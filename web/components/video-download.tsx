'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, Share } from 'lucide-react';
import { dispositionFilename, namedDownload } from '@/lib/download-name';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function VideoDownload({ href, isMp4, children }: { href: string; isMp4: boolean; children?: ReactNode }) {
  const { locale } = useLocale();
  const t = strings[locale].videoDownload;
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);

  async function saveToPhotos() {
    setBusy(true);
    setFallback(false);
    try {
      if (!navigator.share || !navigator.canShare) {
        setFallback(true);
        return;
      }

      if (file) {
        // Call share directly from the tap so Safari still has user activation.
        await navigator.share({ files: [file] });
        return;
      }

      const response = await fetch(href);
      const type = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
      if (!response.ok || !type.startsWith('video/')) {
        setFallback(true);
        return;
      }

      const blob = await response.blob();
      const name = dispositionFilename(response.headers.get('content-disposition')) ?? namedDownload('SnapReel', type);
      const video = new File([blob], name, { type });
      if (!video.size || !navigator.canShare({ files: [video] })) {
        setFallback(true);
        return;
      }
      setFile(video);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setFallback(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="video-download">
      <div className="video-download-actions">
        <a className="download" href={href}>
          <ArrowDownToLine size={17} /> {isMp4 ? t.downloadMp4 : t.downloadVideo}
        </a>
        <button className="download secondary-download" type="button" disabled={busy} onClick={saveToPhotos}>
          <Share size={17} /> {busy && !file ? t.preparing : file ? t.shareVideo : t.saveToPhotos}
        </button>
        {children}
      </div>
      <div aria-live="polite">
        {fallback ? (
          <small>{t.fallbackHelp}</small>
        ) : file ? (
          <small>{t.readyHelp}</small>
        ) : null}
      </div>
    </div>
  );
}
