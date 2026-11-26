'use client';
import { Camera, Film, Music2 } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Benefits } from '@/components/sections/benefits';
import { HOME_STEPS } from '@/lib/tools';
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
        <section className="hero hero-with-mascot" aria-labelledby="home-title">
          <div className="hero-copy">
            <h1 id="home-title">{t.titleLead}{' '}<span>{t.titleAccent}</span></h1>
            <p className="hero-intro">{t.intro}</p>
            <a className="reely-jump" href="#reely">{t.reelyTitle}</a>
          </div>
          {/* The locally hosted illustration uses its intrinsic aspect ratio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-mascot" src="/mascot/reely.png" alt="" width={640} height={467} />
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
        <section id="reely" className="reely-preview" aria-labelledby="reely-title">
          <h2 id="reely-title">{t.reelyTitle}</h2>
          <video
            aria-label={t.reelyVideo}
            controls
            playsInline
            preload="none"
            poster="/mascot/reely-poster.webp"
            width={1080}
            height={1920}
          >
            <source src="/mascot/reely.mp4" type="video/mp4" />
          </video>
        </section>
        <HowItWorks steps={HOME_STEPS} />
        <Benefits />
      </main>
      <SiteFooter />
    </>
  );
}
