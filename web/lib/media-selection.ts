import type { Media } from './media';
import type { strings } from './i18n/strings';

type SelectionText = (typeof strings)['en']['selection'];

export function mediaOptions(items:Media[]):Media[]{
  const derived=items.filter(item=>item.kind==='video'&&!items.some(other=>other.kind==='audio'&&other.url===item.url)).map(item=>({...item,kind:'audio' as const,derivedFromVideo:true}));
  return [...items,...derived];
}
export function selectionMessage(raw: Media[], selected: Media['kind'], t: SelectionText): string | null {
  const items=mediaOptions(raw);
  if (items.some(item => item.kind === selected)) return null;
  if (!items.length) return t.none;
  if (selected === 'video') {
    return items.every(item => item.kind === 'image') ? t.videoImagesOnly : t.videoOther;
  }
  if (selected === 'audio') return t.audio;
  return t.image;
}
