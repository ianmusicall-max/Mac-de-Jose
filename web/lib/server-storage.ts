import {env} from 'cloudflare:workers';
import {downloadName} from './download-name';
import {MediaArchive,SharedBackoff,InstagramContext,type ArchiveStorage} from './archive';
export function bucket():R2Bucket {
  if(!env.BUCKET)throw new Error('El almacenamiento de descargas no está disponible.');
  return env.BUCKET;
}
const storage:ArchiveStorage={
 async read(key){const obj=await bucket().get(key);return obj?obj.text():null;},
 async write(key,value){await bucket().put(key,value,{httpMetadata:{contentType:'application/json'}});},
 async exists(key){return !!await bucket().head(key);},
};
export const archive=new MediaArchive(storage);
export const instagramContext=new InstagramContext(storage);
export const sharedBackoff=new SharedBackoff(storage);
export function storedHeaders(object:R2Object):Headers {
 const type=object.httpMetadata?.contentType||'application/octet-stream';
 const name=downloadName(object.customMetadata?.filename||'videovault',type);
 return new Headers({'Content-Type':type,'Content-Length':String(object.size),'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
}
export function storedResponse(object:R2ObjectBody):Response {
 const headers=storedHeaders(object);
 if(headers.get('Content-Type')?.startsWith('video/'))headers.set('Accept-Ranges','bytes');
 return new Response(object.body,{headers});
}
