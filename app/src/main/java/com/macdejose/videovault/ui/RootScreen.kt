package com.macdejose.videovault.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Timelapse
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.macdejose.videovault.AppContainer
import com.macdejose.videovault.R
import com.macdejose.videovault.ui.browser.BrowserScreen
import com.macdejose.videovault.ui.downloads.DownloadsScreen
import com.macdejose.videovault.ui.home.HomeScreen
import com.macdejose.videovault.ui.settings.SettingsScreen
import com.macdejose.videovault.ui.statuses.StatusScreen
import kotlinx.coroutines.flow.StateFlow

private enum class Destination(
    val route: String,
    val labelRes: Int,
    val icon: ImageVector,
) {
    HOME("home", R.string.tab_home, Icons.Rounded.Link),
    BROWSER("browser", R.string.tab_browser, Icons.Rounded.Public),
    DOWNLOADS("downloads", R.string.tab_downloads, Icons.Rounded.Download),
    STATUSES("statuses", R.string.tab_statuses, Icons.Rounded.Timelapse),
    SETTINGS("settings", R.string.tab_settings, Icons.Rounded.Settings),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RootScreen(
    container: AppContainer,
    incomingLink: StateFlow<String?>,
    openDownloadsOnStart: StateFlow<Boolean>,
    onLinkConsumed: () -> Unit,
    onDownloadsOpened: () -> Unit,
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination
    val activeDownloads by container.downloadDao.observeUnfinished()
        .collectAsStateWithLifecycle(initialValue = emptyList())
    val sharedLink by incomingLink.collectAsStateWithLifecycle()
    val jumpToDownloads by openDownloadsOnStart.collectAsStateWithLifecycle()

    // A link arriving from the share sheet always lands on the Link tab.
    LaunchedEffect(sharedLink) {
        if (sharedLink != null) navController.navigateSingleTop(Destination.HOME.route)
    }

    LaunchedEffect(jumpToDownloads) {
        if (jumpToDownloads) {
            navController.navigateSingleTop(Destination.DOWNLOADS.route)
            onDownloadsOpened()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            NavigationBar {
                Destination.entries.forEach { destination ->
                    val selected = currentRoute?.hierarchy?.any { it.route == destination.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = { navController.navigateSingleTop(destination.route) },
                        label = { Text(stringResource(destination.labelRes)) },
                        icon = {
                            val pending = activeDownloads.count { it.status.isActive }
                            if (destination == Destination.DOWNLOADS && pending > 0) {
                                BadgedBox(badge = { Badge { Text(pending.toString()) } }) {
                                    Icon(destination.icon, contentDescription = null)
                                }
                            } else {
                                Icon(destination.icon, contentDescription = null)
                            }
                        },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Destination.HOME.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Destination.HOME.route) {
                HomeScreen(
                    container = container,
                    incomingLink = sharedLink,
                    onLinkConsumed = onLinkConsumed,
                    snackbarHostState = snackbarHostState,
                    onOpenDownloads = { navController.navigateSingleTop(Destination.DOWNLOADS.route) },
                )
            }
            composable(Destination.BROWSER.route) {
                BrowserScreen(
                    container = container,
                    snackbarHostState = snackbarHostState,
                    onOpenDownloads = { navController.navigateSingleTop(Destination.DOWNLOADS.route) },
                )
            }
            composable(Destination.DOWNLOADS.route) {
                DownloadsScreen(container = container, snackbarHostState = snackbarHostState)
            }
            composable(Destination.STATUSES.route) {
                StatusScreen(container = container, snackbarHostState = snackbarHostState)
            }
            composable(Destination.SETTINGS.route) {
                SettingsScreen(container = container, snackbarHostState = snackbarHostState)
            }
        }
    }
}

private fun androidx.navigation.NavHostController.navigateSingleTop(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
