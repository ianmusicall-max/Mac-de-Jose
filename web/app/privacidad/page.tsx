import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PrivacyContent } from '@/components/legal/privacy-content';

export const metadata: Metadata = {
  title: 'Privacy · SnapReel',
  description: 'What data SnapReel handles and what it does not keep.',
  alternates: { canonical: '/privacidad' },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="/privacidad" />

      <main className="page">
        <PrivacyContent />
      </main>

      <SiteFooter />
    </>
  );
}
