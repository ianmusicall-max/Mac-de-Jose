import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { TermsContent } from '@/components/legal/terms-content';

export const metadata: Metadata = {
  title: 'Terms of use · SnapReel',
  description: 'Conditions and limits of using SnapReel.',
  alternates: { canonical: '/terminos' },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="/terminos" />

      <main className="page">
        <TermsContent />
      </main>

      <SiteFooter />
    </>
  );
}
