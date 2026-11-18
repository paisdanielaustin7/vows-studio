import React from 'react';
import Link from 'next/link';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listDeliveryPipelinesAction } from '@/server/actions/delivery.actions';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ChevronRight,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { DELIVERY_STAGE_CONFIG, DeliveryStageCode } from '@/types/delivery';

export const metadata = {
  title: 'Delivery Pipelines | VOWS CRM',
};

export default async function DeliveryPipelinesPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'delivery:view');

  const { data: pipelines = [] } = await listDeliveryPipelinesAction();

  const totalPipelines = pipelines.length;
  const behindScheduleCount = pipelines.filter((p) => p.behind_schedule).length;
  const blockedCount = pipelines.filter((p) => p.has_blocked_stage).length;
  const completedCount = pipelines.filter((p) => p.completed_at !== null).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-outline block mb-1">
            Operations & Fulfillment
          </span>
          <h1 className="text-2xl font-bold text-on-surface">Master Delivery Pipelines</h1>
          <p className="text-xs text-outline mt-1">
            Track sequential post-production workflow, client previews, revisions, and vault delivery.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipelines</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-on-surface">{totalPipelines}</div>
          <p className="text-[11px] text-outline">All bookings in production</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Behind Schedule</span>
            <AlertTriangle className={`w-4 h-4 ${behindScheduleCount > 0 ? 'text-error' : 'text-outline'}`} />
          </div>
          <div className={`text-2xl font-bold ${behindScheduleCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {behindScheduleCount}
          </div>
          <p className="text-[11px] text-outline">Past target delivery date</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Blocked Stages</span>
            <ShieldAlert className={`w-4 h-4 ${blockedCount > 0 ? 'text-error' : 'text-outline'}`} />
          </div>
          <div className={`text-2xl font-bold ${blockedCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {blockedCount}
          </div>
          <p className="text-[11px] text-outline">Requires immediate attention</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Archived / Complete</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success">{completedCount}</div>
          <p className="text-[11px] text-outline">Vault archival dispatches</p>
        </div>
      </div>

      {/* Pipelines List */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
          <h2 className="text-base font-semibold text-on-surface">Client Pipelines</h2>
          <span className="text-xs text-outline">{pipelines.length} Total</span>
        </div>

        <div className="divide-y divide-outline-variant/30">
          {pipelines.map((pipeline) => {
            const stageConfig = pipeline.current_stage_code
              ? DELIVERY_STAGE_CONFIG[pipeline.current_stage_code as DeliveryStageCode]
              : null;

            return (
              <div
                key={pipeline.id}
                className="p-6 hover:bg-surface-container-low/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary">
                      {pipeline.booking_number}
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      {pipeline.client_name || 'Valued Client'}
                    </span>
                    {pipeline.has_blocked_stage && (
                      <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                        Blocked
                      </span>
                    )}
                    {pipeline.behind_schedule && (
                      <span className="px-2 py-0.5 rounded-full bg-error-container/60 text-error text-[11px] font-semibold">
                        Behind Schedule
                      </span>
                    )}
                    {pipeline.is_share_active && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> Shared Link Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-outline">
                    <span>
                      Current Stage:{' '}
                      <strong className="text-on-surface font-semibold">
                        {stageConfig ? stageConfig.title : 'All Stages Complete'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      Target:{' '}
                      <strong className={pipeline.behind_schedule ? 'text-error' : 'text-on-surface'}>
                        {pipeline.target_date || 'Not set'}
                      </strong>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md space-y-1">
                    <div className="flex justify-between text-[11px] text-outline">
                      <span>{pipeline.completed_stages_count} of 9 Stages Complete</span>
                      <span className="font-semibold text-primary">{pipeline.progress_percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pipeline.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/crm/bookings/${pipeline.booking_id}?tab=delivery`}
                    className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors border border-outline-variant/40"
                  >
                    Open Tracker <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {pipelines.length === 0 && (
            <div className="p-12 text-center text-outline text-xs">
              No delivery pipelines found. Pipelines are automatically generated when bookings are created.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
