'use client';

import React, { useState } from 'react';
import { Mail, Copy, Check, X, Sparkles } from 'lucide-react';

interface ReviewRequestPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNumber: string;
  clientName: string;
  clientEmail?: string | null;
  onSendEmail?: () => void;
}

export function ReviewRequestPromptDialog({
  isOpen,
  onClose,
  bookingNumber,
  clientName,
  clientEmail,
  onSendEmail,
}: ReviewRequestPromptDialogProps) {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const sampleReviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reviews/submit?booking=${bookingNumber}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sampleReviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent block">
              Stage 9 Completed
            </span>
            <h3 className="text-base font-bold text-on-surface">Request Client Review</h3>
          </div>
        </div>

        <p className="text-xs text-outline leading-relaxed">
          The production pipeline for <strong>{clientName}</strong> (Booking {bookingNumber}) is now complete and archived!
          Would you like to send a review request invitation to collect their feedback and testimonial?
        </p>

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
          {onSendEmail && (
            <button
              onClick={() => {
                onClose();
                onSendEmail();
              }}
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
            >
              <Mail className="w-4 h-4" /> Send Review Request Email
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/40"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" /> Review Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Review Request Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
