package com.macdejose.videovault.ui.downloads

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macdejose.videovault.data.db.DownloadEntity
import com.macdejose.videovault.data.db.DownloadStatus
import com.macdejose.videovault.data.repo.MediaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DownloadsUiState(
    val active: List<DownloadEntity> = emptyList(),
    val finished: List<DownloadEntity> = emptyList(),
) {
    val isEmpty: Boolean get() = active.isEmpty() && finished.isEmpty()
}

class DownloadsViewModel(
    private val repository: MediaRepository,
) : ViewModel() {

    val state: StateFlow<DownloadsUiState> = repository.downloads
        .map { all ->
            DownloadsUiState(
                active = all.filter { it.status != DownloadStatus.COMPLETED },
                finished = all.filter { it.status == DownloadStatus.COMPLETED },
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DownloadsUiState())

    private val _playing = MutableStateFlow<DownloadEntity?>(null)
    val playing: StateFlow<DownloadEntity?> = _playing.asStateFlow()

    fun pause(id: Long) {
        viewModelScope.launch { repository.pause(id) }
    }

    fun resume(id: Long) {
        viewModelScope.launch { repository.resume(id) }
    }

    fun retry(id: Long) {
        viewModelScope.launch { repository.retry(id) }
    }

    fun remove(id: Long, deleteFile: Boolean) {
        viewModelScope.launch { repository.remove(id, deleteFile) }
    }

    fun clearFinished() {
        viewModelScope.launch { repository.clearFinished() }
    }

    fun play(download: DownloadEntity) {
        _playing.value = download
    }

    fun stopPlayback() {
        _playing.value = null
    }
}
