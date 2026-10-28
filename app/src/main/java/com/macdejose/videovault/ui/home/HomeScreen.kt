package com.macdejose.videovault.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentPaste
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.macdejose.videovault.AppContainer
import com.macdejose.videovault.R
import com.macdejose.videovault.data.prefs.Settings
import com.macdejose.videovault.download.DownloadService
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.ui.appViewModel
import com.macdejose.videovault.ui.components.EmptyState
import com.macdejose.videovault.ui.components.MediaThumbnail
import com.macdejose.videovault.ui.components.MetaChip
import com.macdejose.videovault.ui.components.SectionHeader
import com.macdejose.videovault.util.Formatters

@Composable
fun HomeScreen(
    container: AppContainer,
    incomingLink: String?,
    onLinkConsumed: () -> Unit,
    snackbarHostState: SnackbarHostState,
    onOpenDownloads: () -> Unit,
) {
    val viewModel = appViewModel { HomeViewModel(container.mediaRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val recent by viewModel.recentLinks.collectAsStateWithLifecycle()
    val settings by container.settingsRepository.settings
        .collectAsStateWithLifecycle(initialValue = Settings())

    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val keyboard = LocalSoftwareKeyboardController.current

    // A shared link should resolve without the user touching anything.
    LaunchedEffect(incomingLink) {
        incomingLink?.let {
            viewModel.submit(it)
            onLinkConsumed()
        }
    }

    LaunchedEffect(settings.watchClipboard) {
        if (settings.watchClipboard) {
            viewModel.offerClipboard(clipboard.getText()?.text)
        } else {
            viewModel.dismissClipboard()
        }
    }

    LaunchedEffect(state.message) {
        val message = state.message ?: return@LaunchedEffect
        val text = when (message) {
            HomeViewModel.MESSAGE_INVALID -> context.getString(R.string.home_invalid_url)
            HomeViewModel.MESSAGE_NOTHING_FOUND -> context.getString(R.string.home_no_media)
            else -> context.getString(R.string.error_generic, message)
        }
        snackbarHostState.showSnackbar(text)
        viewModel.consumeMessage()
    }

    LaunchedEffect(state.queuedCount) {
        if (state.queuedCount == 0) return@LaunchedEffect
        DownloadService.wake(context)
        val result = snackbarHostState.showSnackbar(
            message = context.resources.getQuantityString(
                R.plurals.queued_items,
                state.queuedCount,
                state.queuedCount,
            ),
            actionLabel = context.getString(R.string.tab_downloads),
        )
        if (result == SnackbarResult.ActionPerformed) onOpenDownloads()
        viewModel.consumeQueued()
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        item {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = stringResource(R.string.home_title),
                    style = MaterialTheme.typography.headlineSmall,
                )

                OutlinedTextField(
                    value = state.url,
                    onValueChange = viewModel::onUrlChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(stringResource(R.string.home_hint)) },
                    leadingIcon = { Icon(Icons.Rounded.Link, contentDescription = null) },
                    trailingIcon = {
                        Row {
                            if (state.url.isNotEmpty()) {
                                IconButton(onClick = viewModel::clear) {
                                    Icon(
                                        Icons.Rounded.Close,
                                        contentDescription = stringResource(R.string.home_clear),
                                    )
                                }
                            }
                            IconButton(
                                onClick = {
                                    clipboard.getText()?.text?.let(viewModel::onUrlChange)
                                },
                            ) {
                                Icon(
                                    Icons.Rounded.ContentPaste,
                                    contentDescription = stringResource(R.string.home_paste),
                                )
                            }
                        }
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Uri,
                        imeAction = ImeAction.Go,
                    ),
                    keyboardActions = KeyboardActions(
                        onGo = {
                            keyboard?.hide()
                            viewModel.detect()
                        },
                    ),
                )

                Button(
                    onClick = {
                        keyboard?.hide()
                        viewModel.detect()
                    },
                    enabled = state.canDetect,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (state.isResolving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    } else {
                        Icon(Icons.Rounded.Search, contentDescription = null)
                    }
                    Text(
                        text = stringResource(R.string.home_detect),
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
            }
        }

        state.clipboardSuggestion?.let { suggestion ->
            item {
                ClipboardCard(
                    link = suggestion,
                    onUse = viewModel::acceptClipboard,
                    onDismiss = viewModel::dismissClipboard,
                )
            }
        }

        if (state.candidates.isNotEmpty()) {
            item {
                SectionHeader(
                    text = state.pageTitle ?: stringResource(R.string.results_title),
                    trailing = {
                        TextButton(onClick = viewModel::downloadAll) {
                            Text(stringResource(R.string.results_download_all))
                        }
                    },
                )
            }
            items(state.candidates, key = MediaCandidate::url) { candidate ->
                CandidateRow(candidate = candidate, onDownload = { viewModel.download(candidate) })
            }
        }

        if (recent.isNotEmpty()) {
            item { SectionHeader(text = stringResource(R.string.home_recent)) }
            items(recent, key = { it.url }) { entry ->
                ListItem(
                    headlineContent = {
                        Text(
                            text = entry.title?.takeIf(String::isNotBlank) ?: entry.host,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    supportingContent = {
                        Text(entry.url, style = MaterialTheme.typography.bodySmall, maxLines = 1)
                    },
                    leadingContent = { Icon(Icons.Rounded.History, contentDescription = null) },
                    trailingContent = {
                        IconButton(onClick = { viewModel.forget(entry.url) }) {
                            Icon(Icons.Rounded.Close, contentDescription = null)
                        }
                    },
                    modifier = Modifier.clickable { viewModel.submit(entry.url) },
                )
            }
        } else if (state.candidates.isEmpty() && !state.isResolving) {
            item {
                EmptyState(
                    icon = Icons.Rounded.Link,
                    title = stringResource(R.string.home_recent),
                    message = stringResource(R.string.home_empty_recent),
                )
            }
        }
    }
}

@Composable
private fun ClipboardCard(link: String, onUse: () -> Unit, onDismiss: () -> Unit) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = stringResource(R.string.home_clipboard_found),
                style = MaterialTheme.typography.titleSmall,
            )
            Text(
                text = link,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onUse) {
                    Text(stringResource(R.string.home_clipboard_use))
                }
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.action_dismiss))
                }
            }
        }
    }
}

@Composable
private fun CandidateRow(candidate: MediaCandidate, onDownload: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            MediaThumbnail(model = candidate.thumbnailUrl, kind = candidate.kind)

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = candidate.title,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    MetaChip(text = candidate.displayQuality)
                    MetaChip(
                        text = candidate.sizeBytes.takeIf { it > 0 }
                            ?.let(Formatters::bytes)
                            ?: stringResource(R.string.results_unknown_size),
                    )
                }
            }

            FilledTonalButton(onClick = onDownload) {
                Icon(Icons.Rounded.Download, contentDescription = null)
                Text(
                    text = stringResource(R.string.results_download),
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
        }
    }
}
