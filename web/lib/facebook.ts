import type { ResolvedMedia } from './instagram.ts';
import { extract, publicUrl, kind, type Media } from './media.ts';
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
  ] as const) {
    const pattern = new RegExp(`"(?:${fields})"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'g');
    for (const [, encoded] of html.matchAll(pattern)) {
      try {
        const url = facebookCdn(JSON.parse(encoded).replaceAll('&amp;', '&'));
        if (url && !candidates.has(url)) candidates.set(url, quality);
      } catch {
        // Ignore an invalid JSON string.
      }
      if (candidates.size >= (quality === 'HD' ? 3 : 6)) break;
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
  return { title, items: [...items.values(), ...images], facebookImagesChecked: true };
}
