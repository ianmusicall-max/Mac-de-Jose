import {zipSync} from 'fflate';
import type {Media} from './media';
import {imageExtension} from './image-file.ts';
export type AlbumFile={data:Uint8Array<ArrayBuffer>;type:string;index:number};
export const MAX_ALBUM_BYTES=100*1024*1024;
export function mediaFileUrl(item:Media,inline=false):string{
 const params=new URLSearchParams({url:item.url});if(item.assetId)params.set('id',item.assetId);if(inline)params.set('inline','1');return '/api/download?'+params;
}
export function albumZip(files:AlbumFile[]):Uint8Array<ArrayBuffer>{
 if(!files.length)throw new Error('No hay imágenes para descargar.');
 if(files.reduce((total,file)=>total+file.data.length,0)>MAX_ALBUM_BYTES)throw new Error('El álbum supera 100 MB. Descarga las imágenes por separado.');
 const entries:Record<string,Uint8Array>={};
 for(const [position,file] of files.entries())entries[`imagen-${String(file.index||position+1).padStart(3,'0')}-${position+1}.${imageExtension(file.type)}`]=file.data;
 return new Uint8Array(zipSync(entries,{level:0}));
}
