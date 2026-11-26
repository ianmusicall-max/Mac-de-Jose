'use client';
import type { Tool } from '@/lib/tools';
import { Downloader } from '@/components/downloader';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Benefits } from '@/components/sections/benefits';
import { Faq } from '@/components/sections/faq';
import { ToolLinks } from '@/components/sections/tool-links';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { pick } from '@/lib/i18n/locale';

/**
 * The shape every tool page shares: headline, the downloader itself, then the
 * supporting sections. Each route supplies only its entry from the catalogue.
 */
export function ToolPage({ tool }: { tool: Tool }) {
  const { locale } = useLocale();
  const t = strings[locale];

  return (
    <>
      <SiteHeader current={tool.path} />

      <main className="page">
        <section className="hero">
          <span className="eyebrow">
            <span /> {t.toolPage.downloaderOf(tool.platform?.toUpperCase() ?? 'INSTAGRAM')}
          </span>
          <h1>
            {pick(tool.heading, locale)}
            <br />
            <span>{pick(tool.headingAccent, locale)}</span>
          </h1>
          <p className="hero-intro">{pick(tool.intro, locale)}</p>
        </section>

        <Downloader defaultKind={tool.kind} placeholder={tool.placeholder} platform={tool.platform} formats={tool.formats} />

        <HowItWorks steps={tool.steps} />
        {!tool.platform && <Benefits />}
        {tool.platform === 'youtube' && (
          <p className="hero-intro">
            {t.toolPage.youtubeStudioNote}{' '}
            <a className="text-button" href="https://studio.youtube.com/">YouTube Studio</a>.
          </p>
        )}
        <ToolLinks current={tool.path} />
        <Faq items={tool.faq} />
      </main>

      <SiteFooter />
    </>
  );
}
