'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, LoaderCircle, ImageIcon } from 'lucide-react';
import type { Media } from '@/lib/media';
import { albumZip, mediaFileUrl, MAX_ALBUM_BYTES, type AlbumFile } from '@/lib/album';
import { dispositionFilename, namedDownload } from '@/lib/download-name';
import { readImage } from '@/lib/image-file';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

async function load(
  item: Media,
  signal: AbortSignal,
  imageError: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; type: string; name: string }> {
  const response = await fetch(mediaFileUrl(item), { signal });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.startsWith('image/')) {
    throw new Error(type.startsWith('text/plain') ? (await response.text()).slice(0, 300) : imageError);
  }
  return {
    data: await readImage(response),
    type,
    name: dispositionFilename(response.headers.get('content-disposition')) ?? namedDownload(item.title, type),
  };
}

function save(data: Uint8Array<ArrayBuffer>, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function ImagePreview({ item }: { item: Media }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="file-icon"><ImageIcon size={24} /></span>
  ) : (
    <img className="image-preview" src={mediaFileUrl(item, true)} alt={item.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}

export function ImageDownloadButton({ item }: { item: Media }) {
  const { locale } = useLocale();
  const t = strings[locale].imageDownload;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function download() {
    if (busy) return;
    setBusy(true);
    setError('');
    active.current = new AbortController();
    try {
      const file = await load(item, active.current.signal, t.imageError);
      save(file.data, file.type, file.name);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : t.downloadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="audio-action">
      <button className="download" type="button" disabled={busy} onClick={download}>
        {busy ? (<><LoaderCircle size={17} className="spin" /> {t.downloading}</>) : (<><ArrowDownToLine size={17} /> {t.download}</>)}
      </button>
      {error && <p className="audio-error" role="alert">{error}</p>}
    </div>
  );
}

export function AlbumDownloadButton({ items }: { items: Media[] }) {
  const { locale } = useLocale();
  const t = strings[locale].imageDownload;
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function download() {
    if (progress !== null) return;
    setProgress(0);
    setError('');
    active.current = new AbortController();
    try {
      const files: AlbumFile[] = [];
      let total = 0;
      for (const [position, item] of items.entries()) {
        const file = await load(item, active.current.signal, t.imageError);
        total += file.data.length;
        if (total > MAX_ALBUM_BYTES) throw new Error(t.albumTooBig);
        files.push({ ...file, index: item.albumIndex || position + 1 });
        setProgress(position + 1);
      }
      const zip = albumZip(files);
      const name = items[0]?.title.replace(/ · (?:imagen|portada|image|cover|imagem|capa) \d+$/i, '') || t.defaultAlbumName;
      save(zip, 'application/zip', namedDownload(name, 'application/zip'));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError((e instanceof Error ? e.message : t.albumError) + t.albumErrorSuffix);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="album-actions">
      <button type="button" className="download" disabled={progress !== null} onClick={download}>
        {progress !== null ? (<><LoaderCircle size={17} className="spin" /> {t.albumProgress(progress, items.length)}</>) : (<><ArrowDownToLine size={17} /> {t.downloadAlbum(items.length)}</>)}
      </button>
      {error && <p className="audio-error" role="alert">{error}</p>}
    </div>
  );
}
