package com.macdejose.videovault.ui.browser

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macdejose.videovault.data.repo.MediaRepository
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.ResolveResult
import com.macdejose.videovault.resolver.UrlUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BrowserUiState(
    val addressBarText: String = "",
    val currentUrl: String = HOME_PAGE,
    val pageTitle: String = "",
    val isLoading: Boolean = false,
    val progress: Int = 0,
    val canGoBack: Boolean = false,
    val canGoForward: Boolean = false,
    val desktopMode: Boolean = false,
    val found: List<MediaCandidate> = emptyList(),
    val sheetVisible: Boolean = false,
    val queuedCount: Int = 0,
    val message: String? = null,
) {
    companion object {
        const val HOME_PAGE = "https://duckduckgo.com/"
    }
}

/**
 * State for the in-app browser. Media turns up two ways: the [SnifferBridge] reports
 * what the page declares in its DOM, and the WebView client reports media-looking
 * network requests. Both funnel into [onMediaFound], which dedupes by url.
 */
class BrowserViewModel(
    private val repository: MediaRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(BrowserUiState())
    val state: StateFlow<BrowserUiState> = _state.asStateFlow()

    /** Set by the screen so the view model can drive navigation from the address bar. */
    var navigationRequest: ((String) -> Unit)? = null

    fun onAddressBarChange(value: String) {
        _state.update { it.copy(addressBarText = value) }
    }

    fun go(input: String = _state.value.addressBarText) {
        if (input.isBlank()) return
        navigationRequest?.invoke(UrlUtils.toNavigationUrl(input))
    }

    fun onPageStarted(url: String) {
        _state.update {
            // Media found on the previous page is no longer relevant.
            if (UrlUtils.canonicalize(url) == UrlUtils.canonicalize(it.currentUrl)) {
                it.copy(currentUrl = url, addressBarText = url, isLoading = true)
            } else {
                it.copy(
                    currentUrl = url,
                    addressBarText = url,
                    isLoading = true,
                    found = emptyList(),
                    sheetVisible = false,
                )
            }
        }
    }

    fun onPageFinished(url: String, title: String?, canGoBack: Boolean, canGoForward: Boolean) {
        _state.update {
            it.copy(
                currentUrl = url,
                addressBarText = url,
                pageTitle = title.orEmpty(),
                isLoading = false,
                progress = 100,
                canGoBack = canGoBack,
                canGoForward = canGoForward,
            )
        }
    }

    fun onProgress(value: Int) {
        _state.update { it.copy(progress = value, isLoading = value < 100) }
    }

    fun onNavigationStateChange(canGoBack: Boolean, canGoForward: Boolean) {
        _state.update { it.copy(canGoBack = canGoBack, canGoForward = canGoForward) }
    }

    fun toggleDesktopMode() {
        _state.update { it.copy(desktopMode = !it.desktopMode) }
    }

    fun onMediaFound(candidate: MediaCandidate) {
        if (candidate.url.startsWith("blob:") || candidate.url.startsWith("data:")) return
        _state.update { current ->
            if (current.found.any { it.url == candidate.url }) return@update current
            current.copy(
                found = (current.found + candidate.copy(pageUrl = current.currentUrl))
                    .sortedWith(compareBy({ it.kind.ordinal }, { -it.rank })),
            )
        }
    }

    fun showSheet() = _state.update { it.copy(sheetVisible = true) }

    fun hideSheet() = _state.update { it.copy(sheetVisible = false) }

    fun download(candidate: MediaCandidate) {
        viewModelScope.launch {
            repository.enqueue(
                candidate.copy(referer = candidate.referer ?: _state.value.currentUrl),
            )
            _state.update { it.copy(queuedCount = it.queuedCount + 1, sheetVisible = false) }
        }
    }

    fun downloadAllFound() {
        val found = _state.value.found
        if (found.isEmpty()) return
        viewModelScope.launch {
            repository.enqueueAll(found)
            _state.update {
                it.copy(queuedCount = it.queuedCount + found.size, sheetVisible = false)
            }
        }
    }

    /**
     * Fallback for pages whose player hides the real file: re-read the page
     * server-side with the generic resolvers.
     */
    fun deepScanCurrentPage() {
        val url = _state.value.currentUrl
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val result = repository.resolve(url)) {
                is ResolveResult.Found -> {
                    result.candidates.forEach(::onMediaFound)
                    _state.update { it.copy(isLoading = false, sheetVisible = true) }
                }

                ResolveResult.Empty -> _state.update {
                    it.copy(isLoading = false, message = MESSAGE_NOTHING_FOUND)
                }

                is ResolveResult.Failure -> _state.update {
                    it.copy(isLoading = false, message = result.reason)
                }
            }
        }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }

    fun consumeQueued() = _state.update { it.copy(queuedCount = 0) }

    companion object {
        const val MESSAGE_NOTHING_FOUND = "nothing_found"
    }
}
