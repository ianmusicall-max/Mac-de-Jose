package com.macdejose.videovault.download

import com.macdejose.videovault.resolver.Http
import com.macdejose.videovault.resolver.UrlUtils
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlin.coroutines.coroutineContext

/**
 * Saves an HLS stream by walking its media playlist and appending every segment to
 * one file. The result is a playable transport stream, with no remuxing step and
 * therefore no native dependency.
 *
 * Encrypted playlists are reported rather than worked around: breaking content
 * protection is out of scope for this app.
 */
class HlsDownloader {

    suspend fun download(request: DownloadRequest, onProgress: ProgressSink): Long =
        withContext(Dispatchers.IO) {
            val playlistUrl = resolveMediaPlaylist(request)
            val playlist = fetchText(playlistUrl, request)

            if (playlist.contains("#EXT-X-KEY") && !playlist.contains("METHOD=NONE")) {
                throw UnsupportedStreamException("This stream is encrypted and cannot be saved.")
            }

            val segments = playlist.lines()
                .map(String::trim)
                .filter { it.isNotEmpty() && !it.startsWith("#") }
                .map { UrlUtils.absolutize(playlistUrl, it) }

            if (segments.isEmpty()) throw IOException("The playlist lists no segments")

            request.target.parentFile?.mkdirs()
            // Segment streams are appended in order, so a restart has to begin afresh.
            if (request.target.exists()) request.target.delete()

            var written = 0L
            FileOutputStream(request.target, false).use { output ->
                segments.forEachIndexed { index, segmentUrl ->
                    coroutineContext.ensureActive()
                    Http.client.newCall(
                        Http.requestBuilder(segmentUrl, request.referer, request.userAgent).build(),
                    ).execute().use { response ->
                        if (!response.isSuccessful) {
                            throw IOException("Segment ${index + 1} failed (${response.code})")
                        }
                        val body = response.body ?: throw IOException("Empty segment")
                        body.byteStream().use { input ->
                            val buffer = ByteArray(Downloader.BUFFER_SIZE)
                            while (true) {
                                coroutineContext.ensureActive()
                                val read = input.read(buffer)
                                if (read == -1) break
                                output.write(buffer, 0, read)
                                written += read
                            }
                        }
                    }

                    // Segment counts stand in for byte totals, which HLS never declares.
                    val fraction = (index + 1).toDouble() / segments.size
                    onProgress(written, (written / fraction).toLong())
                }
                output.flush()
            }

            onProgress(written, written)
            written
        }

    /** A master playlist has to be narrowed to one variant before segments exist. */
    private fun resolveMediaPlaylist(request: DownloadRequest): String {
        val text = fetchText(request.url, request)
        if (!text.contains("#EXT-X-STREAM-INF")) return request.url

        val lines = text.lines().map(String::trim).filter(String::isNotEmpty)
        val best = lines
            .withIndex()
            .filter { (_, line) -> line.startsWith("#EXT-X-STREAM-INF") }
            .mapNotNull { (index, line) ->
                val target = lines.drop(index + 1).firstOrNull { !it.startsWith("#") }
                    ?: return@mapNotNull null
                val bandwidth = Regex("""BANDWIDTH=(\d+)""").find(line)
                    ?.groupValues?.get(1)?.toLongOrNull() ?: 0L
                bandwidth to UrlUtils.absolutize(request.url, target)
            }
            .maxByOrNull { it.first }
            ?: throw IOException("No playable variant in that playlist")

        return best.second
    }

    private fun fetchText(url: String, request: DownloadRequest): String =
        Http.client.newCall(
            Http.requestBuilder(url, request.referer, request.userAgent).build(),
        ).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Playlist failed (${response.code})")
            response.body?.string() ?: throw IOException("Empty playlist")
        }
}
