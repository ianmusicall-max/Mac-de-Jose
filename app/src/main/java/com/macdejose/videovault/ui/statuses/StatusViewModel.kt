package com.macdejose.videovault.ui.statuses

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macdejose.videovault.data.prefs.SettingsRepository
import com.macdejose.videovault.statuses.StatusItem
import com.macdejose.videovault.statuses.StatusRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class StatusUiState(
    val folderUri: String? = null,
    val items: List<StatusItem> = emptyList(),
    val isLoading: Boolean = false,
    val savedCount: Int = 0,
)

class StatusViewModel(
    private val repository: StatusRepository,
    private val settingsRepository: SettingsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(StatusUiState())
    val state: StateFlow<StatusUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val stored = settingsRepository.settings.first().statusFolderUri
            _state.update { it.copy(folderUri = stored) }
            refresh()
        }
    }

    fun onFolderPicked(uri: Uri) {
        viewModelScope.launch {
            repository.persistFolderAccess(uri)
            settingsRepository.setStatusFolderUri(uri.toString())
            _state.update { it.copy(folderUri = uri.toString()) }
            refresh()
        }
    }

    fun refresh() {
        val folder = _state.value.folderUri ?: return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val items = repository.list(Uri.parse(folder))
            _state.update { it.copy(items = items, isLoading = false) }
        }
    }

    fun save(item: StatusItem) {
        viewModelScope.launch {
            repository.save(item)
            _state.update { it.copy(savedCount = it.savedCount + 1) }
        }
    }

    fun consumeSaved() = _state.update { it.copy(savedCount = 0) }
}
