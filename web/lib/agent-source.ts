import { isTikTok, tikTokVideoId } from './tiktok.ts';
import { instagramPost } from './instagram.ts';
import { isFacebook } from './facebook.ts';
import { youtubeVideoId } from './youtube.ts';

export function agentSource(url: URL) {
  const youtube = youtubeVideoId(url);
  if (youtube) return { id: youtube, platform: 'YouTube', url: 'https://www.youtube.com/watch?v=' + youtube };
  const instagram = instagramPost(url.href);
  if (instagram && /^[A-Za-z0-9_-]{1,32}$/.test(instagram)) {
    return { id: 'ig:' + instagram, platform: 'Instagram', url: 'https://www.instagram.com/p/' + instagram + '/' };
  }
  if (isTikTok(url)) {
    const video = tikTokVideoId(url);
    if (video) return { id: 'tt:v:' + video, platform: 'TikTok', url: 'https://www.tiktok.com/@i/video/' + video };
    const short = /^\/([A-Za-z0-9]{4,32})\/?$/.exec(url.pathname)?.[1];
    if (short && (url.hostname === 'vm.tiktok.com' || url.hostname === 'vt.tiktok.com')) {
      return { id: 'tt:' + url.hostname.slice(0, 2) + ':' + short, platform: 'TikTok', url: 'https://' + url.hostname + '/' + short + '/' };
    }
    const shared = /^\/t\/([A-Za-z0-9]{4,32})\/?$/.exec(url.pathname)?.[1];
    if (shared) return { id: 'tt:t:' + shared, platform: 'TikTok', url: 'https://www.tiktok.com/t/' + shared + '/' };
  }
  if (!isFacebook(url)) return;
  const path = url.pathname;
  const reel = /^\/reels?\/(\d{1,32})\/?$/.exec(path)?.[1];
  if (reel) return { id: 'fb:r:' + reel, platform: 'Facebook', url: 'https://www.facebook.com/reel/' + reel + '/' };
  const video = /^\/(?:[^/]+\/)?videos\/(\d{1,32})\/?$/.exec(path)?.[1] ??
    (/^\/(?:watch|video\.php)\/?$/.test(path) ? url.searchParams.get('v') : null);
  if (video && /^\d{1,32}$/.test(video)) {
    return { id: 'fb:v:' + video, platform: 'Facebook', url: 'https://www.facebook.com/watch/?v=' + video };
  }
  const shared = /^\/share\/(r|v)\/([A-Za-z0-9]{1,32})\/?$/.exec(path);
  if (shared && !url.hostname.endsWith('fb.watch')) {
    return { id: 'fb:s' + shared[1] + ':' + shared[2], platform: 'Facebook', url: 'https://www.facebook.com/share/' + shared[1] + '/' + shared[2] + '/' };
  }
  const short = /^\/([A-Za-z0-9_-]{1,32})\/?$/.exec(path)?.[1];
  if (short && url.hostname.endsWith('fb.watch')) {
    return { id: 'fb:w:' + short, platform: 'Facebook', url: 'https://fb.watch/' + short + '/' };
  }
}
