import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicServicesAndPackages, getPublicPageSeo } from '@/server/queries/website.queries';
import { formatINR } from '@/lib/money';
import { CheckCircle2, ShieldCheck, Sparkles, Clock, Video, Camera, BookOpen } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/services',
    'Services & Investment Rate Card — VOWS',
    'Transparent wedding cinematography and heirloom photography pricing for Goa, Mangalore, and destination celebrations.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function ServicesPage() {
  const { packages, services } = await getPublicServicesAndPackages();

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-[var(--border)]">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                Fiscal Year 2025 – 2026 Rate Card
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] tracking-tight">
              Services &amp; Commissions
            </h1>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
              Transparent, itemized pricing and bespoke production tiers for sacred Christian nuptials and multi-day celebrations. Rooted in cinematic restraint and analog archival integrity.
            </p>
          </div>

          {/* Quick Stats Stamp */}
          <div className="flex items-center gap-6 bg-[var(--surface)] border border-[var(--border)] px-6 py-4 rounded-xl shadow-sm self-start md:self-auto">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted-foreground)]">
                Turnaround SLA
              </div>
              <div className="text-base font-semibold text-[var(--foreground)]">
                45–60 Calendar Days
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted-foreground)]">
                Advance Retainer
              </div>
              <div className="text-base font-semibold text-[var(--foreground)]">
                25% to Secure Date
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Signature Packages */}
        <section className="space-y-10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block mb-1">
              Section 01 // Curated Collections
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
              Signature Wedding Collections
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              End-to-end production tiers balancing church liturgy, analog film, and multi-camera cinema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id}
                className={`p-8 rounded-xl border flex flex-col justify-between transition-all ${
                  idx === 1
                    ? 'border-[var(--accent)] bg-[var(--surface)] shadow-lg ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] shadow-sm'
                }`}
              >
                <div className="space-y-6">
                  {idx === 1 && (
                    <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] text-[10px] font-bold tracking-widest uppercase">
                      Most Requested Collection
                    </span>
                  )}
                  <div>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold text-[var(--foreground)]">
                      {pkg.name}
                    </h3>
                    <div className="text-3xl font-bold font-mono tracking-tight text-[var(--foreground)] mt-2">
                      {formatINR(pkg.currentPricePaise)}
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      Fixed Engagement Price &bull; No Hidden Surcharges
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                      Commission Scope:
                    </span>
                    {pkg.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--foreground)]">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                        <span>{item.serviceName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-[var(--border)]">
                  <Link
                    href={`/contact?package=${encodeURIComponent(pkg.name)}`}
                    className={`w-full inline-flex items-center justify-center py-3.5 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
                      idx === 1
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-md'
                        : 'border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    Enquire With This Collection
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Modular Services Bento Grid */}
        <section className="space-y-10 pt-10 border-t border-[var(--border)]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block mb-1">
              Section 02 // À La Carte
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
              Standalone Production Services
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Commission individual technical deliverables as modular add-ons to your custom itinerary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                    <span className="font-mono text-[10px] font-semibold tracking-widest">
                      {srv.code}
                    </span>
                    {srv.category === 'cinematography' ? (
                      <Video className="w-4 h-4 text-[var(--accent)]" />
                    ) : srv.category === 'photography' ? (
                      <Camera className="w-4 h-4 text-[var(--accent)]" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-[var(--foreground)]">
                      {srv.name}
                    </h3>
                    <div className="text-lg font-bold font-mono text-[var(--foreground)] mt-1">
                      {formatINR(srv.currentPricePaise)}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {srv.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Category</span>
                  <span className="font-medium capitalize text-[var(--foreground)]">{srv.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Archival Standards & Guarantees */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Studio Protocol
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-[var(--foreground)]">
              Included Across Every VOWS Commission
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center font-semibold">
                <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Uncompressed Audio Fidelity
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Ceremonial vows, priest homilies, and family toasts recorded with discrete 32-bit float broadcast microphones for zero distortion.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center font-semibold">
                <Clock className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Strict Turnaround Guarantee
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                We contractually commit to our 45–60 day delivery SLA with real-time pipeline tracking and milestone email notifications.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] text-[var(--primary)] flex items-center justify-center font-semibold">
                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Archival Cloud &amp; Offline Vault
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Dual redundant backups stored across encrypted off-site cloud storage and offline cold drives for five years.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center py-10 space-y-4">
          <h3 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-[var(--foreground)]">
            Ready to Plan Your Production Scope?
          </h3>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Contact our atelier to discuss custom combinations, multi-day liturgical celebrations, or international destinations.
          </p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm"
            >
              Initiate Inscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
