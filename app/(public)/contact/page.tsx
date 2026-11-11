import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getPublicPageSeo } from '@/server/queries/website.queries';
import { PublicEnquiryForm } from '@/components/public/public-enquiry-form';
import { MapPin, Phone, Mail, Clock, Calendar, ShieldCheck } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/contact',
    'Enquire for Your Wedding Date — VOWS Studio',
    'Initiate a bespoke wedding film enquiry. Limited to 18 commissions per season across Goa, Mangalore, and worldwide destinations.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default function ContactPage() {
  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header Cadence */}
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Season 2025 – 2026 Commissions
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] tracking-tight">
            Initiate an Inscription
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
            We limit our calendar to eighteen discerning couples each season to ensure unhurried focus, deliberate pacing, and museum-grade cinematic storytelling.
          </p>
        </div>

        {/* 2-Column Spacious Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Atelier Coordinates & Details (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            {/* Availability Notice Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                <Calendar className="w-4 h-4" />
                <span>Strict Capacity Protocol</span>
              </div>
              <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-[var(--foreground)]">
                Currently Reserving Autumn &amp; Winter Solemnizations
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Across Goa, Mangalore, Bangalore, and selected coastal &amp; destination weddings worldwide. Early booking is advised for cathedral solemnizations.
              </p>
            </div>

            {/* Direct Studio Coordinates */}
            <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-xl shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Physical Atelier</span>
                </div>
                <div className="font-medium text-sm text-[var(--foreground)]">
                  VOWS Studio Residence
                </div>
                <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Atelier 4B, Heritage Square<br />
                  Light House Hill, Mangalore<br />
                  Karnataka 575001, India
                </div>
              </div>

              <div className="h-px w-full bg-[var(--border)]" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <Phone className="w-3 h-3 text-[var(--accent)]" />
                    <span>Direct Director</span>
                  </div>
                  <div className="font-medium text-[var(--foreground)]">Reuben Serrao</div>
                  <div className="text-[var(--muted-foreground)] font-mono">+91 98200 44521</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <Mail className="w-3 h-3 text-[var(--accent)]" />
                    <span>Private Concierge</span>
                  </div>
                  <div className="font-medium text-[var(--foreground)]">Studio Desk</div>
                  <div className="text-[var(--muted-foreground)] font-mono">concierge@vowsstudio.com</div>
                </div>
              </div>

              <div className="h-px w-full bg-[var(--border)]" />

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <Clock className="w-3 h-3 text-[var(--accent)]" />
                  <span>Consultation Protocol</span>
                </div>
                <div className="text-[var(--muted-foreground)] leading-relaxed">
                  By appointment only.<br />
                  <strong className="text-[var(--foreground)]">Monday — Saturday:</strong> 10:00 — 18:00 IST<br />
                  <span className="text-[11px]">Sunday: Reserved for liturgical commissions &amp; active shoots.</span>
                </div>
              </div>
            </div>

            {/* DPDP Legal Stamp */}
            <div className="p-4 rounded-xl bg-[var(--surface-muted)] text-[11px] text-[var(--muted-foreground)] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <span>
                Your privacy is paramount. Personal details entered here are encrypted and accessed solely by Reuben Serrao to assemble tailored production proposals.
              </span>
            </div>
          </div>

          {/* Right Column: Form (7 cols) */}
          <div className="lg:col-span-7">
            <Suspense fallback={<div className="p-12 text-center text-sm text-[var(--muted-foreground)]">Loading enquiry form...</div>}>
              <PublicEnquiryForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
