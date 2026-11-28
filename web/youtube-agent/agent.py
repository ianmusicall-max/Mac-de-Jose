"""Prepare queued public videos and send MP4 files to SnapReel."""

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

PROFILE = os.environ.get("SNAPREEL_FIREFOX_PROFILE") or os.environ["VIDEOVAULT_FIREFOX_PROFILE"]
MAX_BYTES = 40 * 1024 * 1024
BIN = Path(__file__).resolve().parents[1] / "bin"
QUEUE_PREFIXES = ("SNAPREEL_YOUTUBE", "SNAPREEL_AGENT", "VIDEOVAULT_YOUTUBE", "VIDEOVAULT_SOCIAL")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = build_opener(NoRedirect)


def call(endpoint, token, method="GET", *, video_id=None, reason=None, video=None):
    params = {"id": video_id} if video_id else {}
    if reason:
        params["reason"] = reason
    url = endpoint + ("?" + urlencode(params) if params else "")
    headers = {"Authorization": f"Bearer {token}", "User-Agent": "SnapReel-Agent/1.0"}
    if video is None:
        with opener.open(Request(url, method=method, headers=headers), timeout=15) as response:
            return json.load(response)

    headers.update({"Content-Length": str(video.stat().st_size), "Content-Type": "video/mp4"})
    with video.open("rb") as stream:
        with opener.open(Request(url, data=stream, method=method, headers=headers), timeout=90) as response:
            return json.load(response)


def limit_output():
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_BYTES, MAX_BYTES))


def source_for(video_id):
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        return "https://www.youtube.com/watch?v=" + video_id
    if match := re.fullmatch(r"ig:([A-Za-z0-9_-]{1,32})", video_id):
        return "https://www.instagram.com/p/" + match[1] + "/"
    if match := re.fullmatch(r"fb:r:(\d{1,32})", video_id, re.ASCII):
        return "https://www.facebook.com/reel/" + match[1] + "/"
    if match := re.fullmatch(r"fb:v:(\d{1,32})", video_id, re.ASCII):
        return "https://www.facebook.com/watch/?v=" + match[1]
    if match := re.fullmatch(r"fb:s([rv]):([A-Za-z0-9]{1,32})", video_id):
        return "https://www.facebook.com/share/" + match[1] + "/" + match[2] + "/"
    if match := re.fullmatch(r"fb:w:([A-Za-z0-9_-]{1,32})", video_id):
        return "https://fb.watch/" + match[1] + "/"
    if match := re.fullmatch(r"tt:v:(\d{1,32})", video_id, re.ASCII):
        return "https://www.tiktok.com/@i/video/" + match[1]
    if match := re.fullmatch(r"tt:(vm|vt):([A-Za-z0-9]{4,32})", video_id):
        return "https://" + match[1] + ".tiktok.com/" + match[2] + "/"
    if match := re.fullmatch(r"tt:t:([A-Za-z0-9]{4,32})", video_id):
        return "https://www.tiktok.com/t/" + match[1] + "/"
    return None


def prepare(video_id, work, source_url=None):
    video = work / "video.mp4"
    source = source_for(video_id)
    if video_id.startswith("tt:v:") and isinstance(source_url, str):
        match = re.fullmatch(r"https://www\.tiktok\.com/@[A-Za-z0-9_.-]+/video/([0-9]{1,32})", source_url)
        if match and match[1] == video_id.split(":")[-1]:
            source = source_url
    if not source:
        return None, "unavailable"
    youtube = ":" not in video_id
    tiktok = video_id.startswith("tt:")
    origin_options = [
        "--cookies-from-browser", f"firefox:{PROFILE}",
        "--js-runtimes", f"deno:{BIN / 'deno'}",
    ] if youtube else ["--use-extractors", "TikTok.*" if tiktok else "Instagram.*,Facebook.*"]
    video_format = (
        "b[ext=mp4][vcodec^=avc1][acodec^=mp4a][height<=720]"
        if youtube else "best[ext=mp4][protocol=https]"
    )
    command = [
        str(BIN / "yt-dlp"), "--ignore-config", *origin_options,
        "--no-playlist", "--no-progress", "--socket-timeout", "10",
        "--retries", "0", "--fragment-retries", "0", "--abort-on-unavailable-fragments",
        "--max-filesize", str(MAX_BYTES), "--match-filter",
        "!is_live & duration <= 900" if youtube else "!is_live & duration <=? 900",
        "-f", video_format, "-o", str(video), "--", source,
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
    required = {"h264", "aac"} if youtube else {"h264"}
    if not required <= codecs:
        return None, "unavailable"
    if tiktok:
        decoded = subprocess.run(
            ["/usr/bin/ffmpeg", "-v", "error", "-xerror", "-i", str(video), "-f", "null", "-"],
            capture_output=True, timeout=35, check=False,
        )
        if decoded.returncode:
            return None, "unavailable"
    return video, None


def process_queue(endpoint, token):
    job = call(endpoint, token)
    video_id = job.get("id")
    if not isinstance(video_id, str) or not source_for(video_id):
        return False

    with tempfile.TemporaryDirectory(prefix="snapreel-video-") as directory:
        try:
            video, reason = prepare(video_id, Path(directory), job.get("sourceUrl"))
        except (OSError, ValueError, subprocess.TimeoutExpired):
            video, reason = None, "unavailable"
        if video:
            call(endpoint, token, "PUT", video_id=video_id, video=video)
        else:
            call(endpoint, token, "POST", video_id=video_id, reason=reason)
        print(video_id, "ready" if video else reason, flush=True)
    return True


def main():
    queues = []
    for prefix in QUEUE_PREFIXES:
        endpoint = os.environ.get(prefix + "_ENDPOINT")
        token = os.environ.get(prefix + "_TOKEN")
        if endpoint and token and (endpoint, token) not in queues:
            queues.append((endpoint, token))
    if not queues:
        raise RuntimeError("No download queue is configured")
    while True:
        processed = False
        for endpoint, token in queues:
            try:
                processed = process_queue(endpoint, token) or processed
            except (OSError, ValueError) as error:
                print("SnapReel request failed:", type(error).__name__, getattr(error, "code", ""), flush=True)
        time.sleep(30 if processed else 12)


if __name__ == "__main__":
    main()
