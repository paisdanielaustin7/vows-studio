import React from 'react';
import type { Metadata } from 'next';
import { getPublicPortfolioItems, getPublicPageSeo } from '@/server/queries/website.queries';
import { PortfolioView } from '@/components/public/portfolio-view';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/portfolio',
    'Curated Wedding Portfolio & Monographs — VOWS Studio',
    'Explore curated wedding monographs, chapel solemnizations, and 35mm analog stills across Goa and Mangalore.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.metaTitle || undefined,
      description: seo.metaDescription || undefined,
    },
  };
}

export default async function PortfolioPage() {
  const items = await getPublicPortfolioItems();

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Curated Monograph Archive
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            Selected Works &amp; Sacramental Stills
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
            Every frame presented here was captured with natural light, unscripted observation, and explicit client consent. Click any monograph to enter our high-resolution lightbox.
          </p>
        </div>

        {/* Portfolio View */}
        <PortfolioView initialItems={items} />
      </div>
    </div>
  );
}
