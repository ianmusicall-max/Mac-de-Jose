package com.macdejose.videovault.download

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.getSystemService
import com.macdejose.videovault.MainActivity
import com.macdejose.videovault.R
import com.macdejose.videovault.data.db.DownloadEntity

/** Builds the foreground-service notification and the one-off "finished" notices. */
class DownloadNotifier(private val context: Context) {

    private val manager = context.getSystemService<NotificationManager>()

    fun ensureChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val progress = NotificationChannel(
            CHANNEL_PROGRESS,
            context.getString(R.string.notif_channel_progress),
            NotificationManager.IMPORTANCE_LOW,
        ).apply { setShowBadge(false) }

        val done = NotificationChannel(
            CHANNEL_DONE,
            context.getString(R.string.notif_channel_done),
            NotificationManager.IMPORTANCE_DEFAULT,
        )

        manager?.createNotificationChannels(listOf(progress, done))
    }

    fun buildProgress(active: List<DownloadEntity>): Notification {
        val title = when {
            active.isEmpty() -> context.getString(R.string.notif_done)
            active.size == 1 -> context.getString(R.string.notif_downloading, active.first().title)
            else -> context.getString(R.string.notif_downloading_many, active.size)
        }

        val totals = active.sumOf { it.totalBytes.coerceAtLeast(0) }
        val done = active.sumOf { it.downloadedBytes }
        val indeterminate = totals <= 0

        return NotificationCompat.Builder(context, CHANNEL_PROGRESS)
            .setContentTitle(title)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(openAppIntent())
            .setProgress(
                if (indeterminate) 0 else 100,
                if (indeterminate) 0 else ((done * 100) / totals).toInt(),
                indeterminate,
            )
            .build()
    }

    fun notifyFinished(id: Long, title: String) {
        post(
            id = (FINISHED_ID_BASE + id).toInt(),
            notification = NotificationCompat.Builder(context, CHANNEL_DONE)
                .setContentTitle(context.getString(R.string.notif_done))
                .setContentText(title)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent())
                .build(),
        )
    }

    fun notifyFailed(id: Long, title: String, reason: String) {
        post(
            id = (FAILED_ID_BASE + id).toInt(),
            notification = NotificationCompat.Builder(context, CHANNEL_DONE)
                .setContentTitle(context.getString(R.string.notif_failed))
                .setContentText("$title · $reason")
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent())
                .build(),
        )
    }

    private fun post(id: Int, notification: Notification) {
        // Missing POST_NOTIFICATIONS is not a reason to break a finished download.
        runCatching { manager?.notify(id, notification) }
    }

    private fun openAppIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
            putExtra(MainActivity.EXTRA_OPEN_DOWNLOADS, true)
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        const val CHANNEL_PROGRESS = "downloads_progress"
        const val CHANNEL_DONE = "downloads_done"
        const val FOREGROUND_ID = 1001
        private const val FINISHED_ID_BASE = 2000L
        private const val FAILED_ID_BASE = 4000L
    }
}
