package com.macdejose.videovault.resolver

import com.macdejose.videovault.data.db.MediaKind
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class MediaResolverChainTest {
    private fun resolver(block: suspend () -> ResolveResult) = object : MediaResolver {
        override val id = "test"
        override fun canHandle(url: String) = true
        override suspend fun resolve(url: String) = block()
    }

    @Test
    fun `network errors become visible failures`() = runTest {
        val chain = MediaResolverChain(listOf(resolver { throw IOException("Connection lost") }))
        val result = chain.resolve("https://example.com/video") as ResolveResult.Failure
        assertEquals("Connection lost", result.reason)
    }

    @Test
    fun `tries next resolver after an exception`() = runTest {
        val expected = ResolveResult.Found("Video", listOf(
            MediaCandidate("https://example.com/video.mp4", MediaKind.VIDEO, "Video"),
        ))
        val chain = MediaResolverChain(listOf(
            resolver { throw IOException("Connection lost") },
            resolver { expected },
        ))
        assertSame(expected, chain.resolve("https://example.com/video"))
    }

    @Test
    fun `cancellation is never converted into a failure`() = runTest {
        val expected = CancellationException("Stopped")
        val chain = MediaResolverChain(listOf(resolver { throw expected }))
        try {
            chain.resolve("https://example.com/video")
            throw AssertionError("Cancellation must propagate")
        } catch (actual: CancellationException) {
            assertSame(expected, actual)
        }
    }
}
