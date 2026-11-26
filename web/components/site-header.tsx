'use client';
import { ArrowDownToLine, Moon, Sun } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { LOCALES, pick, type Locale } from '@/lib/i18n/locale';
import { useTheme } from '@/lib/theme-context';

export function SiteHeader({ current }: { current: string }) {
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const t = strings[locale];
  const isDark = theme === 'dark';

  return (
    <header className="site-header">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
      <a className="brand" href="/" aria-label={t.header.brandLabel}>
        <span className="brand-icon">
          <ArrowDownToLine size={22} />
        </span>
        SnapReel
        <span className="beta">WEB</span>
      </a>

      <nav className="site-nav" aria-label={t.header.nav}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
        <a href="/" className={current === '/' ? 'site-nav-link current' : 'site-nav-link'} aria-current={current === '/' ? 'page' : undefined}>
          {t.header.home}
        </a>
        {TOOLS.map(tool => (
          <a
            key={tool.path}
            href={tool.path}
            className={tool.path === current ? 'site-nav-link current' : 'site-nav-link'}
            aria-current={tool.path === current ? 'page' : undefined}
          >
            {pick(tool.nav, locale)}
          </a>
        ))}
      </nav>

      <div className="header-controls">
        <div className="locale-switch" role="group" aria-label={t.header.switchLanguage}>
          {LOCALES.map(code => (
            <button
              key={code}
              type="button"
              className={code === locale ? 'locale-option current' : 'locale-option'}
              aria-pressed={code === locale}
              onClick={() => setLocale(code as Locale)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="theme-toggle"
          aria-label={isDark ? t.header.switchToLight : t.header.switchToDark}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
