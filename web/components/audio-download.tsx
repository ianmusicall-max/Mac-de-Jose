'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, LoaderCircle } from 'lucide-react';
import { dispositionFilename, namedDownload } from '@/lib/download-name';
import type { Media } from '@/lib/media';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function AudioDownloadButton({ item }: { item: Media }) {
  const { locale } = useLocale();
  const t = strings[locale].audioDownload;
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
      const params = new URLSearchParams({ url: item.url, name: item.title.slice(0, 400) });
      if (item.assetId) params.set('id', item.assetId);
      const response = await fetch('/api/audio?' + params, { signal: active.current.signal });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('audio/')) {
        throw new Error(type.startsWith('text/plain') ? (await response.text()).slice(0, 300) : t.prepareError);
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error(t.emptyTrack);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = dispositionFilename(response.headers.get('content-disposition')) ?? namedDownload(item.title, type);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="audio-action">
      <button type="button" className="download" onClick={download} disabled={busy} aria-busy={busy}>
        {busy ? (<><LoaderCircle size={17} className="spin" /> {t.extracting}</>) : (<><ArrowDownToLine size={17} /> {t.download}</>)}
      </button>
      {error && <p className="audio-error" role="alert">{error}</p>}
    </div>
  );
}
