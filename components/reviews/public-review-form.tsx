'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Camera,
  MessageSquare,
  Clock,
  Loader2,
} from 'lucide-react';
import { PublicReviewTokenDetails } from '@/types/reviews';
import { submitReviewAction } from '@/server/actions/reviews.actions';
import { TurnstileWidget } from '@/components/ui/turnstile-widget';

interface PublicReviewFormProps {
  token: string;
  details: PublicReviewTokenDetails;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Sub-Par Experience',
  2: 'Needs Improvement',
  3: 'Satisfactory Coverage',
  4: 'Pristine & Reassuring',
  5: 'Exceptional & Breathtaking',
};

const COMM_LABELS: Record<number, string> = {
  1: 'Lacked clarity',
  2: 'Delayed responses',
  3: 'Acceptable dialogue',
  4: 'Attentive and prompt',
  5: 'Proactive and reassuring',
};

const QUALITY_LABELS: Record<number, string> = {
  1: 'Quality below standard',
  2: 'Inconsistent stills',
  3: 'Expected grade',
  4: 'Masterful composition',
  5: 'Breathtaking analog grade',
};

const PUNCT_LABELS: Record<number, string> = {
  1: 'Significant schedule delays',
  2: 'Minor timing issues',
  3: 'Adhered to call-sheet',
  4: 'Prompt and prepared',
  5: 'Early arrival, seamless coverage',
};

