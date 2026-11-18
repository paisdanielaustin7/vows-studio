'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TurnstileWidget } from '@/components/ui/turnstile-widget';

export function PublicEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPackage = searchParams.get('package') || '';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    eventType: 'wedding',
    eventDate: '',
    venue: '',
    guestCount: '',
    budget: '',
    message: preselectedPackage ? `Interested in: ${preselectedPackage}` : '',
    source: 'website',
    consentGiven: false,
    website_fax_code: '', // honeypot
    turnstileToken: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.consentGiven) {
      setErrorMsg('You must provide consent for data processing before submitting.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        eventType: formData.eventType,
        eventDate: formData.eventDate || undefined,
        venue: formData.venue.trim() || undefined,
        guestCount: formData.guestCount ? Number(formData.guestCount) : undefined,
        budget: formData.budget.trim() || undefined,
        message: formData.message.trim() || undefined,
        source: formData.source,
        consentGiven: formData.consentGiven,
        website_fax_code: formData.website_fax_code,
        turnstileToken: formData.turnstileToken,
      };

      const res = await fetch('/api/public/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        const message =
          typeof json.error === 'string'
            ? json.error
            : json.error?.message || 'Failed to submit enquiry. Please check your information.';
        throw new Error(message);
      }

      router.push('/contact/thank-you');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 shadow-sm space-y-6"
    >
      {/* Honeypot field - invisible to humans */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website_fax_code">Leave this field blank</label>
        <input
          type="text"
          id="website_fax_code"
          name="website_fax_code"
          value={formData.website_fax_code}
          onChange={(e) => setFormData({ ...formData, website_fax_code: e.target.value })}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Row 1: Name and Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Full Name <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Derick D'Souza"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Mobile Number (+91 E.164) <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+91 98200 44521"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Row 2: Email and Event Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Email Address <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="you@domain.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Celebration Type <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            value={formData.eventType}
            onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="wedding">Catholic / Christian Wedding</option>
            <option value="reception">Coastal Reception Gala</option>
            <option value="pre_wedding">Pre-Wedding Monograph</option>
            <option value="mehendi">Roce / Cultural Blessing</option>
            <option value="engagement">Solemn Engagement</option>
            <option value="other">Other Intimate Commission</option>
          </select>
        </div>
      </div>

      {/* Row 3: Event Date and Venue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Primary Date of Celebration
          </label>
          <input
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Venue / Church &amp; City
          </label>
          <input
            type="text"
            placeholder="e.g. St. Cajetan Church, Goa"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Row 4: Guest Count and Estimated Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Estimated Guest Count
          </label>
          <input
            type="number"
            min="10"
            max="5000"
            placeholder="e.g. 250"
            value={formData.guestCount}
            onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
            Target Production Budget
          </label>
          <select
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">Select an investment tier...</option>
            <option value="₹1,50,000 – ₹2,50,000">₹1,50,000 – ₹2,50,000 (Chapel Tier)</option>
            <option value="₹2,50,000 – ₹4,00,000">₹2,50,000 – ₹4,00,000 (Heirloom Tier)</option>
            <option value="₹4,00,000+">₹4,00,000+ (Grand Archival Tier)</option>
          </select>
        </div>
      </div>

      {/* Notes / Inscription Message */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
          Personal Notes &amp; Wedding Vision
        </label>
        <textarea
          rows={4}
          placeholder="Tell us about your chapel, liturgical nuances, schedule, or specific analog film desires..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y"
        />
      </div>

      {/* DPDP Consent Checkbox */}
      <div className="pt-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            required
            checked={formData.consentGiven}
            onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--accent)] mt-0.5 accent-[var(--primary)] cursor-pointer"
          />
          <span className="text-xs text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors leading-relaxed">
            I explicitly confirm that VOWS may securely store my contact details to prepare proposals and correspond regarding our wedding commission, in strict compliance with DPDP standards. <span className="text-[var(--danger)]">*</span>
          </span>
        </label>
      </div>

      {/* Cloudflare Turnstile Widget */}
      <TurnstileWidget
        onVerify={(token) => setFormData((prev) => ({ ...prev, turnstileToken: token }))}
        onExpire={() => setFormData((prev) => ({ ...prev, turnstileToken: '' }))}
      />

      {/* Submit Button */}
      <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
          <span>Response protocol within 24 business hours</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <span>Sending Inscription...</span>
          ) : (
            <>
              <span>Transmit Inscription</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
