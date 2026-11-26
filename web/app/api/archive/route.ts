// Restores a previously obtained file into this owner-private Site's archive.
// Sites authenticates access before this endpoint; preserve owner-private access.
import {bucket,archive} from '@/lib/server-storage';
import {digest} from '@/lib/archive';
import {publicUrl,kind} from '@/lib/media';
export async function POST(request:Request){
 try{
  const source=publicUrl(request.headers.get('X-Source-Url')||'').href;
  const type=request.headers.get('Content-Type')||'';const mediaKind=kind(type);
  const length=Number(request.headers.get('Content-Length'));
  if(!mediaKind||!length||length>40*1024*1024)throw new Error('Envía un archivo multimedia de hasta 40 MB.');
  const data=await request.arrayBuffer();if(data.byteLength!==length)throw new Error('El archivo llegó incompleto.');
  const assetId=await digest(source+':'+await crypto.subtle.digest('SHA-256',data).then(b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('')));
  const extensions:Record<string,string>={'video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/mp4':'m4a','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const extension=extensions[type.split(';')[0]]||'bin';
  await bucket().put('files/'+assetId,data,{httpMetadata:{contentType:type},customMetadata:{filename:'snapreel.'+extension}});
  const result=await archive.save(source,{title:'Archivo guardado',items:[{url:source,assetId,kind:mediaKind,title:'Archivo guardado'}]});
  return Response.json({...result,fromArchive:true});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'No se pudo importar el archivo.'},{status:400});}
}
