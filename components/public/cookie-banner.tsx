'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'vows_cookie_consent';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        setIsVisible(true);
      }
    } catch {
      // ignore in environments without localStorage
    }
  }, []);

  const handleConsent = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl shadow-xl p-5 animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[var(--foreground)]">
            Privacy &amp; Cookie Consent
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            We use essential local storage to safeguard your session, remember viewing preferences, and ensure secure enquiries in compliance with Indian DPDP standards.{' '}
            <Link
              href="/privacy"
              className="underline text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              Read our Privacy Policy
            </Link>.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleConsent('all')}
              className="px-3.5 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() => handleConsent('essential')}
              className="px-3.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Essential Only
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleConsent('essential')}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-md transition-colors"
          aria-label="Dismiss cookie banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
