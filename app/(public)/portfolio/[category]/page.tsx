import React from 'react';
import type { Metadata } from 'next';
import { getPublicPortfolioItems, getPublicPageSeo } from '@/server/queries/website.queries';
import { PortfolioView } from '@/components/public/portfolio-view';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const formatted = category.replace('_', ' ').replace('-', ' ');
  const seo = await getPublicPageSeo(
    `/portfolio/${category}`,
    `${formatted.toUpperCase()} Portfolio — VOWS`,
    `Curated ${formatted} wedding photography and cinema monographs by VOWS.`
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function PortfolioCategoryPage({
  params,
}: CategoryPageProps) {
  const { category } = await params;
  const items = await getPublicPortfolioItems(category);

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Category: {category.replace('_', ' ')}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight capitalize">
            {category.replace('_', ' ')} Monographs
          </h1>
        </div>

        <PortfolioView initialItems={items} activeCategory={category} />
      </div>
    </div>
  );
}
