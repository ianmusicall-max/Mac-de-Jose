'use client';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

export function PrivacyContent() {
  const { locale } = useLocale();
  const t = strings[locale].legal;

  return (
    <>
      <h1>{t.privacyTitle}</h1>

      <div className="legal">
        <p>{t.privacyIntro}</p>

        <h2>{t.privacyNoAccountsH}</h2>
        <p>{t.privacyNoAccountsP}</p>

        <h2>{t.privacyBrowserH}</h2>
        <p>{t.privacyBrowserP}</p>

        <h2>{t.privacyServerH}</h2>
        <ul>
          {t.privacyServerItems.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t.privacyServerFooter}</p>

        <h2>{t.privacyRequestsH}</h2>
        <p>{t.privacyRequestsP}</p>

        <h2>{t.privacyThirdPartyH}</h2>
        <p>{t.privacyThirdPartyP}</p>
      </div>
    </>
  );
}
