import type { ResolvedMedia } from './instagram.ts';
import { boundedText, extract, publicUrl, kind, type Media } from './media.ts';
import { OriginRateLimitError } from './rate-limit.ts';

export const FACEBOOK_UNAVAILABLE = 'Facebook no ofreció un MP4 público para este enlace. Comprueba que el vídeo se abre sin iniciar sesión.';

export function isFacebook(url: URL): boolean {
  return ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'www.fb.watch'].includes(url.hostname);
}

function isFacebookPhoto(page: URL): boolean {
  return /^\/(?:photo(?:\.php)?|photos)(?:\/|$)/i.test(page.pathname) ||
    /\/photos\//i.test(page.pathname);
}

function facebookCdn(raw: string): string | undefined {
  try {
    const url = publicUrl(raw);
    if (url.hostname.endsWith('.fbcdn.net')) return url.href;
  } catch {
    // Ignore malformed or non-public candidates.
  }
}

export function hasFacebookTitle(title: string): boolean {
  return !/^(?:|(?:(?:www|m|web)\.)?facebook(?:\.com)?|log in(?:.*facebook)?|inicia sesi[oó]n(?:.*facebook)?)$/i.test(title.trim());
}

function facebookVideoId(url: URL): string | undefined {
  const id = /^\/(?:[^/]+\/)?(?:reels?|videos)\/(\d+)(?:\/|$)/i.exec(url.pathname)?.[1] ??
    (/^\/(?:watch|video\.php)\/?$/i.test(url.pathname) ? url.searchParams.get('v') : null);
  return id && /^\d+$/.test(id) ? id : undefined;
}

export async function resolveFacebookPage(
  source: URL,
  load: (url: string, stage: 'page' | 'embed') => Promise<Response>,
  probe: (url: string) => Promise<Response>,
): Promise<ResolvedMedia> {
  const result = await resolveFacebookMediaPage(source, load, probe);
  if (!result.items.some(item => item.kind === 'video') || hasFacebookTitle(result.title)) return result;

  const id = facebookVideoId(source);
  if (id) {
    try {
      const watch = new URL('https://www.facebook.com/watch/');
      watch.searchParams.set('v', id);
      const response = await load(watch.href, 'page');
      const target = new URL(response.url || watch.href);
      if (isFacebook(target) && facebookVideoId(target) === id &&
        response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
        const html = await boundedText(response);
        const { title: pageTitle } = extract(html, target.href);
        const caption = /<meta\s+property=["']og:description["']\s+content=(["'])([\s\S]*?)\1/i.exec(html)?.[2]?.trim();
        const title = caption && pageTitle.startsWith(caption + ' | ') ? caption : pageTitle.replace(/\s*\|\s*Facebook$/i, '');
        if (hasFacebookTitle(title)) {
          return { ...result, title, items: result.items.map(item => ({ ...item, title })), facebookTitleChecked: true };
        }
      } else {
        await response.body?.cancel();
      }
    } catch (error) {
      // A title lookup must not prevent the media from being downloaded.
      if (error instanceof OriginRateLimitError) return result;
    }
  }
  return { ...result, facebookTitleChecked: true };
}

