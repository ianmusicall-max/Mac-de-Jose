package com.macdejose.videovault.resolver

/**
 * A strategy for turning a page or file URL into downloadable candidates.
 *
 * Resolvers are deliberately generic: they read what a page publishes about
 * itself (OpenGraph tags, <video> elements, JSON-LD, HLS manifests) rather than
 * reverse-engineering any private API. New strategies plug in through
 * [MediaResolverChain] without touching the rest of the app.
 */
interface MediaResolver {

    val id: String

    fun canHandle(url: String): Boolean

    suspend fun resolve(url: String): ResolveResult
}
