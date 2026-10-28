package com.macdejose.videovault.download

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.ServiceCompat
import com.macdejose.videovault.VideoVaultApp
import com.macdejose.videovault.data.db.DownloadEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Keeps the process alive — and the user informed — for as long as the engine has
 * work. It owns no download logic of its own; it mirrors engine state into a
 * notification and stops itself once the queue drains.
 */
class DownloadService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var observers: Job? = null

    private val container by lazy { (application as VideoVaultApp).container }
    private val notifier by lazy { DownloadNotifier(this) }

    override fun onCreate() {
        super.onCreate()
        notifier.ensureChannels()
        startForegroundWith(emptyList())
        observeEngine()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE_ALL -> scope.launch { container.downloadEngine.pauseAll() }
            else -> container.downloadEngine.pumpAsync()
        }
        return START_STICKY
    }

    private fun observeEngine() {
        if (observers != null) return
        observers = scope.launch {
            launch {
                container.downloadDao.observeUnfinished().collectLatest { unfinished ->
                    val active = unfinished.filter { it.status.isActive }
                    if (active.isEmpty()) {
                        stopSelfSafely()
                    } else if (container.settings().showProgressNotification) {
                        startForegroundWith(active)
                    }
                }
            }

            launch {
                container.downloadEngine.events.collectLatest { event ->
                    when (event) {
                        is DownloadEngine.EngineEvent.Finished ->
                            notifier.notifyFinished(event.id, event.title)

                        is DownloadEngine.EngineEvent.Failed ->
                            notifier.notifyFailed(event.id, event.title, event.reason)

                        else -> Unit
                    }
                    if (event != null) container.downloadEngine.consumeEvent()
                }
            }
        }
    }

    private fun startForegroundWith(active: List<DownloadEntity>) {
        val notification = notifier.buildProgress(active)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                DownloadNotifier.FOREGROUND_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            startForeground(DownloadNotifier.FOREGROUND_ID, notification)
        }
    }

    private fun stopSelfSafely() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_PAUSE_ALL = "com.macdejose.videovault.PAUSE_ALL"

        fun wake(context: Context) {
            val intent = Intent(context, DownloadService::class.java)
            // A queue that is already draining does not need a second foreground start.
            runCatching {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            }
        }
    }
}
