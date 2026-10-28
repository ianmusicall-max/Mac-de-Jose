package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlUtilsTest {

    @Test
    fun `pulls the first link out of shared text`() {
        val shared = "Look at this https://example.com/clip/42?x=1 — pretty good"
        assertEquals("https://example.com/clip/42?x=1", UrlUtils.firstUrlIn(shared))
    }

    @Test
    fun `trims trailing punctuation from shared links`() {
        assertEquals("https://example.com/a", UrlUtils.firstUrlIn("see https://example.com/a."))
    }

    @Test
    fun `recognises bare hosts but not sentences`() {
        assertTrue(UrlUtils.looksLikeUrl("example.com/watch?v=1"))
        assertTrue(UrlUtils.looksLikeUrl("https://example.com"))
        assertFalse(UrlUtils.looksLikeUrl("how to download videos"))
        assertFalse(UrlUtils.looksLikeUrl(""))
    }

    @Test
    fun `search terms become a query, links stay links`() {
        assertEquals("https://example.com", UrlUtils.toNavigationUrl("example.com"))
        assertTrue(UrlUtils.toNavigationUrl("funny clips").startsWith("https://duckduckgo.com/?q="))
    }

    @Test
    fun `kind comes from mime type first and extension second`() {
        assertEquals(MediaKind.VIDEO, UrlUtils.kindFor("https://cdn.test/a.bin", "video/mp4"))
        assertEquals(MediaKind.IMAGE, UrlUtils.kindFor("https://cdn.test/a.jpg"))
        assertEquals(MediaKind.AUDIO, UrlUtils.kindFor("https://cdn.test/a.m4a"))
        assertEquals(MediaKind.VIDEO, UrlUtils.kindFor("https://cdn.test/master.m3u8"))
        assertNull(UrlUtils.kindFor("https://cdn.test/page.html"))
    }

    @Test
    fun `hls detection covers extension and content type`() {
        assertTrue(UrlUtils.isHlsPlaylist("https://cdn.test/master.m3u8"))
        assertTrue(UrlUtils.isHlsPlaylist("https://cdn.test/x", "application/vnd.apple.mpegurl"))
        assertFalse(UrlUtils.isHlsPlaylist("https://cdn.test/a.mp4"))
    }

    @Test
    fun `relative sources resolve against the page`() {
        assertEquals(
            "https://example.com/media/clip.mp4",
            UrlUtils.absolutize("https://example.com/watch/1", "/media/clip.mp4"),
        )
        assertEquals(
            "https://example.com/watch/clip.mp4",
            UrlUtils.absolutize("https://example.com/watch/1", "clip.mp4"),
        )
    }

    @Test
    fun `canonicalize drops tracking parameters but keeps real ones`() {
        assertEquals(
            "https://example.com/watch?v=42",
            UrlUtils.canonicalize("https://example.com/watch?v=42&utm_source=app&igshid=abc"),
        )
    }

    @Test
    fun `extension falls back to a sensible default per kind`() {
        assertEquals("mp4", UrlUtils.extensionFor(MediaKind.VIDEO, null, "https://cdn.test/stream"))
        assertEquals("webm", UrlUtils.extensionFor(MediaKind.VIDEO, "video/webm", "https://cdn.test/s"))
        assertEquals("jpg", UrlUtils.extensionFor(MediaKind.IMAGE, null, "https://cdn.test/photo.jpg"))
    }
}
