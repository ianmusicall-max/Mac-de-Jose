'use client';
import type { Media } from '@/lib/media';
import { mediaFileUrl } from '@/lib/album';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function VideoPreview({ item, poster }: { item: Media; poster?: Media }) {
  const { locale } = useLocale();
  const t = strings[locale].videoPreview;
  return (
    <details className="preview-details">
      <summary>{strings[locale].videoDownload.preview}</summary>
      <video
        className="video-preview"
        controls
        playsInline
        preload="none"
        src={mediaFileUrl(item, true)}
        poster={poster ? mediaFileUrl(poster, true) : undefined}
        aria-label={t.label(item.title || t.fallbackTitle)}
      />
    </details>
  );
}
