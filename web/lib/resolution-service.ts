import {sourceKey} from './archive.ts';
import {OriginRateLimitError} from './rate-limit.ts';
import {ResolutionCache} from './resolution-cache.ts';
import type {ResolvedMedia} from './instagram.ts';

/** All requests for a post share one load, including explicit album refreshes. */
type ResultArchive = {
  find(url:string, storedOnly?:boolean):Promise<ResolvedMedia|null>;
  save(url:string,result:ResolvedMedia):Promise<ResolvedMedia>;
};
export class ResolutionService {
  private cache = new ResolutionCache<ResolvedMedia>();
  private pending = new Map<string, Promise<ResolvedMedia>>();
  private archive:ResultArchive;
  private load:(url:string)=>Promise<ResolvedMedia>;
  constructor(archive:ResultArchive,load:(url:string)=>Promise<ResolvedMedia>) {
    this.archive=archive;this.load=load;
  }

  resolveSaved(raw:string):Promise<ResolvedMedia|null> {
    return this.archive.find(sourceKey(raw),true);
  }

  async resolve(raw:string, refresh=false, images=false):Promise<ResolvedMedia> {
    const key=sourceKey(raw);
    const active=this.pending.get(key);
    if(active)return active;
    const work=async()=>{
      const saved=await this.archive.find(key);
      const needsImages=images&&saved&&key.startsWith('https://www.instagram.com/p/')&&
        (!saved.items.some(item=>item.kind==='image')||saved.albumSize===undefined);
      if(!refresh&&!needsImages&&saved?.items.length)return saved;
      if(refresh||needsImages)this.cache.invalidate(key);
      try {
        const result=await this.cache.get(key,async()=>{
          const loaded=await this.load(key);
          if(loaded.retryAfter){
            if(saved?.items.length)throw new OriginRateLimitError(loaded.retryAfter);
            return loaded;
          }
          return loaded.items.length ? this.archive.save(key,loaded) : loaded;
        });
        if(result.retryAfter||!result.items.length)this.cache.invalidate(key);
        return result;
      } catch(error) {
        if(saved?.items.length&&error instanceof OriginRateLimitError)return {
          ...saved,
          warning:`Instagram está limitando las consultas. Conservamos los resultados disponibles. Podrás intentar actualizar en ${error.retryAfter} segundos; la disponibilidad depende del origen.`,
          albumWarning:'No se pudo actualizar. Se conserva la lista conocida del álbum.',
          retryAfter:error.retryAfter,
        };
        throw error;
      }
    };
    const result=work();
    this.pending.set(key,result);
    try{return await result;}finally{if(this.pending.get(key)===result)this.pending.delete(key);}
  }
}
