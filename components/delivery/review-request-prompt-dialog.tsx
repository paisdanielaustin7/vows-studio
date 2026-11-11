'use client';

import React, { useState } from 'react';
import { Mail, Copy, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { generateReviewRequestAction } from '@/server/actions/reviews.actions';

interface ReviewRequestPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  bookingNumber: string;
  clientName: string;
  clientEmail?: string | null;
  onSendEmail?: () => void;
}

export function ReviewRequestPromptDialog({
  isOpen,
  onClose,
  bookingId,
  bookingNumber,
  clientName,
  clientEmail,
  onSendEmail,
}: ReviewRequestPromptDialogProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    if (!bookingId) {
      const sampleReviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reviews`;
      navigator.clipboard.writeText(sampleReviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await generateReviewRequestAction({
        bookingId,
        sendEmail: false,
      });

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to generate review link.');
        setIsProcessing(false);
        return;
      }

      if (res.data) {
        const fullUrl = `${window.location.origin}${res.data.reviewUrl}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setStatusMessage('Private review link generated & copied to clipboard (valid 30 days)!');
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate link.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    if (!bookingId) {
      if (onSendEmail) onSendEmail();
      onClose();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await generateReviewRequestAction({
        bookingId,
        sendEmail: true,
      });

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to dispatch review invitation email.');
        setIsProcessing(false);
        return;
      }

      if (res.data) {
        setStatusMessage(
          res.data.emailSent
            ? `Review invitation email dispatched to ${res.data.clientEmail}!`
            : 'Review link created. Client email not found; please copy link manually.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch email.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
              Stage 9 Completed · Archive
            </span>
            <h3 className="text-base font-bold text-on-surface">Request Client Review</h3>
          </div>
        </div>

        <p className="text-xs text-outline leading-relaxed">
          The production pipeline for <strong>{clientName}</strong> (Commission {bookingNumber}) is now officially archived!
          Would you like to dispatch an authenticated 30-day review invitation link to collect their testimonial?
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-medium">
            {statusMessage}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-on-surface">Client:</span>
            <span className="text-outline">{clientName}</span>
          </div>
          {clientEmail && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-on-surface">Email:</span>
              <span className="text-outline">{clientEmail}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {clientEmail && (
            <button
              onClick={handleSendEmail}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors shadow-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>Send Review Request Email (Gmail)</span>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/40 disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-secondary" />
                <span>Review Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Review Request Link (30 Days)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
