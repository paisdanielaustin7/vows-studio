import React from 'react';
import type { Metadata } from 'next';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WebsiteSettingsClient } from './website-settings-client';
import { FaqItem, SitePageSeo } from '@/types/portfolio';

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

const CONTENT_KEYS = ['home_settings', 'about_settings', 'privacy_policy', 'terms_of_service'];

export default async function WebsiteSettingsPage() {
  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createClient()]);
  if (!user) {
    redirect('/login');
  }

  const canEdit = user.role === 'system_admin' || user.role === 'business_owner';

  const [contentRes, faqsRes, seoRes] = await Promise.all([
    supabase.from('site_content').select('key, value').in('key', CONTENT_KEYS),
    supabase
      .from('faq_items')
      .select('*')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('site_page_seo').select('*').in('page_key', SEO_PAGES),
  ]);

  const contentMap: Record<string, Record<string, unknown>> = {};
  for (const row of contentRes.data || []) {
    contentMap[row.key] = (row.value as Record<string, unknown>) || {};
  }

  const faqs: FaqItem[] = (faqsRes.data || []).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sort: row.sort,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const seoMap: Record<string, SitePageSeo> = {};
  for (const page of SEO_PAGES) {
    seoMap[page] = { pageKey: page, metaTitle: '', metaDescription: '', updatedAt: '' };
  }
  for (const row of seoRes.data || []) {
    seoMap[row.page_key] = {
      pageKey: row.page_key,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      ogImagePath: row.og_image_path,
      updatedAt: row.updated_at,
    };
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Website Content &amp; SEO Engine
        </h2>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
          Manage landing page copy, studio philosophy, FAQs, legal statements, and search engine metadata.
        </p>
      </div>

      <WebsiteSettingsClient
        initialHome={contentMap.home_settings || {}}
        initialAbout={contentMap.about_settings || {}}
        initialFaqs={faqs}
        initialSeo={seoMap}
        initialPrivacy={contentMap.privacy_policy || {}}
        initialTerms={contentMap.terms_of_service || {}}
        canEdit={canEdit}
      />
    </div>
  );
}
