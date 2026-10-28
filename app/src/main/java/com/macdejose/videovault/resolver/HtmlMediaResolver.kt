package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Document

/**
 * Reads a normal web page and collects the media it declares about itself:
 * OpenGraph/Twitter card tags, <video>/<source>/<audio> elements, JSON-LD
 * `contentUrl`s, and inline playlist URLs. Nothing here is site-specific.
 */
class HtmlMediaResolver : MediaResolver {

    override val id: String = "html"

    override fun canHandle(url: String): Boolean = url.startsWith("http", ignoreCase = true)

    override suspend fun resolve(url: String): ResolveResult = withContext(Dispatchers.IO) {
        val (html, finalUrl) = runCatching { fetchHtml(url) }.getOrElse { error ->
            return@withContext ResolveResult.Failure(
                error.message ?: "Could not open that page",
                error,
            )
        }

        val document = Jsoup.parse(html, finalUrl)
        val found = linkedMapOf<String, MediaCandidate>()
        val pageTitle = document.title().trim().ifEmpty { UrlUtils.hostOf(finalUrl) }
        val poster = document.metaContent("og:image", "twitter:image")

        fun collect(candidate: MediaCandidate) {
            val key = candidate.url
            if (key.isBlank() || key.startsWith("data:") || key.startsWith("blob:")) return
            // Earlier sources are the more trustworthy ones, so never overwrite.
            found.putIfAbsent(key, candidate)
        }

        openGraphVideos(document, finalUrl, pageTitle, poster).forEach(::collect)
        mediaElements(document, finalUrl, pageTitle, poster).forEach(::collect)
        jsonLdMedia(document, finalUrl, pageTitle, poster).forEach(::collect)
        inlineMediaUrls(html, finalUrl, pageTitle, poster).forEach(::collect)
        openGraphImages(document, finalUrl, pageTitle).forEach(::collect)

        val expanded = expandPlaylists(found.values.toList())
        if (expanded.isEmpty()) {
            ResolveResult.Empty
        } else {
            ResolveResult.Found(
                pageTitle = pageTitle,
                candidates = expanded
                    .map { it.copy(pageUrl = finalUrl, referer = finalUrl) }
                    .sortedWith(compareBy({ it.kind.ordinal }, { -it.rank })),
            )
        }
    }

    private fun fetchHtml(url: String): Pair<String, String> =
        Http.get(url, userAgent = Http.DESKTOP_UA).use { response ->
            if (!response.isSuccessful) error("HTTP ${response.code}")
            val body = response.body ?: error("Empty response")
            val contentType = body.contentType()?.toString().orEmpty()
            if (!contentType.contains("html", ignoreCase = true) && contentType.isNotEmpty()) {
                error("That link is not a web page")
            }
            val text = body.source().let { source ->
                source.request(Http.MAX_HTML_BYTES)
                source.buffer.snapshot().utf8()
            }
            text to response.request.url.toString()
        }

    private fun Document.metaContent(vararg names: String): String? = names.firstNotNullOfOrNull { name ->
        selectFirst("meta[property=$name], meta[name=$name]")
            ?.attr("content")
            ?.trim()
            ?.takeIf(String::isNotEmpty)
    }

    private fun openGraphVideos(
        document: Document,
        baseUrl: String,
        pageTitle: String,
        poster: String?,
    ): List<MediaCandidate> {
        val urls = document
            .select(
                "meta[property=og:video], meta[property=og:video:url], " +
                    "meta[property=og:video:secure_url], meta[name=twitter:player:stream]",
            )
            .mapNotNull { it.attr("content").trim().takeIf(String::isNotEmpty) }

        val width = document.metaContent("og:video:width")?.toIntOrNull()
        val height = document.metaContent("og:video:height")?.toIntOrNull()
        val mime = document.metaContent("og:video:type")

        return urls.map { raw ->
            val absolute = UrlUtils.absolutize(baseUrl, raw)
            MediaCandidate(
                url = absolute,
                kind = MediaKind.VIDEO,
                title = pageTitle,
                mimeType = mime,
                widthPx = width,
                heightPx = height,
                isHls = UrlUtils.isHlsPlaylist(absolute, mime),
                thumbnailUrl = poster,
                qualityLabel = height?.let { "${it}p" },
            )
        }
    }

