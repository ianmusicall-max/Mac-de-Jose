import {youtubeFileKey} from '@/lib/youtube-jobs';
import {bucket,storedResponse,sharedBackoff} from '@/lib/server-storage';
import {dispositionFilename,namedDownload,readableFilename} from '@/lib/download-name';
import {tikTokMediaHeaders} from '@/lib/tiktok';
import {digest} from '@/lib/archive';
import {publicUrl,remote} from '@/lib/media';
import {OriginRateLimitError} from '@/lib/rate-limit';
import {extractM4a,AudioExtractionError,MAX_AUDIO_SOURCE_BYTES} from '@/lib/audio';
async function boundedVideo(response:Response):Promise<ArrayBuffer>{
 const size=Number(response.headers.get('content-length'));
 if(size>MAX_AUDIO_SOURCE_BYTES){await response.body?.cancel();throw new AudioExtractionError('La extracción de audio admite vídeos de hasta 32 MB.');}
 const reader=response.body?.getReader();if(!reader)throw new AudioExtractionError('El vídeo está vacío.');
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_AUDIO_SOURCE_BYTES)throw new AudioExtractionError('La extracción de audio admite vídeos de hasta 32 MB.');chunks.push(value);}}
 finally{await reader.cancel();}
 const data=new Uint8Array(total);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return data.buffer;
}
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams;let id=params.get('id');const raw=params.get('url');const title=params.get('name');
  if(id&&!/^[a-f0-9]{64}$/.test(id))throw new AudioExtractionError('El identificador del vídeo no es válido.');
  const url=raw?publicUrl(raw).href:null;
  if(!id){if(!url)throw new AudioExtractionError('Falta el vídeo del que extraer audio.');id=await digest(url);}
  const youtube=await youtubeFileKey(id,url);
  const audioKey=(youtube?'youtube/audio/':'audio/')+id+'.m4a';
  const saved=await bucket().get(audioKey);if(saved){
   const source=await bucket().head(youtube??'files/'+id);
   return storedResponse(saved,source?.customMetadata?.originalFilename||title);
  }
  const source=await bucket().get(youtube??'files/'+id);
  let originalFilename=source?.customMetadata?.originalFilename;
  let data:ArrayBuffer;
  if(source){
   if(source.size>MAX_AUDIO_SOURCE_BYTES)throw new AudioExtractionError('La extracción de audio admite vídeos de hasta 32 MB.');
   data=await source.arrayBuffer();
  }else{
   if(!url||id!==await digest(url))throw new AudioExtractionError('El vídeo guardado no está disponible. Vuelve a buscar el enlace.');
   const headers=tikTokMediaHeaders(new URL(url));
   const response=await remote(url,{headers},10*60_000,sharedBackoff,headers?tikTokMediaHeaders:undefined);
   if(!(response.headers.get('content-type')||'').startsWith('video/')){await response.body?.cancel();throw new AudioExtractionError('Necesitamos un vídeo MP4 para extraer el audio.');}
   const original=readableFilename(dispositionFilename(response.headers.get('content-disposition')));
   originalFilename=original&&namedDownload(original,'video/mp4');
   data=await boundedVideo(response);
  }
  const audio=extractM4a(data);
  if(!source)await bucket().put('files/'+id,data,{httpMetadata:{contentType:'video/mp4'},customMetadata:{filename:'snapreel.mp4',...(originalFilename?{originalFilename}:{})}});
  await bucket().put(audioKey,audio,{httpMetadata:{contentType:'audio/mp4'},customMetadata:{filename:'snapreel-audio.m4a',...(originalFilename?{originalFilename}:{})}});
  const result=await bucket().get(audioKey);if(!result)throw new Error('No se pudo guardar la pista de audio.');
  return storedResponse(result,title);
 }catch(e){return new Response(e instanceof Error?e.message:'No se pudo extraer el audio.',{status:e instanceof OriginRateLimitError?429:422,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...(e instanceof OriginRateLimitError?{'Retry-After':String(e.retryAfter)}:{})}});}
}
