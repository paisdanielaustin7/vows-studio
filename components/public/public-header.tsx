'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services & Pricing', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/contact' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)] transition-all">
      <div className="h-20 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex flex-col group select-none transition-opacity hover:opacity-80"
          aria-label="VOWS Studio Home"
        >
          <span className="font-[family-name:var(--font-cormorant)] text-2xl font-bold tracking-[0.2em] text-[var(--foreground)] uppercase leading-none">
            VOWS STUDIO
          </span>
          <span className="text-[10px] tracking-[0.25em] text-[var(--muted-foreground)] uppercase font-medium mt-1">
            Wedding Cinematic &amp; Stills
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-8"
          aria-label="Main Navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-wide transition-colors py-1 ${
                  isActive
                    ? 'text-[var(--foreground)] font-semibold border-b-2 border-[var(--accent)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-medium'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase transition-colors"
          >
            Studio Portal
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm"
          >
            Enquire
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium tracking-wider uppercase"
          >
            Enquire
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--background)] px-6 py-6 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base tracking-wide py-1.5 flex items-center justify-between ${
                    isActive
                      ? 'text-[var(--foreground)] font-semibold'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-40" />
                </Link>
              );
            })}
            <div className="h-px w-full bg-[var(--border)] my-2" />
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-[var(--muted-foreground)] py-1"
              >
                Client &amp; Team Portal Sign In
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center py-3 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase shadow-sm"
              >
                Initiate Inscription (Enquire)
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
