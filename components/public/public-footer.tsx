import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--surface)] border-t border-[var(--border)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          {/* Col 1: Studio Monograph Brand (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-block group py-1" aria-label="VOWS Home">
              <Image
                src="/images/logo-light.png"
                alt="VOWS"
                width={160}
                height={56}
                className="h-12 w-auto object-contain dark:hidden"
              />
              <Image
                src="/images/logo-dark.png"
                alt="VOWS"
                width={160}
                height={56}
                className="h-12 w-auto object-contain hidden dark:block"
              />
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-sm">
              Understated cinematic documentation and heirloom analog stills capturing sacred Christian nuptials across heritage cathedral arches, coastal solemnizations, and family gatherings.
            </p>
            <div className="pt-2 text-xs text-[var(--muted-foreground)] space-y-1">
              <div>Principal Cinematographer: <strong className="font-medium text-[var(--foreground)]">Reuben Serrao</strong></div>
              <div>Operating across Goa, Mangalore, Bangalore, and Worldwide</div>
            </div>
          </div>

          {/* Col 2: Navigation Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Monographs
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/portfolio" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Selected Works
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Services &amp; Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Our Philosophy
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Client Words
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Information & Compliance (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Information
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/faq" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  FAQ &amp; Timelines
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Privacy &amp; DPDP
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  Studio Portal Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Physical Atelier (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Atelier Coordinates
            </h4>
            <address className="not-italic text-sm text-[var(--muted-foreground)] leading-relaxed">
              <span className="font-medium text-[var(--foreground)] block">Atelier 4B, Heritage Square</span>
              Light House Hill, Mangalore<br />
              Karnataka 575001, India<br />
              <span className="block mt-2 font-mono text-xs">+91 98200 44521</span>
              <span className="block font-mono text-xs">concierge@vowsstudio.com</span>
            </address>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance Guarantee */}
        <div className="border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
          <div>
            &copy; {currentYear} VOWS. All rights reserved.
          </div>
          <div className="text-center sm:text-right">
            100% Client Consent Release Verified. Archival preservation SLA 99.98%.
          </div>
        </div>
      </div>
    </footer>
  );
}
