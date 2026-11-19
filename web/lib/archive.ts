import type { ResolvedMedia } from './instagram.ts';
import type { Media } from './media.ts';
import { OriginRateLimitError, retryAfterSeconds } from './rate-limit.ts';
export interface ArchiveStorage {
  read(key:string):Promise<string|null>;
  write(key:string, value:string):Promise<void>;
  exists(key:string):Promise<boolean>;
}
export async function digest(value:string):Promise<string> {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function sourceKey(raw:string):string {
  const url=new URL(raw);url.hash='';
  if (url.hostname==='instagram.com'||url.hostname==='www.instagram.com') {
    const id=/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url.pathname)?.[1];
    if(id)return `https://www.instagram.com/p/${id}/`;
  }
  return url.href;
}
export class MediaArchive {
  private storage:ArchiveStorage;
  private now:()=>number;
  constructor(storage:ArchiveStorage,now:()=>number=Date.now){this.storage=storage;this.now=now;}
  async save(source:string,result:ResolvedMedia):Promise<ResolvedMedia> {
    const key='results/'+await digest(sourceKey(source));
    const previous=await this.storage.read(key);const old=previous?(JSON.parse(previous) as {result:ResolvedMedia}).result.items:[];
    const incomingVideos=result.items.filter(item=>item.kind==='video');const previousVideos=old.filter(item=>item.kind==='video');
    const storedIds=new Set((await Promise.all(old.map(async item=>item.assetId&&await this.storage.exists('files/'+item.assetId)?item.assetId:null))).filter((id):id is string=>!!id));
    const items=await Promise.all(result.items.map(async item=>{
      let saved=old.find(existing=>existing.mediaKey&&existing.mediaKey===item.mediaKey&&existing.kind===item.kind);
      if(!saved&&item.kind==='video'&&incomingVideos.length===1&&previousVideos.length===1)saved=previousVideos[0];
      const higherQuality=item.kind==='image'&&saved&&Number(item.width)*Number(item.height)>Number(saved.width||0)*Number(saved.height||0);
      if(saved?.assetId&&!higherQuality&&storedIds.has(saved.assetId))return {...item,assetId:saved.assetId,isStored:true};
      return {...item,assetId:item.assetId||await digest(item.url)};
    }));
    const retained=old.filter(item=>item.assetId&&(storedIds.has(item.assetId)||!!result.albumWarning)&&!items.some(fresh=>fresh.assetId===item.assetId||fresh.mediaKey&&fresh.mediaKey===item.mediaKey||fresh.kind===item.kind&&((item.albumIndex&&fresh.albumIndex===item.albumIndex)||(!item.albumIndex&&item.kind==='image'))));
    const saved={...result,items:[...items,...retained.map(item=>({...item,isStored:!!item.assetId&&storedIds.has(item.assetId)}))],...(retained.some(item=>item.assetId&&storedIds.has(item.assetId))?{fromArchive:true}:{})};
    await this.storage.write('results/'+await digest(sourceKey(source)),JSON.stringify({savedAt:this.now(),result:saved}));
    return saved;
  }
  async find(source:string, storedOnly=false):Promise<ResolvedMedia|null> {
    const text=await this.storage.read('results/'+await digest(sourceKey(source)));if(!text)return null;
    const {savedAt,result}=JSON.parse(text) as {savedAt:number;result:ResolvedMedia};
    if(!Array.isArray(result.items))return null;
    const items=await Promise.all(result.items.map(async item=>({...item,isStored:!!item.assetId&&await this.storage.exists('files/'+item.assetId)})));
    if(storedOnly){
      const stored=items.filter(item=>item.isStored);
      return stored.length?{...result,items:stored,fromArchive:true}:null;
    }
    if(items.some(item=>item.isStored&&(item.kind!=='image'||!item.isPreview)))return {...result,items,fromArchive:true};
    return this.now()-savedAt<120000?result:null;
  }
}
/** Shared per-site wait state survives Worker restarts; never rotate origins/IPs. */
export class SharedBackoff {
  private storage:ArchiveStorage;
  private now:()=>number;
  constructor(storage:ArchiveStorage,now:()=>number=Date.now){this.storage=storage;this.now=now;}
  async check(origin:string):Promise<void>{
    const text=await this.storage.read('limits/'+await digest(origin));if(!text)return;
    const {until}=JSON.parse(text) as {until:number};
    if(until>this.now())throw new OriginRateLimitError(Math.ceil((until-this.now())/1000));
  }
  async record(origin:string,header:string|null):Promise<OriginRateLimitError>{
    const key='limits/'+await digest(origin);const previous=await this.storage.read(key);
    const old=previous?JSON.parse(previous) as {attempts:number;at:number}:null;
    const attempts=old&&this.now()-old.at<86400000?old.attempts+1:1;
    const seconds=header?retryAfterSeconds(header,this.now()):Math.min(900,60*2**Math.min(attempts-1,4));
    await this.storage.write(key,JSON.stringify({until:this.now()+seconds*1000,at:this.now(),attempts}));
    return new OriginRateLimitError(seconds);
  }
}

/** Reuses only Instagram's anonymous page token; never stores account cookies. */
export class InstagramContext {
  private storage:ArchiveStorage;
  private now:()=>number;
  constructor(storage:ArchiveStorage,now:()=>number=Date.now){this.storage=storage;this.now=now;}
  async read():Promise<string|null>{
    const raw=await this.storage.read('context/instagram');if(!raw)return null;
    const value=JSON.parse(raw) as {token?:string;at?:number};
    return typeof value.token==='string'&&typeof value.at==='number'&&this.now()-value.at<15*60_000?value.token:null;
  }
  async record(html:string):Promise<void>{
    const token=/\["LSD",\[\],\{"token":"([^"]+)"/.exec(html)?.[1];
    if(token)await this.storage.write('context/instagram',JSON.stringify({token,at:this.now()}));
  }
}
