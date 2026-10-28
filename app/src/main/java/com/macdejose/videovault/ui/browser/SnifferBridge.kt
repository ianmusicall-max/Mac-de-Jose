package com.macdejose.videovault.ui.browser

import android.webkit.JavascriptInterface
import com.macdejose.videovault.data.db.MediaKind
import com.macdejose.videovault.resolver.MediaCandidate
import com.macdejose.videovault.resolver.UrlUtils
import org.json.JSONArray

/**
 * The Java side of the page scanner. The injected script posts a JSON array of the
 * media the DOM declares; everything that arrives here is page-controlled data, so
 * it is validated before it reaches the rest of the app.
 */
class SnifferBridge(
    private val pageUrlProvider: () -> String,
    private val onFound: (MediaCandidate) -> Unit,
) {

    @JavascriptInterface
    fun report(payload: String) {
        val pageUrl = pageUrlProvider()
        runCatching {
            val array = JSONArray(payload)
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val rawUrl = item.optString("url").takeIf(String::isNotEmpty) ?: continue
                val absolute = UrlUtils.absolutize(pageUrl, rawUrl)
                if (!absolute.startsWith("http", ignoreCase = true)) continue

                val mime = item.optString("type").takeIf(String::isNotEmpty)
                val kind = UrlUtils.kindFor(absolute, mime)
                    ?: item.optString("kind").toKind()
                    ?: continue

                onFound(
                    MediaCandidate(
                        url = absolute,
                        kind = kind,
                        title = item.optString("title").takeIf(String::isNotEmpty)
                            ?: UrlUtils.hostOf(pageUrl).ifEmpty { "media" },
                        mimeType = mime,
                        widthPx = item.optInt("width").takeIf { it > 0 },
                        heightPx = item.optInt("height").takeIf { it > 0 },
                        isHls = UrlUtils.isHlsPlaylist(absolute, mime),
                        thumbnailUrl = item.optString("poster").takeIf(String::isNotEmpty)
                            ?.let { UrlUtils.absolutize(pageUrl, it) },
                        pageUrl = pageUrl,
                        referer = pageUrl,
                    ),
                )
            }
        }
    }

    private fun String?.toKind(): MediaKind? = when (this) {
        "video" -> MediaKind.VIDEO
        "audio" -> MediaKind.AUDIO
        "image" -> MediaKind.IMAGE
        else -> null
    }

    companion object {
        const val NAME = "VideoVaultSniffer"

        /**
         * Collects <video>/<audio> sources plus OpenGraph video tags. Kept small and
         * side-effect free so it is safe to run on every page.
         */
        val SCRIPT = """
            (function () {
              try {
                var out = [];
                var push = function (url, type, kind, extra) {
                  if (!url) return;
                  if (url.indexOf('blob:') === 0 || url.indexOf('data:') === 0) return;
                  var item = { url: url, type: type || '', kind: kind };
                  if (extra) {
                    item.width = extra.width || 0;
                    item.height = extra.height || 0;
                    item.poster = extra.poster || '';
                    item.title = extra.title || document.title || '';
                  } else {
                    item.title = document.title || '';
                  }
                  out.push(item);
                };

                var media = document.querySelectorAll('video, audio');
                for (var i = 0; i < media.length; i++) {
                  var el = media[i];
                  var kind = el.tagName.toLowerCase() === 'audio' ? 'audio' : 'video';
                  var extra = {
                    width: el.videoWidth || el.width || 0,
                    height: el.videoHeight || el.height || 0,
                    poster: el.getAttribute('poster') || '',
                    title: el.getAttribute('title') || document.title || ''
                  };
                  push(el.currentSrc || el.getAttribute('src'), el.getAttribute('type'), kind, extra);
                  var sources = el.querySelectorAll('source');
                  for (var j = 0; j < sources.length; j++) {
                    push(
                      sources[j].getAttribute('src'),
                      sources[j].getAttribute('type'),
                      kind,
                      extra
                    );
                  }
                }

                var metas = document.querySelectorAll(
                  'meta[property="og:video"], meta[property="og:video:url"],' +
                  'meta[property="og:video:secure_url"], meta[name="twitter:player:stream"]'
                );
                for (var k = 0; k < metas.length; k++) {
                  push(metas[k].getAttribute('content'), '', 'video', null);
                }

                if (out.length) {
                  ${NAME}.report(JSON.stringify(out));
                }
              } catch (e) {
                /* A page that blocks introspection simply reports nothing. */
              }
            })();
        """.trimIndent()
    }
}
