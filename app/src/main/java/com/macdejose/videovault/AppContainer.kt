package com.macdejose.videovault

import android.content.Context
import com.macdejose.videovault.data.db.AppDatabase
import com.macdejose.videovault.data.prefs.Settings
import com.macdejose.videovault.data.prefs.SettingsRepository
import com.macdejose.videovault.data.repo.MediaRepository
import com.macdejose.videovault.download.DownloadEngine
import com.macdejose.videovault.download.FileStore
import com.macdejose.videovault.resolver.MediaResolverChain
import com.macdejose.videovault.statuses.StatusRepository
import kotlinx.coroutines.flow.first

/**
 * Hand-rolled dependency graph. The app has one of each of these and they are all
 * cheap to build, so a container beats pulling in a DI framework.
 */
class AppContainer(context: Context) {

    private val appContext = context.applicationContext

    private val database by lazy { AppDatabase.build(appContext) }

    val downloadDao by lazy { database.downloadDao() }

    private val linkHistoryDao by lazy { database.linkHistoryDao() }

    val settingsRepository by lazy { SettingsRepository(appContext) }

    val fileStore by lazy { FileStore(appContext) }

    private val resolverChain by lazy { MediaResolverChain() }

    val downloadEngine by lazy {
        DownloadEngine(
            context = appContext,
            dao = downloadDao,
            fileStore = fileStore,
            settingsRepository = settingsRepository,
        )
    }

    val mediaRepository by lazy {
        MediaRepository(
            resolverChain = resolverChain,
            downloadDao = downloadDao,
            historyDao = linkHistoryDao,
            engine = downloadEngine,
        )
    }

    val statusRepository by lazy { StatusRepository(appContext, fileStore) }

    suspend fun settings(): Settings = settingsRepository.settings.first()
}
