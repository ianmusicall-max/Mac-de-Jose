'use client';
import { Camera, Film, Music2 } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Downloader } from '@/components/downloader';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Benefits } from '@/components/sections/benefits';
import { HOME_STEPS, toolByPath } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { ReelyVideo } from '@/components/reely-video';

/**
 * The home page carries YouTube's own downloader rather than a link to it:
 * a visitor can paste a link without choosing anything first. YouTube gets
 * that spot because it is the one platform that serves its public page and
 * its media to anyone, so it is the only tool here that works dependably.
 */
const FEATURED_PATH = '/youtube';

const PLATFORMS = [
  { name: 'Instagram', path: '/instagram', Icon: Camera },
  { name: 'TikTok', path: '/tiktok', Icon: Music2 },
  { name: 'Facebook', path: '/facebook', Icon: Film },
] as const;

export default function Home() {
  const { locale } = useLocale();
  const t = strings[locale].home;
  const featured = toolByPath(FEATURED_PATH);

  return (
    <>
      <SiteHeader current="/" />
      <main className="page">
        <section className="hero hero-with-reel" aria-labelledby="home-title">
          <div className="hero-copy">
            <h1 id="home-title">{t.titleLead}{' '}<span>{t.titleAccent}</span></h1>
            <p className="hero-intro">{t.intro}</p>
          </div>
          <figure id="reely" className="reely-preview">
            <ReelyVideo locale={locale} label={t.reelyVideo} />
            <figcaption>{t.reelyTitle}</figcaption>
          </figure>
        </section>
        {featured && (
          <>
            <span className="eyebrow">
              <span /> {strings[locale].toolPage.downloaderOf('YOUTUBE')}
            </span>
            <Downloader
              defaultKind={featured.kind}
              placeholder={featured.placeholder}
              platform={featured.platform}
              formats={featured.formats}
            />
          </>
        )}
        <h2 className="band-title platform-others-title">{t.otherPlatforms}</h2>
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
        <HowItWorks steps={HOME_STEPS} />
        <Benefits />
      </main>
      <SiteFooter />
    </>
  );
}
