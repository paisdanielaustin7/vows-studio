import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ArrowLeft, Mail } from 'lucide-react';
import { getReviewRequestByTokenAction } from '@/server/actions/reviews.actions';
import { PublicReviewForm } from '@/components/reviews/public-review-form';

interface ReviewPageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Client Reflection & Review Verification — VOWS Studio',
    description: 'Private, authenticated client portal to submit your wedding reflection and testimonial.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ReviewSubmissionPage({ params }: ReviewPageProps) {
  const { token } = await params;
  const result = await getReviewRequestByTokenAction(token);

  // State 3: Invalid, Expired, Revoked, or Already Submitted Token
  if (!result.isValid || !result.details) {
    let headline = 'Invite Link Expired or Inactive';
    let message =
      'This private review link has expired or has already been completed by the couple. Links remain active for 30 days after initial generation.';

    if (result.errorReason === 'already_submitted') {
      headline = 'Review Already Recorded';
      message =
        'An official reflection has already been submitted for this commission. Thank you for your heartfelt words!';
    } else if (result.errorReason === 'revoked') {
      headline = 'Review Link Revoked';
      message =
        'This review link has been revoked or superseded by a newer link sent to the couple.';
    }

    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-8 sm:p-12 rounded-2xl shadow-sm text-center max-w-xl w-full space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-error-container/40 text-error flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-error" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-error">
              Security Token Inactive
            </span>
            <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-bold text-on-surface">
              {headline}
            </h1>
            <p className="text-sm text-tertiary max-w-md mx-auto leading-relaxed pt-1">
              {message}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Atelier
            </Link>

            <Link
              href="/contact"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary hover:bg-secondary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" /> Contact Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Active Submission Page
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <header className="w-full py-6 flex justify-center items-center border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
            V
          </div>
          <span className="font-semibold tracking-tight text-on-surface uppercase text-sm font-sans">
            VOWS Studio
          </span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        <PublicReviewForm token={token} details={result.details} />
      </main>

      <footer className="w-full py-6 text-center text-xs text-tertiary border-t border-outline-variant/20">
        &copy; {new Date().getFullYear()} VOWS Studio. Private &amp; Confidential Verification Protocol.
      </footer>
    </div>
  );
}
