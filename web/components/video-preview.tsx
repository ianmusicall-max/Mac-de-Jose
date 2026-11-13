'use client';
import type {Media} from '@/lib/media';
import {mediaFileUrl} from '@/lib/album';

export function VideoPreview({item,poster}:{item:Media;poster?:Media}){
 return <video className="video-preview" controls playsInline preload="metadata" src={mediaFileUrl(item,true)} poster={poster?mediaFileUrl(poster,true):undefined} aria-label={`Vista previa de ${item.title||'vídeo'}`}/>;
}
