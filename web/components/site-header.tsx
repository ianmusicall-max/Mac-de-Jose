import { ArrowDownToLine } from 'lucide-react';
import { TOOLS } from '@/lib/tools';

export function SiteHeader({ current }: { current: string }) {
  return (
    <header className="site-header">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
      <a className="brand" href="/" aria-label="VideoVault, inicio">
        <span className="brand-icon">
          <ArrowDownToLine size={22} />
        </span>
        VideoVault
        <span className="beta">WEB</span>
      </a>

      <nav className="site-nav" aria-label="Herramientas">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
        <a href="/" className={current === '/' ? 'site-nav-link current' : 'site-nav-link'} aria-current={current === '/' ? 'page' : undefined}>
          Inicio
        </a>
        {TOOLS.map(tool => (
          <a
            key={tool.path}
            href={tool.path}
            className={tool.path === current ? 'site-nav-link current' : 'site-nav-link'}
            aria-current={tool.path === current ? 'page' : undefined}
          >
            {tool.nav}
          </a>
        ))}
      </nav>
    </header>
  );
}
