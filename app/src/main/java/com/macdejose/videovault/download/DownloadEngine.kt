package com.macdejose.videovault.download

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import androidx.core.content.getSystemService
import com.macdejose.videovault.data.db.DownloadDao
import com.macdejose.videovault.data.db.DownloadEntity
import com.macdejose.videovault.data.db.DownloadStatus
import com.macdejose.videovault.data.prefs.Settings
import com.macdejose.videovault.data.prefs.SettingsRepository
import com.macdejose.videovault.resolver.Http
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.UrlUtils
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * The queue behind every download in the app. The UI only ever asks the engine to
 * enqueue, pause, resume or drop an item; progress flows back through Room so any
 * screen observing the database stays in sync.
 */
class DownloadEngine(
    private val context: Context,
    private val dao: DownloadDao,
    private val fileStore: FileStore,
    private val settingsRepository: SettingsRepository,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
) {

    private val httpDownloader = Downloader()
    private val hlsDownloader = HlsDownloader()
    private val jobs = mutableMapOf<Long, Job>()
    private val lock = Mutex()

    private val _activeCount = MutableStateFlow(0)
    val activeCount: StateFlow<Int> = _activeCount.asStateFlow()

    private val _events = MutableStateFlow<EngineEvent?>(null)
    val events: StateFlow<EngineEvent?> = _events.asStateFlow()

    sealed interface EngineEvent {
        data class Finished(val id: Long, val title: String) : EngineEvent
        data class Failed(val id: Long, val title: String, val reason: String) : EngineEvent
        data class Blocked(val reason: String) : EngineEvent
    }

    /** Marks anything the previous process left mid-flight as resumable. */
    suspend fun recoverAfterRestart() {
        dao.parkUnfinished()
    }

    suspend fun enqueue(candidate: MediaCandidate): Long {
        dao.findByUrl(candidate.url)?.let { existing ->
            if (existing.status == DownloadStatus.COMPLETED) return existing.id
            resume(existing.id)
            return existing.id
        }

        val extension = UrlUtils.extensionFor(candidate.kind, candidate.mimeType, candidate.url)
            .let { if (candidate.isHls) "ts" else it }
        val target = fileStore.workFile(candidate.title, extension)

        val id = dao.insert(
            DownloadEntity(
                title = target.nameWithoutExtension,
                mediaUrl = candidate.url,
                pageUrl = candidate.pageUrl,
                kind = candidate.kind,
                mimeType = candidate.mimeType ?: fileStore.mimeTypeFor(candidate.kind, extension),
                qualityLabel = candidate.qualityLabel,
                isHls = candidate.isHls,
                totalBytes = candidate.sizeBytes,
                durationMs = candidate.durationMs,
                localPath = target.absolutePath,
                referer = candidate.referer ?: candidate.pageUrl,
                userAgent = candidate.userAgent ?: Http.DESKTOP_UA,
            ),
        )

        pump()
        return id
    }

    suspend fun pause(id: Long) {
        lock.withLock { jobs.remove(id) }?.cancel()
        dao.updateStatus(id, DownloadStatus.PAUSED)
        refreshActiveCount()
        pump()
    }

    suspend fun resume(id: Long) {
        val download = dao.find(id) ?: return
        if (download.status == DownloadStatus.COMPLETED) return
        dao.updateStatus(id, DownloadStatus.QUEUED, error = null)
        pump()
    }

    suspend fun retry(id: Long) {
        val download = dao.find(id) ?: return
        download.localPath?.let { File(it).delete() }
        dao.updateProgress(id, downloaded = 0, total = -1)
        dao.updateStatus(id, DownloadStatus.QUEUED, error = null)
        pump()
    }

    suspend fun cancel(id: Long, deleteFile: Boolean = true) {
        lock.withLock { jobs.remove(id) }?.cancel()
        val download = dao.find(id)
        if (deleteFile) {
            download?.localPath?.let { File(it).delete() }
            download?.publishedUri?.let { fileStore.deletePublished(Uri.parse(it)) }
        }
        dao.delete(id)
        refreshActiveCount()
        pump()
    }

    suspend fun pauseAll() {
        val running = lock.withLock { jobs.keys.toList() }
        running.forEach { pause(it) }
    }

    /** Starts as many queued downloads as the user's settings allow. */
    fun pumpAsync() = scope.launch { pump() }

    suspend fun pump() {
        val settings = settingsRepository.settings.first()
        if (!hasUsableNetwork(settings)) {
            if (lock.withLock { jobs.isEmpty() }) {
                val queued = dao.nextQueued(1)
                if (queued.isNotEmpty()) {
                    _events.value = EngineEvent.Blocked(
                        if (settings.wifiOnly) "Waiting for Wi-Fi" else "No internet connection",
                    )
                }
            }
            return
        }

        while (true) {
            val slots = settings.maxParallelDownloads - lock.withLock { jobs.size }
            if (slots <= 0) break
            val next = dao.nextQueued(slots).firstOrNull { candidate ->
                lock.withLock { !jobs.containsKey(candidate.id) }
            } ?: break
            start(next, settings)
        }
        refreshActiveCount()
    }

    private suspend fun start(download: DownloadEntity, settings: Settings) {
        val target = download.localPath?.let(::File) ?: return
        dao.updateStatus(download.id, DownloadStatus.RUNNING, error = null)

        val job = scope.launch {
            val request = DownloadRequest(
                url = download.mediaUrl,
                target = target,
                referer = download.referer,
                userAgent = download.userAgent ?: Http.DESKTOP_UA,
            )

            val outcome = runDownload {
                if (download.isHls) {
                    hlsDownloader.download(request) { done, total ->
                        dao.updateProgress(download.id, done, total)
                    }
                } else {
                    httpDownloader.download(request) { done, total ->
                        dao.updateProgress(download.id, done, total)
                    }
                }
            }

            outcome
                .onSuccess { bytes -> complete(download, target, bytes, settings) }
                .onFailure { error ->
                    dao.updateStatus(
                        download.id,
                        DownloadStatus.FAILED,
                        error = error.message ?: error::class.simpleName ?: "Download failed",
                    )
                    _events.value = EngineEvent.Failed(
                        download.id,
                        download.title,
                        error.message ?: "Download failed",
                    )
                }

            lock.withLock { jobs.remove(download.id) }
            refreshActiveCount()
            pump()
        }

        lock.withLock { jobs[download.id] = job }
        refreshActiveCount()
    }

    private suspend fun complete(
        download: DownloadEntity,
        target: File,
        bytes: Long,
        settings: Settings,
    ) {
        val publishedUri = if (settings.publishToGallery) {
            fileStore.publishToGallery(
                file = target,
                kind = download.kind,
                mimeType = download.mimeType,
            )?.toString()
        } else {
            null
        }

        dao.update(
            download.copy(
                status = DownloadStatus.COMPLETED,
                downloadedBytes = bytes,
                totalBytes = bytes,
                publishedUri = publishedUri,
                error = null,
                updatedAt = System.currentTimeMillis(),
            ),
        )
        _events.value = EngineEvent.Finished(download.id, download.title)
    }

    fun consumeEvent() {
        _events.value = null
    }

    private suspend fun refreshActiveCount() {
        _activeCount.value = lock.withLock { jobs.size }
    }

    private fun hasUsableNetwork(settings: Settings): Boolean {
        val manager = context.getSystemService<ConnectivityManager>() ?: return true
        val capabilities = manager.activeNetwork?.let(manager::getNetworkCapabilities)
            ?: return false
        if (!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return false
        if (!settings.wifiOnly) return true
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }
}
