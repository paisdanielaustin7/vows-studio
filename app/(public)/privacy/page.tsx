import React from 'react';
import type { Metadata } from 'next';
import { getPublicPageSeo, getPublicSiteContent } from '@/server/queries/website.queries';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/privacy',
    'Privacy Policy & DPDP Compliance — VOWS Studio',
    'Our strict commitments to client confidentiality, image publishing consent governance, and DPDP data security.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function PrivacyPage() {
  const privacyData = await getPublicSiteContent('privacy_policy', {
    lastUpdated: 'November 2026',
    content:
      'VOWS Studio operates with the highest standard of client privacy. We strictly honor client image publishing consent. No wedding images or videos are published to our portfolio without explicit, recorded consent. Personal information submitted via our enquiry portal is never sold or shared with third parties.',
  });

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Legal &bull; Updated {privacyData.lastUpdated}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            Privacy Policy &amp; Data Governance
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
            How VOWS Studio collects, safeguards, and handles your personal information and wedding media under the Digital Personal Data Protection Act (DPDP Act, 2023).
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Explicit Consent</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              No wedding frame is ever made public on our website without recorded written consent from both spouses.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <Lock className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Encrypted Storage</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Client contracts, invoices, and contact data are encrypted with AES-256 and restricted by strict RBAC controls.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <EyeOff className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Zero Commercial Sharing</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              We never sell or distribute your names, phone numbers, or email addresses to outside vendors or sponsors.
            </p>
          </div>
        </div>

        {/* Detailed Terms */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 space-y-8 text-sm text-[var(--muted-foreground)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              1. Information We Collect
            </h2>
            <p>
              When you submit an enquiry through our portal, we collect your name, mobile telephone number (+91), email address, celebration date, and proposed venues. This information is utilized strictly to verify calendar availability and prepare customized commission quotations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              2. Image Consent &amp; Showcase Governance
            </h2>
            <p>
              {privacyData.content}
            </p>
            <p>
              Should a couple decline publication, their engagement remains entirely confidential. Archived media remains in private vault storage accessible only through hashed token download links issued directly to the couple.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              3. Right to Erasure &amp; Anonymization
            </h2>
            <p>
              In accordance with DPDP requirements, clients may at any time request anonymization of their personal profiles upon completion of all contractual delivery obligations and statutory financial audit retention periods.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              4. Contact Our Data Protection Officer
            </h2>
            <p>
              For privacy requests or to revoke showcase consent, please direct correspondence to Reuben Serrao at{' '}
              <a href="mailto:privacy@vowsstudio.com" className="text-[var(--accent)] underline">
                privacy@vowsstudio.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