    private fun openGraphImages(
        document: Document,
        baseUrl: String,
        pageTitle: String,
    ): List<MediaCandidate> =
        document.select("meta[property=og:image], meta[property=og:image:secure_url]")
            .mapNotNull { it.attr("content").trim().takeIf(String::isNotEmpty) }
            .map { raw ->
                val absolute = UrlUtils.absolutize(baseUrl, raw)
                MediaCandidate(
                    url = absolute,
                    kind = MediaKind.IMAGE,
                    title = pageTitle,
                    widthPx = document.metaContent("og:image:width")?.toIntOrNull(),
                    heightPx = document.metaContent("og:image:height")?.toIntOrNull(),
                    thumbnailUrl = absolute,
                )
            }

    private fun mediaElements(
        document: Document,
        baseUrl: String,
        pageTitle: String,
        poster: String?,
    ): List<MediaCandidate> {
        val candidates = mutableListOf<MediaCandidate>()

        document.select("video, audio").forEach { element ->
            val kind = if (element.tagName() == "audio") MediaKind.AUDIO else MediaKind.VIDEO
            val elementPoster = element.attr("poster").trim().takeIf(String::isNotEmpty)
                ?.let { UrlUtils.absolutize(baseUrl, it) }
                ?: poster
            val label = element.attr("title").trim().takeIf(String::isNotEmpty) ?: pageTitle

            val sources = buildList {
                element.attr("src").trim().takeIf(String::isNotEmpty)?.let { add(it to "") }
                element.select("source").forEach { source ->
                    val src = source.attr("src").trim().ifEmpty { source.attr("data-src").trim() }
                    if (src.isNotEmpty()) add(src to source.attr("type").trim())
                }
            }

            sources.forEach { (src, type) ->
                val absolute = UrlUtils.absolutize(baseUrl, src)
                candidates += MediaCandidate(
                    url = absolute,
                    kind = UrlUtils.kindFor(absolute, type.ifEmpty { null }) ?: kind,
                    title = label,
                    mimeType = type.ifEmpty { null },
                    isHls = UrlUtils.isHlsPlaylist(absolute, type),
                    thumbnailUrl = elementPoster,
                    widthPx = element.attr("width").toIntOrNull(),
                    heightPx = element.attr("height").toIntOrNull(),
                )
            }
        }

        return candidates
    }

    private fun jsonLdMedia(
        document: Document,
        baseUrl: String,
        pageTitle: String,
        poster: String?,
    ): List<MediaCandidate> {
        val candidates = mutableListOf<MediaCandidate>()

        document.select("script[type=application/ld+json]").forEach { script ->
            val payload = script.data().trim().takeIf(String::isNotEmpty) ?: return@forEach
            runCatching {
                when (val parsed = JSONTokenerCompat.parse(payload)) {
                    is JSONObject -> candidates += fromJsonLdNode(parsed, baseUrl, pageTitle, poster)
                    is JSONArray -> for (index in 0 until parsed.length()) {
                        parsed.optJSONObject(index)?.let {
                            candidates += fromJsonLdNode(it, baseUrl, pageTitle, poster)
                        }
                    }
                }
            }
        }

        return candidates
    }

