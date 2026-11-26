import type { Metadata } from 'next';
import './globals.css';

const title = 'SnapReel · Instagram, TikTok, Facebook y YouTube';
const description = 'Elige Instagram, TikTok, Facebook o YouTube para descargar vídeos, audio o fotos con SnapReel.';

export const metadata: Metadata = {
  title: { default: title, template: '%s' },
  description,
  applicationName: 'SnapReel',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'SnapReel',
    title,
    description,
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
