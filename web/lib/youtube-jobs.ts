import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { bucket } from './server-storage';
import { digest } from './archive';
import { boundedText } from './media';
import { youtubeVideoId } from './youtube';

const jobs = 'youtube/pending/';
const failures = 'youtube/failed/';
const pauseKey = 'youtube/paused';
const maxAge = 15 * 60_000;
const failureAge = 5 * 60_000;
const maxBytes = 40 * 1024 * 1024;
const headers = { 'Cache-Control': 'no-store' };

export async function youtubeFileKey(id: string, raw: string | null) {
  if (!raw) return null;
  const url = URL.canParse(raw) ? new URL(raw) : null;
  const video = url && youtubeVideoId(url);
  return video && id === await assetId(video) ? 'youtube/files/' + id : null;
}

function assetId(id: string) {
  return digest('youtube:mp4:v1:' + id);
}

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

async function pauseRemaining() {
  const marker = await bucket().head(pauseKey);
  return marker ? Math.max(0, Math.ceil((marker.uploaded.getTime() + 10 * 60_000 - Date.now()) / 1000)) : 0;
}

export async function resolveYoutubeJob(id: string, url: string, savedOnly: boolean) {
  const fileId = await assetId(id);
  const store = bucket();
  if (await store.head('youtube/files/' + fileId)) {
    const titleKey = 'youtube/titles/' + id;
    const storedTitle = await store.get(titleKey);
    let title = storedTitle ? await storedTitle.text() : '';
    if (!title && !savedOnly) {
      try {
        const endpoint = new URL('https://www.youtube.com/oembed');
        endpoint.searchParams.set('url', url);
        endpoint.searchParams.set('format', 'json');
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000), redirect: 'error' });
        if (response.ok) {
          const metadata = JSON.parse(await boundedText(response)) as { title?: unknown };
          if (typeof metadata.title === 'string') {
            title = metadata.title.trim().slice(0, 400);
            if (title) await store.put(titleKey, title);
          }
        } else {
          await response.body?.cancel();
        }
      } catch { /* Keep archived files available when title lookup fails. */ }
    }
    title ||= 'Vídeo de YouTube';
    return reply({ title, items: [{ url, title, kind: 'video', assetId: fileId }] });
  }
  if (savedOnly) return reply({ error: 'No hay archivos guardados para este enlace.' }, 404);
  const retryAfter = await pauseRemaining();
  if (retryAfter) return reply({ error: 'YouTube está limitando las descargas. Vuelve a intentarlo más tarde.', retryAfter }, 429);

  const failed = await store.head(failures + id);
  if (failed && Date.now() - failed.uploaded.getTime() < failureAge) {
    return reply({ error: failed.customMetadata?.reason === 'size'
      ? 'El vídeo supera el límite de 40 MB.'
      : 'No se pudo preparar el MP4 de este vídeo.' }, 422);
  }

  const pending = await store.head(jobs + id);
  if (!pending || Date.now() - pending.uploaded.getTime() >= maxAge) {
    const queue = await store.list({ prefix: jobs, limit: 50 });
    if (queue.objects.filter(item => Date.now() - item.uploaded.getTime() < maxAge).length >= 5) {
      return reply({ error: 'Hay varias descargas de YouTube en curso. Inténtalo en unos segundos.' }, 503);
    }
    await store.put(jobs + id, '');
  }
  return reply({ pending: true }, 202);
}

export async function youtubeAgentRequest(request: Request) {
  const token = env.YOUTUBE_AGENT_TOKEN;
  const supplied = Buffer.from(request.headers.get('Authorization') ?? '');
  const expected = Buffer.from(token ? 'Bearer ' + token : '');
  if (!token || supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)) {
    return reply({ error: 'No disponible.' }, 404);
  }

  const store = bucket();
  if (request.method === 'GET') {
    if (await pauseRemaining()) return reply({ id: null });
    const queue = await store.list({ prefix: jobs, limit: 50 });
    const expired = queue.objects.filter(item => Date.now() - item.uploaded.getTime() >= maxAge);
    if (expired.length) await store.delete(expired.map(item => item.key));
    const next = queue.objects.filter(item => !expired.includes(item))
      .sort((a, b) => a.uploaded.getTime() - b.uploaded.getTime())[0];
    return reply({ id: next?.key.slice(jobs.length) ?? null });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !await store.head(jobs + id)) return reply({}, 404);
  if (request.method === 'PUT') {
    const length = Number(request.headers.get('Content-Length'));
    if (!request.body || !Number.isSafeInteger(length) || length <= 0 || length > maxBytes ||
        request.headers.get('Content-Type') !== 'video/mp4') return reply({}, 400);
    await store.put('youtube/files/' + await assetId(id), request.body.pipeThrough(new FixedLengthStream(length)), {
      httpMetadata: { contentType: 'video/mp4' },
      customMetadata: { filename: 'youtube-' + id + '.mp4' },
    });
  } else if (request.method === 'POST') {
    const reason = url.searchParams.get('reason') ?? '';
    if (!['limited', 'unavailable', 'size'].includes(reason)) return reply({}, 400);
    if (reason === 'limited') await store.put(pauseKey, '');
    await store.put(failures + id, '', { customMetadata: { reason } });
  } else {
    return reply({}, 405);
  }
  await store.delete(jobs + id);
  return reply({ ok: true });
}
