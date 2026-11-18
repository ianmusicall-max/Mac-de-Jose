import {sourceKey} from './archive.ts';
import {OriginRateLimitError} from './rate-limit.ts';
import {ResolutionCache} from './resolution-cache.ts';
import type {ResolvedMedia} from './instagram.ts';

/** All requests for a post share one load, including explicit album refreshes. */
type ResultArchive = {
  find(url:string):Promise<ResolvedMedia|null>;
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

  async resolve(raw:string, refresh=false, images=false):Promise<ResolvedMedia> {
    const key=sourceKey(raw);
    const active=this.pending.get(key);
    if(active)return active;
    const work=async()=>{
      const saved=await this.archive.find(key);
      const needsImages=images&&saved&&key.startsWith('https://www.instagram.com/p/')&&
        (!saved.items.some(item=>item.kind==='image')||saved.albumSize===undefined);
      if(!refresh&&!needsImages&&saved)return saved;
      if(refresh||needsImages)this.cache.invalidate(key);
      try {
        return await this.cache.get(key,async()=>this.archive.save(key,await this.load(key)));
      } catch(error) {
        if(saved&&error instanceof OriginRateLimitError)return {
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
