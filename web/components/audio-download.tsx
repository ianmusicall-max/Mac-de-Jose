'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDownToLine,LoaderCircle} from 'lucide-react';
import type {Media} from '@/lib/media';
export function AudioDownloadButton({item}:{item:Media}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function download(){
  if(busy)return;setBusy(true);setError('');active.current=new AbortController();
  try{
   const params=new URLSearchParams({url:item.url});if(item.assetId)params.set('id',item.assetId);
   const response=await fetch('/api/audio?'+params,{signal:active.current.signal});
   const type=response.headers.get('content-type')||'';
   if(!response.ok||!type.startsWith('audio/'))throw new Error(type.startsWith('text/plain')?(await response.text()).slice(0,300):'No se pudo preparar el audio. Vuelve a intentar la descarga.');
   const blob=await response.blob();if(!blob.size)throw new Error('La pista de audio está vacía.');
   const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='videovault-audio.m4a';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'No se pudo extraer el audio.');}
  finally{setBusy(false);}
 }
 return <div className="audio-action"><button type="button" className="download" onClick={download} disabled={busy} aria-busy={busy}>{busy?<><LoaderCircle size={17} className="spin"/> Extrayendo…</>:<><ArrowDownToLine size={17}/> Extraer audio M4A</>}</button>{error&&<p className="audio-error" role="alert">{error}</p>}</div>;
}
