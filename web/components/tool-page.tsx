import type { Tool } from '@/lib/tools';
import { Downloader } from '@/components/downloader';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Benefits } from '@/components/sections/benefits';
import { Faq } from '@/components/sections/faq';
import { ToolLinks } from '@/components/sections/tool-links';

/**
 * The shape every tool page shares: headline, the downloader itself, then the
 * supporting sections. Each route supplies only its entry from the catalogue.
 */
export function ToolPage({ tool }: { tool: Tool }) {
  return (
    <>
      <SiteHeader current={tool.path} />

      <main className="page">
        <section className="hero">
          <span className="eyebrow">
            <span /> DESCARGADOR DE {tool.platform?.toUpperCase() ?? 'INSTAGRAM'}
          </span>
          <h1>
            {tool.heading}
            <br />
            <span>{tool.headingAccent}</span>
          </h1>
          <p className="hero-intro">{tool.intro}</p>
        </section>

        <Downloader defaultKind={tool.kind} placeholder={tool.placeholder} platform={tool.platform} formats={tool.formats} />

        <HowItWorks steps={tool.steps} />
        {!tool.platform && <Benefits />}
        {tool.platform === 'youtube' && (
          <p className="hero-intro">
            Si el vídeo es tuyo, también puedes descargarlo desde{' '}
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
