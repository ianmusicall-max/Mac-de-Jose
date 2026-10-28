package com.macdejose.videovault

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import com.macdejose.videovault.resolver.UrlUtils

/**
 * Invisible entry point for the system share sheet. It extracts the link and hands
 * it to [MainActivity], which already knows how to resolve and queue one.
 */
class ShareReceiverActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val shared = intent?.getStringExtra(Intent.EXTRA_TEXT)
            ?: intent?.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
        val link = UrlUtils.firstUrlIn(shared)

        if (link == null) {
            Toast.makeText(this, R.string.home_invalid_url, Toast.LENGTH_SHORT).show()
        } else {
            startActivity(
                Intent(this, MainActivity::class.java).apply {
                    putExtra(MainActivity.EXTRA_SHARED_LINK, link)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                },
            )
        }

        finish()
    }
}
