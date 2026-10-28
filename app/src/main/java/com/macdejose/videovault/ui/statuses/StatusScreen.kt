package com.macdejose.videovault.ui.statuses

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Timelapse
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.macdejose.videovault.statuses.StatusItem
import com.macdejose.videovault.ui.appViewModel
import com.macdejose.videovault.ui.components.EmptyState
import com.macdejose.videovault.ui.components.MediaThumbnail

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusScreen(
    container: AppContainer,
    snackbarHostState: SnackbarHostState,
) {
    val viewModel = appViewModel {
        StatusViewModel(container.statusRepository, container.settingsRepository)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val folderPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree(),
    ) { uri -> uri?.let(viewModel::onFolderPicked) }

    LaunchedEffect(state.savedCount) {
        if (state.savedCount == 0) return@LaunchedEffect
        snackbarHostState.showSnackbar(context.getString(R.string.statuses_saved))
        viewModel.consumeSaved()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.statuses_title)) },
                actions = {
                    IconButton(onClick = viewModel::refresh) {
                        Icon(Icons.Rounded.Refresh, contentDescription = null)
                    }
                    IconButton(onClick = { folderPicker.launch(null) }) {
                        Icon(Icons.Rounded.FolderOpen, contentDescription = null)
                    }
                },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.folderUri == null -> EmptyState(
                    icon = Icons.Rounded.FolderOpen,
                    title = stringResource(R.string.statuses_pick_folder),
                    message = stringResource(R.string.statuses_explain),
                    modifier = Modifier.align(Alignment.Center),
                    action = {
                        Button(onClick = { folderPicker.launch(null) }) {
                            Text(stringResource(R.string.statuses_pick_folder))
                        }
                    },
                )

                state.items.isEmpty() && !state.isLoading -> EmptyState(
                    icon = Icons.Rounded.Timelapse,
                    title = stringResource(R.string.statuses_empty),
                    modifier = Modifier.align(Alignment.Center),
                )

                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 120.dp),
                    contentPadding = PaddingValues(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.items, key = { it.uri.toString() }) { item ->
                        StatusTile(item = item, onSave = { viewModel.save(item) })
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusTile(item: StatusItem, onSave: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
            MediaThumbnail(
                model = item.uri,
                kind = item.kind,
                modifier = Modifier.fillMaxSize(),
            )
            FilledIconButton(
                onClick = onSave,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(6.dp),
            ) {
                Icon(
                    Icons.Rounded.Download,
                    contentDescription = stringResource(R.string.statuses_save),
                )
            }
        }
        Text(
            text = item.name,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
