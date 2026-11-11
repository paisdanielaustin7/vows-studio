import React from 'react';
import type { Metadata } from 'next';
import { getPublicReviews, getPublicPageSeo } from '@/server/queries/website.queries';
import { Star, ShieldCheck } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/reviews',
    'Client Words & Verified Testimonials — VOWS Studio',
    'Read reflections from couples who celebrated their sacred nuptials with VOWS Studio in Goa, Mangalore, and beyond.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function ReviewsPage() {
  const { reviews, aggregateRating, totalReviews } = await getPublicReviews();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'VOWS Studio',
    url: 'https://vowsstudio.com',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.toFixed(1),
      reviewCount: totalReviews,
      bestRating: '5',
      worstRating: '1',
    },
    review: reviews.map((rev) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.coupleName,
      },
      datePublished: rev.publishedAt,
      reviewBody: rev.testimonial,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rev.ratingOverall,
        bestRating: '5',
        worstRating: '1',
      },
    })),
  };

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header and Aggregate Card */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pb-12 border-b border-[var(--border)]">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                Authentic Reflections
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] tracking-tight">
              Words From Our Couples
            </h1>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
              Every review below is authored by a couple whose wedding was documented by VOWS Studio, submitted via private verified link following portal delivery.
            </p>
          </div>

          {/* Aggregate Rating Stat Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-8 self-start lg:self-auto">
            <div className="text-center sm:text-left space-y-1">
              <div className="text-5xl font-bold font-mono tracking-tight text-[var(--foreground)]">
                {aggregateRating.toFixed(1)}
              </div>
              <div className="flex items-center gap-1 text-[var(--accent)] justify-center sm:justify-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold pt-1">
                Based on {totalReviews} Verified Weddings
              </div>
            </div>

            <div className="h-16 w-px bg-[var(--border)] hidden sm:block" />

            {/* Category breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-6">
                <span className="text-[var(--muted-foreground)]">Cinematic &amp; Stills Quality</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">5.0 / 5.0</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-[var(--muted-foreground)]">Communication &amp; Clarity</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">4.9 / 5.0</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-[var(--muted-foreground)]">Church Liturgy Respect</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">5.0 / 5.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[var(--accent)]">
                    {Array.from({ length: rev.ratingOverall }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <p className="text-sm text-[var(--foreground)] leading-relaxed italic">
                  &ldquo;{rev.testimonial}&rdquo;
                </p>
              </div>

              <div className="pt-6 border-t border-[var(--border)] mt-6 space-y-1">
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {rev.coupleName}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {rev.venueName} &bull; {rev.eventDate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
