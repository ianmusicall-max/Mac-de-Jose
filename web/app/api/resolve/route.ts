import { remote, kind, boundedText, publicUrl } from '@/lib/media';
import { OriginRateLimitError } from '@/lib/rate-limit';
import { resolveInstagram, instagramPost } from '@/lib/instagram';
import { ResolutionService } from '@/lib/resolution-service';
import {archive,sharedBackoff,instagramContext} from '@/lib/server-storage';
async function fetchOrigin(stage:'page'|'query'|'embed',url:string,init?:RequestInit) {
  try{return await remote(url,init,20_000,sharedBackoff);}
  catch(error){
    console.warn('origin_request_failed',{origin:new URL(url).origin,stage,rateLimited:error instanceof OriginRateLimitError,...(error instanceof OriginRateLimitError?{retryAfter:error.retryAfter}:{})});
    throw error;
  }
}
async function resolve(url: string) {
  const post=instagramPost(url);
  const token=post?await instagramContext.read():null;
  const response = await fetchOrigin('page',url);
  const type = response.headers.get('content-type') || '';
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
    const payload = await request.json() as {url?: unknown;refresh?:boolean;kind?:string;savedOnly?:boolean};
    const url = publicUrl(String(payload.url));
    url.hash = '';
    if(payload.savedOnly===true){
      const result=await service.resolveSaved(url.href);
      return result
        ? Response.json(result,{headers:{'Cache-Control':'no-store'}})
        : Response.json({error:'No hay archivos guardados para este enlace.'},{status:404,headers:{'Cache-Control':'no-store'}});
    }
    return Response.json(await service.resolve(url.href,!!payload.refresh,payload.kind==='image'), {headers:{'Cache-Control':'no-store'}});
  } catch (e) {
    const limited = e instanceof OriginRateLimitError;
    return Response.json({error:e instanceof Error?e.message:'No se pudo analizar el enlace.', ...(limited?{retryAfter:e.retryAfter}:{})}, {
      status:limited?429:400,
      headers:{'Cache-Control':'no-store', ...(limited?{'Retry-After':String(e.retryAfter)}:{})},
    });
  }
}
