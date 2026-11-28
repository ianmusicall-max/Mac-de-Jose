'use client';
import type { Media } from '@/lib/media';
import { mediaFileUrl } from '@/lib/album';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function VideoPreview({ item, poster }: { item: Media; poster?: Media }) {
  const { locale } = useLocale();
  const t = strings[locale].videoPreview;
  return (
    <figure className="preview-details">
      <figcaption>{strings[locale].videoDownload.preview}</figcaption>
      <video
        className="video-preview"
        controls
        playsInline
        preload="metadata"
        src={mediaFileUrl(item, true)}
        poster={poster ? mediaFileUrl(poster, true) : undefined}
        aria-label={t.label(item.title || t.fallbackTitle)}
      />
    </figure>
  );
}
