import {youtubeFileKey} from '@/lib/youtube-jobs';
import {remote,kind,publicUrl} from '@/lib/media';
import {tikTokMediaHeaders} from '@/lib/tiktok';
import {OriginRateLimitError} from '@/lib/rate-limit';
import {bucket,storedResponse,storedHeaders,sharedBackoff} from '@/lib/server-storage';
import {digest} from '@/lib/archive';
import {attachment,dispositionFilename,mediaDownloadName,namedDownload,readableFilename} from '@/lib/download-name';
import {readImage,assertCompleteImage,assertFullResponse,IncompleteImageError,MAX_IMAGE_BYTES} from '@/lib/image-file';
async function cachedFile(id:string,rangeHeader:string|null,inline:boolean,key='files/'+id,title?:string|null):Promise<Response|null>{
 if(rangeHeader){
  const head=await bucket().head(key);
  const type=head?.httpMetadata?.contentType||'';
  if(head&&type.startsWith('video/')){
   const match=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
   if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`,'Accept-Ranges':'bytes'}});
   const start=match[1]?Number(match[1]):Math.max(0,head.size-Number(match[2]||0));
   const end=match[2]&&match[1]?Math.min(Number(match[2]),head.size-1):head.size-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=head.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`,'Accept-Ranges':'bytes'}});
   const length=end-start+1;const object=await bucket().get(key,{range:{offset:start,length}});if(!object)return null;
   const headers=storedHeaders(head,title);headers.set('Accept-Ranges','bytes');headers.set('Content-Range',`bytes ${start}-${end}/${head.size}`);headers.set('Content-Length',String(length));if(inline)headers.set('Content-Disposition','inline');
   return new Response(object.body,{status:206,headers});
  }
 }
 const object=await bucket().get(key);if(!object)return null;
 if((object.httpMetadata?.contentType||'').startsWith('image/')&&object.size<=MAX_IMAGE_BYTES){
  const data=new Uint8Array(await object.arrayBuffer());
  try{assertCompleteImage(data,object.httpMetadata?.contentType||'',object.size);}
  catch{await bucket().delete(key);return null;}
  return new Response(data,{headers:storedHeaders(object,title)});
 }
 return storedResponse(object,title);
}
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams;const id=params.get('id');const raw=params.get('url');
  const inline=params.get('inline')==='1';const title=params.get('name');
  const finish=(response:Response)=>{const type=response.headers.get('content-type')||'';if(inline&&(type.startsWith('image/')||type.startsWith('video/')))response.headers.set('Content-Disposition','inline');return response;};
  if(id&&!/^[a-f0-9]{64}$/.test(id))throw new Error('Identificador de archivo inválido.');
  if(id){
   const youtube=await youtubeFileKey(id,raw);
   const saved=await cachedFile(id,request.headers.get('range'),inline,youtube??undefined,title);
   if(saved)return finish(saved);
   if(youtube)throw new Error('El vídeo guardado ya no está disponible. Vuelve a buscarlo.');
  }
  if(!raw)throw new Error('El archivo guardado no está disponible. Vuelve a buscar el enlace.');
  const url=publicUrl(raw).href;const assetId=await digest(url);
  if(id&&id!==assetId)throw new Error('El archivo guardado no está disponible.');
  const saved=await cachedFile(assetId,request.headers.get('range'),inline,undefined,title);if(saved)return finish(saved);
  const tikTokHeaders=tikTokMediaHeaders(new URL(url));
  const response=await remote(url,{headers:{'Accept-Encoding':'identity',...tikTokHeaders}},10*60_000,sharedBackoff,tikTokHeaders?tikTokMediaHeaders:undefined);
  const type=response.headers.get('content-type')||'';
  if(!kind(type)){await response.body?.cancel();throw new Error('El destino no es un archivo multimedia descargable.');}
  try{assertFullResponse(response.status,response.headers.get('content-range'));}catch(error){await response.body?.cancel();throw error;}
  const original=readableFilename(dispositionFilename(response.headers.get('content-disposition')));
  const originalFilename=original&&namedDownload(original,type);
  let basename=new URL(response.url||url).pathname.split('/').pop();
  try { if(basename)basename=decodeURIComponent(basename); } catch { /* Keep the encoded name. */ }
  const filename=mediaDownloadName(type,title,originalFilename,readableFilename(basename));
  const customMetadata={filename,...(originalFilename?{originalFilename}:{}),...(type.startsWith('video/')&&title?.trim()?{videoTitle:title.trim().slice(0,160)}:{})};
  if(type.startsWith('image/')){
   const data=await readImage(response);
   await bucket().put('files/'+assetId,data,{httpMetadata:{contentType:type},customMetadata});
   return finish(new Response(data,{headers:{'Content-Type':type,'Content-Length':String(data.length),'Content-Disposition':attachment(filename),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}));
  }
  const length=Number(response.headers.get('content-length'));
  if(!Number.isSafeInteger(length)||length<=0||length>100*1024*1024){
   const headers=new Headers({'Content-Type':type,'Content-Disposition':attachment(filename),'Cache-Control':'no-store'});
   if(Number.isSafeInteger(length)&&length>0&&!response.headers.get('content-encoding'))headers.set('Content-Length',String(length));
   return finish(new Response(response.body,{headers}));
  }
  await bucket().put('files/'+assetId,response.body,{httpMetadata:{contentType:type},customMetadata});
  const object=await bucket().get('files/'+assetId);
  if(!object)throw new Error('No se pudo guardar la descarga.');
  if(object.size!==length){await bucket().delete('files/'+assetId);throw new IncompleteImageError('El archivo llegó incompleto. Vuelve a intentarlo.');}
  const range=request.headers.get('range');
  if(range&&type.startsWith('video/')){
   await object.body.cancel();
   const partial=await cachedFile(assetId,range,inline,undefined,title);
   if(!partial)throw new Error('No se pudo abrir la descarga guardada.');
   return finish(partial);
  }
  return finish(storedResponse(object,title));
 }catch(error){return new Response(error instanceof Error?error.message:'No se pudo descargar.',{status:error instanceof OriginRateLimitError?429:error instanceof IncompleteImageError?502:400,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...(error instanceof OriginRateLimitError?{'Retry-After':String(error.retryAfter)}:{})}});}
}
