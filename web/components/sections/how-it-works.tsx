'use client';
import type { Tool } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { pick } from '@/lib/i18n/locale';

export function HowItWorks({ steps }: { steps: Tool['steps'] }) {
  const { locale } = useLocale();
  const t = strings[locale];

  return (
    <section className="band" aria-labelledby="pasos">
      <h2 id="pasos" className="band-title">
        {t.howItWorks.title}
      </h2>
      <ol className="steps">
        {steps.map((step, index) => (
          <li key={pick(step.heading, 'en')}>
            <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
            <h3>{pick(step.heading, locale)}</h3>
            <p>{pick(step.body, locale)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
