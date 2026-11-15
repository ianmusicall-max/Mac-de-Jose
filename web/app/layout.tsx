import type { Metadata } from 'next';
import './globals.css';

import { HUB } from '@/lib/tools';

export const metadata: Metadata = {
  title: { default: HUB.title, template: '%s' },
  description: HUB.description,
  applicationName: 'VideoVault',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'VideoVault',
    title: HUB.title,
    description: HUB.description,
    locale: 'es_ES',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
