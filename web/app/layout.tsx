import type { Metadata } from 'next';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { ThemeProvider } from '@/lib/theme-context';
import './globals.css';

const title = 'SnapReel · Instagram, TikTok, Facebook and YouTube';
const description = 'Choose Instagram, TikTok, Facebook or YouTube to download videos, audio or photos with SnapReel.';

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
    locale: 'en_US',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6339208855562328"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
