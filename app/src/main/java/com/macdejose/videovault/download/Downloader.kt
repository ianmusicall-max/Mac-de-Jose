package com.macdejose.videovault.download

import com.macdejose.videovault.resolver.Http
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlin.coroutines.coroutineContext

data class DownloadRequest(
    val url: String,
    val target: File,
    val referer: String? = null,
    val userAgent: String = Http.DESKTOP_UA,
)

/** Progress callback: bytes written so far and the total when the server declares one. */
typealias ProgressSink = suspend (downloaded: Long, total: Long) -> Unit

/**
 * Streams one HTTP body to disk. Partial files are reused: if [DownloadRequest.target]
 * already holds bytes and the server honours ranges, the transfer picks up where it
 * stopped, which is what makes pause/resume work across process death.
 */
class Downloader {

    suspend fun download(request: DownloadRequest, onProgress: ProgressSink): Long =
        withContext(Dispatchers.IO) {
            request.target.parentFile?.mkdirs()
            val alreadyHave = if (request.target.exists()) request.target.length() else 0L

            val call = Http.client.newCall(
                Http.requestBuilder(request.url, request.referer, request.userAgent)
                    .apply { if (alreadyHave > 0) header("Range", "bytes=$alreadyHave-") }
                    .build(),
            )

            call.execute().use { response ->
                if (!response.isSuccessful) {
                    throw IOException("Server replied ${response.code}")
                }

                // The server ignored our Range header, so start the file over.
                val resuming = alreadyHave > 0 && response.code == 206
                if (alreadyHave > 0 && !resuming) request.target.delete()

                val body = response.body ?: throw IOException("Empty response body")
                val startAt = if (resuming) alreadyHave else 0L
                val declared = body.contentLength().takeIf { it > 0 }?.plus(startAt) ?: -1L

                var written = startAt
                onProgress(written, declared)

                body.byteStream().use { input ->
                    FileOutputStream(request.target, resuming).use { output ->
                        val buffer = ByteArray(BUFFER_SIZE)
                        var lastReport = System.currentTimeMillis()

                        while (true) {
                            coroutineContext.ensureActive()
                            val read = input.read(buffer)
                            if (read == -1) break
                            output.write(buffer, 0, read)
                            written += read

                            val now = System.currentTimeMillis()
                            if (now - lastReport >= PROGRESS_INTERVAL_MS) {
                                lastReport = now
                                onProgress(written, declared)
                            }
                        }
                        output.flush()
                    }
                }

                onProgress(written, written)
                written
            }
        }

    companion object {
        const val BUFFER_SIZE = 64 * 1024
        const val PROGRESS_INTERVAL_MS = 350L
    }
}

/** Thrown when a stream cannot be saved for reasons the user should see verbatim. */
class UnsupportedStreamException(message: String) : IOException(message)

internal suspend fun <T> runDownload(block: suspend () -> T): Result<T> = try {
    Result.success(block())
} catch (cancellation: CancellationException) {
    throw cancellation
} catch (error: Throwable) {
    Result.failure(error)
}
