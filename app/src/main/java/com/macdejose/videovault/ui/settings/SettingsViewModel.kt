package com.macdejose.videovault.ui.settings

import android.webkit.CookieManager
import android.webkit.WebStorage
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macdejose.videovault.data.prefs.Settings
import com.macdejose.videovault.data.prefs.SettingsRepository
import com.macdejose.videovault.data.prefs.ThemeMode
import com.macdejose.videovault.data.repo.MediaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
    private val mediaRepository: MediaRepository,
) : ViewModel() {

    val settings: StateFlow<Settings> = settingsRepository.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), Settings())

    private val _confirmation = MutableStateFlow<String?>(null)
    val confirmation: StateFlow<String?> = _confirmation.asStateFlow()

    fun setTheme(mode: ThemeMode) = launchEdit { settingsRepository.setThemeMode(mode) }

    fun setDynamicColor(enabled: Boolean) =
        launchEdit { settingsRepository.setDynamicColor(enabled) }

    fun setWifiOnly(enabled: Boolean) = launchEdit { settingsRepository.setWifiOnly(enabled) }

    fun setMaxParallel(count: Int) =
        launchEdit { settingsRepository.setMaxParallelDownloads(count) }

    fun setPublishToGallery(enabled: Boolean) =
        launchEdit { settingsRepository.setPublishToGallery(enabled) }

    fun setWatchClipboard(enabled: Boolean) =
        launchEdit { settingsRepository.setWatchClipboard(enabled) }

    fun setProgressNotification(enabled: Boolean) =
        launchEdit { settingsRepository.setShowProgressNotification(enabled) }

    fun clearHistory() = launchEdit {
        mediaRepository.clearHistory()
        _confirmation.value = CONFIRM_HISTORY
    }

    /** Drops browser cookies and local storage, so the next visit starts clean. */
    fun clearBrowserData() = launchEdit {
        runCatching {
            CookieManager.getInstance().removeAllCookies(null)
            WebStorage.getInstance().deleteAllData()
        }
        _confirmation.value = CONFIRM_BROWSER
    }

    fun consumeConfirmation() {
        _confirmation.value = null
    }

    private fun launchEdit(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    companion object {
        const val CONFIRM_HISTORY = "history_cleared"
        const val CONFIRM_BROWSER = "browser_cleared"
    }
}
