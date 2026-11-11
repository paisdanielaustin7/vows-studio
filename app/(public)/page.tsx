import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  getPublicPortfolioItems,
  getPublicServicesAndPackages,
  getPublicReviews,
  getPublicPageSeo,
} from '@/server/queries/website.queries';
import { formatINR } from '@/lib/money';
import { LocalBusinessJsonLd } from '@/components/public/json-ld';
import {
  ShieldCheck,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Camera,
  Film,
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicPageSeo(
    '/',
    'VOWS Studio — Wedding Cinematic & Stills | Goa & Mangalore',
    'Understated cinematic documentation and heirloom analog stills capturing sacred Christian nuptials across heritage chapels and coastal weddings.'
  );

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.metaTitle || undefined,
      description: seo.metaDescription || undefined,
      images: seo.ogImagePath ? [seo.ogImagePath] : undefined,
    },
  };
}

export default async function HomePage() {
  const [portfolioItems, catalogue, reviewsData] = await Promise.all([
    getPublicPortfolioItems(),
    getPublicServicesAndPackages(),
    getPublicReviews(),
  ]);

  const featuredItems = portfolioItems.slice(0, 4);
  const featuredPackages = catalogue.packages.slice(0, 3);
  const featuredReviews = reviewsData.reviews.slice(0, 3);

  return (
    <>
      <LocalBusinessJsonLd
        aggregateRating={{
          ratingValue: reviewsData.aggregateRating,
          reviewCount: reviewsData.totalReviews,
        }}
      />

      {/* 1. HERO SECTION */}
      <section className="w-full bg-[var(--background)] px-6 sm:px-8 lg:px-12 pt-12 pb-20 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto flex flex-col">
          {/* Micro-Tag */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Fine Art Christian Wedding Cinematography &amp; Analog Stills &bull; Goa &amp; Mangalore
            </span>
          </div>

          {/* Title & Editorial Description */}
          <div className="max-w-4xl">
            <h1 className="font-[family-name:var(--font-cormorant)] text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--foreground)] tracking-tight leading-[1.05] mb-4">
              Sacred Vows. Timeless Light.
            </h1>
            <p className="font-[family-name:var(--font-cormorant)] text-xl sm:text-2xl text-[var(--accent)] tracking-wide uppercase font-semibold mb-6">
              VOWS STUDIO &bull; Reuben Serrao
            </p>
            <p className="text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl leading-relaxed mb-10">
              Understated cinematic documentation and heirloom analog stills capturing sacred vows across heritage cathedral arches, coastal solemnizations, and intimate family gatherings with reverent stillness.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-14">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase rounded-md hover:opacity-90 transition-all shadow-sm"
              >
                Enquire for Your Date
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center px-8 py-4 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold tracking-wider uppercase rounded-md hover:bg-[var(--surface-muted)] transition-all shadow-sm"
              >
                View Curated Portfolio
              </Link>
            </div>
          </div>

          {/* Trust Strip */}
          <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--foreground)]">Reuben Serrao</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">Principal Director</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--foreground)]">48+ Solemnizations</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">Verified Cathedral Nuptials</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--foreground)]">100% Client Consent</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">DPDP Legal Releases</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--foreground)]">99.98% On-Time SLA</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">Archival Portal Delivery</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SELECTED PORTFOLIO WORKS */}
      <section className="w-full bg-[var(--surface)] px-6 sm:px-8 lg:px-12 py-20 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto flex flex-col">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] block mb-2">
                Selected Monographs
              </span>
              <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
                Moments Preserved in Quiet Reverence
              </h2>
            </div>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[var(--accent)] hover:underline"
            >
              <span>Explore Entire Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid of Portfolio Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {featuredItems.map((item, idx) => (
              <Link
                key={item.id}
                href="/portfolio"
                className={`group flex flex-col bg-[var(--background)] border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-md transition-all ${
                  idx === 0 ? 'md:col-span-2 lg:grid lg:grid-cols-12' : ''
                }`}
              >
                <div
                  className={`relative overflow-hidden bg-[var(--surface-muted)] ${
                    idx === 0 ? 'lg:col-span-7 aspect-[16/10]' : 'aspect-[16/10]'
                  }`}
                >
                  {item.coverImagePath && (
                    <Image
                      src={item.coverImagePath}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <span className="absolute top-4 left-4 bg-[var(--background)]/90 backdrop-blur-md px-3 py-1 rounded text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
                    {item.eventType.replace('_', ' ')}
                  </span>
                </div>
                <div
                  className={`p-6 sm:p-8 flex flex-col justify-between ${
                    idx === 0 ? 'lg:col-span-5' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                      Monograph No. 0{idx + 1}
                    </span>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-6 flex flex-wrap gap-1.5 border-t border-[var(--border)] mt-6">
                    {item.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted-foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ARTISTIC PHILOSOPHY */}
      <section className="w-full bg-[var(--background)] px-6 sm:px-8 lg:px-12 py-20 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] block">
              The Atelier Philosophy
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-5xl font-semibold text-[var(--foreground)] leading-tight">
              Reverence, Natural Light &amp; The Soul of Chemical Film
            </h2>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
              We approach sacred Catholic and Christian weddings not as commercial spectacles, but as profound sacramental covenants. We never bring intrusive lighting rigs into candlelit cathedral sanctuaries or choreograph artificial poses during your vows.
            </p>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed">
              Working with precision Leica optics, full-frame cinema cameras, and authentic Kodak 35mm film stock, our goal is to capture unscripted glances, parental blessings, and architectural stillness that will hold emotional weight fifty years from today.
            </p>
            <div className="pt-4 flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-[var(--foreground)]">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[var(--accent)]" />
                <span>35mm Analog Film</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>32-bit Float Audio</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border)] shadow-md">
            <Image
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
              alt="Cathedral altar light during wedding ceremony"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 4. SIGNATURE PACKAGES */}
      <section className="w-full bg-[var(--surface)] px-6 sm:px-8 lg:px-12 py-20 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto flex flex-col">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Curated Collections
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
              Signature Wedding Commissions
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Transparent investment collections designed for solemn chapel celebrations, coastal receptions, and multi-day family traditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredPackages.map((pkg, idx) => (
              <div
                key={pkg.id}
                className={`flex flex-col justify-between p-8 rounded-xl border transition-all ${
                  idx === 1
                    ? 'border-[var(--accent)] bg-[var(--background)] shadow-md ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] shadow-sm'
                }`}
              >
                <div className="space-y-6">
                  {idx === 1 && (
                    <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--primary)] text-[10px] font-bold tracking-widest uppercase">
                      Most Requested
                    </span>
                  )}
                  <div>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[var(--foreground)]">
                      {pkg.name}
                    </h3>
                    <div className="text-2xl font-bold font-mono tracking-tight text-[var(--foreground)] mt-2">
                      {formatINR(pkg.currentPricePaise)}
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      Standard Atelier Commission (Inclusive of GST)
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                      Deliverables Included:
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
                    className={`w-full inline-flex items-center justify-center py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
                      idx === 1
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm'
                        : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    Enquire With This Collection
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[var(--accent)] hover:underline"
            >
              <span>View Full Rate Card &amp; Modular Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="w-full bg-[var(--background)] px-6 sm:px-8 lg:px-12 py-20 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto flex flex-col">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Kind Words &bull; 4.9 / 5.0 Aggregate
            </span>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-semibold text-[var(--foreground)]">
              Couples We Have Celebrated With
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-xl flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-[var(--accent)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] italic leading-relaxed">
                    &ldquo;{rev.testimonial}&rdquo;
                  </p>
                </div>
                <div className="pt-6 border-t border-[var(--border)] mt-6">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {rev.coupleName}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {rev.venueName} &bull; {rev.eventDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL BOTTOM CTA BANNER */}
      <section className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] px-6 sm:px-8 lg:px-12 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)] block">
            Limited Commission Season
          </span>
          <h2 className="font-[family-name:var(--font-cormorant)] text-4xl sm:text-5xl font-bold leading-tight">
            Accepting Eighteen Couples for the 2025–2026 Calendar Year
          </h2>
          <p className="text-sm sm:text-base text-[var(--primary-foreground)]/80 max-w-xl mx-auto leading-relaxed">
            We limit our calendar to preserve deliberate focus and museum-grade storytelling for each marriage. Begin your inscription to confirm date availability.
          </p>
          <div className="pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-10 py-4 bg-[var(--accent)] text-[var(--foreground)] text-xs font-semibold tracking-wider uppercase rounded-md hover:opacity-90 transition-all shadow-lg"
            >
              Initiate Wedding Inscription
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
