package com.macdejose.videovault.resolver

/**
 * Tries each resolver in order and returns the first useful answer. Failures are
 * remembered so that, if nothing at all works, the user sees a real reason
 * instead of a bare "not found".
 */
class MediaResolverChain(
    private val resolvers: List<MediaResolver> = listOf(
        InstagramResolver(),
        HlsResolver(),
        DirectLinkResolver(),
        HtmlMediaResolver(),
    ),
) {

    suspend fun resolve(rawUrl: String): ResolveResult {
        if (!UrlUtils.looksLikeUrl(rawUrl)) {
            return ResolveResult.Failure("Not a web address")
        }
        val url = UrlUtils.normalize(rawUrl)
        var lastFailure: ResolveResult.Failure? = null

        for (resolver in resolvers) {
            if (!resolver.canHandle(url)) continue
            when (val result = resolver.resolve(url)) {
                is ResolveResult.Found -> if (result.candidates.isNotEmpty()) return result
                is ResolveResult.Failure -> lastFailure = result
                ResolveResult.Empty -> Unit
            }
        }

        return lastFailure ?: ResolveResult.Empty
    }
}
