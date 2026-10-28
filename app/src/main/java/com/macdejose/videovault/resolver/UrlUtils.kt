package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import java.net.URI
import java.util.Locale

object UrlUtils {

    private val URL_IN_TEXT = Regex("""https?://[^\s<>"']+""", RegexOption.IGNORE_CASE)

    private val VIDEO_EXTENSIONS = setOf("mp4", "m4v", "mov", "webm", "mkv", "3gp", "ts", "avi")
    private val AUDIO_EXTENSIONS = setOf("mp3", "m4a", "aac", "ogg", "opus", "wav", "flac")
    private val IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp", "gif", "heic", "bmp")

    /** Pulls the first http(s) link out of free text, which is what share sheets hand us. */
    fun firstUrlIn(text: String?): String? =
        text?.let { URL_IN_TEXT.find(it)?.value }?.trimEnd('.', ',', ')', ']', '"', '\'')

    fun looksLikeUrl(text: String): Boolean {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || trimmed.any(Char::isWhitespace)) return false
        if (trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true)) return true
        // Bare host like "example.com/watch?v=1".
        return Regex("""^[\w-]+(\.[\w-]+)+(/.*)?$""").matches(trimmed)
    }

    fun normalize(raw: String): String {
        val trimmed = raw.trim()
        return when {
            trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true) -> trimmed
            else -> "https://$trimmed"
        }
    }

    /** Turns anything the user typed into either a URL to open or a search query. */
    fun toNavigationUrl(input: String, searchTemplate: String = DEFAULT_SEARCH): String =
        if (looksLikeUrl(input)) normalize(input)
        else searchTemplate.format(java.net.URLEncoder.encode(input.trim(), "UTF-8"))

    const val DEFAULT_SEARCH = "https://duckduckgo.com/?q=%s"

    fun hostOf(url: String): String =
        runCatching { URI(url).host?.removePrefix("www.") }.getOrNull().orEmpty()

    fun pathExtension(url: String): String? {
        val path = runCatching { URI(url).path }.getOrNull() ?: return null
        val name = path.substringAfterLast('/', "")
        if (!name.contains('.')) return null
        return name.substringAfterLast('.').lowercase(Locale.ROOT).takeIf { it.isNotBlank() }
    }

    fun fileNameOf(url: String): String? {
        val path = runCatching { URI(url).path }.getOrNull() ?: return null
        return path.substringAfterLast('/', "").takeIf { it.isNotBlank() }
    }

    fun isHlsPlaylist(url: String, mimeType: String? = null): Boolean =
        pathExtension(url) in setOf("m3u8", "m3u") ||
            mimeType?.contains("mpegurl", ignoreCase = true) == true

    fun isDashManifest(url: String, mimeType: String? = null): Boolean =
        pathExtension(url) == "mpd" || mimeType?.contains("dash+xml", ignoreCase = true) == true

    fun kindFor(url: String, mimeType: String? = null): MediaKind? {
        mimeType?.substringBefore(';')?.trim()?.lowercase(Locale.ROOT)?.let { mime ->
            when {
                mime.startsWith("video/") || mime.contains("mpegurl") -> return MediaKind.VIDEO
                mime.startsWith("audio/") -> return MediaKind.AUDIO
                mime.startsWith("image/") -> return MediaKind.IMAGE
            }
        }
        return when (pathExtension(url)) {
            in VIDEO_EXTENSIONS -> MediaKind.VIDEO
            "m3u8", "m3u", "mpd" -> MediaKind.VIDEO
            in AUDIO_EXTENSIONS -> MediaKind.AUDIO
            in IMAGE_EXTENSIONS -> MediaKind.IMAGE
            else -> null
        }
    }

    fun extensionFor(kind: MediaKind, mimeType: String?, url: String): String {
        pathExtension(url)
            ?.takeIf { it in VIDEO_EXTENSIONS || it in AUDIO_EXTENSIONS || it in IMAGE_EXTENSIONS }
            ?.let { return it }
        mimeType?.substringBefore(';')?.trim()?.lowercase(Locale.ROOT)?.let { mime ->
            when (mime) {
                "video/mp4" -> return "mp4"
                "video/webm" -> return "webm"
                "video/quicktime" -> return "mov"
                "audio/mpeg" -> return "mp3"
                "audio/mp4" -> return "m4a"
                "image/jpeg" -> return "jpg"
                "image/png" -> return "png"
                "image/webp" -> return "webp"
                "image/gif" -> return "gif"
            }
        }
        return when (kind) {
            MediaKind.VIDEO -> "mp4"
            MediaKind.AUDIO -> "m4a"
            MediaKind.IMAGE -> "jpg"
        }
    }

    fun absolutize(base: String, maybeRelative: String): String = runCatching {
        URI(base).resolve(maybeRelative.trim()).toString()
    }.getOrElse { maybeRelative }

    /** Strips tracking noise so the same page is not stored twice in history. */
    fun canonicalize(url: String): String = runCatching {
        val uri = URI(normalize(url))
        val query = uri.query
            ?.split('&')
            ?.filter { param ->
                val key = param.substringBefore('=').lowercase(Locale.ROOT)
                key.isNotEmpty() && !key.startsWith("utm_") && key !in TRACKING_PARAMS
            }
            ?.takeIf { it.isNotEmpty() }
            ?.joinToString("&")
        URI(uri.scheme, uri.authority, uri.path, query, null).toString()
    }.getOrElse { url.trim() }

    private val TRACKING_PARAMS = setOf("fbclid", "gclid", "igshid", "mc_cid", "mc_eid", "ref_src")
}
