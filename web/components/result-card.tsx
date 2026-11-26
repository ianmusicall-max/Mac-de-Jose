'use client';
import { ArrowDownToLine, Film, ImageIcon, Music2 } from 'lucide-react';
import type { Media } from '@/lib/media';
import { AudioDownloadButton } from '@/components/audio-download';
import { ImageDownloadButton, ImagePreview } from '@/components/image-download';
import { VideoDownload } from '@/components/video-download';
import { VideoPreview } from '@/components/video-preview';

const KIND_LABEL = { video: 'vídeo', audio: 'audio', image: 'imagen' } as const;

const KIND_ICON = { video: Film, audio: Music2, image: ImageIcon } as const;

function describe(item: Media): string {
  if (item.kind === 'video') return 'Vídeo';
  if (item.kind === 'audio') return item.derivedFromVideo ? 'M4A · audio del vídeo' : 'Audio';
  return item.isPreview ? 'Imagen de portada' : 'Imagen';
}

function downloadHref(item: Media): string {
  const params = new URLSearchParams({ url: item.url });
  if (item.assetId) params.set('id', item.assetId);
  return '/api/download?' + params;
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
        <h3>{item.title || `Archivo ${position}`}</h3>
        <small>
          {describe(item)}{item.quality && ` · ${item.quality}`} · {new URL(item.url).hostname}
          {dimensions}
        </small>
      </div>

      {item.kind === 'video' && <VideoPreview item={item} poster={poster} />}

      {item.derivedFromVideo ? (
        <AudioDownloadButton item={item} />
      ) : item.kind === 'image' ? (
        <ImageDownloadButton item={item} />
      ) : item.kind === 'video' ? (
        <VideoDownload key={downloadHref(item)} href={downloadHref(item)}>
          {offerAudio && <AudioDownloadButton item={item} />}
        </VideoDownload>
      ) : (
        <a className="download" href={downloadHref(item)}>
          <ArrowDownToLine size={17} /> Descargar {KIND_LABEL[item.kind]}
        </a>
      )}
    </article>
  );
}
