package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup

/**
 * Instagram does not put the media in the page a signed-out visitor receives, so
 * the generic HTML resolver finds nothing there. The embed page Instagram serves
 * for public posts does carry it, and that is what this resolver reads.
 *
 * Only public posts can work this way. Private accounts, stories and anything
 * behind a follow request need a signed-in session, which this app does not have
 * and does not ask for.
 */
class InstagramResolver : MediaResolver {

    override val id: String = "instagram"

    override fun canHandle(url: String): Boolean {
        val host = UrlUtils.hostOf(url).lowercase()
        return host == "instagram.com" || host.endsWith(".instagram.com")
    }

    override suspend fun resolve(url: String): ResolveResult = withContext(Dispatchers.IO) {
        val shortcode = shortcodeOf(url)
            ?: followToShortcode(url)
            ?: return@withContext ResolveResult.Failure(
                "Open the post itself — a link with /p/, /reel/ or /tv/ in it",
            )

        // The captioned variant carries more of the post's JSON; plain embed is the fallback.
        val pages = listOf(
            "https://www.instagram.com/p/$shortcode/embed/captioned/",
            "https://www.instagram.com/p/$shortcode/embed/",
        )

        var lastError: String? = null
        for (page in pages) {
            val html = runCatching { fetch(page) }.getOrElse { error ->
                lastError = error.message
                continue
            }

            val candidates = parse(html, shortcode)
            if (candidates.isNotEmpty()) {
                return@withContext ResolveResult.Found(
                    pageTitle = titleOf(html) ?: "instagram-$shortcode",
                    candidates = candidates.map {
                        it.copy(
                            pageUrl = url,
                            referer = "https://www.instagram.com/",
                            userAgent = Http.DESKTOP_UA,
                        )
                    },
                )
            }
        }

        lastError?.let { return@withContext ResolveResult.Failure(it) }
        ResolveResult.Empty
    }

    private fun fetch(pageUrl: String): String =
        Http.get(pageUrl, referer = "https://www.instagram.com/", userAgent = Http.DESKTOP_UA)
            .use { response ->
                if (!response.isSuccessful) error("Instagram replied ${response.code}")
                response.body?.string() ?: error("Instagram returned an empty page")
            }

    private fun parse(html: String, shortcode: String): List<MediaCandidate> {
        val found = linkedMapOf<String, MediaCandidate>()
        val document = runCatching { Jsoup.parse(html) }.getOrNull()

        fun add(rawUrl: String, kind: MediaKind, width: Int? = null, height: Int? = null) {
            val clean = unescape(rawUrl)
            if (!clean.startsWith("http", ignoreCase = true)) return
            found.putIfAbsent(
                clean,
                MediaCandidate(
                    url = clean,
                    kind = kind,
                    title = "instagram-$shortcode",
                    widthPx = width,
                    heightPx = height,
                    isHls = UrlUtils.isHlsPlaylist(clean),
                ),
            )
        }

        // The post JSON embedded in the page is the richest source.
        VIDEO_URL.findAll(html).forEach { add(it.groupValues[1], MediaKind.VIDEO) }
        VIDEO_VERSION.findAll(html).forEach { match ->
            add(
                rawUrl = match.groupValues[3],
                kind = MediaKind.VIDEO,
                width = match.groupValues[1].toIntOrNull(),
                height = match.groupValues[2].toIntOrNull(),
            )
        }

        document?.selectFirst("meta[property=og:video]")
            ?.attr("content")
            ?.takeIf(String::isNotEmpty)
            ?.let { add(it, MediaKind.VIDEO) }

        document?.select("video[src]")?.forEach { add(it.attr("src"), MediaKind.VIDEO) }

        // Photo posts, and the poster frame of a video post.
        DISPLAY_URL.findAll(html).forEach { add(it.groupValues[1], MediaKind.IMAGE) }
        document?.select("img.EmbeddedMediaImage[src]")?.forEach {
            add(it.attr("src"), MediaKind.IMAGE)
        }
        document?.selectFirst("meta[property=og:image]")
            ?.attr("content")
            ?.takeIf(String::isNotEmpty)
            ?.let { add(it, MediaKind.IMAGE) }

        // Videos first, best quality first; the poster image stays last as a fallback.
        return found.values.sortedWith(compareBy({ it.kind.ordinal }, { -it.rank }))
    }

    private fun titleOf(html: String): String? = runCatching {
        Jsoup.parse(html).selectFirst("meta[property=og:title]")
            ?.attr("content")
            ?.trim()
            ?.takeIf(String::isNotEmpty)
    }.getOrNull()

    /** A /share/ or shortened link only reveals the post once the redirects are followed. */
    private fun followToShortcode(url: String): String? = runCatching {
        Http.get(UrlUtils.normalize(url), userAgent = Http.DESKTOP_UA).use { response ->
            shortcodeOf(response.request.url.toString())
        }
    }.getOrNull()

    private fun unescape(raw: String): String = raw
        .replace("\\/", "/")
        .replace("\\u0026", "&")
        .replace("&amp;", "&")
        .trim()

    companion object {
        private val SHORTCODE = Regex("""/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)""")
        private val VIDEO_URL = Regex(""""video_url"\s*:\s*"([^"]+)"""")
        private val VIDEO_VERSION = Regex(
            """"width"\s*:\s*(\d+)\s*,\s*"height"\s*:\s*(\d+)\s*,\s*"url"\s*:\s*"([^"]+\.mp4[^"]*)"""",
        )
        private val DISPLAY_URL = Regex(""""display_url"\s*:\s*"([^"]+)"""")

        /** Pulls the post id out of any Instagram post, reel or IGTV link. */
        fun shortcodeOf(url: String): String? =
            SHORTCODE.find(url)?.groupValues?.get(1)?.takeIf { it.length >= 5 }
    }
}
