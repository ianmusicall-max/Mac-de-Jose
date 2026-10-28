package com.macdejose.videovault.resolver

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Handles links that already point at a media file, e.g. a bare .mp4 on a CDN. */
class DirectLinkResolver : MediaResolver {

    override val id: String = "direct"

    override fun canHandle(url: String): Boolean =
        UrlUtils.kindFor(url) != null && !UrlUtils.isHlsPlaylist(url)

    override suspend fun resolve(url: String): ResolveResult = withContext(Dispatchers.IO) {
        val kind = UrlUtils.kindFor(url) ?: return@withContext ResolveResult.Empty
        val probe = Http.probe(url)
        val resolvedKind = probe?.mimeType?.let { UrlUtils.kindFor(url, it) } ?: kind
        val name = UrlUtils.fileNameOf(url)?.substringBeforeLast('.')
            ?: UrlUtils.hostOf(url).ifEmpty { "media" }

        ResolveResult.Found(
            pageTitle = name,
            candidates = listOf(
                MediaCandidate(
                    url = probe?.finalUrl ?: url,
                    kind = resolvedKind,
                    title = name,
                    mimeType = probe?.mimeType,
                    sizeBytes = probe?.contentLength ?: -1,
                    pageUrl = url,
                ),
            ),
        )
    }
}
