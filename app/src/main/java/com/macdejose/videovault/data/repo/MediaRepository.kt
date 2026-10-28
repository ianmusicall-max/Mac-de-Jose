package com.macdejose.videovault.data.repo

import com.macdejose.videovault.data.db.DownloadDao
import com.macdejose.videovault.data.db.DownloadEntity
import com.macdejose.videovault.data.db.LinkHistoryDao
import com.macdejose.videovault.data.db.LinkHistoryEntity
import com.macdejose.videovault.download.DownloadEngine
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.MediaResolverChain
import com.macdejose.videovault.resolver.ResolveResult
import com.macdejose.videovault.resolver.UrlUtils
import kotlinx.coroutines.flow.Flow

/**
 * The single entry point the UI uses to go from "a link" to "a queued download".
 */
class MediaRepository(
    private val resolverChain: MediaResolverChain,
    private val downloadDao: DownloadDao,
    private val historyDao: LinkHistoryDao,
    private val engine: DownloadEngine,
) {

    val downloads: Flow<List<DownloadEntity>> = downloadDao.observeAll()
    val unfinished: Flow<List<DownloadEntity>> = downloadDao.observeUnfinished()
    val completed: Flow<List<DownloadEntity>> = downloadDao.observeCompleted()
    val recentLinks: Flow<List<LinkHistoryEntity>> = historyDao.observeRecent()

    suspend fun resolve(rawUrl: String): ResolveResult {
        val result = resolverChain.resolve(rawUrl)
        if (result is ResolveResult.Found) {
            val canonical = UrlUtils.canonicalize(rawUrl)
            historyDao.upsert(
                LinkHistoryEntity(
                    url = canonical,
                    title = result.pageTitle,
                    host = UrlUtils.hostOf(canonical),
                    mediaCount = result.candidates.size,
                ),
            )
        }
        return result
    }

    suspend fun enqueue(candidate: MediaCandidate): Long = engine.enqueue(candidate)

    suspend fun enqueueAll(candidates: List<MediaCandidate>): List<Long> =
        candidates.map { engine.enqueue(it) }

    suspend fun pause(id: Long) = engine.pause(id)

    suspend fun resume(id: Long) = engine.resume(id)

    suspend fun retry(id: Long) = engine.retry(id)

    suspend fun remove(id: Long, deleteFile: Boolean) = engine.cancel(id, deleteFile)

    suspend fun find(id: Long): DownloadEntity? = downloadDao.find(id)

    suspend fun clearFinished() = downloadDao.deleteCompleted()

    suspend fun forgetLink(url: String) = historyDao.delete(url)

    suspend fun clearHistory() = historyDao.clear()
}
