'use client';

import React, { useState } from 'react';
import {
  generateShareLinkAction,
  revokeShareLinkAction,
} from '@/server/actions/delivery.actions';
import { Share2, Copy, Check, AlertCircle, X, Shield, Lock } from 'lucide-react';

interface ShareLinkDialogProps {
  pipelineId: string;
  bookingNumber: string;
  clientName: string;
  currentShareHash?: string | null;
  currentExpiresAt?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ShareLinkDialog({
  pipelineId,
  bookingNumber,
  clientName,
  currentShareHash,
  currentExpiresAt,
  isOpen,
  onClose,
  onUpdated,
}: ShareLinkDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await generateShareLinkAction({
        pipelineId,
        expiresInDays,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        const fullUrl = `${window.location.origin}${res.data.shareUrl}`;
        setGeneratedUrl(fullUrl);
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke client access to this delivery portal?')) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await revokeShareLinkAction(pipelineId);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setGeneratedUrl(null);
        if (onUpdated) onUpdated();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-on-surface">Client Delivery Portal</h3>
            <p className="text-xs text-outline">
              Booking {bookingNumber} • {clientName}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-error-container/40 border border-error/20 flex items-center gap-2 text-xs text-on-error-container">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-outline uppercase tracking-wider">
              Link Expiration Window
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days (Standard)</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>

          {generatedUrl ? (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
              <span className="text-xs font-semibold text-on-surface block">
                Live Client Share URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 text-xs font-mono px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : currentShareHash ? (
            <div className="p-4 rounded-xl bg-secondary-container/30 border border-secondary/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-secondary" /> Active Share Link Exists
                </span>
                {currentExpiresAt && (
                  <span className="text-outline">
                    Expires: {new Date(currentExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-outline">
                A secure token link is currently active. You can generate a new link to refresh the token, or revoke access immediately.
              </p>
            </div>
          ) : null}

          {/* Privacy & confidentiality notice */}
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 flex items-start gap-2 text-xs text-outline">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              The client portal displays verified finished deliverables, review streams, and download links only. Internal production notes, crew assignments, and financial ledgers remain completely confidential.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
          {currentShareHash ? (
            <button
              onClick={handleRevoke}
              disabled={isSubmitting}
              className="text-xs text-error hover:underline font-medium"
            >
              Revoke Share Link
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-secondary transition-colors"
            >
              {isSubmitting ? 'Generating...' : generatedUrl ? 'Regenerate Link' : 'Generate Secure Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
