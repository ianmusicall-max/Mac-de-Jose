import { remote, kind, boundedText, publicUrl } from '@/lib/media';
import { OriginRateLimitError } from '@/lib/rate-limit';
import { resolveInstagram, instagramPost, publicInstagramQuery, extractPublicInstagram, type ResolvedMedia } from '@/lib/instagram';
import { ResolutionCache } from '@/lib/resolution-cache';
import {archive,sharedBackoff,instagramContext} from '@/lib/server-storage';
const cache = new ResolutionCache<ResolvedMedia>();
async function resolve(url: string) {
  const post=instagramPost(url);
  if(post){
    const token=await instagramContext.read();
    const query=token?publicInstagramQuery('',post,token):null;
    if(query){
      const response=await remote(query.url,query.init,20_000,sharedBackoff);
      const result=extractPublicInstagram(JSON.parse(await boundedText(response)),post);
      if(result?.items.length)return result;
    }
  }
  const response = await remote(url,undefined,20_000,sharedBackoff);
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
  return resolveInstagram(response.url || url, html, async embedUrl => {
    const embed = await remote(embedUrl,undefined,20_000,sharedBackoff);
    return boundedText(embed);
  }, async query => {
    const response = await remote(query.url,query.init,20_000,sharedBackoff);
    const payload = await boundedText(response);
    return JSON.parse(payload) as unknown;
  });
}
export async function POST(request: Request) {
  try {
    const payload = await request.json() as {url?: unknown;refresh?:boolean;kind?:string};
    const url = publicUrl(String(payload.url));
    url.hash = '';
    const saved=await archive.find(url.href);
    const needsImages=payload.kind==='image'&&saved&&instagramPost(url.href)&&(!saved.items.some(item=>item.kind==='image')||saved.albumSize===undefined);
    if(payload.refresh||needsImages){
      cache.invalidate(url.href);
      try{return Response.json(await archive.save(url.href,await resolve(url.href)),{headers:{'Cache-Control':'no-store'}});}
      catch(error){if(saved&&error instanceof OriginRateLimitError)return Response.json({...saved,albumWarning:'No se pudo actualizar: el origen está limitando las consultas. Se conserva la lista conocida del álbum.'},{headers:{'Cache-Control':'no-store'}});throw error;}
    }
    return Response.json(await cache.get(url.href, async () => {
      if(saved)return saved;
      const result=await resolve(url.href);
      return archive.save(url.href,result);
    }), {headers:{'Cache-Control':'no-store'}});
  } catch (e) {
    const limited = e instanceof OriginRateLimitError;
    return Response.json({error:e instanceof Error?e.message:'No se pudo analizar el enlace.', ...(limited?{retryAfter:e.retryAfter}:{})}, {
      status:limited?429:400,
      headers:{'Cache-Control':'no-store', ...(limited?{'Retry-After':String(e.retryAfter)}:{})},
    });
  }
}
