'use client';
import { ArrowUpRight } from 'lucide-react';
import { otherTools } from '@/lib/tools';
import { useLocale } from '@/lib/i18n/locale-context';
import { strings } from '@/lib/i18n/strings';
import { pick } from '@/lib/i18n/locale';

export function ToolLinks({ current }: { current: string }) {
  const { locale } = useLocale();
  const t = strings[locale];
  const tools = otherTools(current);
  if (!tools.length) return null;

  return (
    <section className="band" aria-labelledby="otras">
      <h2 id="otras" className="band-title">
        {t.toolLinks.title}
      </h2>
      <div className="tool-links">
        {tools.map(tool => (
          <a key={tool.path} href={tool.path} className="tool-link">
            <h3>
              {pick(tool.heading, locale)} {pick(tool.headingAccent, locale)}
            </h3>
            <p>{pick(tool.intro, locale)}</p>
            <span className="tool-link-go">
              {t.toolLinks.open} <ArrowUpRight size={15} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
