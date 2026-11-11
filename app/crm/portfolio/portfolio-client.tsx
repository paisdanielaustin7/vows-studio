'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PortfolioItem } from '@/types/portfolio';
import {
  publishPortfolioItemAction,
  unpublishPortfolioItemAction,
  createPortfolioItemAction,
  deletePortfolioItemAction,
} from '@/server/actions/portfolio.actions';
import {
  Plus,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Trash2,
  X,
  FileCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface PortfolioClientProps {
  initialItems: PortfolioItem[];
  canManage: boolean;
}

export function PortfolioClient({ initialItems, canManage }: PortfolioClientProps) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Consent Dialog state
  const [consentTargetItem, setConsentTargetItem] = useState<PortfolioItem | null>(null);
  const [consentCheck1, setConsentCheck1] = useState(false);
  const [consentCheck2, setConsentCheck2] = useState(false);
  const [consentCheck3, setConsentCheck3] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // New Item Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEventType, setNewEventType] = useState('wedding');
  const [newDescription, setNewDescription] = useState('');
  const [newShootDate, setNewShootDate] = useState('');
  const [newCoverPath, setNewCoverPath] = useState('');
  const [newTags, setNewTags] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.eventType !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const handleOpenConsentDialog = (item: PortfolioItem) => {
    setConsentTargetItem(item);
    setConsentCheck1(false);
    setConsentCheck2(false);
    setConsentCheck3(false);
    setDialogError(null);
  };

  const handleConfirmPublish = async () => {
    if (!consentTargetItem) return;
    if (!consentCheck1 || !consentCheck2 || !consentCheck3) {
      setDialogError('All three compliance releases must be verified to satisfy DPDP legal obligations.');
      return;
    }

    setPublishing(true);
    setDialogError(null);

    const res = await publishPortfolioItemAction(consentTargetItem.id, true);
    setPublishing(false);

    if (res.error) {
      setDialogError(res.error.message);
      return;
    }

    // Update local state
    setItems((prev) =>
      prev.map((it) =>
        it.id === consentTargetItem.id
          ? {
              ...it,
              isPublished: true,
              clientConsentConfirmedAt: res.data?.publishedAt || new Date().toISOString(),
            }
          : it
      )
    );

    setConsentTargetItem(null);
  };

  const handleUnpublish = async (item: PortfolioItem) => {
    if (!confirm(`Are you sure you want to unpublish "${item.title}" from the public website?`)) {
      return;
    }

    const res = await unpublishPortfolioItemAction(item.id);
    if (res.data) {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isPublished: false } : it))
      );
    } else if (res.error) {
      alert(res.error.message);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    const res = await deletePortfolioItemAction(item.id);
    if (res.data) {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } else if (res.error) {
      alert(res.error.message);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    const res = await createPortfolioItemAction({
      title: newTitle.trim(),
      eventType: newEventType as 'wedding',
      description: newDescription.trim() || undefined,
      shootDate: newShootDate || undefined,
      coverImagePath:
        newCoverPath.trim() ||
        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      sort: 0,
      isPublished: false, // strictly created as draft
    });

    setCreating(false);

    if (res.data) {
      setItems((prev) => [res.data!, ...prev]);
      setShowNewModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewShootDate('');
      setNewCoverPath('');
      setNewTags('');
    } else if (res.error) {
      alert(res.error.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header matching Stitch */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-[var(--surface-muted)] p-6 sm:p-8 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-[var(--accent-soft)] text-[var(--primary)] px-2.5 py-0.5 rounded-full">
              Website Showcase Engine
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">Curated Edition 2025.4</span>
          </div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Portfolio &amp; Showcase Manager
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
            Curate public web galleries, arrange visual story sequences, and ensure strict client publication releases across high-res stills and cinema reels.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-[var(--accent)]" />
              <span>+ Add New Project</span>
            </button>
            <Link
              href="/portfolio"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all shadow-sm"
            >
              <span>View Public Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { label: 'All Items', val: 'all' },
            { label: 'Weddings', val: 'wedding' },
            { label: 'Receptions', val: 'reception' },
            { label: 'Pre-Wedding', val: 'pre_wedding' },
            { label: 'Portraits', val: 'portrait' },
          ].map((cat) => (
            <button
              key={cat.val}
              type="button"
              onClick={() => setSelectedCategory(cat.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.val
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search projects by couple, location, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Grid of Portfolio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isLive = item.isPublished && !!item.clientConsentConfirmedAt;
          return (
            <div
              key={item.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-[var(--surface-muted)]">
                  {item.coverImagePath && (
                    <Image
                      src={item.coverImagePath}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  )}
                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white px-2 py-0.5 rounded">
                      {item.eventType.replace('_', ' ')}
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[var(--success)] text-white px-2 py-0.5 rounded shadow-sm">
                        <Globe className="w-3 h-3" />
                        Live on Site
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[var(--warning)] text-white px-2 py-0.5 rounded shadow-sm">
                        <AlertTriangle className="w-3 h-3" />
                        Draft / Unconsented
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-bold text-[var(--foreground)] leading-snug">
                      {item.title}
                    </h3>
                    {item.shootDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{item.shootDate}</span>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Consent Badge */}
                  <div className="pt-2">
                    {item.clientConsentConfirmedAt ? (
                      <div className="inline-flex items-center gap-1 text-[11px] text-[var(--success)] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Consent Confirmed: {new Date(item.clientConsentConfirmedAt).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-[11px] text-[var(--warning)] font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Client Written Consent Required to Publish</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div className="p-4 bg-[var(--surface-muted)] border-t border-[var(--border)] flex items-center justify-between">
                  {isLive ? (
                    <button
                      type="button"
                      onClick={() => handleUnpublish(item)}
                      className="text-xs font-semibold text-[var(--warning)] hover:underline"
                    >
                      Unpublish to Draft
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConsentDialog(item)}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publish with Consent</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--danger)] rounded transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONSENT CONFIRMATION DIALOG (Matches stitch-screens/portfolio_manager_consent_dialog_desktop) */}
      {consentTargetItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden border border-[var(--border)] animate-in zoom-in-95 duration-200">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--accent)]" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold tracking-tight">
                    Confirm Client Publication Consent
                  </h3>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Legal Release Protocol &bull; DPDP Compliance
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConsentTargetItem(null)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              Before making imagery public on the VOWS Studio website, verify that the couple has executed a Studio Media &amp; Public Display Release under our DPDP standards.
            </p>

            {/* Commission reference card */}
            <div className="bg-[var(--background)] border border-[var(--border)] p-4 rounded-xl space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Commission Target
              </div>
              <div className="font-semibold text-sm text-[var(--foreground)]">
                {consentTargetItem.title}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Category: {consentTargetItem.eventType.replace('_', ' ')}
              </div>
            </div>

            {dialogError && (
              <div className="p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs border border-[var(--danger)]/30">
                {dialogError}
              </div>
            )}

            {/* Checkbox Controls */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={consentCheck1}
                  onChange={(e) => setConsentCheck1(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)] mt-0.5 accent-[var(--primary)] cursor-pointer"
                />
                <span className="leading-relaxed">
                  Couple has explicitly approved web showcase display of solemnization and reception stills.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={consentCheck2}
                  onChange={(e) => setConsentCheck2(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)] mt-0.5 accent-[var(--primary)] cursor-pointer"
                />
                <span className="leading-relaxed">
                  Faces of private family members, guests, and minors are either cleared or excluded.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={consentCheck3}
                  onChange={(e) => setConsentCheck3(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)] mt-0.5 accent-[var(--primary)] cursor-pointer"
                />
                <span className="leading-relaxed">
                  No church sanctuary confidentiality restrictions or priest photography bans were violated.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setConsentTargetItem(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing || !consentCheck1 || !consentCheck2 || !consentCheck3}
                onClick={handleConfirmPublish}
                className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold tracking-wider uppercase hover:opacity-90 transition-all disabled:opacity-40"
              >
                {publishing ? 'Publishing...' : 'Confirm Consent & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PORTFOLIO ITEM MODAL */}
      {showNewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden border border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
                  Add New Portfolio Monograph
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Created as an internal draft. Publishing requires client release confirmation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider block">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenneth & Rochelle — St. Aloysius Chapel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider block">
                    Event Type *
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    <option value="wedding">Wedding / Nuptials</option>
                    <option value="reception">Reception</option>
                    <option value="pre_wedding">Pre-Wedding</option>
                    <option value="portrait">Editorial Portrait</option>
                    <option value="mehendi">Roce / Ceremony</option>
                    <option value="engagement">Engagement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider block">
                    Shoot Date
                  </label>
                  <input
                    type="date"
                    value={newShootDate}
                    onChange={(e) => setNewShootDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider block">
                  Cover Image URL / Storage Path
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or storage path"
                  value={newCoverPath}
                  onChange={(e) => setNewCoverPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider block">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="35mm Film, Goa, Cathedral, Golden Hour"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief story, location details, film stock used..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold uppercase"
                >
                  {creating ? 'Creating...' : 'Save Monograph Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
