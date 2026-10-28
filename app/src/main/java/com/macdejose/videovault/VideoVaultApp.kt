package com.macdejose.videovault

import android.app.Application
import com.macdejose.videovault.download.DownloadNotifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class VideoVaultApp : Application() {

    lateinit var container: AppContainer
        private set

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        DownloadNotifier(this).ensureChannels()

        // Anything the last process was mid-way through becomes a paused item the
        // user can resume, rather than a download that silently never finishes.
        scope.launch { container.downloadEngine.recoverAfterRestart() }
    }
}
