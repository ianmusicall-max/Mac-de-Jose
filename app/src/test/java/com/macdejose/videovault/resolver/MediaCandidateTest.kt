package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MediaCandidateTest {

    private fun candidate(
        height: Int? = null,
        label: String? = null,
    ) = MediaCandidate(
        url = "https://cdn.test/a.mp4",
        kind = MediaKind.VIDEO,
        title = "clip",
        heightPx = height,
        widthPx = height?.let { it * 16 / 9 },
        qualityLabel = label,
    )

    @Test
    fun `pixel count outranks a label`() {
        assertTrue(candidate(height = 1080).rank > candidate(height = 480).rank)
    }

    @Test
    fun `label is used when the size is unknown`() {
        assertTrue(candidate(label = "720p").rank > candidate(label = "360p").rank)
    }

    @Test
    fun `display quality prefers the label, then the height`() {
        assertEquals("720p", candidate(label = "720p").displayQuality)
        assertEquals("480p", candidate(height = 480).displayQuality)
        assertEquals("Original", candidate().displayQuality)
    }
}
