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
            <span /> DESCARGADOR DE INSTAGRAM
          </span>
          <h1>
            {tool.heading}
            <br />
            <span>{tool.headingAccent}</span>
          </h1>
          <p className="hero-intro">{tool.intro}</p>
        </section>

        <Downloader defaultKind={tool.kind} placeholder={tool.placeholder} />

        <HowItWorks steps={tool.steps} />
        <Benefits />
        <ToolLinks current={tool.path} />
        <Faq items={tool.faq} />
      </main>

      <SiteFooter />
    </>
  );
}
