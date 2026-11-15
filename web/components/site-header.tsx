import Link from 'next/link';
import { ArrowDownToLine } from 'lucide-react';
import { TOOLS } from '@/lib/tools';

export function SiteHeader({ current }: { current: string }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="VideoVault, inicio">
        <span className="brand-icon">
          <ArrowDownToLine size={22} />
        </span>
        VideoVault
        <span className="beta">WEB</span>
      </Link>

      <nav className="site-nav" aria-label="Herramientas">
        {TOOLS.map(tool => (
          <Link
            key={tool.path}
            href={tool.path}
            className={tool.path === current ? 'site-nav-link current' : 'site-nav-link'}
            aria-current={tool.path === current ? 'page' : undefined}
          >
            {tool.nav}
          </Link>
        ))}
      </nav>
    </header>
  );
}
