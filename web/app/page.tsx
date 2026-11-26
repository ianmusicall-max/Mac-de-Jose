'use client';
import { Camera, Film, Music2 } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';

const PLATFORMS = [
  { name: 'Instagram', path: '/instagram', Icon: Camera },
  { name: 'TikTok', path: '/tiktok', Icon: Music2 },
  { name: 'Facebook', path: '/facebook', Icon: Film },
  { name: 'YouTube', path: '/youtube', Icon: Film },
] as const;

export default function Home() {
  const { locale } = useLocale();
  const t = strings[locale].home;

  return (
    <>
      <SiteHeader current="/" />
      <main className="page">
        <section className="hero" aria-labelledby="home-title">
          <h1 id="home-title">{t.titleLead}{' '}<span>{t.titleAccent}</span></h1>
          <p className="hero-intro">{t.intro}</p>
        </section>
        <div className="tool-links platform-links">
          {PLATFORMS.map(({ name, path, Icon }) => (
            <a key={path} href={path} className="tool-link">
              <span className="benefit-icon" aria-hidden="true"><Icon size={20} /></span>
              <h2>{name}</h2>
              <p>{t.platforms[name]}</p>
              <span className="tool-link-go">{t.open(name)}</span>
            </a>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
