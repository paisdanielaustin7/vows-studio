'use client';

import React, { useState } from 'react';
import {
  updateSiteContentAction,
  updateSitePageSeoAction,
  createFaqItemAction,
  deleteFaqItemAction,
} from '@/server/actions/website.actions';
import { FaqItem, SitePageSeo } from '@/types/portfolio';
import {
  Globe,
  FileText,
  HelpCircle,
  Search,
  Shield,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface WebsiteSettingsClientProps {
  initialHome: Record<string, unknown>;
  initialAbout: Record<string, unknown>;
  initialFaqs: FaqItem[];
  initialSeo: Record<string, SitePageSeo>;
  initialPrivacy: Record<string, unknown>;
  initialTerms: Record<string, unknown>;
  canEdit: boolean;
}

export function WebsiteSettingsClient({
  initialHome,
  initialAbout,
  initialFaqs,
  initialSeo,
  initialPrivacy,
  initialTerms,
  canEdit,
}: WebsiteSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'faqs' | 'seo' | 'legal'>('home');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Home state
  const [homeData, setHomeData] = useState({
    heroTitle: String(initialHome.heroTitle || 'VOWS'),
    heroSubtitle: String(initialHome.heroSubtitle || 'Wedding Cinematic & Stills'),
    heroDescription: String(
      initialHome.heroDescription ||
        'Understated cinematic documentation and heirloom analog stills capturing sacred vows across heritage chapels, coastal solemnizations, and intimate family gatherings with reverent stillness.'
    ),
    tagline: String(
      initialHome.tagline ||
        'Fine Art Christian Wedding Cinematography & Analog Stills • Goa & Mangalore'
    ),
  });

  // About state
  const [aboutData, setAboutData] = useState({
    founderName: String(initialAbout.founderName || 'Reuben Serrao'),
    founderRole: String(initialAbout.founderRole || 'Founder & Principal Cinematographer'),
    heritageStory: String(
      initialAbout.heritageStory ||
        'Founded in Light House Hill, Mangalore, VOWS was born from a desire to return to reverence. In an era of hurried wedding trends and loud spectacles, we stand for quiet, enduring beauty.'
    ),
    artisticPhilosophy: String(
      initialAbout.artisticPhilosophy ||
        'We honor natural light, chemical film stock, and unchoreographed honesty.'
    ),
    equipmentPhilosophy: String(
      initialAbout.equipmentPhilosophy ||
        'From Leica rangefinders and mechanical 35mm film cameras to cinema-grade prime glass.'
    ),
  });

  // FAQs state
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingFaq, setAddingFaq] = useState(false);

  // SEO state
  const [seoList, setSeoList] = useState<Record<string, SitePageSeo>>(initialSeo);
  const [selectedSeoPage, setSelectedSeoPage] = useState('/');

  // Legal state
  const [privacyContent, setPrivacyContent] = useState(
    String(
      initialPrivacy.content ||
        'VOWS operates with the highest standard of client privacy. We strictly honor client image publishing consent.'
    )
  );
  const [termsContent, setTermsContent] = useState(
    String(
      initialTerms.content ||
        'All engagements with VOWS are subject to our formal booking agreement.'
    )
  );

  const handleSaveHome = async () => {
    setSaving(true);
    setStatusMsg(null);
    const res = await updateSiteContentAction({ key: 'home_settings', value: homeData });
    setSaving(false);
    if (res.error) {
      setStatusMsg({ text: res.error.message, type: 'error' });
    } else {
      setStatusMsg({ text: 'Homepage settings updated successfully', type: 'success' });
    }
  };

  const handleSaveAbout = async () => {
    setSaving(true);
    setStatusMsg(null);
    const res = await updateSiteContentAction({ key: 'about_settings', value: aboutData });
    setSaving(false);
    if (res.error) {
      setStatusMsg({ text: res.error.message, type: 'error' });
    } else {
      setStatusMsg({ text: 'About section updated successfully', type: 'success' });
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setAddingFaq(true);
    const res = await createFaqItemAction({
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      sort: faqs.length + 1,
      isPublished: true,
    });
    setAddingFaq(false);

    if (res.data) {
      setFaqs([...faqs, res.data]);
      setNewQuestion('');
      setNewAnswer('');
      setStatusMsg({ text: 'FAQ item created', type: 'success' });
    } else if (res.error) {
      setStatusMsg({ text: res.error.message, type: 'error' });
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ item?')) return;
    const res = await deleteFaqItemAction(id);
    if (res.data) {
      setFaqs(faqs.filter((f) => f.id !== id));
      setStatusMsg({ text: 'FAQ deleted', type: 'success' });
    }
  };

  const handleSaveSeo = async () => {
    const cur = seoList[selectedSeoPage] || {
      pageKey: selectedSeoPage,
      metaTitle: '',
      metaDescription: '',
      updatedAt: '',
    };
    setSaving(true);
    setStatusMsg(null);
    const res = await updateSitePageSeoAction({
      pageKey: selectedSeoPage,
      metaTitle: cur.metaTitle || undefined,
      metaDescription: cur.metaDescription || undefined,
      ogImagePath: cur.ogImagePath || undefined,
    });
    setSaving(false);

    if (res.error) {
      setStatusMsg({ text: res.error.message, type: 'error' });
    } else {
      setStatusMsg({ text: `SEO updated for ${selectedSeoPage}`, type: 'success' });
    }
  };

  const handleSaveLegal = async () => {
    setSaving(true);
    setStatusMsg(null);
    const [pRes, tRes] = await Promise.all([
      updateSiteContentAction({
        key: 'privacy_policy',
        value: { lastUpdated: new Date().toISOString().split('T')[0], content: privacyContent },
      }),
      updateSiteContentAction({
        key: 'terms_of_service',
        value: { lastUpdated: new Date().toISOString().split('T')[0], content: termsContent },
      }),
    ]);
    setSaving(false);

    if (pRes.error || tRes.error) {
      setStatusMsg({ text: pRes.error?.message || tRes.error?.message || 'Error saving legal pages', type: 'error' });
    } else {
      setStatusMsg({ text: 'Privacy Policy & Terms of Service updated', type: 'success' });
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs border ${
            statusMsg.type === 'success'
              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
              : 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-1">
        {[
          { key: 'home', label: 'Homepage & Hero', icon: Globe },
          { key: 'about', label: 'About & Philosophy', icon: FileText },
          { key: 'faqs', label: 'FAQs & Protocols', icon: HelpCircle },
          { key: 'seo', label: 'SEO & Metadata', icon: Search },
          { key: 'legal', label: 'Privacy & Terms', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HOMEPAGE */}
      {activeTab === 'home' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
              Homepage Editorial Settings
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Modify the headline, monologue description, and studio credentials shown to couples on the landing page.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Tagline Micro-Banner</label>
              <input
                type="text"
                disabled={!canEdit}
                value={homeData.tagline}
                onChange={(e) => setHomeData({ ...homeData, tagline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block">Main Hero Title</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={homeData.heroTitle}
                  onChange={(e) => setHomeData({ ...homeData, heroTitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block">Hero Subtitle</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={homeData.heroSubtitle}
                  onChange={(e) => setHomeData({ ...homeData, heroSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Editorial Description</label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={homeData.heroDescription}
                onChange={(e) => setHomeData({ ...homeData, heroDescription: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>
          </div>

          {canEdit && (
            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveHome}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ABOUT */}
      {activeTab === 'about' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
              About &amp; Philosophy Copy
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Studio heritage narrative, Reuben Serrao founder credentials, and camera craft values.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block">Founder Name</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={aboutData.founderName}
                  onChange={(e) => setAboutData({ ...aboutData, founderName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block">Founder Role</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={aboutData.founderRole}
                  onChange={(e) => setAboutData({ ...aboutData, founderRole: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Heritage Story</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={aboutData.heritageStory}
                onChange={(e) => setAboutData({ ...aboutData, heritageStory: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Artistic Philosophy</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={aboutData.artisticPhilosophy}
                onChange={(e) => setAboutData({ ...aboutData, artisticPhilosophy: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Equipment &amp; Vault Philosophy</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={aboutData.equipmentPhilosophy}
                onChange={(e) => setAboutData({ ...aboutData, equipmentPhilosophy: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>
          </div>

          {canEdit && (
            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAbout}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          {canEdit && (
            <form onSubmit={handleAddFaq} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
                + Add New FAQ Item
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Question (e.g. Do you shoot uncompressed audio?)"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Answer explanation..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingFaq}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold uppercase"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingFaq ? 'Adding...' : 'Add FAQ Item'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
              Existing FAQ Items ({faqs.length})
            </h3>
            <div className="space-y-4">
              {faqs.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      {idx + 1}. {f.question}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      {f.answer}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(f.id)}
                      className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SEO */}
      {activeTab === 'seo' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
              Search Engine Optimization (SEO) &amp; Open Graph
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Customize meta titles, descriptions, and preview social sharing tags per public page route.
            </p>
          </div>

          {/* Page selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['/', '/portfolio', '/services', '/about', '/contact', '/reviews', '/faq', '/privacy', '/terms'].map((route) => (
              <button
                key={route}
                type="button"
                onClick={() => setSelectedSeoPage(route)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                  selectedSeoPage === route
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {route}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Meta Title</label>
              <input
                type="text"
                disabled={!canEdit}
                value={seoList[selectedSeoPage]?.metaTitle || ''}
                onChange={(e) =>
                  setSeoList({
                    ...seoList,
                    [selectedSeoPage]: {
                      ...(seoList[selectedSeoPage] || { pageKey: selectedSeoPage, updatedAt: '' }),
                      metaTitle: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Meta Description</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={seoList[selectedSeoPage]?.metaDescription || ''}
                onChange={(e) =>
                  setSeoList({
                    ...seoList,
                    [selectedSeoPage]: {
                      ...(seoList[selectedSeoPage] || { pageKey: selectedSeoPage, updatedAt: '' }),
                      metaDescription: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">Open Graph Image URL / Path</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="https://... or /branding/og.jpg"
                value={seoList[selectedSeoPage]?.ogImagePath || ''}
                onChange={(e) =>
                  setSeoList({
                    ...seoList,
                    [selectedSeoPage]: {
                      ...(seoList[selectedSeoPage] || { pageKey: selectedSeoPage, updatedAt: '' }),
                      ogImagePath: e.target.value,
                    },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
              />
            </div>
          </div>

          {canEdit && (
            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSeo}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : `Save SEO for ${selectedSeoPage}`}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: LEGAL */}
      {activeTab === 'legal' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
              Legal Text &amp; Client Consent Statements
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Edit the text displayed on the public Privacy Policy and Terms of Service routes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">
                Privacy Policy Statement
              </label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={privacyContent}
                onChange={(e) => setPrivacyContent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block">
                Terms of Service Overview
              </label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs font-mono"
              />
            </div>
          </div>

          {canEdit && (
            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveLegal}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Legal Policies'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
