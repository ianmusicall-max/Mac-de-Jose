package com.macdejose.videovault.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macdejose.videovault.data.db.LinkHistoryEntity
import com.macdejose.videovault.data.repo.MediaRepository
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.ResolveResult
import com.macdejose.videovault.resolver.UrlUtils
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val url: String = "",
    val isResolving: Boolean = false,
    val pageTitle: String? = null,
    val candidates: List<MediaCandidate> = emptyList(),
    val clipboardSuggestion: String? = null,
    val message: String? = null,
    val queuedCount: Int = 0,
) {
    val canDetect: Boolean get() = url.isNotBlank() && !isResolving
}

class HomeViewModel(
    private val repository: MediaRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    val recentLinks: StateFlow<List<LinkHistoryEntity>> = repository.recentLinks
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private var resolveJob: Job? = null

    fun onUrlChange(value: String) {
        _state.update { it.copy(url = value, message = null) }
    }

    fun clear() {
        resolveJob?.cancel()
        _state.update {
            it.copy(url = "", candidates = emptyList(), pageTitle = null, isResolving = false)
        }
    }

    /** Offers a link sitting in the clipboard, unless it is the one already typed. */
    fun offerClipboard(text: String?) {
        val link = UrlUtils.firstUrlIn(text) ?: text?.takeIf { UrlUtils.looksLikeUrl(it) }
        _state.update { current ->
            val worthOffering = link != null &&
                link != current.url &&
                current.candidates.none { it.pageUrl == link }
            current.copy(clipboardSuggestion = link.takeIf { worthOffering })
        }
    }

    fun dismissClipboard() {
        _state.update { it.copy(clipboardSuggestion = null) }
    }

    fun acceptClipboard() {
        val link = _state.value.clipboardSuggestion ?: return
        _state.update { it.copy(url = link, clipboardSuggestion = null) }
        detect()
    }

    fun submit(url: String) {
        _state.update { it.copy(url = url) }
        detect()
    }

    fun detect() {
        val raw = _state.value.url.trim()
        if (raw.isEmpty()) return
        if (!UrlUtils.looksLikeUrl(raw)) {
            _state.update { it.copy(message = MESSAGE_INVALID) }
            return
        }

        resolveJob?.cancel()
        resolveJob = viewModelScope.launch {
            _state.update {
                it.copy(isResolving = true, message = null, candidates = emptyList())
            }

            when (val result = repository.resolve(raw)) {
                is ResolveResult.Found -> _state.update {
                    it.copy(
                        isResolving = false,
                        pageTitle = result.pageTitle,
                        candidates = result.candidates,
                    )
                }

                ResolveResult.Empty -> _state.update {
                    it.copy(isResolving = false, message = MESSAGE_NOTHING_FOUND)
                }

                is ResolveResult.Failure -> _state.update {
                    it.copy(isResolving = false, message = result.reason)
                }
            }
        }
    }

    fun download(candidate: MediaCandidate) {
        viewModelScope.launch {
            repository.enqueue(candidate)
            _state.update { it.copy(queuedCount = it.queuedCount + 1) }
        }
    }

    fun downloadAll() {
        val candidates = _state.value.candidates
        if (candidates.isEmpty()) return
        viewModelScope.launch {
            repository.enqueueAll(candidates)
            _state.update { it.copy(queuedCount = it.queuedCount + candidates.size) }
        }
    }

    fun forget(url: String) {
        viewModelScope.launch { repository.forgetLink(url) }
    }

    fun consumeMessage() {
        _state.update { it.copy(message = null) }
    }

    fun consumeQueued() {
        _state.update { it.copy(queuedCount = 0) }
    }

    companion object {
        const val MESSAGE_INVALID = "invalid_url"
        const val MESSAGE_NOTHING_FOUND = "nothing_found"
    }
}
