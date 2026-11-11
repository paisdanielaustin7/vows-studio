'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getDeliveryPipelineAction,
} from '@/server/actions/delivery.actions';
import {
  DeliveryPipeline,
  DeliveryStage,
  DELIVERY_STAGE_CONFIG,
} from '@/types/delivery';
import { ShareLinkDialog } from './share-link-dialog';
import { StageDialog } from './stage-dialog';
import { ReviewRequestPromptDialog } from './review-request-prompt-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Share2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  HardDrive,
  Filter,
  Palette,
  PlayCircle,
  RefreshCw,
  Film,
  Send,
  Archive,
} from 'lucide-react';

interface PipelineTrackerProps {
  bookingId: string;
  bookingNumber?: string;
  clientName?: string;
  clientEmail?: string | null;
  targetDeliveryDate?: string | null;
  userRole?: string;
  userId?: string;
  availableStaff?: Array<{ id: string; full_name: string; email: string }>;
}

export function PipelineTracker({
  bookingId,
  bookingNumber = 'BK-2026-000000',
  clientName = 'Client',
  clientEmail,
  targetDeliveryDate,
  userRole = 'staff',
  userId,
  availableStaff = [],
}: PipelineTrackerProps) {
  const [pipeline, setPipeline] = useState<DeliveryPipeline | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStage, setSelectedStage] = useState<DeliveryStage | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isReviewPromptOpen, setIsReviewPromptOpen] = useState<boolean>(false);

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDeliveryPipelineAction(bookingId);
      if (res.data) {
        setPipeline(res.data);
      }
    } catch {
      // Handled gracefully in UI
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const stages = pipeline?.stages || [];
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / 9) * 100);
  const hasBlocked = stages.some((s) => s.status === 'blocked');

  // Check behind schedule
  const effectiveTarget = pipeline?.target_date || targetDeliveryDate;
  const isBehindSchedule =
    effectiveTarget &&
    new Date(effectiveTarget) < new Date() &&
    !pipeline?.completed_at;

  const isStage9Complete = stages.find((s) => s.sort === 9)?.status === 'completed';

  const getStageIcon = (code: string) => {
    switch (code) {
      case 'raw_import':
        return <HardDrive className="w-4 h-4" />;
      case 'culling':
        return <Filter className="w-4 h-4" />;
      case 'editing':
        return <Palette className="w-4 h-4" />;
      case 'client_preview':
        return <PlayCircle className="w-4 h-4" />;
      case 'revisions':
        return <RefreshCw className="w-4 h-4" />;
      case 'final_export':
        return <Film className="w-4 h-4" />;
      case 'quality_check':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'delivery':
        return <Send className="w-4 h-4" />;
      case 'completed':
        return <Archive className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/40 animate-pulse space-y-4">
        <div className="h-6 bg-surface-container rounded w-1/4" />
        <div className="h-2 bg-surface-container rounded w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-24 bg-surface-container rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Master Post-Production
              </span>
              {hasBlocked && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/60 text-on-error-container text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                  At Risk / 1 Stage Blocked
                </div>
              )}
              {isBehindSchedule && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/60 text-on-error-container text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3 text-error" />
                  Behind Target Schedule
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-on-surface">9-Stage Delivery Pipeline</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" /> Share with Client
            </button>

            {isStage9Complete && (
              <button
                onClick={() => setIsReviewPromptOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5" /> Request Review
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Schedule Indicator */}
        <div className="space-y-2 pt-2 border-t border-outline-variant/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-on-surface">
              <span className="font-bold">{completedCount} of 9 Stages Complete</span>
              <span className="text-outline">•</span>
              <span className="text-primary font-semibold">{progressPercent}% Assembled</span>
            </div>
            {effectiveTarget && (
              <div className="flex items-center gap-1.5 text-outline">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                <span>
                  Target Delivery: <strong className="text-on-surface">{effectiveTarget}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 9-Stage Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((stg) => {
          const config = DELIVERY_STAGE_CONFIG[stg.stage_code];
          const isSelected = selectedStage?.id === stg.id;

          return (
            <div
              key={stg.id}
              onClick={() => setSelectedStage(stg)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest shadow-md'
                  : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant/80 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      stg.status === 'completed'
                        ? 'bg-success text-white'
                        : stg.status === 'blocked'
                        ? 'bg-error text-white'
                        : stg.status === 'in_progress'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {stg.sort}
                  </div>
                  <span className="text-xs font-semibold text-on-surface">
                    {config?.shortTitle}
                  </span>
                </div>

                <Badge
                  variant={
                    stg.status === 'completed'
                      ? 'success'
                      : stg.status === 'in_progress'
                      ? 'info'
                      : stg.status === 'blocked'
                      ? 'danger'
                      : 'default'
                  }
                >
                  {stg.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <p className="text-xs text-outline line-clamp-2 leading-relaxed">
                {config?.description}
              </p>

              {stg.status === 'blocked' && stg.blocked_reason && (
                <div className="px-2 py-1 rounded bg-error-container/40 text-[11px] text-error font-medium truncate">
                  Blocked: {stg.blocked_reason}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-[11px] text-outline">
                <div className="flex items-center gap-1.5">
                  <span className="text-primary">{getStageIcon(stg.stage_code)}</span>
                  <span>{stg.attachments?.length || 0} Assets</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{stg.assignees?.length || 0} Staff</span>
                  <ChevronRight className="w-3 h-3 text-outline" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Inspection & Edit Modal */}
      <StageDialog
        stage={selectedStage}
        allStages={stages}
        userRole={userRole}
        userId={userId}
        availableStaff={availableStaff}
        isOpen={Boolean(selectedStage)}
        onClose={() => setSelectedStage(null)}
        onUpdated={fetchPipeline}
        onCompletedStage9={() => setIsReviewPromptOpen(true)}
      />

      {/* Share Link Modal */}
      {pipeline && (
        <ShareLinkDialog
          pipelineId={pipeline.id}
          bookingNumber={bookingNumber}
          clientName={clientName}
          currentShareHash={pipeline.share_token_hash}
          currentExpiresAt={pipeline.share_expires_at}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onUpdated={fetchPipeline}
        />
      )}

      {/* Review Request Modal */}
      <ReviewRequestPromptDialog
        isOpen={isReviewPromptOpen}
        onClose={() => setIsReviewPromptOpen(false)}
        bookingId={bookingId}
        bookingNumber={bookingNumber}
        clientName={clientName}
        clientEmail={clientEmail}
      />
    </div>
  );
}
