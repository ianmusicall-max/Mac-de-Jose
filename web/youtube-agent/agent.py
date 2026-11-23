"""Prepare queued public YouTube videos and send MP4 files to VideoVault."""

import json
import os
from pathlib import Path
import re
import resource
import signal
import subprocess
import tempfile
import time
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

ENDPOINT = os.environ["VIDEOVAULT_YOUTUBE_ENDPOINT"]
TOKEN = os.environ["VIDEOVAULT_YOUTUBE_TOKEN"]
PROFILE = os.environ["VIDEOVAULT_FIREFOX_PROFILE"]
MAX_BYTES = 40 * 1024 * 1024
BIN = Path("/opt/videovault/bin")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = build_opener(NoRedirect)


def call(method="GET", *, video_id=None, reason=None, video=None):
    params = {"id": video_id} if video_id else {}
    if reason:
        params["reason"] = reason
    url = ENDPOINT + ("?" + urlencode(params) if params else "")
    headers = {"Authorization": f"Bearer {TOKEN}", "User-Agent": "VideoVault-YouTube-Agent/1.0"}
    if video is None:
        with opener.open(Request(url, method=method, headers=headers), timeout=15) as response:
            return json.load(response)

    headers.update({"Content-Length": str(video.stat().st_size), "Content-Type": "video/mp4"})
    with video.open("rb") as stream:
        with opener.open(Request(url, data=stream, method=method, headers=headers), timeout=90) as response:
            return json.load(response)


def limit_output():
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_BYTES, MAX_BYTES))


def prepare(video_id, work):
    video = work / "video.mp4"
    command = [
        str(BIN / "yt-dlp"), "--ignore-config",
        "--cookies-from-browser", f"firefox:{PROFILE}",
        "--js-runtimes", f"deno:{BIN / 'deno'}",
        "--no-playlist", "--no-progress", "--socket-timeout", "10",
        "--retries", "0", "--fragment-retries", "0", "--abort-on-unavailable-fragments",
        "--max-filesize", str(MAX_BYTES), "--match-filter", "!is_live & duration <= 900",
        "-f", "b[ext=mp4][vcodec^=avc1][acodec^=mp4a][height<=720]",
        "-o", str(video), "--", "https://www.youtube.com/watch?v=" + video_id,
    ]
    with (work / "download.log").open("w+b") as log:
        with subprocess.Popen(command, stdout=log, stderr=log, start_new_session=True,
                              preexec_fn=limit_output) as child:
            try:
                status = child.wait(timeout=110)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
                return None, "unavailable"
        log.seek(0)
        output = log.read(128 * 1024).lower()

    if any(text in output for text in (
        b"http error 429", b"confirm you", b"too many requests", b"rate limit", b"not a bot",
    )):
        return None, "limited"
    if b"max-filesize" in output or b"file size limit" in output or (
        video.exists() and video.stat().st_size >= MAX_BYTES
    ):
        return None, "size"
    if status != 0 or not video.exists() or video.stat().st_size == 0:
        return None, "unavailable"

    check = subprocess.run(
        ["/usr/bin/ffprobe", "-v", "error", "-show_entries", "stream=codec_name",
         "-of", "json", str(video)],
        capture_output=True, timeout=15, check=False,
    )
    if check.returncode != 0:
        return None, "unavailable"
    codecs = {entry.get("codec_name") for entry in json.loads(check.stdout).get("streams", [])}
    return (video, None) if {"h264", "aac"} <= codecs else (None, "unavailable")


def main():
    while True:
        try:
            video_id = call().get("id")
            if not isinstance(video_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
                time.sleep(12)
                continue

            with tempfile.TemporaryDirectory(prefix="videovault-youtube-") as directory:
                try:
                    video, reason = prepare(video_id, Path(directory))
                except (OSError, ValueError, subprocess.TimeoutExpired):
                    video, reason = None, "unavailable"
                if video:
                    call("PUT", video_id=video_id, video=video)
                else:
                    call("POST", video_id=video_id, reason=reason)
                print(video_id, "ready" if video else reason, flush=True)
            time.sleep(30)
        except (OSError, ValueError) as error:
            print("VideoVault request failed:", type(error).__name__, getattr(error, "code", ""), flush=True)
            time.sleep(30)


if __name__ == "__main__":
    main()
