import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { bucket } from './server-storage';
import { digest } from './archive';
import { boundedText } from './media';
import { agentSource } from './agent-source';

const jobs = 'youtube/pending/';
const socialJobs = 'social/pending/';
const failures = 'youtube/failed/';
const pauseKey = 'youtube/paused';
const maxAge = 15 * 60_000;
const failureAge = 5 * 60_000;
const maxBytes = 40 * 1024 * 1024;
const headers = { 'Cache-Control': 'no-store' };

export async function youtubeFileKey(id: string, raw: string | null) {
  if (!raw) return null;
  const url = URL.canParse(raw) ? new URL(raw) : null;
  const source = url && agentSource(url);
  return source && id === await assetId(source.id) ? 'youtube/files/' + id : null;
}

function assetId(id: string) {
  return digest('youtube:mp4:v1:' + id);
}

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

function pendingKey(id: string) {
  return (id.includes(':') ? socialJobs : jobs) + id;
}

async function listPending() {
  const store = bucket();
  const queues = await Promise.all([jobs, socialJobs].map(prefix => store.list({ prefix, limit: 50 })));
  return queues.flatMap(queue => queue.objects);
}

function platformPauseKey(id: string) {
  if (id.length === 11 && !id.includes(':')) return pauseKey;
  const platform = id.split(':', 1)[0];
  return pauseKey + '/' + platform;
}

async function pauseRemaining(id: string) {
  const marker = await bucket().head(platformPauseKey(id));
  return marker ? Math.max(0, Math.ceil((marker.uploaded.getTime() + 10 * 60_000 - Date.now()) / 1000)) : 0;
}

export async function queuedAgentVideo(id: string) {
  const pending = await bucket().head(pendingKey(id));
  return !!pending && Date.now() - pending.uploaded.getTime() < maxAge;
}

export async function resolveYoutubeJob({ id, url, platform }: NonNullable<ReturnType<typeof agentSource>>, savedOnly: boolean) {
  const fileId = await assetId(id);
  const store = bucket();
  if (await store.head('youtube/files/' + fileId)) {
    const titleKey = 'youtube/titles/' + id;
    const storedTitle = await store.get(titleKey);
    let title = storedTitle ? await storedTitle.text() : '';
    if (!title && !savedOnly && platform === 'YouTube') {
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
    title ||= 'Vídeo de ' + platform;
    return reply({ title, items: [{ url, title, kind: 'video', assetId: fileId, isStored: true }], fromArchive: savedOnly });
  }
  if (savedOnly) return reply({ error: 'No hay archivos guardados para este enlace.' }, 404);
  const retryAfter = await pauseRemaining(id);
  if (retryAfter) return reply({ error: platform + ' está limitando las descargas. Vuelve a intentarlo más tarde.', retryAfter }, 429);

  const failed = await store.head(failures + id);
  if (failed && Date.now() - failed.uploaded.getTime() < failureAge) {
    return reply({ error: failed.customMetadata?.reason === 'size'
      ? 'El vídeo supera el límite de 40 MB.'
      : 'No se pudo preparar el MP4 de este vídeo.' }, 422);
  }

  const pending = await store.head(pendingKey(id));
  if (!pending || Date.now() - pending.uploaded.getTime() >= maxAge) {
    const queue = await listPending();
    if (queue.filter(item => Date.now() - item.uploaded.getTime() < maxAge).length >= 5) {
      return reply({ error: 'Hay varias descargas de vídeo en curso. Inténtalo en unos segundos.' }, 503);
    }
    await store.put(pendingKey(id), '');
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
    const queue = await listPending();
    const expired = queue.filter(item => Date.now() - item.uploaded.getTime() >= maxAge);
    if (expired.length) await store.delete(expired.map(item => item.key));
    const candidates = queue.filter(item => !expired.includes(item))
      .sort((a, b) => a.uploaded.getTime() - b.uploaded.getTime());
    for (const candidate of candidates) {
      const id = candidate.key.slice(candidate.key.lastIndexOf('/') + 1);
      if (!await pauseRemaining(id)) return reply({ id });
    }
    return reply({ id: null });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  if (!/^(?:[A-Za-z0-9_-]{11}|ig:[A-Za-z0-9_-]{1,32}|fb:[rv]:\d{1,32}|fb:s[rv]:[A-Za-z0-9]{1,32}|fb:w:[A-Za-z0-9_-]{1,32}|tt:v:\d{1,32}|tt:(?:t|vm|vt):[A-Za-z0-9]{4,32})$/.test(id) || !await store.head(pendingKey(id))) return reply({}, 404);
  if (request.method === 'PUT') {
    const length = Number(request.headers.get('Content-Length'));
    if (!request.body || !Number.isSafeInteger(length) || length <= 0 || length > maxBytes ||
        request.headers.get('Content-Type') !== 'video/mp4') return reply({}, 400);
    await store.put('youtube/files/' + await assetId(id), request.body.pipeThrough(new FixedLengthStream(length)), {
      httpMetadata: { contentType: 'video/mp4' },
      customMetadata: { filename: (id.includes(':') ? id.replaceAll(':', '-') : 'youtube-' + id) + '.mp4' },
    });
  } else if (request.method === 'POST') {
    const reason = url.searchParams.get('reason') ?? '';
    if (!['limited', 'unavailable', 'size'].includes(reason)) return reply({}, 400);
    if (reason === 'limited') await store.put(platformPauseKey(id), '');
    await store.put(failures + id, '', { customMetadata: { reason } });
  } else {
    return reply({}, 405);
  }
  await store.delete(pendingKey(id));
  return reply({ ok: true });
}
