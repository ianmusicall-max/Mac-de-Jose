package com.macdejose.videovault.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = Teal40,
    onPrimary = Neutral99,
    primaryContainer = Teal90,
    onPrimaryContainer = Teal40,
    secondary = Indigo30,
    onSecondary = Neutral99,
    secondaryContainer = Indigo90,
    onSecondaryContainer = Indigo20,
    tertiary = Amber60,
    error = Rose40,
    background = Neutral99,
    surface = Neutral99,
    surfaceVariant = Neutral95,
)

private val DarkColors = darkColorScheme(
    primary = Teal80,
    onPrimary = Indigo20,
    primaryContainer = Teal40,
    onPrimaryContainer = Teal90,
    secondary = Indigo80,
    onSecondary = Indigo20,
    secondaryContainer = Indigo30,
    onSecondaryContainer = Indigo90,
    tertiary = Amber80,
    error = Rose80,
    background = Neutral10,
    surface = Neutral10,
    surfaceVariant = Neutral20,
)

@Composable
fun VideoVaultTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)

        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = VideoVaultTypography,
        content = content,
    )
}