export function PublicReviewForm({ token, details }: PublicReviewFormProps) {
  // Form state
  const [overallRating, setOverallRating] = useState<number>(5);
  const [commRating, setCommRating] = useState<number>(5);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [punctRating, setPunctRating] = useState<number>(5);

  const [reviewerName, setReviewerName] = useState<string>(details.coupleName || '');
  const [body, setBody] = useState<string>('');
  const [showcaseConsent, setShowcaseConsent] = useState<boolean>(true);
  const [honeypot, setHoneypot] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (body.trim().length < 10) {
      setErrorMessage('Please provide a testimonial of at least 10 characters.');
      return;
    }

    if (!reviewerName.trim()) {
      setErrorMessage('Please provide your name(s).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReviewAction({
        token,
        overallRating,
        communicationRating: commRating,
        qualityRating,
        punctualityRating: punctRating,
        body: body.trim(),
        reviewerName: reviewerName.trim(),
        showcaseConsent,
        honeypot,
        turnstileToken,
      });

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to submit review.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during submission.');
      setIsSubmitting(false);
    }
  };

  // State 2: Thank-You Confirmation Card
  if (isSubmitted) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-8 sm:p-12 rounded-2xl shadow-sm text-center space-y-8 animate-in fade-in duration-300">
          {/* Monogram Seal */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-secondary" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Verification Recorded
              </span>
              <h1 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-bold text-on-surface">
                With Heartfelt Gratitude, {reviewerName}
              </h1>
              <p className="text-sm text-tertiary max-w-xl mx-auto pt-2 leading-relaxed">
                Your review has been successfully logged in our private studio archive. Once verified by our editorial curators, your words will grace our public portfolio.
              </p>
            </div>
          </div>

          {/* Metrics Summary Strip */}
          <div className="bg-surface-container-low p-6 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border border-outline-variant/30">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-tertiary">Overall Master</span>
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-bold text-on-surface">{overallRating}.0</span>
              </div>
              <span className="text-[11px] text-secondary font-medium">{RATING_LABELS[overallRating]}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-tertiary">Dialogue</span>
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-bold text-on-surface">{commRating}.0</span>
              </div>
              <span className="text-[11px] text-secondary font-medium">{COMM_LABELS[commRating]}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-tertiary">Artistry</span>
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-bold text-on-surface">{qualityRating}.0</span>
              </div>
              <span className="text-[11px] text-secondary font-medium">{QUALITY_LABELS[qualityRating]}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-tertiary">Discipline</span>
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-bold text-on-surface">{punctRating}.0</span>
              </div>
              <span className="text-[11px] text-secondary font-medium">{PUNCT_LABELS[punctRating]}</span>
            </div>
          </div>

          {/* Testimonial Excerpt Preview */}
          <div className="text-left bg-surface-container-lowest p-5 rounded-lg border-l-4 border-primary shadow-sm space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              Archived Excerpt
            </span>
            <p className="text-sm text-on-surface-variant italic leading-relaxed pt-1">
              &ldquo;{body}&rdquo;
            </p>
          </div>

          {/* Return Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold transition-colors"
            >
              Return to VOWS
            </Link>
            <Link
              href="/reviews"
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-primary hover:bg-secondary text-on-primary text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>View Public Reflections</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Active Submission View
  return (
    <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
      {/* Editorial Event Hero Strip */}
      <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold uppercase tracking-wider">
              Confirmed Commission
            </span>
            <span className="text-[11px] font-medium text-tertiary">
              Ref · {details.bookingNumber}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Verified Commission Record
          </span>
        </div>

        <div className="space-y-1 pt-1">
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
            Welcome, {details.coupleName}
          </h1>
          <p className="text-sm text-tertiary">
            {details.eventTitle} &bull; {details.venueName || 'Goa & Mangalore Atelier'} {details.eventDate ? `· ${details.eventDate}` : ''}
          </p>
        </div>

        <div className="p-3.5 bg-surface-container-low rounded-xl flex items-center justify-between text-xs text-on-surface">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span className="text-tertiary">
              Private reflection access valid through{' '}
              <strong className="text-on-surface">
                {new Date(details.expiresAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Cinematic + Stills
          </span>
        </div>
      </div>

      {/* Main Review Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Honeypot anti-spam trap (D-11) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="review_website_fax">Leave this field blank</label>
          <input
            id="review_website_fax"
            type="text"
            name="review_website_fax"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium border border-error/20">
            {errorMessage}
          </div>
        )}

        {/* Verified Identity Strip */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
              Verified Identity
            </span>
            <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
              <Lock className="w-3.5 h-3.5" /> Authenticated Commission Link
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-tertiary" htmlFor="reviewer-name">
                Reviewer Full Name(s)
              </label>
              <input
                id="reviewer-name"
                type="text"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="bg-surface-container-low px-4 py-2.5 rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/40 transition-all"
                placeholder="e.g. Samantha & Derick D'Souza"
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-tertiary" htmlFor="reviewer-email">
                Authorized Client Email
              </label>
              <input
                id="reviewer-email"
                type="email"
                readOnly
                disabled
                value={details.clientEmail || 'client@vowsstudio.com'}
                className="bg-surface-container-low/60 px-4 py-2.5 rounded-lg text-sm text-tertiary cursor-not-allowed border border-outline-variant/30"
              />
            </div>
          </div>
        </div>

        {/* Rating Section: Master Assessment & 3 Sub-Categories */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 sm:p-8 rounded-2xl shadow-sm space-y-8">
          {/* Master Overall Rating */}
          <div className="space-y-3 pb-6 border-b border-surface-container">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Master Assessment
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                  Overall Studio Experience
                </h2>
              </div>
              <span className="text-xs font-semibold text-secondary bg-secondary-container px-3 py-1 rounded-full self-start sm:self-auto">
                {RATING_LABELS[overallRating]}
              </span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-primary">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    aria-label={`${star} Stars`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= overallRating
                          ? 'fill-current text-primary'
                          : 'text-outline-variant'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-2xl font-bold font-mono text-on-surface">
                {overallRating}.0
              </span>
            </div>
          </div>

          {/* 3 Pillar Sub-Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Communication */}
            <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-between space-y-4 border border-outline-variant/30">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    01 · Dialogue
                  </span>
                  <span className="text-xs font-bold text-secondary">{commRating}.0</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Communication &amp; Pre-Production
                </h3>
                <p className="text-xs text-tertiary leading-relaxed pt-1">
                  {COMM_LABELS[commRating]}
                </p>
              </div>

              <div className="flex items-center gap-1 text-primary pt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCommRating(s)}
                    className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= commRating ? 'fill-current text-primary' : 'text-outline-variant'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category 2: Artistry & Quality */}
            <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-between space-y-4 border border-outline-variant/30">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    02 · Artistry
                  </span>
                  <span className="text-xs font-bold text-secondary">{qualityRating}.0</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary" />
                  Cinematic &amp; Stills Quality
                </h3>
                <p className="text-xs text-tertiary leading-relaxed pt-1">
                  {QUALITY_LABELS[qualityRating]}
                </p>
              </div>

              <div className="flex items-center gap-1 text-primary pt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQualityRating(s)}
                    className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= qualityRating ? 'fill-current text-primary' : 'text-outline-variant'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category 3: Protocol & Punctuality */}
            <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-between space-y-4 border border-outline-variant/30">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    03 · Protocol
                  </span>
                  <span className="text-xs font-bold text-secondary">{punctRating}.0</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Punctuality &amp; Floor Discipline
                </h3>
                <p className="text-xs text-tertiary leading-relaxed pt-1">
                  {PUNCT_LABELS[punctRating]}
                </p>
              </div>

              <div className="flex items-center gap-1 text-primary pt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPunctRating(s)}
                    className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= punctRating ? 'fill-current text-primary' : 'text-outline-variant'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Narrative Textarea */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                Personal Narrative
              </span>
              <h2 className="text-xl font-bold text-on-surface">Your Wedding Testimonial</h2>
            </div>
            <span className="text-xs font-mono text-tertiary">
              {body.length} characters (min 10)
            </span>
          </div>

          <div className="relative">
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your reflection on how VOWS captured your sacred day (e.g. the quietness of the crew in the chapel, the emotional reaction to your film)..."
              className="w-full bg-surface-container-low p-4 rounded-xl text-sm text-on-surface placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/40 transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Showcase Consent Checkbox */}
          <div className="pt-2 flex items-start gap-3 select-none">
            <input
              id="showcase-consent"
              type="checkbox"
              checked={showcaseConsent}
              onChange={(e) => setShowcaseConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary rounded bg-surface-container-lowest accent-primary cursor-pointer"
            />
            <label
              htmlFor="showcase-consent"
              className="text-xs sm:text-sm text-on-surface-variant leading-relaxed cursor-pointer"
            >
              I grant VOWS permission to feature this reflection and testimonial excerpt within their curated print monograph and public digital portfolio showcase.
            </label>
          </div>
        </div>

        {/* Cloudflare Turnstile Widget (D-11) */}
        <TurnstileWidget
          onVerify={(tok) => setTurnstileToken(tok)}
          onExpire={() => setTurnstileToken('')}
        />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold text-tertiary hover:text-on-surface transition-colors text-center"
          >
            Cancel / Return Home
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || body.trim().length < 10}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-secondary text-on-primary text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Testimonial...</span>
              </>
            ) : (
              <>
                <span>Submit Official Testimonial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
