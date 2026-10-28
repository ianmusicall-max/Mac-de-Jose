package com.macdejose.videovault.statuses

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.macdejose.videovault.data.db.MediaKind
import com.macdejose.videovault.download.FileStore
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class StatusItem(
    val uri: Uri,
    val name: String,
    val kind: MediaKind,
    val sizeBytes: Long,
    val lastModified: Long,
)

/**
 * Lists the short-lived status files a messaging app has cached on the device and
 * copies the ones the user picks into their gallery.
 *
 * Android 11 removed direct access to other apps' folders, so the user grants a
 * folder once through the system picker and we read it through [DocumentFile].
 */
class StatusRepository(
    private val context: Context,
    private val fileStore: FileStore,
) {

    suspend fun persistFolderAccess(treeUri: Uri) = withContext(Dispatchers.IO) {
        runCatching {
            context.contentResolver.takePersistableUriPermission(
                treeUri,
                android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        }
    }

    suspend fun list(treeUri: Uri?): List<StatusItem> = withContext(Dispatchers.IO) {
        val root = treeUri?.let { DocumentFile.fromTreeUri(context, it) }
            ?: return@withContext emptyList()

        root.listFiles()
            .asSequence()
            .filter { it.isFile }
            .mapNotNull { file ->
                val name = file.name ?: return@mapNotNull null
                val kind = kindOf(name, file.type) ?: return@mapNotNull null
                StatusItem(
                    uri = file.uri,
                    name = name,
                    kind = kind,
                    sizeBytes = file.length(),
                    lastModified = file.lastModified(),
                )
            }
            .sortedByDescending(StatusItem::lastModified)
            .toList()
    }

    /** Copies one status into the shared gallery; returns the new uri when it lands. */
    suspend fun save(item: StatusItem): Uri? = withContext(Dispatchers.IO) {
        val extension = item.name.substringAfterLast('.', "")
            .ifEmpty { if (item.kind == MediaKind.VIDEO) "mp4" else "jpg" }
        val staging = File(fileStore.downloadDir, "status-${item.lastModified}.$extension")

        runCatching {
            context.contentResolver.openInputStream(item.uri)?.use { input ->
                staging.outputStream().use { output -> input.copyTo(output) }
            } ?: return@runCatching null

            fileStore.publishToGallery(
                file = staging,
                kind = item.kind,
                mimeType = fileStore.mimeTypeFor(item.kind, extension),
            )
        }.getOrNull()
    }

    private fun kindOf(name: String, mimeType: String?): MediaKind? {
        // Status folders are full of ".nomedia" markers and stray db files.
        if (name.startsWith(".")) return null
        mimeType?.let { mime ->
            when {
                mime.startsWith("video/") -> return MediaKind.VIDEO
                mime.startsWith("image/") -> return MediaKind.IMAGE
            }
        }
        return when (name.substringAfterLast('.', "").lowercase()) {
            "mp4", "mkv", "3gp", "webm", "mov" -> MediaKind.VIDEO
            "jpg", "jpeg", "png", "webp" -> MediaKind.IMAGE
            else -> null
        }
    }
}
