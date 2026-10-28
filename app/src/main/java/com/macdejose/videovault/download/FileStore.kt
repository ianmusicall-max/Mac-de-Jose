package com.macdejose.videovault.download

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.macdejose.videovault.data.db.MediaKind
import java.io.File
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Owns where files live. Downloads stream into app-private storage (no permission
 * needed, survives interruptions) and are copied into the shared gallery
 * collections afterwards when the user wants them visible to other apps.
 */
class FileStore(private val context: Context) {

    val downloadDir: File
        get() = File(context.getExternalFilesDir(null) ?: context.filesDir, "downloads")
            .apply { mkdirs() }

    val thumbnailDir: File
        get() = File(context.cacheDir, "thumbnails").apply { mkdirs() }

    fun workFile(title: String, extension: String): File {
        val base = sanitize(title).ifEmpty { "video" }
        var candidate = File(downloadDir, "$base.$extension")
        var counter = 1
        while (candidate.exists()) {
            candidate = File(downloadDir, "$base-$counter.$extension")
            counter++
        }
        return candidate
    }

    fun shareUri(file: File): Uri =
        FileProvider.getUriForFile(context, "${context.packageName}.files", file)

    /**
     * Copies a finished download into the public gallery so other apps can see it.
     * Returns the new content uri, or null when publishing was not possible.
     */
    suspend fun publishToGallery(
        file: File,
        kind: MediaKind,
        mimeType: String?,
    ): Uri? = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val collection = when (kind) {
            MediaKind.VIDEO -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            } else {
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            }

            MediaKind.IMAGE -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            } else {
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            }

            MediaKind.AUDIO -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            } else {
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            }
        }

        val relativePath = when (kind) {
            MediaKind.VIDEO -> "${Environment.DIRECTORY_MOVIES}/$ALBUM"
            MediaKind.IMAGE -> "${Environment.DIRECTORY_PICTURES}/$ALBUM"
            MediaKind.AUDIO -> "${Environment.DIRECTORY_MUSIC}/$ALBUM"
        }

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
            mimeType?.let { put(MediaStore.MediaColumns.MIME_TYPE, it) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }

        runCatching {
            val uri = resolver.insert(collection, values) ?: return@runCatching null
            resolver.openOutputStream(uri)?.use { output ->
                file.inputStream().use { input -> input.copyTo(output, DEFAULT_BUFFER_SIZE) }
            } ?: return@runCatching null

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                resolver.update(
                    uri,
                    ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) },
                    null,
                    null,
                )
            }
            uri
        }.getOrNull()
    }

    suspend fun deletePublished(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        runCatching { context.contentResolver.delete(uri, null, null) > 0 }.getOrDefault(false)
    }

    fun mimeTypeFor(kind: MediaKind, extension: String): String = when (extension.lowercase(Locale.ROOT)) {
        "mp4", "m4v" -> "video/mp4"
        "webm" -> "video/webm"
        "mov" -> "video/quicktime"
        "mkv" -> "video/x-matroska"
        "ts" -> "video/mp2t"
        "mp3" -> "audio/mpeg"
        "m4a" -> "audio/mp4"
        "jpg", "jpeg" -> "image/jpeg"
        "png" -> "image/png"
        "webp" -> "image/webp"
        "gif" -> "image/gif"
        else -> when (kind) {
            MediaKind.VIDEO -> "video/mp4"
            MediaKind.AUDIO -> "audio/mpeg"
            MediaKind.IMAGE -> "image/jpeg"
        }
    }

    private fun sanitize(raw: String): String = raw
        .replace(Regex("""[\\/:*?"<>|\n\r\t]"""), " ")
        .replace(Regex("\\s+"), " ")
        .trim()
        .take(MAX_NAME_LENGTH)

    private companion object {
        const val ALBUM = "VideoVault"
        const val MAX_NAME_LENGTH = 60
    }
}
