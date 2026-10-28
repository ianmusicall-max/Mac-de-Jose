package com.macdejose.videovault.resolver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InstagramResolverTest {

    private val resolver = InstagramResolver()

    @Test
    fun `handles instagram hosts only`() {
        assertTrue(resolver.canHandle("https://www.instagram.com/reel/Cx1y2z3a4b5/"))
        assertTrue(resolver.canHandle("https://instagram.com/p/Cx1y2z3a4b5/"))
        assertFalse(resolver.canHandle("https://example.com/reel/Cx1y2z3a4b5/"))
    }

    @Test
    fun `reads the shortcode out of every post shape`() {
        val expected = "Cx1y2z3a4b5"
        listOf(
            "https://www.instagram.com/p/$expected/",
            "https://www.instagram.com/reel/$expected/",
            "https://www.instagram.com/reels/$expected/",
            "https://www.instagram.com/tv/$expected/",
            "https://www.instagram.com/reel/$expected/?igshid=abc123",
            "https://www.instagram.com/someuser/reel/$expected/",
        ).forEach { url ->
            assertEquals(url, expected, InstagramResolver.shortcodeOf(url))
        }
    }

    @Test
    fun `profile and story links carry no post shortcode`() {
        assertNull(InstagramResolver.shortcodeOf("https://www.instagram.com/someuser/"))
        assertNull(InstagramResolver.shortcodeOf("https://www.instagram.com/stories/user/123/"))
    }
}
