import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inscription Received — VOWS',
  description: 'Thank you for your enquiry. We will review atelier availability and respond within 24 hours.',
};

export default function ThankYouPage() {
  return (
    <div className="w-full bg-[var(--background)] py-20 px-6 sm:px-8 lg:px-12 flex items-center justify-center min-h-[70vh]">
      <div className="max-w-2xl w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 shadow-sm text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Inscription Recorded
          </span>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            Thank You for Your Trust
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed max-w-lg mx-auto">
            Your wedding inscription has reached our studio desk. Reuben Serrao and our concierge will review your date against our 18-wedding annual quota.
          </p>
        </div>

        {/* Stepper Timeline */}
        <div className="text-left bg-[var(--background)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
            What Happens Next:
          </span>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">Availability Verification (24 Hours)</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">We verify liturgical and travel feasibility for your selected date.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">Bespoke Monograph Proposal</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">We send a customized collection quotation with clear line items.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
              3
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">Private Atelier or Video Call</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">A 30-minute conversation with Reuben to discuss your ceremony vision.</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm"
          >
            <span>Explore Portfolio Stills</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold tracking-wider uppercase hover:bg-[var(--surface-muted)] transition-all"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
