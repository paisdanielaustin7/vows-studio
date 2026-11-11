'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Mail,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { listBookingsAction } from '@/server/actions/booking.actions';
import { generateReviewRequestAction } from '@/server/actions/reviews.actions';

interface GenerateReviewLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBookingId?: string;
  onSuccess?: () => void;
}

export function GenerateReviewLinkModal({
  isOpen,
  onClose,
  preselectedBookingId,
  onSuccess,
}: GenerateReviewLinkModalProps) {
  const [bookings, setBookings] = useState<Array<{ id: string; booking_number: string; client_name?: string }>>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(preselectedBookingId || '');
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sendEmailDirectly, setSendEmailDirectly] = useState<boolean>(false);

  // Result state
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setGeneratedUrl(null);
      setEmailStatus(null);
      setCopied(false);

      if (preselectedBookingId) {
        setSelectedBookingId(preselectedBookingId);
      }

      setIsLoadingBookings(true);
      listBookingsAction()
        .then((res) => {
          if (res.data) {
            const mapped = (res.data as any[]).map((b) => ({
              id: b.id,
              booking_number: b.booking_number || 'BKG',
              client_name: b.clients?.full_name || b.client_name || 'Client',
            }));
            setBookings(mapped);
            if (!selectedBookingId && mapped.length > 0 && !preselectedBookingId) {
              setSelectedBookingId(mapped[0].id);
            }
          }
        })
        .finally(() => setIsLoadingBookings(false));
    }
  }, [isOpen, preselectedBookingId]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!selectedBookingId) {
      setErrorMessage('Please select a booking commission.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await generateReviewRequestAction({
        bookingId: selectedBookingId,
        sendEmail: sendEmailDirectly,
      });

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to generate review invitation link.');
        setIsGenerating(false);
        return;
      }

      if (res.data) {
        const fullUrl = `${window.location.origin}${res.data.reviewUrl}`;
        setGeneratedUrl(fullUrl);
        if (res.data.emailSent) {
          setEmailStatus(`Review invitation dispatched to ${res.data.clientEmail}`);
        } else if (sendEmailDirectly && !res.data.clientEmail) {
          setEmailStatus('Client has no email on file; generated link can be copied below.');
        }
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while generating link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-150">
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
              SLA Verification Protocol
            </span>
            <h3 className="text-lg font-bold text-on-surface">Generate Client Review Invite</h3>
          </div>
        </div>

        <p className="text-xs text-outline leading-relaxed">
          Generate an authenticated, single-use 30-day review invitation link for confirmed clients. Generating a new link automatically revokes any previous active links for the booking.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {!generatedUrl ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-tertiary">
                Target Booking Commission
              </label>
              {isLoadingBookings ? (
                <div className="h-10 bg-surface-container-low rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-lg text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="" disabled>
                    Select confirmed booking...
                  </option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booking_number} — {b.client_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1 select-none">
              <input
                id="send-email-checkbox"
                type="checkbox"
                checked={sendEmailDirectly}
                onChange={(e) => setSendEmailDirectly(e.target.checked)}
                className="w-4 h-4 text-primary rounded accent-primary cursor-pointer"
              />
              <label htmlFor="send-email-checkbox" className="text-xs text-on-surface cursor-pointer">
                Send review invitation email immediately via connected Gmail
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating || !selectedBookingId}
                onClick={handleGenerate}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-secondary text-on-primary text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Link...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Generate Review Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {emailStatus && (
              <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-secondary" />
                <span>{emailStatus}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider">
                Private Review Invite URL (30-Day Expiry)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-lg text-xs font-mono text-on-surface border border-outline-variant/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-on-primary" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