async function resolveFacebookMediaPage(
  source: URL,
  load: (url: string, stage: 'page' | 'embed') => Promise<Response>,
  probe: (url: string) => Promise<Response>,
): Promise<ResolvedMedia> {
  let page = source;
  let original: ResolvedMedia | undefined;
  try {
    const response = await load(source.href, 'page');
    const target = new URL(response.url || source.href);
    if (!isFacebook(target) || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      await response.body?.cancel();
      throw new Error(FACEBOOK_UNAVAILABLE);
    }
    if (!target.pathname.startsWith('/login')) page = target;
    original = await resolveFacebook(page, await boundedText(response), probe);
    if (original.items.some(item => item.kind === 'video') || isFacebookPhoto(page)) return original;
  } catch (error) {
    if (error instanceof OriginRateLimitError) throw error;
  }

  if (!isFacebookPhoto(page)) {
    try {
      const embed = new URL('https://www.facebook.com/plugins/video.php');
      embed.searchParams.set('href', page.href);
      const response = await load(embed.href, 'embed');
      const target = new URL(response.url || embed.href);
      if (!isFacebook(target) || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
        await response.body?.cancel();
        throw new Error(FACEBOOK_UNAVAILABLE);
      }
      const embedded = await resolveFacebook(page, await boundedText(response), probe);
      if (!original) return embedded;
      const title = hasFacebookTitle(original.title) ? original.title : embedded.title;
      const known = new Set(original.items.map(item => item.url));
      const items = [
        ...embedded.items.filter(item => !known.has(item.url)).map(item => ({ ...item, title })),
        ...original.items.map(item => ({ ...item, title })),
      ];
      return { title, items, facebookEmbedChecked: true };
    } catch (error) {
      if (error instanceof OriginRateLimitError) {
        if (original) return { ...original, retryAfter: error.retryAfter };
        throw error;
      }
    }
  }
  if (original) return original;
  throw new Error(FACEBOOK_UNAVAILABLE);
}

export async function resolveFacebook(
  page: URL,
  html: string,
  probe: (url: string) => Promise<Response>,
): Promise<ResolvedMedia> {
  const { title, items: metadata } = extract(html, page.href);
  const candidates = new Map<string, 'HD' | 'SD' | undefined>();
  for (const [fields, quality] of [
    ['browser_native_hd_url|playable_url_quality_hd|hd_src(?:_no_ratelimit)?', 'HD'],
    ['browser_native_sd_url|playable_url|sd_src(?:_no_ratelimit)?', 'SD'],
    ['progressive_url', undefined],
  ] as const) {
    const pattern = new RegExp(`"(?:${fields})"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'g');
    for (const [, encoded] of html.matchAll(pattern)) {
      try {
        const url = facebookCdn(JSON.parse(encoded).replaceAll('&amp;', '&'));
        if (url && !candidates.has(url)) candidates.set(url, quality);
      } catch {
        // Ignore an invalid JSON string.
      }
      if (candidates.size >= (quality === 'HD' ? 3 : quality === 'SD' ? 6 : 8)) break;
    }
  }
  for (const item of metadata.filter(item => item.kind === 'video').slice(0, 2)) {
    const url = facebookCdn(item.url);
    if (url && !candidates.has(url)) candidates.set(url, undefined);
  }

  const available = await Promise.all([...candidates].map(async ([url, quality]): Promise<Media | null> => {
    try {
      const response = await probe(url);
      const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      await response.body?.cancel();
      if (response.ok && type === 'video/mp4' && facebookCdn(response.url || url)) {
        return { url, kind: 'video', title, quality, mediaKey: `facebook-${quality ?? 'mp4'}` };
      }
    } catch (error) {
      if (error instanceof OriginRateLimitError) throw error;
    }
    return null;
  }));

  const items = new Map<Media['quality'], Media>();
  for (const item of available) {
    if (item && !items.has(item.quality)) items.set(item.quality, item);
  }
  if (items.has('HD') || items.has('SD')) items.delete(undefined);

  const images: Media[] = [];
  for (const candidate of metadata.filter(item => item.kind === 'image').slice(0, 3)) {
    const url = facebookCdn(candidate.url);
    if (!url || new URL(url).hostname.startsWith('static.')) continue;
    try {
      const response = await probe(url);
      const type = response.headers.get('content-type')?.toLowerCase() ?? '';
      await response.body?.cancel();
      if (response.ok && kind(type) === 'image' && facebookCdn(response.url || url)) {
        images.push({ ...candidate, url, isPreview: items.size > 0 || !isFacebookPhoto(page) });
      }
    } catch (error) {
      if (!items.size && !images.length && error instanceof OriginRateLimitError) throw error;
    }
  }

  if (!items.size && !images.length) throw new Error(FACEBOOK_UNAVAILABLE);
  return { title, items: [...items.values(), ...images], facebookEmbedChecked: true };
}
