import { env } from 'cloudflare:workers';
import { queuedAgentVideo, resolveYoutubeJob } from '@/lib/youtube-jobs';
import { agentSource } from '@/lib/agent-source';
import { remote, kind, boundedText, publicUrl } from '@/lib/media';
import { OriginRateLimitError } from '@/lib/rate-limit';
import { resolveInstagram, instagramPost } from '@/lib/instagram';
import { TIKTOK_MP4_UNAVAILABLE, isTikTok, resolveTikTok, tikTokMediaHeaders, tikTokVideoId } from '@/lib/tiktok';
import { isFacebook, resolveFacebookPage } from '@/lib/facebook';
import { resolveYouTube, youtubeVideoId } from '@/lib/youtube';
import { ResolutionService } from '@/lib/resolution-service';
import {archive,sharedBackoff,instagramContext} from '@/lib/server-storage';
async function fetchOrigin(stage:'page'|'query'|'embed'|'video',url:string,init?:RequestInit,redirectHeaders?:Parameters<typeof remote>[4]) {
  try{return await remote(url,init,stage === 'video' ? 5_000 : 20_000,sharedBackoff,redirectHeaders);}
  catch(error){
    console.warn('origin_request_failed',{origin:new URL(url).origin,stage,rateLimited:error instanceof OriginRateLimitError,...(error instanceof OriginRateLimitError?{retryAfter:error.retryAfter}:{})});
    throw error;
  }
}
async function resolve(url: string) {
  const source = new URL(url);
  if (isFacebook(source)) {
    return resolveFacebookPage(source, (target, stage) => fetchOrigin(stage, target), candidate =>
      fetchOrigin('video', candidate, { headers: { Range: 'bytes=0-0' } }));
  }
  const tikTok = isTikTok(source);
  const youtube = youtubeVideoId(source);
  const post=instagramPost(url);
  const token=post?await instagramContext.read():null;
  const response = await fetchOrigin('page',url);
  const type = response.headers.get('content-type') || '';
  if (tikTok) {
    const page = new URL(response.url || url);
    if (!tikTokVideoId(page) || !type.includes('text/html')) {
      await response.body?.cancel();
      throw new Error('Usa el enlace de una publicación pública de vídeo de TikTok.');
    }
    const probe = (candidate: string) =>
      fetchOrigin('video', candidate, { headers: tikTokMediaHeaders(new URL(candidate)) }, tikTokMediaHeaders);
    try {
      return await resolveTikTok(page, await boundedText(response), probe);
    } catch (error) {
      const id = tikTokVideoId(page);
      const alternate = new URL(`https://www.tiktok.com/@i/video/${id}`);
      if (!(error instanceof Error) || error.message !== TIKTOK_MP4_UNAVAILABLE || page.pathname === alternate.pathname) throw error;

      try {
        const retry = await fetchOrigin('page', alternate.href);
        const target = new URL(retry.url || alternate.href);
        if (tikTokVideoId(target) === id && retry.headers.get('content-type')?.includes('text/html')) {
          return await resolveTikTok(target, await boundedText(retry), probe);
        }
        await retry.body?.cancel();
      } catch (fallbackError) {
        if (fallbackError instanceof OriginRateLimitError) throw fallbackError;
      }
      throw error;
    }
  }
  if (youtube) {
    if (!type.includes('text/html')) {
      await response.body?.cancel();
      throw new Error('YouTube no ofreció un vídeo público descargable para este enlace.');
    }
    return resolveYouTube(youtube, await boundedText(response), candidate =>
      fetchOrigin('video', candidate, {headers:{Range:'bytes=0-0'}}));
  }
  const k = kind(type);
  if (k) {
    await response.body?.cancel();
    let title = new URL(url).pathname.split('/').pop() || 'archivo';
    try { title = decodeURIComponent(title); } catch { /* Keep raw filename. */ }
    return { title: new URL(url).hostname, items: [{url, kind:k, title}] };
  }
  if (!type.includes('text/html')) {
    await response.body?.cancel();
    throw new Error('Este formato no está disponible en la web. Usa un archivo de vídeo, audio o imagen.');
  }
  const html = await boundedText(response);
  if(post)await instagramContext.record(html);
  return resolveInstagram(post ? url : response.url || url, html, async embedUrl => {
    const embed = await fetchOrigin('embed',embedUrl);
    return boundedText(embed);
  }, async query => {
    const response = await fetchOrigin('query',query.url,query.init);
    const payload = await boundedText(response);
    return JSON.parse(payload) as unknown;
  }, token);
}
const service = new ResolutionService(archive,resolve);
export async function POST(request: Request) {
  try {
    const payload = await request.json() as {url?: unknown;refresh?:boolean;kind?:string;savedOnly?:boolean;platform?:string};
    let url = publicUrl(String(payload.url));
    url.hash = '';
    if (payload.platform === 'tiktok' && !isTikTok(url)) {
      throw new Error('Pega un enlace de vídeo de TikTok.');
    }
    if (payload.platform === 'facebook' && !isFacebook(url)) {
      throw new Error('Pega un enlace de vídeo o reel de Facebook.');
    }
    const youtube = youtubeVideoId(url);
    if (payload.platform === 'youtube' && !youtube) {
      throw new Error('Pega un enlace de un vídeo o Short de YouTube.');
    }
    if (youtube) url = new URL(`https://www.youtube.com/watch?v=${youtube}`);
    const source = env.YOUTUBE_AGENT_TOKEN && payload.kind !== 'image' ? agentSource(url) : undefined;
    const savedOnly = payload.savedOnly === true;
    if (source?.platform === 'YouTube' || source?.platform === 'Facebook') {
      return await resolveYoutubeJob(source, savedOnly);
    }
    if (source) {
      const stored = await resolveYoutubeJob(source, true);
      if (stored.ok) return stored;
      if (!savedOnly && await queuedAgentVideo(source.id)) return await resolveYoutubeJob(source, false);
    }
    if (savedOnly) {
      const result = await service.resolveSaved(url.href);
      return result
        ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
        : Response.json({ error: 'No hay archivos guardados para este enlace.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    let result;
    try {
      result = await service.resolve(url.href, !!payload.refresh, payload.kind === 'image');
    } catch (error) {
      if (!source) throw error;
      return await resolveYoutubeJob(source, false);
    }
    if (source && !result.items.some(item => item.kind === 'video')) {
      const fallback = await resolveYoutubeJob(source, false);
      if (fallback.ok || !result.items.length) return fallback;
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const limited = e instanceof OriginRateLimitError;
    return Response.json({error:e instanceof Error?e.message:'No se pudo analizar el enlace.', ...(limited?{retryAfter:e.retryAfter}:{})}, {
      status:limited?429:400,
      headers:{'Cache-Control':'no-store', ...(limited?{'Retry-After':String(e.retryAfter)}:{})},
    });
  }
}
