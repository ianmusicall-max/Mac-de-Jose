'use client';
import { Eye, HardDriveDownload, KeyRound, Smartphone } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

const ICONS = [KeyRound, Smartphone, HardDriveDownload, Eye];

export function Benefits() {
  const { locale } = useLocale();
  const t = strings[locale];

  return (
    <section className="band" aria-labelledby="ventajas">
      <h2 id="ventajas" className="band-title">
        {t.benefits.title}
      </h2>
      <div className="benefits">
        {t.benefits.items.map(({ heading, body }, index) => {
          const Icon = ICONS[index];
          return (
            <article key={heading}>
              <span className="benefit-icon">
                <Icon size={18} />
              </span>
              <h3>{heading}</h3>
              <p>{body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
