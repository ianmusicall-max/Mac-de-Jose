'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, Share } from 'lucide-react';
import { downloadName } from '@/lib/download-name';

export function VideoDownload({ href, children }: { href: string; children?: ReactNode }) {
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
      const name = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'videovault';
      const video = new File([blob], downloadName(name, type), { type });
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
          <ArrowDownToLine size={17} /> Descargar vídeo
        </a>
        <button className="download" type="button" disabled={busy} onClick={saveToPhotos}>
          <Share size={17} /> {busy && !file ? 'Preparando vídeo…' : file ? 'Compartir vídeo' : 'Guardar en Fotos'}
        </button>
        {children}
      </div>
      <div aria-live="polite">
        {fallback ? (
          <small>Descarga el vídeo y ábrelo en Archivos. Toca Compartir y elige Guardar vídeo si aparece la opción.</small>
        ) : file ? (
          <small>Toca Compartir vídeo y elige Guardar vídeo si aparece la opción.</small>
        ) : null}
      </div>
    </div>
  );
}
