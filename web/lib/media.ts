import { OriginBackoff } from './rate-limit.ts';
const originBackoff = new OriginBackoff();
export type Media = { url: string; kind: 'video' | 'audio' | 'image'; title: string; isPreview?: boolean; assetId?: string; derivedFromVideo?: boolean; albumIndex?:number; mediaKey?:string; isStored?:boolean; width?:number; height?:number; quality?: 'HD' | 'SD' };
export function publicUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':') || host === 'localhost' || host.endsWith('.localhost')) throw new Error('Usa un enlace HTTPS público.');
  return url;
}
export function publicAddress(address: string): boolean {
  if (address.includes(':')) return /^[23][0-9a-f]{3}:/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
  const p = address.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b] = p;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19));
}
async function validateDns(host: string) {
  const responses = await Promise.all(['A','AAAA'].map(async type => {
    const r = await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type='+type, {headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(10000)});
    if (!r.ok) throw new Error('No se pudo verificar el destino.');
    const data = await r.json() as {Answer?:{type:number;data:string}[]};
    return (data.Answer || []).filter(a => a.type === 1 || a.type === 28).map(a=>a.data);
  }));
  const addresses = responses.flat();
  if (!addresses.length || addresses.some(a=>!publicAddress(a))) throw new Error('El enlace debe apuntar a un servidor público.');
}
export async function remote(
  raw: string,
  init?: RequestInit,
  timeoutMs = 20_000,
  guard?: {check(origin:string):Promise<void>;record(origin:string,header:string|null):Promise<Error>},
  redirectHeaders?: (destination: URL) => Record<string, string> | undefined,
): Promise<Response> {
  let url = publicUrl(raw);
  let requestOptions = init;
  for (let i = 0; i < 5; i++) {
    if(guard)await guard.check(url.origin);
    originBackoff.check(url.origin);
    await validateDns(url.hostname);
    const response = await fetch(url, { ...requestOptions, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: '*/*',
      ...requestOptions?.headers,
    } });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Redirección sin destino.');
      url = publicUrl(new URL(location, url).href);
      // Only caller-selected headers may be used on a redirect. The original request options are discarded.
      requestOptions = redirectHeaders ? { headers: redirectHeaders(url) } : undefined;
      continue;
    }
    if (response.status === 429) {
      const error = guard?await guard.record(url.origin,response.headers.get('retry-after')):originBackoff.record(url.origin, response.headers.get('retry-after'));
      await response.body?.cancel();
      throw error;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`El sitio respondió HTTP ${response.status}.`); }
    return response;
  }
  throw new Error('El enlace tiene demasiadas redirecciones.');
}
export function kind(type: string): Media['kind'] | null {
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/') && !type.includes('mpegurl')) return 'audio';
  if (type.startsWith('image/')) return 'image';
  return null;
}
const decode = (s: string) => s.replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\\u0026/g,'&').replace(/\\\//g,'/');
export function extract(html: string, base: string): { title: string; items: Media[] } {
  const title = decode(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || new URL(base).hostname).trim();
  const items: Media[] = [];
  function add(raw: string, k: Media['kind'], isPreview = false) {
    try { const url = publicUrl(new URL(decode(raw),base).href).href;
      if (!items.some(i=>i.url===url) && !/\.(m3u8|mpd)(\?|$)/i.test(url)) items.push({url,kind:k,title,...(isPreview?{isPreview:true}:{})});
    } catch { /* Skip non-public or unsupported sources. */ }
  }
  for (const tag of html.matchAll(/<(?:meta|video|audio|source|img)\b[^>]*>/gi)) {
    const attrs: Record<string,string> = {};
    for (const a of tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) attrs[a[1].toLowerCase()] = a[2];
    const property = attrs.property || attrs.name || '';
    if (/^(og:video(?::url|:secure_url)?|twitter:player:stream)$/.test(property) && attrs.content) add(attrs.content,'video');
    if (/^og:audio(?::url|:secure_url)?$/.test(property) && attrs.content) add(attrs.content,'audio');
    if (/^og:image(?::secure_url)?$/.test(property) && attrs.content) add(attrs.content,'image',true);
    if (/^<(video|audio|source)\b/i.test(tag[0]) && attrs.src) add(attrs.src,kind(attrs.type || '') || (/^<audio/i.test(tag[0])?'audio':'video'));
  }
  for (const m of html.matchAll(/"(?:contentUrl|video_url)"\s*:\s*"([^"\n]+)"/g)) add(m[1],'video');
  return {title,items:items.slice(0,40)};
}
export async function boundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader(); if (!reader) throw new Error('Página vacía.');
  let size = 0; const decoder = new TextDecoder(); let text = '';
  try { while(true) { const {done,value} = await reader.read(); if(done) break; size += value.length;
    if(size > 4*1024*1024) throw new Error('La página es demasiado grande.'); text += decoder.decode(value,{stream:true});
  } return text + decoder.decode(); } finally { await reader.cancel(); }
}
