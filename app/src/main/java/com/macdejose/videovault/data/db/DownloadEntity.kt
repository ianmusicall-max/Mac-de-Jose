package com.macdejose.videovault.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

enum class MediaKind { VIDEO, IMAGE, AUDIO }

enum class DownloadStatus {
    QUEUED,
    RUNNING,
    PAUSED,
    COMPLETED,
    FAILED;

    val isTerminal: Boolean get() = this == COMPLETED || this == FAILED
    val isActive: Boolean get() = this == QUEUED || this == RUNNING
}

@Entity(
    tableName = "downloads",
    indices = [Index("status"), Index("createdAt")],
)
data class DownloadEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val mediaUrl: String,
    val pageUrl: String?,
    val kind: MediaKind,
    val mimeType: String?,
    val qualityLabel: String?,
    val isHls: Boolean = false,
    val status: DownloadStatus = DownloadStatus.QUEUED,
    val totalBytes: Long = -1,
    val downloadedBytes: Long = 0,
    /** Absolute path of the file we stream into while the download runs. */
    val localPath: String? = null,
    /** MediaStore uri the finished file was published under, when publishing is on. */
    val publishedUri: String? = null,
    val thumbnailPath: String? = null,
    val durationMs: Long = -1,
    val referer: String? = null,
    val userAgent: String? = null,
    val error: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
) {
    val progress: Float
        get() = when {
            totalBytes > 0 -> (downloadedBytes.toFloat() / totalBytes).coerceIn(0f, 1f)
            else -> -1f
        }
}

@Entity(tableName = "link_history")
data class LinkHistoryEntity(
    @PrimaryKey val url: String,
    val title: String?,
    val host: String,
    val mediaCount: Int,
    val lastUsedAt: Long = System.currentTimeMillis(),
)
