'use client';
import { ArrowDownToLine, Film, ImageIcon, Music2 } from 'lucide-react';
import type { Media } from '@/lib/media';
import { AudioDownloadButton } from '@/components/audio-download';
import { ImageDownloadButton, ImagePreview } from '@/components/image-download';
import { mediaFileUrl } from '@/lib/album';
import { VideoDownload } from '@/components/video-download';
import { VideoPreview } from '@/components/video-preview';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

const KIND_ICON = { video: Film, audio: Music2, image: ImageIcon } as const;

function describe(item: Media, t: (typeof strings)['en']['resultCard']): string {
  if (item.kind === 'video') return t.describe.video;
  if (item.kind === 'audio') return item.derivedFromVideo ? t.describe.audioFromVideo : t.describe.audio;
  return item.isPreview ? t.describe.coverImage : t.describe.image;
}

export function ResultCard({
  item,
  poster,
  position,
  offerAudio,
}: {
  item: Media;
  poster?: Media;
  position: number;
  offerAudio?: boolean;
}) {
  const { locale } = useLocale();
  const t = strings[locale].resultCard;
  const kindLabel = strings[locale].downloader.kindLabel;
  const Icon = KIND_ICON[item.kind];
  const dimensions = item.width && item.height ? ` · ${item.width}×${item.height}` : '';

  return (
    <article className={`result${item.kind === 'video' ? ' result-video' : ''}`}>
      {item.kind === 'image' ? (
        <ImagePreview item={item} />
      ) : (
        <span className="file-icon">
          <Icon size={24} />
        </span>
      )}

      <div className={item.kind === 'video' ? 'video-details' : ''}>
        <h3>{item.title || t.file(position)}</h3>
        <small>
          {describe(item, t)}{item.quality && ` · ${item.quality}`} · {new URL(item.url).hostname}
          {dimensions}
        </small>
      </div>

      {item.kind === 'video' && <VideoPreview item={item} poster={poster} />}

      {item.derivedFromVideo ? (
        <AudioDownloadButton item={item} />
      ) : item.kind === 'image' ? (
        <ImageDownloadButton item={item} />
      ) : item.kind === 'video' ? (
        <VideoDownload key={mediaFileUrl(item)} href={mediaFileUrl(item)}>
          {offerAudio && <AudioDownloadButton item={item} />}
        </VideoDownload>
      ) : (
        <a className="download" href={mediaFileUrl(item)}>
          <ArrowDownToLine size={17} /> {t.download(kindLabel[item.kind])}
        </a>
      )}
    </article>
  );
}
