import type { Media } from './media';
export function mediaOptions(items:Media[]):Media[]{
  const derived=items.filter(item=>item.kind==='video'&&!items.some(other=>other.kind==='audio'&&other.url===item.url)).map(item=>({...item,kind:'audio' as const,derivedFromVideo:true}));
  return [...items,...derived];
}
export function selectionMessage(raw: Media[], selected: Media['kind']): string | null {
  const items=mediaOptions(raw);
  if (items.some(item => item.kind === selected)) return null;
  if (!items.length) return 'No encontramos archivos públicos en esta página. Prueba un enlace directo a un archivo multimedia.';
  if (selected === 'video') {
    return items.every(item => item.kind === 'image')
      ? 'Solo encontramos imágenes o la portada de la página. No encontramos un vídeo descargable. Puedes ver las imágenes en la opción Imagen.'
      : 'No encontramos un vídeo descargable. Revisa los otros formatos disponibles.';
  }
  if (selected === 'audio') return 'No encontramos una pista de audio ni un vídeo del que extraerla.';
  return 'No encontramos imágenes descargables. Revisa los otros formatos disponibles.';
}
