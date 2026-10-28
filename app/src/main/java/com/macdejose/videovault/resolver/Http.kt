package com.macdejose.videovault.resolver

import java.util.concurrent.TimeUnit
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/**
 * Shared HTTP stack. A desktop-ish user agent is used on purpose: plenty of sites
 * serve a stripped-down page (or no <video> tag at all) to unknown clients.
 */
object Http {

    const val DESKTOP_UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

    const val MOBILE_UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"

    /** Pages larger than this are almost certainly not what we are looking for. */
    const val MAX_HTML_BYTES = 4L * 1024 * 1024

    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .callTimeout(0, TimeUnit.MILLISECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .retryOnConnectionFailure(true)
            .build()
    }

    fun requestBuilder(
        url: String,
        referer: String? = null,
        userAgent: String = DESKTOP_UA,
    ): Request.Builder = Request.Builder()
        .url(url)
        .header("User-Agent", userAgent)
        .header("Accept-Language", "en-US,en;q=0.9")
        .apply { referer?.let { header("Referer", it) } }

    fun get(url: String, referer: String? = null, userAgent: String = DESKTOP_UA): Response =
        client.newCall(
            requestBuilder(url, referer, userAgent)
                .cacheControl(CacheControl.FORCE_NETWORK)
                .build(),
        ).execute()

    data class Probe(
        val contentLength: Long,
        val mimeType: String?,
        val supportsRanges: Boolean,
        val finalUrl: String,
    )

    /**
     * Asks the server what it is about to send us. HEAD first, then a one-byte
     * ranged GET for the many CDNs that answer HEAD with 405.
     */
    fun probe(url: String, referer: String? = null, userAgent: String = DESKTOP_UA): Probe? {
        headProbe(url, referer, userAgent)?.let { return it }
        return rangeProbe(url, referer, userAgent)
    }

    private fun headProbe(url: String, referer: String?, userAgent: String): Probe? = runCatching {
        client.newCall(
            requestBuilder(url, referer, userAgent).head().build(),
        ).execute().use { response ->
            if (!response.isSuccessful) return@use null
            Probe(
                contentLength = response.header("Content-Length")?.toLongOrNull() ?: -1,
                mimeType = response.header("Content-Type")?.substringBefore(';')?.trim(),
                supportsRanges = response.header("Accept-Ranges")?.contains("bytes") == true,
                finalUrl = response.request.url.toString(),
            )
        }
    }.getOrNull()

    private fun rangeProbe(url: String, referer: String?, userAgent: String): Probe? = runCatching {
        client.newCall(
            requestBuilder(url, referer, userAgent).header("Range", "bytes=0-0").build(),
        ).execute().use { response ->
            if (!response.isSuccessful) return@use null
            val contentRange = response.header("Content-Range")
            val total = contentRange?.substringAfter('/', "")?.toLongOrNull()
                ?: response.header("Content-Length")?.toLongOrNull()
                ?: -1
            Probe(
                contentLength = total,
                mimeType = response.header("Content-Type")?.substringBefore(';')?.trim(),
                supportsRanges = response.code == 206,
                finalUrl = response.request.url.toString(),
            )
        }
    }.getOrNull()
}
