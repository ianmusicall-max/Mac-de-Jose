package com.macdejose.videovault.data.db

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun kindToString(kind: MediaKind): String = kind.name

    @TypeConverter
    fun stringToKind(value: String): MediaKind =
        runCatching { MediaKind.valueOf(value) }.getOrDefault(MediaKind.VIDEO)

    @TypeConverter
    fun statusToString(status: DownloadStatus): String = status.name

    @TypeConverter
    fun stringToStatus(value: String): DownloadStatus =
        runCatching { DownloadStatus.valueOf(value) }.getOrDefault(DownloadStatus.FAILED)
}
