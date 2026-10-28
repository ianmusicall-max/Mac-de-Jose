package com.macdejose.videovault.ui.downloads

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.macdejose.videovault.AppContainer
import com.macdejose.videovault.R
import com.macdejose.videovault.data.db.DownloadEntity
import com.macdejose.videovault.data.db.DownloadStatus
import com.macdejose.videovault.download.DownloadService
import com.macdejose.videovault.ui.appViewModel
import com.macdejose.videovault.ui.components.EmptyState
import com.macdejose.videovault.ui.components.MediaThumbnail
import com.macdejose.videovault.ui.components.MetaChip
import com.macdejose.videovault.ui.components.SectionHeader
import com.macdejose.videovault.ui.components.TaskProgress
import com.macdejose.videovault.ui.player.PlayerSheet
import com.macdejose.videovault.util.Formatters
import java.io.File

@Composable
fun DownloadsScreen(
    container: AppContainer,
    snackbarHostState: SnackbarHostState,
) {
    val viewModel = appViewModel { DownloadsViewModel(container.mediaRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val playing by viewModel.playing.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (state.active.isNotEmpty()) {
            item { SectionHeader(text = stringResource(R.string.downloads_active)) }
            items(state.active, key = DownloadEntity::id) { download ->
                ActiveDownloadCard(
                    download = download,
                    onPause = { viewModel.pause(download.id) },
                    onResume = {
                        viewModel.resume(download.id)
                        DownloadService.wake(context)
                    },
                    onRetry = {
                        viewModel.retry(download.id)
                        DownloadService.wake(context)
                    },
                    onCancel = { viewModel.remove(download.id, deleteFile = true) },
                )
            }
        }

        if (state.finished.isNotEmpty()) {
            item {
                SectionHeader(
                    text = stringResource(R.string.downloads_finished),
                    trailing = {
                        TextButton(onClick = viewModel::clearFinished) {
                            Text(stringResource(R.string.downloads_clear_finished))
                        }
                    },
                )
            }
            items(state.finished, key = DownloadEntity::id) { download ->
                FinishedDownloadCard(
                    download = download,
                    onPlay = { viewModel.play(download) },
                    onShare = { shareDownload(context, container, download) },
                    onDelete = { viewModel.remove(download.id, deleteFile = true) },
                )
            }
        }

        if (state.isEmpty) {
            item {
                EmptyState(
                    icon = Icons.Rounded.Download,
                    title = stringResource(R.string.downloads_empty),
                )
            }
        }
    }

    playing?.let { download ->
        val path = download.localPath
        if (path != null && File(path).exists()) {
            PlayerSheet(
                title = download.title,
                localPath = path,
                onDismiss = viewModel::stopPlayback,
            )
        } else {
            viewModel.stopPlayback()
        }
    }
}

@Composable
private fun ActiveDownloadCard(
    download: DownloadEntity,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                MediaThumbnail(
                    model = null,
                    kind = download.kind,
                    modifier = Modifier.size(48.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = download.title,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = download.error
                            ?: Formatters.progressLine(
                                download.downloadedBytes,
                                download.totalBytes,
                            ),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (download.status == DownloadStatus.FAILED) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                when (download.status) {
                    DownloadStatus.RUNNING -> IconButton(onClick = onPause) {
                        Icon(
                            Icons.Rounded.Pause,
                            contentDescription = stringResource(R.string.downloads_pause),
                        )
                    }

                    DownloadStatus.PAUSED, DownloadStatus.QUEUED -> IconButton(onClick = onResume) {
                        Icon(
                            Icons.Rounded.PlayArrow,
                            contentDescription = stringResource(R.string.downloads_resume),
                        )
                    }

                    DownloadStatus.FAILED -> IconButton(onClick = onRetry) {
                        Icon(
                            Icons.Rounded.Refresh,
                            contentDescription = stringResource(R.string.downloads_retry),
                        )
                    }

                    DownloadStatus.COMPLETED -> Unit
                }

                IconButton(onClick = onCancel) {
                    Icon(
                        Icons.Rounded.Delete,
                        contentDescription = stringResource(R.string.downloads_cancel),
                    )
                }
            }

            if (download.status != DownloadStatus.FAILED) {
                TaskProgress(fraction = download.progress)
            }
        }
    }
}

@Composable
private fun FinishedDownloadCard(
    download: DownloadEntity,
    onPlay: () -> Unit,
    onShare: () -> Unit,
    onDelete: () -> Unit,
) {
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
            MediaThumbnail(
                model = download.localPath?.let(::File),
                kind = download.kind,
            )

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = download.title,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    MetaChip(text = Formatters.bytes(download.totalBytes))
                    download.qualityLabel?.let { MetaChip(text = it) }
                    Formatters.duration(download.durationMs)?.let { MetaChip(text = it) }
                }
            }

            IconButton(onClick = onPlay) {
                Icon(
                    Icons.Rounded.PlayArrow,
                    contentDescription = stringResource(R.string.downloads_play),
                )
            }
            IconButton(onClick = onShare) {
                Icon(
                    Icons.Rounded.Share,
                    contentDescription = stringResource(R.string.downloads_share),
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Rounded.Delete,
                    contentDescription = stringResource(R.string.downloads_delete),
                )
            }
        }
    }
}

private fun shareDownload(
    context: android.content.Context,
    container: AppContainer,
    download: DownloadEntity,
) {
    val path = download.localPath ?: return
    val file = File(path)
    if (!file.exists()) return

    val uri = container.fileStore.shareUri(file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = download.mimeType ?: "video/*"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, download.title))
}
