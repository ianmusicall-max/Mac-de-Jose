import type { Metadata } from 'next';
import './globals.css';

const title = 'VideoVault · Instagram, TikTok y YouTube';
const description = 'Elige Instagram, TikTok o YouTube para descargar vídeos, audio o fotos con VideoVault.';

export const metadata: Metadata = {
  title: { default: title, template: '%s' },
  description,
  applicationName: 'VideoVault',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'VideoVault',
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
