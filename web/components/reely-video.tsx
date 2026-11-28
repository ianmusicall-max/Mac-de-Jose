'use client';
import { useState, type SyntheticEvent } from 'react';
import type { Locale } from '@/lib/i18n/locale';

export function ReelyVideo({ locale, label }: { locale: Locale; label: string }) {
  const [scene, setScene] = useState(0);
  const english = locale !== 'es';

  function updateScene(event: SyntheticEvent<HTMLVideoElement>) {
    const next = Math.floor(event.currentTarget.currentTime);
    setScene(current => current === next ? current : next);
  }

  return (
    <div className="reely-video-shell">
      <video
        aria-label={label}
        autoPlay
        muted
        controls
        playsInline
        preload="metadata"
        poster="/mascot/reely-start.jpg"
        width={1080}
        height={1920}
        src="/mascot/reely.mp4"
        onTimeUpdate={updateScene}
        onSeeked={updateScene}
      />
      {english && (
        <div className="reely-english-overlays">
          {scene < 3 && <span className="reely-copy reely-copy-phone">Can’t save this video 😩</span>}
          {scene >= 4 && scene < 7 && (
            <span className="reely-copy reely-copy-headline">Paste the link.<br />Reely downloads it.</span>
          )}
          {scene >= 3 && scene < 6 && <span className="reely-copy reely-copy-download-right">Download</span>}
          {scene >= 7 && scene < 9 && <span className="reely-copy reely-copy-download-left">Download</span>}
          {scene >= 11 && scene < 14 && <span className="reely-copy reely-copy-outro">Free. No sign-up.</span>}
          {scene >= 14 && <span className="reely-copy reely-copy-cta">Try it now.</span>}
        </div>
      )}
    </div>
  );
}
