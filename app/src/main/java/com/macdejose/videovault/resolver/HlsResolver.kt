package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Expands an HLS master playlist into one candidate per quality variant. A media
 * playlist (one that already lists segments) resolves to a single candidate.
 */
class HlsResolver : MediaResolver {

    override val id: String = "hls"

    override fun canHandle(url: String): Boolean = UrlUtils.isHlsPlaylist(url)

    override suspend fun resolve(url: String): ResolveResult = withContext(Dispatchers.IO) {
        val playlist = runCatching { fetch(url) }.getOrElse { error ->
            return@withContext ResolveResult.Failure(
                error.message ?: "Could not read the playlist",
                error,
            )
        }

        val variants = parseVariants(url, playlist)
        val title = UrlUtils.fileNameOf(url)?.substringBeforeLast('.')
            ?: UrlUtils.hostOf(url).ifEmpty { "stream" }

        val candidates = when {
            variants.isNotEmpty() -> variants.map { variant ->
                MediaCandidate(
                    url = variant.url,
                    kind = MediaKind.VIDEO,
                    title = title,
                    mimeType = "application/vnd.apple.mpegurl",
                    qualityLabel = variant.label,
                    widthPx = variant.width,
                    heightPx = variant.height,
                    isHls = true,
                    pageUrl = url,
                )
            }

            playlist.contains("#EXTINF") -> listOf(
                MediaCandidate(
                    url = url,
                    kind = MediaKind.VIDEO,
                    title = title,
                    mimeType = "application/vnd.apple.mpegurl",
                    isHls = true,
                    durationMs = totalDurationMs(playlist),
                    pageUrl = url,
                ),
            )

            else -> emptyList()
        }

        if (candidates.isEmpty()) ResolveResult.Empty
        else ResolveResult.Found(title, candidates.sortedByDescending(MediaCandidate::rank))
    }

    private fun fetch(url: String): String = Http.get(url).use { response ->
        if (!response.isSuccessful) error("HTTP ${response.code}")
        response.body?.string()?.takeIf { it.contains("#EXTM3U") }
            ?: error("Not an HLS playlist")
    }

    private data class Variant(
        val url: String,
        val label: String?,
        val width: Int?,
        val height: Int?,
    )

    private fun parseVariants(baseUrl: String, playlist: String): List<Variant> {
        val lines = playlist.lines().map(String::trim).filter(String::isNotEmpty)
        val variants = mutableListOf<Variant>()

        lines.forEachIndexed { index, line ->
            if (!line.startsWith("#EXT-X-STREAM-INF")) return@forEachIndexed
            val target = lines
                .drop(index + 1)
                .firstOrNull { !it.startsWith("#") }
                ?: return@forEachIndexed

            val attributes = parseAttributes(line)
            val resolution = attributes["RESOLUTION"]?.split('x')
            val width = resolution?.getOrNull(0)?.toIntOrNull()
            val height = resolution?.getOrNull(1)?.toIntOrNull()
            val bandwidth = attributes["BANDWIDTH"]?.toLongOrNull()

            variants += Variant(
                url = UrlUtils.absolutize(baseUrl, target),
                label = height?.let { "${it}p" }
                    ?: bandwidth?.let { "${it / 1000} kbps" },
                width = width,
                height = height,
            )
        }

        return variants.distinctBy(Variant::url)
    }

    /** Parses `KEY=VALUE` pairs, honouring quoted values that contain commas. */
    private fun parseAttributes(line: String): Map<String, String> {
        val payload = line.substringAfter(':', "")
        val attributes = mutableMapOf<String, String>()
        var index = 0
        val builder = StringBuilder()
        var inQuotes = false

        fun flush() {
            val pair = builder.toString()
            builder.clear()
            if (pair.contains('=')) {
                attributes[pair.substringBefore('=').trim().uppercase()] =
                    pair.substringAfter('=').trim().trim('"')
            }
        }

        while (index < payload.length) {
            val char = payload[index]
            when {
                char == '"' -> { inQuotes = !inQuotes; builder.append(char) }
                char == ',' && !inQuotes -> flush()
                else -> builder.append(char)
            }
            index++
        }
        flush()
        return attributes
    }

    private fun totalDurationMs(playlist: String): Long {
        val seconds = Regex("""#EXTINF:\s*([0-9.]+)""")
            .findAll(playlist)
            .sumOf { it.groupValues[1].toDoubleOrNull() ?: 0.0 }
        return if (seconds > 0) (seconds * 1000).toLong() else -1
    }
}
