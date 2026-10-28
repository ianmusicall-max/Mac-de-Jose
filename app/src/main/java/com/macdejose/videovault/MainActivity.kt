package com.macdejose.videovault

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.macdejose.videovault.data.prefs.Settings
import com.macdejose.videovault.data.prefs.ThemeMode
import com.macdejose.videovault.resolver.UrlUtils
import com.macdejose.videovault.ui.RootScreen
import com.macdejose.videovault.ui.theme.VideoVaultTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class MainActivity : ComponentActivity() {

    private val pendingLink = MutableStateFlow<String?>(null)
    private val startOnDownloads = MutableStateFlow(false)

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* Progress notifications are a convenience; denial is not fatal. */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleIntent(intent)
        askForNotificationPermission()

        val container = (application as VideoVaultApp).container

        setContent {
            val settings by container.settingsRepository.settings
                .collectAsStateWithLifecycle(initialValue = Settings())

            VideoVaultTheme(
                darkTheme = when (settings.themeMode) {
                    ThemeMode.SYSTEM -> isSystemInDarkTheme()
                    ThemeMode.LIGHT -> false
                    ThemeMode.DARK -> true
                },
                dynamicColor = settings.dynamicColor,
            ) {
                RootScreen(
                    container = container,
                    incomingLink = pendingLink.asStateFlow(),
                    openDownloadsOnStart = startOnDownloads.asStateFlow(),
                    onLinkConsumed = { pendingLink.value = null },
                    onDownloadsOpened = { startOnDownloads.value = false },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent ?: return
        if (intent.getBooleanExtra(EXTRA_OPEN_DOWNLOADS, false)) {
            startOnDownloads.value = true
        }
        val shared = intent.getStringExtra(EXTRA_SHARED_LINK)
            ?: intent.getStringExtra(Intent.EXTRA_TEXT)
            ?: intent.dataString
        UrlUtils.firstUrlIn(shared)?.let { pendingLink.value = it }
    }

    private fun askForNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    companion object {
        const val EXTRA_OPEN_DOWNLOADS = "open_downloads"
        const val EXTRA_SHARED_LINK = "shared_link"
    }
}
