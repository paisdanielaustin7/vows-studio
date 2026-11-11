import React from 'react';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { CookieBanner } from '@/components/public/cookie-banner';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)] selection:text-[var(--primary)]">
      <PublicHeader />
      <main className="flex-1 pt-20">
        {children}
      </main>
      <PublicFooter />
      <CookieBanner />
    </div>
  );
}
