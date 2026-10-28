package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind

/**
 * One downloadable file we found behind a page or link.
 *
 * [url] is always something an HTTP client can fetch directly; HLS playlists keep
 * [isHls] set so the download engine knows to walk the segment list instead of
 * streaming a single body.
 */
data class MediaCandidate(
    val url: String,
    val kind: MediaKind,
    val title: String,
    val mimeType: String? = null,
    val qualityLabel: String? = null,
    val widthPx: Int? = null,
    val heightPx: Int? = null,
    val sizeBytes: Long = -1,
    val durationMs: Long = -1,
    val isHls: Boolean = false,
    val thumbnailUrl: String? = null,
    val pageUrl: String? = null,
    val referer: String? = null,
    val userAgent: String? = null,
) {
    /** Rough ranking so the best variant can be pre-selected in the UI. */
    val rank: Int
        get() {
            val pixels = (widthPx ?: 0) * (heightPx ?: 0)
            if (pixels > 0) return pixels
            val fromLabel = qualityLabel?.filter(Char::isDigit)?.toIntOrNull() ?: 0
            return fromLabel * 1_000
        }

    val displayQuality: String
        get() = qualityLabel
            ?: heightPx?.let { "${it}p" }
            ?: mimeType?.substringAfter('/')?.uppercase()
            ?: "Original"
}

sealed interface ResolveResult {
    data class Found(
        val pageTitle: String?,
        val candidates: List<MediaCandidate>,
    ) : ResolveResult

    data object Empty : ResolveResult

    data class Failure(val reason: String, val cause: Throwable? = null) : ResolveResult
}
