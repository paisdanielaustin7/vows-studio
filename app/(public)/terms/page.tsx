import React from 'react';
import type { Metadata } from 'next';
import { getPublicPageSeo, getPublicSiteContent } from '@/server/queries/website.queries';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/terms',
    'Terms of Service & Engagement Standards — VOWS',
    'Legal terms governing photography commissions, retainer schedules, copyright, and delivery specifications.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function TermsPage() {
  const termsData = await getPublicSiteContent('terms_of_service', {
    lastUpdated: 'November 2026',
    content:
      'All engagements with VOWS are subject to our formal booking agreement. Dates are secured exclusively upon receipt of the advance retainer and digital counter-signature. Copyright of all captured media remains with VOWS, granting the client a perpetual personal reproduction and display license.',
  });

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Terms of Engagement &bull; Updated {termsData.lastUpdated}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
            Standard contractual principles governing commissions, scheduling, payment tranches, and copyright ownership.
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 space-y-8 text-sm text-[var(--muted-foreground)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              1. Commission Booking &amp; Date Reservation
            </h2>
            <p>
              Dates are confirmed exclusively upon countersignature of our formal Wedding Commission Agreement and receipt of the 25% non-refundable booking retainer. Dates cannot be held on verbal request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              2. Payment Schedule &amp; Invoicing
            </h2>
            <p>
              Our standard payment structure comprises four tranches:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Tranche 1 (25%):</strong> Non-refundable advance retainer upon contract execution.</li>
              <li><strong>Tranche 2 (35%):</strong> Due 30 calendar days prior to the first shoot event.</li>
              <li><strong>Tranche 3 (30%):</strong> Due on or before the conclusion of event shoot dates.</li>
              <li><strong>Tranche 4 (10%):</strong> Due upon initial preview gallery delivery, prior to high-resolution master dispatch.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              3. Copyright &amp; Client License
            </h2>
            <p>
              {termsData.content}
            </p>
            <p>
              Clients receive a perpetual, royalty-free, non-commercial license to reproduce, print, share, and enjoy their wedding stills and films across personal channels without watermark restrictions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              4. Delivery Turnaround &amp; Archival Storage
            </h2>
            <p>
              Master stills are delivered within 4 to 6 weeks. Master cinematic feature films are delivered within 8 to 10 weeks via our encrypted digital portal. Files are preserved in our archival cold storage vault for five years from delivery.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              5. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These terms and any resulting commission contracts are governed by the laws of the Republic of India. The courts of Mangalore, Karnataka shall have exclusive jurisdiction over any disputes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
