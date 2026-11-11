import React from 'react';
import type { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getSiteContentAction,
  listFaqItemsAction,
  getSitePageSeoAction,
} from '@/server/actions/website.actions';
import { WebsiteSettingsClient } from './website-settings-client';
import { SitePageSeo } from '@/types/portfolio';

export const metadata: Metadata = {
  title: 'Website & SEO Settings — VOWS Studio CRM',
};

const SEO_PAGES = [
  '/',
  '/portfolio',
  '/services',
  '/about',
  '/contact',
  '/reviews',
  '/faq',
  '/privacy',
  '/terms',
];

export default async function WebsiteSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const canEdit = user.role === 'system_admin' || user.role === 'business_owner';

  const [homeRes, aboutRes, faqsRes, privacyRes, termsRes, ...seoResults] = await Promise.all([
    getSiteContentAction('home_settings'),
    getSiteContentAction('about_settings'),
    listFaqItemsAction(false),
    getSiteContentAction('privacy_policy'),
    getSiteContentAction('terms_of_service'),
    ...SEO_PAGES.map((p) => getSitePageSeoAction(p)),
  ]);

  const seoMap: Record<string, SitePageSeo> = {};
  SEO_PAGES.forEach((page, idx) => {
    const res = seoResults[idx];
    if (res?.data) {
      seoMap[page] = res.data;
    } else {
      seoMap[page] = { pageKey: page, metaTitle: '', metaDescription: '', updatedAt: '' };
    }
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Website Content &amp; SEO Engine
        </h2>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
          Manage landing page copy, studio philosophy, FAQs, legal statements, and search engine metadata.
        </p>
      </div>

      <WebsiteSettingsClient
        initialHome={homeRes.data?.value || {}}
        initialAbout={aboutRes.data?.value || {}}
        initialFaqs={faqsRes.data || []}
        initialSeo={seoMap}
        initialPrivacy={privacyRes.data?.value || {}}
        initialTerms={termsRes.data?.value || {}}
        canEdit={canEdit}
      />
    </div>
  );
}
