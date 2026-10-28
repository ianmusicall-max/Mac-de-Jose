package com.macdejose.videovault.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface DownloadDao {

    @Insert
    suspend fun insert(download: DownloadEntity): Long

    @Update
    suspend fun update(download: DownloadEntity)

    @Query("SELECT * FROM downloads ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE status IN ('QUEUED', 'RUNNING', 'PAUSED') ORDER BY createdAt ASC")
    fun observeUnfinished(): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE status = 'COMPLETED' ORDER BY createdAt DESC")
    fun observeCompleted(): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE id = :id")
    suspend fun find(id: Long): DownloadEntity?

    @Query("SELECT * FROM downloads WHERE status = 'QUEUED' ORDER BY createdAt ASC LIMIT :limit")
    suspend fun nextQueued(limit: Int): List<DownloadEntity>

    @Query("SELECT COUNT(*) FROM downloads WHERE status = 'RUNNING'")
    suspend fun runningCount(): Int

    @Query("SELECT * FROM downloads WHERE mediaUrl = :mediaUrl AND status != 'FAILED' LIMIT 1")
    suspend fun findByUrl(mediaUrl: String): DownloadEntity?

    @Query("UPDATE downloads SET downloadedBytes = :downloaded, totalBytes = :total, updatedAt = :now WHERE id = :id")
    suspend fun updateProgress(id: Long, downloaded: Long, total: Long, now: Long = System.currentTimeMillis())

    @Query("UPDATE downloads SET status = :status, error = :error, updatedAt = :now WHERE id = :id")
    suspend fun updateStatus(
        id: Long,
        status: DownloadStatus,
        error: String? = null,
        now: Long = System.currentTimeMillis(),
    )

    /** Downloads left mid-flight by a process death are resumable, not running. */
    @Query("UPDATE downloads SET status = 'PAUSED', updatedAt = :now WHERE status IN ('RUNNING', 'QUEUED')")
    suspend fun parkUnfinished(now: Long = System.currentTimeMillis())

    @Query("DELETE FROM downloads WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM downloads WHERE status = 'COMPLETED'")
    suspend fun deleteCompleted()
}

@Dao
interface LinkHistoryDao {

    @Upsert
    suspend fun upsert(entry: LinkHistoryEntity)

    @Query("SELECT * FROM link_history ORDER BY lastUsedAt DESC LIMIT :limit")
    fun observeRecent(limit: Int = 30): Flow<List<LinkHistoryEntity>>

    @Query("DELETE FROM link_history WHERE url = :url")
    suspend fun delete(url: String)

    @Query("DELETE FROM link_history")
    suspend fun clear()
}
