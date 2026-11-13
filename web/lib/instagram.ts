import { extract, publicUrl, type Media } from './media.ts';
import { OriginRateLimitError } from './rate-limit.ts';
export type ResolvedMedia = { title: string; items: Media[]; warning?: string; fromArchive?:boolean; albumSize?:number; resolvedAlbumItems?:number; albumWarning?:string };
export function instagramPost(raw: string): string | null {
  const url = new URL(raw);
  if (url.hostname !== 'instagram.com' && url.hostname !== 'www.instagram.com') return null;
  return /^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})(?:\/|$)/.exec(url.pathname)?.[1] || null;
}
export function extractInstagram(html: string, shortcode: string): ResolvedMedia {
  const base = `https://www.instagram.com/p/${shortcode}/`;
  const result = extract(html, base);
  const add = (raw: string, kind: Media['kind']) => {
    try {
      const clean = raw.replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&');
      const url = publicUrl(clean).href;
      if (!result.items.some(item=>item.url===url)) result.items.push({url,kind,title:`instagram-${shortcode}`});
    } catch { /* Ignore invalid media URLs. */ }
  };
  for (const match of html.matchAll(/"video_url"\s*:\s*"([^"\n]+)"/g)) add(match[1],'video');
  for (const match of html.matchAll(/"video_versions"\s*:\s*(\[[\s\S]*?\])/g)) {
    try {
      const versions = JSON.parse(match[1]) as {url?:unknown}[];
      for (const version of versions) if (typeof version.url === 'string') add(version.url,'video');
    } catch { /* Ignore malformed page data. */ }
  }
  for (const match of html.matchAll(/"display_url"\s*:\s*"([^"\n]+)"/g)) add(match[1],'image');
  return {...result,title:result.title==='www.instagram.com'?`Instagram ${shortcode}`:result.title};
}
export type PublicInstagramQuery = {url: string; init: RequestInit};
/** Public logged-out query shape: yt-dlp/extractor/instagram.py, InstagramIE. */
export function publicInstagramQuery(html: string, shortcode: string, cachedToken?:string): PublicInstagramQuery | null {
  const token = cachedToken || /\["LSD",\[\],\{"token":"([^"]+)"/.exec(html)?.[1];
  if (!token) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (const letter of shortcode) id = id * BigInt(64) + BigInt(alphabet.indexOf(letter));
  return {
    url:'https://www.instagram.com/api/graphql',
    init:{method:'POST',headers:{
      'X-IG-App-ID':'936619743392459',
      'X-FB-LSD':token,
      'X-FB-Friendly-Name':'PolarisLoggedOutDesktopWWWPostRootContentQuery',
      'Referer':`https://www.instagram.com/p/${shortcode}/`,
      'Content-Type':'application/x-www-form-urlencoded',
    },body:new URLSearchParams({lsd:token,fb_api_caller_class:'RelayModern',fb_api_req_friendly_name:'PolarisLoggedOutDesktopWWWPostRootContentQuery',server_timestamps:'true',variables:JSON.stringify({media_id:String(id)}),doc_id:'27130156389949648'}).toString()},
  };
}
const record = (value: unknown): Record<string,unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
export function bestImageCandidate(raw:unknown[],originalWidth?:number,originalHeight?:number):Record<string,unknown>|null {
  const candidates=raw.map(record).filter((item):item is Record<string,unknown>=>!!item&&typeof item.url==='string').filter(item=>{try{publicUrl(item.url as string);return true;}catch{return false;}});
  const ratio=originalWidth&&originalHeight?originalWidth/originalHeight:0;
  return candidates.sort((a,b)=>{
    const aw=Number(a.width)||0,ah=Number(a.height)||0,bw=Number(b.width)||0,bh=Number(b.height)||0;
    if(ratio){const aMatches=ah>0&&Math.abs(aw/ah-ratio)/ratio<0.03;const bMatches=bh>0&&Math.abs(bw/bh-ratio)/ratio<0.03;if(aMatches!==bMatches)return aMatches?-1:1;}
    return bw*bh-aw*ah;
  })[0]||null;
}
export function extractPublicInstagram(payload: unknown, shortcode: string): ResolvedMedia | null {
  // Only use content Instagram explicitly returns to a logged-out visitor.
  const media = record(record(record(record(payload)?.data)?.xig_polaris_media)?.if_not_gated_logged_out);
  if (!media) return null;
  const title = typeof record(media.user)?.username === 'string' ? `Instagram · ${record(media.user)!.username}` : `Instagram ${shortcode}`;
  const items: Media[] = [];
  const nodes = Array.isArray(media.carousel_media)&&media.carousel_media.length ? media.carousel_media : [media];
  for (const [index,node] of nodes.entries()) {
    const item = record(node); if (!item) continue;
    const versions = Array.isArray(item.video_versions) ? item.video_versions : [];
    for (const [version,entry] of versions.entries()) {
      const source = record(entry)?.url;
      if (typeof source !== 'string') continue;
      try {
        const url = publicUrl(source).href;
        if (!items.some(i=>i.url===url&&i.albumIndex===index+1)) items.push({url,kind:'video',albumIndex:index+1,mediaKey:`${item.pk||item.id||index}:video:${record(entry)?.type||version}`,title:`${title} · vídeo ${index+1}, opción ${version+1}`});
      } catch { /* Ignore invalid URLs. */ }
    }

    const image = record(item.image_versions2);
    const candidates = Array.isArray(image?.candidates) ? image.candidates : [];
    const best=bestImageCandidate(candidates,Number(item.original_width),Number(item.original_height));
    const source = best?.url || (typeof item.display_uri==='string'?item.display_uri:undefined);
    if (typeof source === 'string') {
      try {items.push({url:publicUrl(source).href,kind:'image',isPreview:versions.length>0||item.media_type===2,albumIndex:index+1,mediaKey:`${item.pk||item.id||index}:image`,width:Number(best?.width)||undefined,height:Number(best?.height)||undefined,title:`${title} · ${versions.length?'portada':'imagen'} ${index+1}`});} catch { /* Ignore invalid URLs. */ }
    }
  }
  const albumSize=Number(media.carousel_media_count)||nodes.length;
  const resolvedAlbumItems=new Set(items.map(item=>item.albumIndex)).size;
  return {title,items,albumSize,resolvedAlbumItems,...(resolvedAlbumItems<albumSize?{albumWarning:`El origen entregó ${resolvedAlbumItems} de ${albumSize} elementos del álbum. No está completo.`}:{})};
}
export async function resolveInstagram(
  raw: string,
  html: string,
  loadHtml: (url:string)=>Promise<string>,
  loadPublic?: (query:PublicInstagramQuery)=>Promise<unknown>,
): Promise<ResolvedMedia> {
  const shortcode = instagramPost(raw);
  if (!shortcode) return extract(html,raw);
  const original = extractInstagram(html,shortcode);
  if (original.items.some(item=>item.kind==='video')) return original;
  const query = publicInstagramQuery(html,shortcode);
  if (query && loadPublic) {
    try {
      const result = extractPublicInstagram(await loadPublic(query),shortcode);
      if (result?.items.length) {
        return result;
      }
    } catch (error) {
      if (error instanceof OriginRateLimitError) throw error;
      // An empty/unsupported public query can still fall back to the embed.
    }
  }

  try {
    const embed = extractInstagram(await loadHtml(`https://www.instagram.com/p/${shortcode}/embed/captioned/`),shortcode);
    const items = [...original.items,...embed.items.filter(item=>!original.items.some(other=>other.url===item.url))];
    if (items.some(item=>item.kind==='video')) return {...original,items};
    return {...original,items,warning:'Instagram no ha entregado un vídeo descargable para esta publicación. La portada no es el vídeo. Puede requerir iniciar sesión, tener restricciones o ya no estar disponible; no podemos distinguir la causa desde esta web.'};
  } catch (error) {
    if (error instanceof OriginRateLimitError) throw error;
    return {...original,warning:'No pudimos obtener el vídeo desde la página pública de Instagram. Las imágenes encontradas no confirman que el vídeo esté disponible.'};
  }
}
