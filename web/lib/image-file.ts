export class IncompleteImageError extends Error {}
export const MAX_IMAGE_BYTES=32*1024*1024;
export function imageExtension(type:string):string{
 return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/heic':'heic','image/svg+xml':'svg'} as Record<string,string>)[type.split(';')[0].toLowerCase()]||'img';
}
/** Checks transport completeness and standard raster container endings. */
export function assertCompleteImage(data:Uint8Array,type:string,expectedBytes?:number):void{
 if(!data.byteLength||expectedBytes!==undefined&&expectedBytes!==data.byteLength)throw new IncompleteImageError('La imagen llegó incompleta. Vuelve a intentar la descarga.');
 const mime=type.split(';')[0].toLowerCase();
 if(mime==='image/jpeg'){
  if(data.length<4||data[0]!==255||data[1]!==216)throw new IncompleteImageError('El archivo recibido no es una imagen JPEG válida.');
  let end=false;for(let i=data.length-2;i>=Math.max(2,data.length-1024);i--)if(data[i]===255&&data[i+1]===217){end=true;break;}
  if(!end)throw new IncompleteImageError('La imagen JPEG llegó cortada; no se guardó como completa.');
 }else if(mime==='image/png'){
  const signature=[137,80,78,71,13,10,26,10];
  if(data.length<33||signature.some((b,i)=>data[i]!==b)||String.fromCharCode(...data.slice(-8,-4))!=='IEND')throw new IncompleteImageError('La imagen PNG llegó incompleta.');
 }else if(mime==='image/webp'){
  if(data.length<20||String.fromCharCode(...data.slice(0,4))!=='RIFF'||String.fromCharCode(...data.slice(8,12))!=='WEBP'||new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(4,true)+8!==data.length)throw new IncompleteImageError('La imagen WebP llegó incompleta.');
 }else if(mime==='image/gif'){
  if(data.length<14||!['GIF87a','GIF89a'].includes(String.fromCharCode(...data.slice(0,6)))||data[data.length-1]!==59)throw new IncompleteImageError('La imagen GIF llegó incompleta.');
 }
}
export function assertFullResponse(status:number,contentRange:string|null):void{
 if(status!==206)return;
 const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange||'');
 if(!match||Number(match[1])!==0||Number(match[2])+1!==Number(match[3]))throw new IncompleteImageError('El origen devolvió solo una parte del archivo. No se descargó como una imagen completa.');
}
export async function readImage(response:Response):Promise<Uint8Array<ArrayBuffer>>{
 assertFullResponse(response.status,response.headers.get('content-range'));
 const length=Number(response.headers.get('content-length'));
 if(length>MAX_IMAGE_BYTES){await response.body?.cancel();throw new Error('Esta imagen supera el límite de 32 MB.');}
 const reader=response.body?.getReader();if(!reader)throw new IncompleteImageError('La imagen está vacía.');
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_IMAGE_BYTES)throw new Error('Esta imagen supera el límite de 32 MB.');chunks.push(value);}}
 catch(error){if(error instanceof IncompleteImageError)throw error;throw new IncompleteImageError('La imagen no terminó de descargarse. Vuelve a intentarlo.');}
 finally{await reader.cancel();}
 const output=new Uint8Array(total);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}
 assertCompleteImage(output,response.headers.get('content-type')||'',length>0&&!response.headers.get('content-encoding')?length:undefined);
 return output;
}
