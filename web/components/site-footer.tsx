'use client';
import { TOOLS } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { pick } from '@/lib/i18n/locale';

export function SiteFooter() {
  const { locale } = useLocale();
  const t = strings[locale];

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2>{t.footer.tools}</h2>
          <ul>
            <li>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
              <a href="/">{t.footer.home}</a>
            </li>
            {TOOLS.map(tool => (
              <li key={tool.path}>
                <a href={tool.path}>{pick(tool.nav, locale)}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>{t.footer.legal}</h2>
          <ul>
            <li>
              <a href="/privacidad">{t.footer.privacy}</a>
            </li>
            <li>
              <a href="/terminos">{t.footer.terms}</a>
            </li>
          </ul>
        </div>

        <div className="footer-note">
          <h2>{t.footer.about}</h2>
          <p>{t.footer.aboutP1}</p>
          <p>{t.footer.aboutP2}</p>
        </div>
      </div>

      <p className="footer-limits">{t.footer.limits}</p>
    </footer>
  );
}
