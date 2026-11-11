import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicFaqItems, getPublicPageSeo } from '@/server/queries/website.queries';
import { ArrowRight } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/faq',
    'Frequently Asked Questions & Protocols — VOWS Studio',
    'Answers regarding delivery turnaround, 35mm analog film processing, destination wedding travel, and booking retainers.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function FaqPage() {
  const faqs = await getPublicFaqItems();

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Studio Protocols
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
            Clear, transparent answers regarding our production timelines, analog preservation chemistry, and travel engagements.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div
              key={faq.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 shadow-sm space-y-3"
            >
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs font-semibold text-[var(--accent)] mt-1 shrink-0">
                  0{idx + 1}.
                </span>
                <div className="space-y-2">
                  <h3 className="font-[family-name:var(--font-cormorant)] text-xl sm:text-2xl font-semibold text-[var(--foreground)]">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Further enquiries box */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Have a question not addressed here?
            </h4>
            <p className="text-xs text-[var(--muted-foreground)]">
              We welcome specific liturgical, schedule, or destination queries.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shrink-0"
          >
            <span>Ask Our Atelier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
