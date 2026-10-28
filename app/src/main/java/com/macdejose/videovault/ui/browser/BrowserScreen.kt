package com.macdejose.videovault.ui.browser

import android.annotation.SuppressLint
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.DesktopWindows
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.macdejose.videovault.AppContainer
import com.macdejose.videovault.R
import com.macdejose.videovault.data.db.MediaKind
import com.macdejose.videovault.download.DownloadService
import com.macdejose.videovault.resolver.Http
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.UrlUtils
import com.macdejose.videovault.ui.appViewModel
import com.macdejose.videovault.ui.components.MediaThumbnail
import com.macdejose.videovault.ui.components.MetaChip
import com.macdejose.videovault.util.Formatters

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun BrowserScreen(
    container: AppContainer,
    snackbarHostState: SnackbarHostState,
    onOpenDownloads: () -> Unit,
) {
    val viewModel = appViewModel { BrowserViewModel(container.mediaRepository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val keyboard = LocalSoftwareKeyboardController.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)

    val webView = remember {
        WebView(context).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                builtInZoomControls = true
                displayZoomControls = false
                mediaPlaybackRequiresUserGesture = true
                userAgentString = Http.MOBILE_UA
            }

            addJavascriptInterface(
                SnifferBridge(
                    pageUrlProvider = { url ?: viewModel.state.value.currentUrl },
                    onFound = viewModel::onMediaFound,
                ),
                SnifferBridge.NAME,
            )

            // Without this, a site that sets its session cookie through an
            // embedded frame loses it on every navigation.
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    viewModel.onProgress(newProgress)
                }
            }

            webViewClient = object : WebViewClient() {
                /**
                 * Links with a custom scheme (intent://, market://, whatsapp://)
                 * cannot be rendered; letting the WebView try shows an error page.
                 */
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): Boolean {
                    val scheme = request?.url?.scheme?.lowercase()
                    return scheme != null && scheme != "http" && scheme != "https"
                }

                override fun onPageStarted(
                    view: WebView?,
                    url: String?,
                    favicon: android.graphics.Bitmap?,
                ) {
                    url?.let(viewModel::onPageStarted)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    viewModel.onPageFinished(
                        url = url.orEmpty(),
                        title = view?.title,
                        canGoBack = view?.canGoBack() == true,
                        canGoForward = view?.canGoForward() == true,
                    )
                    view?.evaluateJavascript(SnifferBridge.SCRIPT, null)
                }

                /**
                 * Media requests the page makes are the most reliable signal there is:
                 * a player that hides its source still has to fetch it.
                 */
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): android.webkit.WebResourceResponse? {
                    val requestUrl = request?.url?.toString()
                    if (requestUrl != null && request.method.equals("GET", ignoreCase = true)) {
                        UrlUtils.kindFor(requestUrl)?.let { kind ->
                            if (kind != MediaKind.IMAGE) {
                                viewModel.onMediaFound(
                                    MediaCandidate(
                                        url = requestUrl,
                                        kind = kind,
                                        title = view?.title?.takeIf(String::isNotBlank)
                                            ?: UrlUtils.hostOf(requestUrl),
                                        isHls = UrlUtils.isHlsPlaylist(requestUrl),
                                    ),
                                )
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request)
                }
            }

            loadUrl(BrowserUiState.HOME_PAGE)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.navigationRequest = { url -> webView.loadUrl(url) }
    }

    LaunchedEffect(state.desktopMode) {
        val wanted = if (state.desktopMode) Http.DESKTOP_UA else Http.MOBILE_UA
        if (webView.settings.userAgentString != wanted) {
            webView.settings.userAgentString = wanted
            webView.reload()
        }
    }

    LaunchedEffect(state.message) {
        val message = state.message ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(
            if (message == BrowserViewModel.MESSAGE_NOTHING_FOUND) {
                context.getString(R.string.home_no_media)
            } else {
                context.getString(R.string.error_generic, message)
            },
        )
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

    BackHandler(enabled = state.canGoBack) {
        webView.goBack()
        viewModel.onNavigationStateChange(webView.canGoBack(), webView.canGoForward())
    }

    Scaffold(
        topBar = {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = state.addressBarText,
                        onValueChange = viewModel::onAddressBarChange,
                        modifier = Modifier.weight(1f),
                        placeholder = { Text(stringResource(R.string.browser_hint)) },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Go,
                        ),
                        keyboardActions = KeyboardActions(
                            onGo = {
                                keyboard?.hide()
                                viewModel.go()
                            },
                        ),
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    IconButton(
                        onClick = { webView.goBack() },
                        enabled = state.canGoBack,
                    ) {
                        Icon(
                            Icons.Rounded.ArrowBack,
                            contentDescription = stringResource(R.string.browser_back),
                        )
                    }
                    IconButton(
                        onClick = { webView.goForward() },
                        enabled = state.canGoForward,
                    ) {
                        Icon(
                            Icons.Rounded.ArrowForward,
                            contentDescription = stringResource(R.string.browser_forward),
                        )
                    }
                    IconButton(onClick = { webView.reload() }) {
                        Icon(
                            Icons.Rounded.Refresh,
                            contentDescription = stringResource(R.string.browser_reload),
                        )
                    }
                    IconButton(onClick = viewModel::toggleDesktopMode) {
                        Icon(
                            Icons.Rounded.DesktopWindows,
                            contentDescription = stringResource(R.string.browser_desktop_site),
                            tint = if (state.desktopMode) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                    }
                    TextButton(onClick = viewModel::deepScanCurrentPage) {
                        Text(stringResource(R.string.browser_deep_scan))
                    }
                }

                if (state.isLoading) {
                    LinearProgressIndicator(
                        progress = { state.progress / 100f },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        },
        floatingActionButton = {
            if (state.found.isNotEmpty()) {
                BadgedBox(badge = { Badge { Text(state.found.size.toString()) } }) {
                    ExtendedFloatingActionButton(
                        onClick = viewModel::showSheet,
                        icon = { Icon(Icons.Rounded.Download, contentDescription = null) },
                        text = {
                            Text(
                                if (state.found.size == 1) {
                                    stringResource(R.string.browser_found_one)
                                } else {
                                    stringResource(R.string.browser_found_many, state.found.size)
                                },
                            )
                        },
                    )
                }
            }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            AndroidView(
                factory = { webView },
                modifier = Modifier.fillMaxSize(),
                onRelease = { it.stopLoading() },
            )
        }

        if (state.sheetVisible) {
            ModalBottomSheet(
                onDismissRequest = viewModel::hideSheet,
                sheetState = sheetState,
            ) {
                FoundMediaSheet(
                    found = state.found,
                    onDownload = viewModel::download,
                    onDownloadAll = viewModel::downloadAllFound,
                )
            }
        }
    }
}

@Composable
private fun FoundMediaSheet(
    found: List<MediaCandidate>,
    onDownload: (MediaCandidate) -> Unit,
    onDownloadAll: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = stringResource(R.string.results_title),
                style = MaterialTheme.typography.titleMedium,
            )
            TextButton(onClick = onDownloadAll) {
                Text(stringResource(R.string.results_download_all))
            }
        }

        found.forEach { candidate ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                MediaThumbnail(
                    model = candidate.thumbnailUrl,
                    kind = candidate.kind,
                    modifier = Modifier.size(48.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = candidate.title,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        MetaChip(text = candidate.displayQuality)
                        if (candidate.sizeBytes > 0) {
                            MetaChip(text = Formatters.bytes(candidate.sizeBytes))
                        }
                    }
                }
                IconButton(onClick = { onDownload(candidate) }) {
                    Icon(Icons.Rounded.Download, contentDescription = null)
                }
            }
        }
    }
}
