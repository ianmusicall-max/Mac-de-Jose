import { publicUrl } from './media.ts';
import { OriginRateLimitError } from './rate-limit.ts';
import type { ResolvedMedia } from './instagram.ts';

export function youtubeVideoId(url: URL): string | undefined {
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') {
    id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
    id = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : /^\/(?:shorts|live|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}

type Format = { mimeType?: string; url?: string; height?: number };
type Player = {
  playabilityStatus?: { status?: string };
  videoDetails?: { videoId?: string; title?: string; isLive?: boolean };
  streamingData?: { formats?: Format[] };
};

function playerResponse(html: string): Player | null {
  const json = /\bytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i.exec(html)?.[1];
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function resolveYouTube(
  id: string,
  html: string,
  fetchVideo: (url: string) => Promise<Response>,
): Promise<ResolvedMedia> {
  const player = playerResponse(html);
  const video = player?.videoDetails;
  if (player?.playabilityStatus?.status !== 'OK' || video?.videoId !== id || video.isLive) {
    throw new Error('YouTube no ofreció un vídeo público descargable para este enlace.');
  }

  const formats = player.streamingData?.formats;
  const candidates = (Array.isArray(formats) ? formats : [])
    .filter(format => format && typeof format.url === 'string' && /^video\/mp4(?:;|$)/i.test(format.mimeType ?? ''))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  const title = video.title || `YouTube ${id}`;
  for (const format of candidates.slice(0, 4)) {
    try {
      const url = publicUrl(format.url!);
      if (!url.hostname.endsWith('.googlevideo.com')) continue;
      const response = await fetchVideo(url.href);
      const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      await response.body?.cancel();
      if (response.ok && type === 'video/mp4') {
        return { title, items: [{ url: url.href, kind: 'video', title }] };
      }
    } catch (error) {
      if (error instanceof OriginRateLimitError) throw error;
    }
  }

  throw new Error('YouTube no ofreció un MP4 directo. Si el vídeo es tuyo, puedes descargarlo desde YouTube Studio.');
}
