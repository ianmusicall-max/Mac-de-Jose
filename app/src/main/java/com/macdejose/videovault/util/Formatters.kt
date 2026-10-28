package com.macdejose.videovault.util

import java.util.Locale
import java.util.concurrent.TimeUnit

object Formatters {

    fun bytes(count: Long): String {
        if (count < 0) return "—"
        if (count < 1024) return "$count B"
        val units = listOf("KB", "MB", "GB", "TB")
        var value = count.toDouble() / 1024
        var unitIndex = 0
        while (value >= 1024 && unitIndex < units.lastIndex) {
            value /= 1024
            unitIndex++
        }
        return String.format(Locale.getDefault(), "%.1f %s", value, units[unitIndex])
    }

    fun duration(millis: Long): String? {
        if (millis <= 0) return null
        val hours = TimeUnit.MILLISECONDS.toHours(millis)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(millis) % 60
        val seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
        return if (hours > 0) {
            String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format(Locale.getDefault(), "%d:%02d", minutes, seconds)
        }
    }

    fun percent(fraction: Float): String =
        if (fraction < 0) "" else "${(fraction * 100).toInt()}%"

    fun progressLine(downloaded: Long, total: Long): String = when {
        total > 0 -> "${bytes(downloaded)} / ${bytes(total)}"
        downloaded > 0 -> bytes(downloaded)
        else -> "—"
    }
}
