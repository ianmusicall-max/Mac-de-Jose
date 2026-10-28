package com.macdejose.videovault.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.macdejose.videovault.AppContainer
import com.macdejose.videovault.BuildConfig
import com.macdejose.videovault.R
import com.macdejose.videovault.data.prefs.ThemeMode
import com.macdejose.videovault.ui.appViewModel
import com.macdejose.videovault.ui.components.SectionHeader

@Composable
fun SettingsScreen(
    container: AppContainer,
    snackbarHostState: SnackbarHostState,
) {
    val viewModel = appViewModel {
        SettingsViewModel(container.settingsRepository, container.mediaRepository)
    }
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val confirmation by viewModel.confirmation.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(confirmation) {
        val key = confirmation ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(
            when (key) {
                SettingsViewModel.CONFIRM_HISTORY -> context.getString(R.string.settings_clear_history)
                else -> context.getString(R.string.settings_clear_cookies)
            },
        )
        viewModel.consumeConfirmation()
    }

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item { SectionHeader(text = stringResource(R.string.settings_appearance)) }

        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = stringResource(R.string.settings_theme),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ThemeMode.entries.forEach { mode ->
                        FilterChip(
                            selected = settings.themeMode == mode,
                            onClick = { viewModel.setTheme(mode) },
                            label = {
                                Text(
                                    stringResource(
                                        when (mode) {
                                            ThemeMode.SYSTEM -> R.string.settings_theme_system
                                            ThemeMode.LIGHT -> R.string.settings_theme_light
                                            ThemeMode.DARK -> R.string.settings_theme_dark
                                        },
                                    ),
                                )
                            },
                        )
                    }
                }
            }
        }

        item {
            SwitchRow(
                title = stringResource(R.string.settings_dynamic_color),
                checked = settings.dynamicColor,
                onCheckedChange = viewModel::setDynamicColor,
            )
        }

        item { HorizontalDivider() }
        item { SectionHeader(text = stringResource(R.string.settings_downloads)) }

        item {
            SwitchRow(
                title = stringResource(R.string.settings_wifi_only),
                checked = settings.wifiOnly,
                onCheckedChange = viewModel::setWifiOnly,
            )
        }

        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    text = stringResource(R.string.settings_max_parallel),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    (1..4).forEach { count ->
                        FilterChip(
                            selected = settings.maxParallelDownloads == count,
                            onClick = { viewModel.setMaxParallel(count) },
                            label = { Text(count.toString()) },
                        )
                    }
                }
            }
        }

        item {
            SwitchRow(
                title = stringResource(R.string.settings_save_to_gallery),
                checked = settings.publishToGallery,
                onCheckedChange = viewModel::setPublishToGallery,
            )
        }

        item {
            SwitchRow(
                title = stringResource(R.string.settings_clipboard_watch),
                checked = settings.watchClipboard,
                onCheckedChange = viewModel::setWatchClipboard,
            )
        }

        item {
            SwitchRow(
                title = stringResource(R.string.settings_notifications),
                checked = settings.showProgressNotification,
                onCheckedChange = viewModel::setProgressNotification,
            )
        }

        item { HorizontalDivider() }
        item { SectionHeader(text = stringResource(R.string.settings_privacy)) }

        item {
            ListItem(
                headlineContent = { Text(stringResource(R.string.settings_clear_history)) },
                leadingContent = { Icon(Icons.Rounded.Delete, contentDescription = null) },
                modifier = Modifier.clickable { viewModel.clearHistory() },
            )
        }

        item {
            ListItem(
                headlineContent = { Text(stringResource(R.string.settings_clear_cookies)) },
                leadingContent = { Icon(Icons.Rounded.Language, contentDescription = null) },
                modifier = Modifier.clickable { viewModel.clearBrowserData() },
            )
        }

        item { HorizontalDivider() }
        item { SectionHeader(text = stringResource(R.string.settings_about)) }

        item {
            ListItem(
                headlineContent = {
                    Text(stringResource(R.string.settings_version, BuildConfig.VERSION_NAME))
                },
                supportingContent = { Text(stringResource(R.string.settings_legal)) },
            )
        }
    }
}

@Composable
private fun SwitchRow(
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    ListItem(
        headlineContent = { Text(title) },
        trailingContent = { Switch(checked = checked, onCheckedChange = onCheckedChange) },
        modifier = Modifier.fillMaxWidth(),
    )
}
