import { publicUrl } from './media.ts';
import { OriginRateLimitError } from './rate-limit.ts';
import type { ResolvedMedia } from './instagram.ts';

export const TIKTOK_MP4_UNAVAILABLE = 'TikTok no ofreció un archivo MP4 descargable para este vídeo.';

export function isTikTok(url: URL): boolean {
  return ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname);
}

export function tikTokVideoId(url: URL): string | undefined {
  if (!isTikTok(url)) return;
  return /^\/@[\w.-]+\/video\/(\d+)\/?$/.exec(url.pathname)?.[1];
}

/**
 * TikTok's actual video files are served from a handful of ByteDance CDN
 * domains (not tiktok.com itself), and that CDN rejects requests that don't
 * carry a Referer pointing back at tiktok.com.
 */
export function isTikTokCdn(hostname: string): boolean {
  return ['tiktok.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktokv.us',
    'ibyteimg.com', 'ibytedtos.com', 'byteoversea.com', 'bytefcdn-oversea.com'].some(domain =>
    hostname === domain || hostname.endsWith('.' + domain));
}

export function tikTokMediaHeaders(url: URL): Record<string, string> | undefined {
  return isTikTokCdn(url.hostname) ? { Referer: 'https://www.tiktok.com/', 'Accept-Encoding': 'identity' } : undefined;
}

function isTikTokPlayback(url: URL): boolean {
  return isTikTok(url) && /^\/(?:aweme\/v1\/play|api\/play|video\/tos)(?:\/|$)/.test(url.pathname);
}

type Address = string | { UrlList?: string[]; UrlKey?: string; src?: string };
type TikTokItem = {
  id?: string;
  desc?: string;
  privateItem?: boolean;
  imagePost?: unknown;
  video?: {
    playAddr?: Address | Address[];
    PlayAddrStruct?: Address;
    downloadAddr?: Address;
    download?: { url?: string };
    bitrateInfo?: { PlayAddr?: Address; Bitrate?: number }[];
  };
};

function scriptData(html: string, id: string) {
  const body = new RegExp(`<script\\b[^>]*\\sid=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, 'i').exec(html)?.[1];
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}

function addressUrls(address: Address | undefined): string[] {
  if (typeof address === 'string') return [address];
  if (typeof address?.src === 'string') return [address.src];
  return Array.isArray(address?.UrlList) ? address.UrlList : [];
}

export async function resolveTikTok(
  page: URL,
  html: string,
  fetchVideo: (url: string) => Promise<Response>,
): Promise<ResolvedMedia> {
  const id = tikTokVideoId(page);
  if (!id) throw new Error('Usa el enlace de una publicación pública de vídeo de TikTok.');

  const detail = scriptData(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
  const legacy = scriptData(html, 'SIGI_STATE')?.ItemModule;
  const item: TikTokItem | undefined = detail?.itemInfo?.itemStruct ?? legacy?.[id];
  if (detail?.statusCode || item?.id !== id || item.privateItem || item.imagePost || !item.video) {
    throw new Error('TikTok no entregó un vídeo público para este enlace. Comprueba que se abre sin iniciar sesión.');
  }

  const bitrates = Array.isArray(item.video.bitrateInfo) ? item.video.bitrateInfo : [];
  const variants = bitrates.filter(variant => variant && typeof variant.PlayAddr === 'object' &&
      typeof variant.PlayAddr?.UrlKey === 'string' && /_(?:h264|bytevc1)_/i.test(variant.PlayAddr.UrlKey))
    .sort((a, b) => (b.Bitrate ?? 0) - (a.Bitrate ?? 0));
  const variantUrls = [...new Set(variants.flatMap(variant => addressUrls(variant.PlayAddr)))];
  // The public player endpoint can supply an MP4 even if the rendition has no codec label.
  const playbackUrls = bitrates.flatMap(variant => addressUrls(variant?.PlayAddr))
    .filter(value => typeof value === 'string' && URL.canParse(value, page) && isTikTokPlayback(new URL(value, page)));
  const candidates = new Set([
    ...playbackUrls,
    ...addressUrls(item.video.downloadAddr),
    ...addressUrls(item.video.download?.url),
    ...variantUrls,
    ...[item.video.playAddr].flat().flatMap(addressUrls),
    ...addressUrls(item.video.PlayAddrStruct),
  ]);
  const title = typeof item.desc === 'string' && item.desc.trim() ? item.desc.trim() : `TikTok ${id}`;
  const playback: URL[] = [];
  const direct: URL[] = [];
  for (const candidate of candidates) {
    try {
      if (typeof candidate !== 'string') continue;
      const target = publicUrl(new URL(candidate, page).href);
      if (target.pathname.endsWith('/media-video-hvc1/')) continue;
      if (isTikTokPlayback(target)) playback.push(target);
      else if (!isTikTok(target)) direct.push(target);
    } catch { /* Ignore malformed candidates. */ }
  }
  for (const target of [...playback, ...direct].slice(0, 8)) {
    try {
      const url = target.href;
      const response = await fetchVideo(url);
      const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      await response.body?.cancel();
      if (response.ok && type === 'video/mp4') {
        return { title, items: [{ url, kind: 'video', contentType: 'video/mp4', title }] };
      }
    } catch (error) {
      if (error instanceof OriginRateLimitError) throw error;
    }
  }

  throw new Error(TIKTOK_MP4_UNAVAILABLE);
}
