'use client';
import type { Tool } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { pick } from '@/lib/i18n/locale';

/**
 * Plain <details> elements: the accordion works before any JavaScript loads, and
 * screen readers get the open/closed state for free.
 */
export function Faq({ items }: { items: Tool['faq'] }) {
  const { locale } = useLocale();
  const t = strings[locale];

  return (
    <section className="band" aria-labelledby="faq">
      <h2 id="faq" className="band-title">
        {t.faq.title}
      </h2>
      <div className="faq">
        {items.map(item => (
          <details key={pick(item.question, 'en')}>
            <summary>
              <h3>{pick(item.question, locale)}</h3>
            </summary>
            <p>{pick(item.answer, locale)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
