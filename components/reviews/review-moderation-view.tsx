'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Download,
  Link as LinkIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Sparkles,
  ShieldAlert,
  Loader2,
  Calendar,
  MessageSquare,
  Camera,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ReviewListItem, ReviewStats, ReviewStatus } from '@/types/reviews';
import { moderateReviewAction, listReviewsAction } from '@/server/actions/reviews.actions';
import { GenerateReviewLinkModal } from './generate-review-link-modal';

interface ReviewModerationViewProps {
  initialReviews: ReviewListItem[];
  initialStats: ReviewStats;
  currentUserRole: string;
}

export function ReviewModerationView({
  initialReviews,
  initialStats,
  currentUserRole,
}: ReviewModerationViewProps) {
  const [reviews, setReviews] = useState<ReviewListItem[]>(initialReviews);
  const [stats, setStats] = useState<ReviewStats>(initialStats);
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    initialReviews[0]?.id || ''
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Action States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canModerate = currentUserRole === 'system_admin' || currentUserRole === 'business_owner';

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.reviewer_name.toLowerCase().includes(q);
      const matchBody = r.body.toLowerCase().includes(q);
      const matchBooking = r.booking_number?.toLowerCase().includes(q);
      const matchClient = r.client_name?.toLowerCase().includes(q);
      return matchName || matchBody || matchBooking || matchClient;
    }
    return true;
  });

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) || filteredReviews[0] || null;

  const refreshList = async () => {
    const res = await listReviewsAction();
    if (res.data) {
      setReviews(res.data.reviews);
      setStats(res.data.stats);
    }
  };

  const handleModerate = async (status: ReviewStatus, note?: string) => {
    if (!selectedReview) return;
    setIsActionLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await moderateReviewAction({
        reviewId: selectedReview.id,
        status,
        moderationNote: note,
      });

      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error.message || 'Moderation failed' });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `Review updated to ${status.toUpperCase()} status.`,
        });
        setIsRejecting(false);
        setRejectionNote('');
        await refreshList();
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Moderation action failed' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredReviews.length === 0) return;

    const headers = [
      'Review ID',
      'Booking Ref',
      'Couple Name',
      'Overall Rating',
      'Communication',
      'Quality',
      'Punctuality',
      'Status',
      'Testimonial Narrative',
      'Submitted At',
      'Moderation Note',
    ];

    const rows = filteredReviews.map((r) => [
      r.id,
      r.booking_number || '',
      `"${r.reviewer_name.replace(/"/g, '""')}"`,
      r.overall_rating,
      r.communication_rating || '',
      r.quality_rating || '',
      r.punctuality_rating || '',
      r.status,
      `"${r.body.replace(/"/g, '""')}"`,
      r.submitted_at,
      `"${(r.moderation_note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vows-reviews-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">
              Editorial Governance
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="text-[11px] text-tertiary">
              SLA Verification Protocol v2.4
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Client Reviews &amp; Testimonials Moderation
          </h1>
          <p className="text-xs sm:text-sm text-outline leading-relaxed max-w-2xl">
            Curate verified client feedback, moderate public showcase visibility, and inspect category-level scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-tertiary" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsLinkModalOpen(true)}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-on-primary text-xs font-semibold shadow-sm transition-all flex items-center gap-2 group"
          >
            <LinkIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Generate Review Link</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Overall Studio Score */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
              Overall Studio Score
            </span>
            <span className="p-1.5 rounded-full bg-secondary-container text-on-secondary-container">
              <Star className="w-4 h-4 fill-current text-secondary" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-on-surface">
              {stats.avgOverallRating.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-tertiary">/ 5.0</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-outline">
            <span>From {stats.approvedCount} approved reviews</span>
            <span className="font-semibold text-secondary">
              {stats.totalReviews > 0
                ? Math.round((stats.approvedCount / stats.totalReviews) * 100)
                : 100}
              % verified
            </span>
          </div>

          <div className="w-full bg-surface-container h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${(stats.avgOverallRating / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 2: Moderation Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
              Moderation Breakdown
            </span>
            <span className="p-1.5 rounded-full bg-surface-container text-tertiary">
              <Sparkles className="w-4 h-4 text-tertiary" />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-lg font-bold text-on-surface font-mono">
                  {stats.approvedCount}
                </span>
              </div>
              <span className="text-[10px] text-tertiary uppercase">Approved</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-lg font-bold text-on-surface font-mono">
                  {stats.pendingCount}
                </span>
              </div>
              <span className="text-[10px] text-tertiary uppercase">Pending</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error" />
                <span className="text-lg font-bold text-on-surface font-mono">
                  {stats.rejectedCount}
                </span>
              </div>
              <span className="text-[10px] text-tertiary uppercase">Rejected</span>
            </div>
          </div>

          <div className="flex gap-1 h-1.5 w-full mt-3 rounded-full overflow-hidden bg-surface-container">
            <div
              className="bg-secondary"
              style={{
                width: `${stats.totalReviews > 0 ? (stats.approvedCount / stats.totalReviews) * 100 : 70}%`,
              }}
            />
            <div
              className="bg-accent"
              style={{
                width: `${stats.totalReviews > 0 ? (stats.pendingCount / stats.totalReviews) * 100 : 20}%`,
              }}
            />
            <div
              className="bg-error"
              style={{
                width: `${stats.totalReviews > 0 ? (stats.rejectedCount / stats.totalReviews) * 100 : 10}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Category Performance */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
              Category Performance
            </span>
            <span className="p-1.5 rounded-full bg-surface-container text-tertiary">
              <Star className="w-4 h-4 text-tertiary" />
            </span>
          </div>

          <div className="flex flex-col gap-2 mt-2 text-xs">
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-outline">Communication</span>
                <span className="font-bold text-on-surface font-mono">
                  {stats.avgCommunicationRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: `${(stats.avgCommunicationRating / 5) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-outline">Cinematic Quality</span>
                <span className="font-bold text-on-surface font-mono">
                  {stats.avgQualityRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: `${(stats.avgQualityRating / 5) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-outline">Punctuality</span>
                <span className="font-bold text-on-surface font-mono">
                  {stats.avgPunctualityRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: `${(stats.avgPunctualityRating / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-surface-container text-on-surface'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            All <span className="ml-1 opacity-70">({stats.totalReviews})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Pending Moderation</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-accent/20 text-accent font-bold">
              {stats.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'approved'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            Approved <span className="ml-1 opacity-70">({stats.approvedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-error-container text-on-error-container'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            Rejected <span className="ml-1 opacity-70">({stats.rejectedCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-tertiary absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search couple, booking..."
            className="w-full bg-surface-container-low pl-9 pr-3.5 py-1.5 rounded-lg text-xs sm:text-sm text-on-surface placeholder:text-tertiary border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-secondary-container text-on-secondary-container border-secondary/20'
              : 'bg-error-container text-on-error-container border-error/20'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Two-Column Moderation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Review List (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {filteredReviews.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/40 p-12 rounded-2xl text-center space-y-3">
              <Sparkles className="w-8 h-8 text-outline mx-auto" />
              <h3 className="text-sm font-bold text-on-surface">No reviews found</h3>
              <p className="text-xs text-outline max-w-sm mx-auto">
                No client reviews match the selected filter criteria.
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => {
              const isSelected = selectedReview?.id === rev.id;
              const initials = rev.reviewer_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');

              return (
                <div
                  key={rev.id}
                  onClick={() => setSelectedReviewId(rev.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container-lowest border-primary shadow-sm'
                      : 'bg-surface-container-lowest border-outline-variant/40 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary-container/30 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-on-surface truncate">
                            {rev.reviewer_name}
                          </h4>

                          {rev.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-secondary" />
                              Approved
                            </span>
                          )}

                          {rev.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                              Pending Moderation
                            </span>
                          )}

                          {rev.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-error-container text-on-error-container flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-error" />
                              Rejected
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-tertiary block truncate">
                          Commission {rev.booking_number || 'BKG'} &bull;{' '}
                          {new Date(rev.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-lg shrink-0 border border-outline-variant/30">
                      <Star className="w-3.5 h-3.5 text-primary fill-current" />
                      <span className="text-xs font-bold text-on-surface font-mono">
                        {rev.overall_rating}.0
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-outline line-clamp-2 leading-relaxed">
                    &ldquo;{rev.body}&rdquo;
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Inspection Detail Panel (Col 5) */}
        <div className="lg:col-span-5 sticky top-6">
          {selectedReview ? (
            <div className="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-2xl shadow-sm space-y-6">
              {/* Panel Header */}
              <div className="flex items-start justify-between pb-4 border-b border-surface-container">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Inspection Detail
                  </span>
                  <div className="text-xs font-mono text-tertiary">
                    REV-ID: {selectedReview.id.slice(0, 8)}
                  </div>
                </div>

                <div>
                  {selectedReview.status === 'approved' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary-container text-on-secondary-container">
                      Approved &amp; Published
                    </span>
                  )}
                  {selectedReview.status === 'pending' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/20 text-accent">
                      Pending Moderation
                    </span>
                  )}
                  {selectedReview.status === 'rejected' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-error-container text-on-error-container">
                      Rejected / Flagged
                    </span>
                  )}
                </div>
              </div>

              {/* Commission Reference Badge */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Verified Commission Record
                  </span>
                  <div className="text-xs font-bold text-on-surface">
                    Ref · {selectedReview.booking_number}
                  </div>
                  <div className="text-[11px] text-tertiary">
                    {selectedReview.client_name || 'Confirmed Client'}
                  </div>
                </div>

                <Link
                  href={`/crm/bookings/${selectedReview.booking_id}`}
                  className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
                >
                  <span>View Booking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Overall Score */}
              <div className="flex items-center justify-between py-2 border-y border-surface-container">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary block">
                    Overall Rating
                  </span>
                  <div className="flex items-center gap-1 text-primary mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= selectedReview.overall_rating
                            ? 'fill-current text-primary'
                            : 'text-outline-variant'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-3xl font-bold font-mono text-on-surface">
                  {selectedReview.overall_rating}.0
                </span>
              </div>

              {/* 3 Granular Criteria */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary block">
                  Granular Assessment
                </span>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    Communication
                  </span>
                  <span className="text-xs font-mono font-bold text-secondary">
                    {selectedReview.communication_rating || 5}.0 / 5.0
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    Cinematic Quality
                  </span>
                  <span className="text-xs font-mono font-bold text-secondary">
                    {selectedReview.quality_rating || 5}.0 / 5.0
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Punctuality &amp; Discipline
                  </span>
                  <span className="text-xs font-mono font-bold text-secondary">
                    {selectedReview.punctuality_rating || 5}.0 / 5.0
                  </span>
                </div>
              </div>

              {/* Full Testimonial Quote */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary block">
                  Full Testimonial Text
                </span>
                <div className="p-4 rounded-xl bg-surface-container-low text-xs sm:text-sm text-on-surface leading-relaxed border-l-4 border-secondary italic">
                  &ldquo;{selectedReview.body}&rdquo;
                </div>
              </div>

              {/* Moderation Note Display if present */}
              {selectedReview.moderation_note && (
                <div className="p-3.5 rounded-xl bg-surface-container text-xs text-on-surface space-y-1 border border-outline-variant/30">
                  <span className="text-[10px] font-bold uppercase text-tertiary">
                    Moderator Note:
                  </span>
                  <p className="italic">{selectedReview.moderation_note}</p>
                </div>
              )}

              {/* RBAC R6 Governance Alert for Manager */}
              {!canModerate ? (
                <div className="p-4 rounded-xl bg-secondary-container/40 border border-secondary/20 text-xs text-on-surface space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-secondary">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Editorial Governance (RBAC R6)</span>
                  </div>
                  <p className="text-tertiary leading-relaxed">
                    Review moderation (approval, rejection, showcase retraction) is restricted to Studio Owner &amp; System Administrator. As Studio Manager, you can generate invite links and inspect feedback.
                  </p>
                </div>
              ) : (
                /* Moderation Controls for SA & BO */
                <div className="space-y-3 pt-2 border-t border-surface-container">
                  {isRejecting ? (
                    <div className="space-y-3 p-3.5 rounded-xl bg-error-container/20 border border-error/30 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-error block">
                        Internal Rejection Note:
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="State reason: unverified commission, inappropriate wording, NDA embargo..."
                        className="w-full bg-surface-container-lowest p-2.5 rounded-lg text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-error"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRejecting(false);
                            setRejectionNote('');
                          }}
                          className="px-3 py-1.5 text-xs text-tertiary hover:text-on-surface font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleModerate('rejected', rejectionNote)}
                          className="px-4 py-1.5 rounded-lg bg-error text-on-error text-xs font-semibold shadow-sm"
                        >
                          {isActionLoading ? 'Saving...' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isActionLoading || selectedReview.status === 'approved'}
                        onClick={() => handleModerate('approved')}
                        className="w-full py-2.5 rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Approve &amp; Publish to Showcase</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isActionLoading || selectedReview.status === 'rejected'}
                          onClick={() => setIsRejecting(true)}
                          className="py-2 rounded-xl bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Reject Review</span>
                        </button>

                        <button
                          type="button"
                          disabled={isActionLoading || selectedReview.status === 'pending'}
                          onClick={() => handleModerate('pending')}
                          className="py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface-variant text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Re-Hide to Pending</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/40 p-8 rounded-2xl text-center text-xs text-outline">
              Select a review to inspect details
            </div>
          )}
        </div>
      </div>

      {/* Review Link Modal */}
      <GenerateReviewLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={refreshList}
      />
    </div>
  );
}
