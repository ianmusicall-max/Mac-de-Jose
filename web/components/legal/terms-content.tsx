'use client';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function TermsContent() {
  const { locale } = useLocale();
  const t = strings[locale].legal;

  return (
    <>
      <h1>{t.termsTitle}</h1>

      <div className="legal">
        <h2>{t.termsWhatH}</h2>
        <p>{t.termsWhatP}</p>

        <h2>{t.termsYoursH}</h2>
        <p>{t.termsYoursP}</p>
        <ul>
          {t.termsYoursItems.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.termsGuaranteeH}</h2>
        <p>{t.termsGuaranteeP}</p>

        <h2>{t.termsUnsupportedH}</h2>
        <ul>
          {t.termsUnsupportedItems.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.termsInstagramH}</h2>
        <p>{t.termsInstagramP}</p>
      </div>
    </>
  );
}
