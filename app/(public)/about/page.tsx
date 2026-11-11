import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPublicPageSeo, getPublicSiteContent } from '@/server/queries/website.queries';
import { Film, Compass, HeartHandshake } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/about',
    'Our Philosophy & Atelier Heritage — VOWS Studio',
    'Founded by Reuben Serrao. Dedicated to quiet reverence, natural light, and authentic emotional legacy in Christian wedding cinematography.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
  };
}

export default async function AboutPage() {
  const aboutSettings = await getPublicSiteContent('about_settings', {
    founderName: 'Reuben Serrao',
    founderRole: 'Founder & Principal Cinematographer',
    heritageStory:
      'Founded in Light House Hill, Mangalore, VOWS Studio was born from a desire to return to reverence. In an era of hurried wedding trends and loud spectacles, we stand for quiet, enduring beauty.',
    artisticPhilosophy:
      'We honor natural light, chemical film stock, and unchoreographed honesty. Our team documents sacred vows with the unobtrusive respect of a church guest rather than an intrusive production crew.',
    equipmentPhilosophy:
      'From Leica rangefinders and mechanical 35mm film cameras to cinema-grade prime glass, every tool is chosen to preserve emotional weight without distracting from the solemnity of your sacrament.',
  });

  return (
    <div className="w-full bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pb-12 border-b border-[var(--border)]">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                The Atelier Heritage
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] tracking-tight leading-tight">
              Honoring Sacred Vows with Quiet Reverence
            </h1>
            <p className="text-base sm:text-lg text-[var(--muted-foreground)] leading-relaxed">
              {aboutSettings.heritageStory}
            </p>
            <div className="pt-2 text-xs text-[var(--muted-foreground)]">
              <div className="font-semibold text-[var(--foreground)] text-sm">
                {aboutSettings.founderName}
              </div>
              <div>{aboutSettings.founderRole}</div>
            </div>
          </div>
          <div className="lg:col-span-5 relative aspect-[4/5] rounded-2xl overflow-hidden border border-[var(--border)] shadow-md">
            <Image
              src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80"
              alt="Reuben Serrao documenting wedding couple"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Pillars of Craft */}
        <section className="space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Core Convictions
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
              How We Document Nuptials
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-xl space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[var(--foreground)]">
                Sanctuary Stillness
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                During church ceremonies, we never command or interrupt. We move silently along cathedral perimeters, respecting the altar and religious liturgy.
              </p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-xl space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[var(--foreground)]">
                Authentic 35mm Grain
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                Digital pixels are razor-sharp, but silver halide chemical film captures an intangible warmth, human skin tone nuance, and nostalgic soul.
              </p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-xl space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[var(--foreground)]">
                Deliberate Pacing
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                We accept strictly 18 commissions per year so that our editing and grading are never rushed by commercial backlogs or outsourcing.
              </p>
            </div>
          </div>
        </section>

        {/* Equipment & Vault */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Archival Standards
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-[var(--foreground)]">
              Equipment Philosophy &amp; Preservation Vault
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {aboutSettings.equipmentPhilosophy}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div className="space-y-1 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--foreground)]">Leica Rangefinders</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Discreet documentary capture</div>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--foreground)]">35mm &amp; 120 Chemistry</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Kodak Portra &amp; Tri-X film stocks</div>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--foreground)]">Cinema FX Prime Lenses</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Low-light church sanctuary optics</div>
            </div>
            <div className="space-y-1 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
              <div className="text-xs font-semibold text-[var(--foreground)]">5-Year Archival Cold Vault</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">Dual-site redundant digital storage</div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center py-6 space-y-4">
          <h3 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-[var(--foreground)]">
            We Would Be Honored to Preserve Your Sacred Day
          </h3>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Contact us to arrange an in-person or video consultation with Reuben Serrao.
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
