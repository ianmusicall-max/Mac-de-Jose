package com.macdejose.videovault.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class Settings(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true,
    val wifiOnly: Boolean = false,
    val maxParallelDownloads: Int = 2,
    val publishToGallery: Boolean = true,
    val watchClipboard: Boolean = true,
    val showProgressNotification: Boolean = true,
    /** Tree uri the user granted for the status-saver folder, if any. */
    val statusFolderUri: String? = null,
)

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsRepository(private val context: Context) {

    private object Keys {
        val THEME = stringPreferencesKey("theme_mode")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
        val WIFI_ONLY = booleanPreferencesKey("wifi_only")
        val MAX_PARALLEL = intPreferencesKey("max_parallel")
        val PUBLISH = booleanPreferencesKey("publish_to_gallery")
        val CLIPBOARD = booleanPreferencesKey("watch_clipboard")
        val NOTIFICATION = booleanPreferencesKey("progress_notification")
        val STATUS_FOLDER = stringPreferencesKey("status_folder_uri")
    }

    val settings: Flow<Settings> = context.dataStore.data.map { prefs ->
        val defaults = Settings()
        Settings(
            themeMode = prefs[Keys.THEME]
                ?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                ?: defaults.themeMode,
            dynamicColor = prefs[Keys.DYNAMIC_COLOR] ?: defaults.dynamicColor,
            wifiOnly = prefs[Keys.WIFI_ONLY] ?: defaults.wifiOnly,
            maxParallelDownloads = (prefs[Keys.MAX_PARALLEL] ?: defaults.maxParallelDownloads)
                .coerceIn(1, 4),
            publishToGallery = prefs[Keys.PUBLISH] ?: defaults.publishToGallery,
            watchClipboard = prefs[Keys.CLIPBOARD] ?: defaults.watchClipboard,
            showProgressNotification = prefs[Keys.NOTIFICATION] ?: defaults.showProgressNotification,
            statusFolderUri = prefs[Keys.STATUS_FOLDER],
        )
    }

    suspend fun setThemeMode(mode: ThemeMode) = put { it[Keys.THEME] = mode.name }

    suspend fun setDynamicColor(enabled: Boolean) = put { it[Keys.DYNAMIC_COLOR] = enabled }

    suspend fun setWifiOnly(enabled: Boolean) = put { it[Keys.WIFI_ONLY] = enabled }

    suspend fun setMaxParallelDownloads(count: Int) =
        put { it[Keys.MAX_PARALLEL] = count.coerceIn(1, 4) }

    suspend fun setPublishToGallery(enabled: Boolean) = put { it[Keys.PUBLISH] = enabled }

    suspend fun setWatchClipboard(enabled: Boolean) = put { it[Keys.CLIPBOARD] = enabled }

    suspend fun setShowProgressNotification(enabled: Boolean) =
        put { it[Keys.NOTIFICATION] = enabled }

    suspend fun setStatusFolderUri(uri: String?) = put { prefs ->
        if (uri == null) prefs.remove(Keys.STATUS_FOLDER) else prefs[Keys.STATUS_FOLDER] = uri
    }

    private suspend fun put(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        context.dataStore.edit(block)
    }
}