    private fun fromJsonLdNode(
        node: JSONObject,
        baseUrl: String,
        pageTitle: String,
        poster: String?,
    ): List<MediaCandidate> {
        val candidates = mutableListOf<MediaCandidate>()
        val contentUrl = node.optString("contentUrl").takeIf(String::isNotEmpty)
        if (contentUrl != null) {
            val absolute = UrlUtils.absolutize(baseUrl, contentUrl)
            val kind = UrlUtils.kindFor(absolute) ?: MediaKind.VIDEO
            candidates += MediaCandidate(
                url = absolute,
                kind = kind,
                title = node.optString("name").takeIf(String::isNotEmpty) ?: pageTitle,
                widthPx = node.optInt("width").takeIf { it > 0 },
                heightPx = node.optInt("height").takeIf { it > 0 },
                isHls = UrlUtils.isHlsPlaylist(absolute),
                thumbnailUrl = node.optString("thumbnailUrl").takeIf(String::isNotEmpty) ?: poster,
                durationMs = parseIsoDuration(node.optString("duration")),
            )
        }

        // Nested graphs are common; walk one level of object/array children.
        node.keys().forEach { key ->
            when (val child = node.opt(key)) {
                is JSONObject -> candidates += fromJsonLdNode(child, baseUrl, pageTitle, poster)
                is JSONArray -> for (index in 0 until child.length()) {
                    child.optJSONObject(index)?.let {
                        candidates += fromJsonLdNode(it, baseUrl, pageTitle, poster)
                    }
                }
            }
        }

        return candidates
    }

    /** Parses the ISO-8601 shape schema.org uses for durations, e.g. `PT1M30S`. */
    private fun parseIsoDuration(value: String?): Long {
        if (value.isNullOrBlank()) return -1
        val match = Regex("""PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?""").find(value) ?: return -1
        val (hours, minutes, seconds) = match.destructured
        val total = (hours.toLongOrNull() ?: 0) * 3_600_000 +
            (minutes.toLongOrNull() ?: 0) * 60_000 +
            ((seconds.toDoubleOrNull() ?: 0.0) * 1000).toLong()
        return if (total > 0) total else -1
    }

    /** Last resort: media URLs sitting in inline scripts or JSON blobs. */
    private fun inlineMediaUrls(
        html: String,
        baseUrl: String,
        pageTitle: String,
        poster: String?,
    ): List<MediaCandidate> =
        INLINE_MEDIA_URL.findAll(html)
            .map { it.value.replace("\\/", "/").replace("\\u0026", "&").trim('"', '\'') }
            .filter { it.startsWith("http", ignoreCase = true) }
            .distinct()
            .take(MAX_INLINE_HITS)
            .mapNotNull { url ->
                val kind = UrlUtils.kindFor(url) ?: return@mapNotNull null
                if (kind == MediaKind.IMAGE) return@mapNotNull null
                MediaCandidate(
                    url = UrlUtils.absolutize(baseUrl, url),
                    kind = kind,
                    title = pageTitle,
                    isHls = UrlUtils.isHlsPlaylist(url),
                    thumbnailUrl = poster,
                )
            }
            .toList()

    /** A master playlist found on a page is worth one entry per quality. */
    private suspend fun expandPlaylists(candidates: List<MediaCandidate>): List<MediaCandidate> {
        val playlists = candidates.filter(MediaCandidate::isHls)
        if (playlists.isEmpty()) return candidates

        val hls = HlsResolver()
        val expanded = mutableListOf<MediaCandidate>()
        candidates.forEach { candidate ->
            if (!candidate.isHls) {
                expanded += candidate
                return@forEach
            }
            val result = hls.resolve(candidate.url)
            if (result is ResolveResult.Found && result.candidates.isNotEmpty()) {
                expanded += result.candidates.map {
                    it.copy(title = candidate.title, thumbnailUrl = candidate.thumbnailUrl)
                }
            } else {
                expanded += candidate
            }
        }
        return expanded.distinctBy(MediaCandidate::url)
    }

    private companion object {
        const val MAX_INLINE_HITS = 12
        val INLINE_MEDIA_URL = Regex(
            """https?:(?:\\/|/)[^"'\s\\]+?\.(?:mp4|m4v|webm|mov|m3u8|mp3|m4a)(?:\?[^"'\s\\]*)?""",
            RegexOption.IGNORE_CASE,
        )
    }
}

/** Tiny shim so both JSON object and array payloads can be parsed in one call. */
private object JSONTokenerCompat {
    fun parse(payload: String): Any? = org.json.JSONTokener(payload).nextValue()
}
