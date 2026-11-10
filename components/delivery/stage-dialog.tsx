'use client';

import React, { useState } from 'react';
import {
  updateStageStatusAction,
  assignStageStaffAction,
  addStageAttachmentAction,
  deleteStageAttachmentAction,
} from '@/server/actions/delivery.actions';
import {
  DeliveryStage,
  DeliveryStageStatus,
  DELIVERY_STAGE_CONFIG,
} from '@/types/delivery';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Play,
  CheckCircle,
  AlertOctagon,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  UserPlus,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface StageDialogProps {
  stage: DeliveryStage | null;
  allStages: DeliveryStage[];
  userRole?: string;
  userId?: string;
  availableStaff?: Array<{ id: string; full_name: string; email: string }>;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onCompletedStage9?: () => void;
}

export function StageDialog({
  stage,
  allStages,
  userRole = 'staff',
  userId,
  availableStaff = [],
  isOpen,
  onClose,
  onUpdated,
  onCompletedStage9,
}: StageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blocked Dialog State
  const [isBlocking, setIsBlocking] = useState<boolean>(false);
  const [blockedReasonText, setBlockedReasonText] = useState<string>('');

  // Override Dialog State
  const [isOverriding, setIsOverriding] = useState<boolean>(false);
  const [overrideReasonText, setOverrideReasonText] = useState<string>('');

  // Attachments State
  const [showAddAttachment, setShowAddAttachment] = useState<boolean>(false);
  const [attachmentKind, setAttachmentKind] = useState<'link' | 'file'>('link');
  const [attachmentLabel, setAttachmentLabel] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentFilePath, setAttachmentFilePath] = useState<string>('');

  // Assignees State
  const [showAddAssignee, setShowAddAssignee] = useState<boolean>(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Notes State
  const [notesText, setNotesText] = useState<string>(stage?.notes || '');

  if (!isOpen || !stage) return null;

  const stageConfig = DELIVERY_STAGE_CONFIG[stage.stage_code];
  const isLeadership = ['system_admin', 'business_owner', 'manager'].includes(userRole);
  const isOwnerOrAdmin = ['system_admin', 'business_owner'].includes(userRole);

  // Check if staff member is assigned to this stage
  const isAssignedStaff =
    userRole === 'staff' && stage.assignees?.some((a) => a.profile_id === userId);
  const canEdit = isLeadership || isAssignedStaff;

  // Check if prior stages are complete
  const priorIncomplete = allStages.some(
    (s) => s.sort < stage.sort && s.status !== 'completed'
  );

  const handleUpdateStatus = async (
    newStatus: DeliveryStageStatus,
    overrideReason?: string,
    blockedReason?: string
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await updateStageStatusAction({
        stageId: stage.id,
        status: newStatus,
        notes: notesText,
        blockedReason,
        overrideReason,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setIsBlocking(false);
        setIsOverriding(false);
        onUpdated();
        if (stage.sort === 9 && newStatus === 'completed' && onCompletedStage9) {
          onCompletedStage9();
        }
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteClick = () => {
    if (priorIncomplete) {
      if (!isOwnerOrAdmin) {
        setErrorMessage(
          `Stage ${stage.sort} cannot be completed until prior stages are completed. Only Studio Owner or Admin can override sequential completion.`
        );
        return;
      }
      setIsOverriding(true);
      return;
    }
    handleUpdateStatus('completed');
  };

  const handleAddAttachment = async () => {
    if (!attachmentLabel.trim()) {
      setErrorMessage('Attachment label is required');
      return;
    }
    if (attachmentKind === 'link' && !attachmentUrl.trim()) {
      setErrorMessage('Valid URL is required for link deliverable');
      return;
    }
    if (attachmentKind === 'file' && !attachmentFilePath.trim()) {
      setErrorMessage('File path is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await addStageAttachmentAction({
        stageId: stage.id,
        kind: attachmentKind,
        label: attachmentLabel.trim(),
        url: attachmentKind === 'link' ? attachmentUrl.trim() : null,
        filePath: attachmentKind === 'file' ? attachmentFilePath.trim() : null,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setAttachmentLabel('');
        setAttachmentUrl('');
        setAttachmentFilePath('');
        setShowAddAttachment(false);
        onUpdated();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add attachment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to remove this deliverable?')) return;
    try {
      await deleteStageAttachmentAction(attachmentId);
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete attachment');
    }
  };

  const handleAddAssignee = async () => {
    if (!selectedStaffId) return;
    setIsSubmitting(true);
    try {
      const currentIds = (stage.assignees || []).map((a) => a.profile_id);
      if (!currentIds.includes(selectedStaffId)) {
        await assignStageStaffAction({
          stageId: stage.id,
          profileIds: [...currentIds, selectedStaffId],
        });
      }
      setSelectedStaffId('');
      setShowAddAssignee(false);
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to assign staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignee = async (profileId: string) => {
    setIsSubmitting(true);
    try {
      const remainingIds = (stage.assignees || [])
        .map((a) => a.profile_id)
        .filter((id) => id !== profileId);
      await assignStageStaffAction({
        stageId: stage.id,
        profileIds: remainingIds,
      });
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Stage Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Stage {stage.sort} of 9
              </span>
              <Badge
                variant={
                  stage.status === 'completed'
                    ? 'success'
                    : stage.status === 'in_progress'
                    ? 'info'
                    : stage.status === 'blocked'
                    ? 'danger'
                    : 'default'
                }
              >
                {stage.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-on-surface">{stageConfig?.title}</h2>
            <p className="text-xs text-outline leading-relaxed">{stageConfig?.description}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-error-container/40 border border-error/20 flex items-center gap-2 text-xs text-on-error-container">
            <AlertOctagon className="w-4 h-4 text-error shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Blocked reason banner */}
        {stage.status === 'blocked' && stage.blocked_reason && (
          <div className="p-3 rounded-lg bg-error-container/30 border border-error/30 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="text-xs text-on-error-container">
              <strong className="font-semibold block">Production Blocked Reason:</strong>
              {stage.blocked_reason}
            </div>
          </div>
        )}

        {/* Override banner */}
        {stage.override_reason && (
          <div className="p-3 rounded-lg bg-accent-soft/40 border border-accent/30 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-on-surface">
              <strong className="font-semibold block">Sequence Overridden by Studio Owner/Admin:</strong>
              {stage.override_reason}
            </div>
          </div>
        )}

        {/* Workflow Action Bar */}
        {canEdit && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-3">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider block">
              Workflow Status Control
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {stage.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> Start Work
                </button>
              )}

              {stage.status === 'in_progress' && (
                <>
                  <button
                    onClick={handleCompleteClick}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-lg bg-success text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                  </button>

                  <button
                    onClick={() => setIsBlocking(true)}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1.5 hover:bg-error-container/80 transition-colors"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 text-error" /> Flag as Blocked
                  </button>
                </>
              )}

              {stage.status === 'blocked' && (
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resume Work
                </button>
              )}

              {stage.status === 'completed' && isLeadership && (
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-medium flex items-center gap-1.5 hover:bg-surface-container-high transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Revert to In Progress
                </button>
              )}
            </div>
          </div>
        )}

        {/* Blocking Form */}
        {isBlocking && (
          <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 space-y-3">
            <span className="text-xs font-semibold text-on-error-container block">
              Provide Blocked Reason (Required for Audit & Alerts)
            </span>
            <textarea
              value={blockedReasonText}
              onChange={(e) => setBlockedReasonText(e.target.value)}
              placeholder="e.g. Awaiting client audio track choice, or corrupted card B needing recovery..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-lg border border-error/30 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-error"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsBlocking(false)}
                className="px-3 py-1.5 text-xs text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus('blocked', undefined, blockedReasonText)}
                disabled={isSubmitting || !blockedReasonText.trim()}
                className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Confirm Blocked Status
              </button>
            </div>
          </div>
        )}

        {/* Override Form */}
        {isOverriding && (
          <div className="p-4 rounded-xl bg-accent-soft/30 border border-accent/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <span>Override Sequential Progression (Owner / Admin Only)</span>
            </div>
            <p className="text-xs text-outline">
              Prior stages remain incomplete. Completing stage {stage.sort} ahead of order requires an explicit audit reason.
            </p>
            <textarea
              value={overrideReasonText}
              onChange={(e) => setOverrideReasonText(e.target.value)}
              placeholder="State reason for overriding sequential workflow (e.g. Expedited client preview cut approved)..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-lg border border-accent/40 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOverriding(false)}
                className="px-3 py-1.5 text-xs text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus('completed', overrideReasonText)}
                disabled={isSubmitting || !overrideReasonText.trim()}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Audit & Complete Stage
              </button>
            </div>
          </div>
        )}

        {/* Assigned Staff */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Assigned Staff ({stage.assignees?.length || 0})
            </span>
            {isLeadership && (
              <button
                onClick={() => setShowAddAssignee(!showAddAssignee)}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign Staff
              </button>
            )}
          </div>

          {showAddAssignee && (
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center gap-2">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
              >
                <option value="">Select a team member...</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({staff.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddAssignee}
                disabled={!selectedStaffId || isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold"
              >
                Assign
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(stage.assignees || []).map((item) => (
              <div
                key={item.profile_id}
                className="px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 flex items-center gap-2 text-xs text-on-surface"
              >
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {item.profile?.full_name?.charAt(0) || 'S'}
                </span>
                <span>{item.profile?.full_name || 'Staff Member'}</span>
                {isLeadership && (
                  <button
                    onClick={() => handleRemoveAssignee(item.profile_id)}
                    className="text-outline hover:text-error"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {(!stage.assignees || stage.assignees.length === 0) && (
              <span className="text-xs text-outline italic">No staff assigned to this stage</span>
            )}
          </div>
        </div>

        {/* Attachments / Deliverables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Deliverables & Attachments ({stage.attachments?.length || 0})
            </span>
            {canEdit && (
              <button
                onClick={() => setShowAddAttachment(!showAddAttachment)}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Deliverable
              </button>
            )}
          </div>

          {showAddAttachment && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="attKind"
                    checked={attachmentKind === 'link'}
                    onChange={() => setAttachmentKind('link')}
                  />
                  <span>Web Link (Frame.io, Drive, Vimeo)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="attKind"
                    checked={attachmentKind === 'file'}
                    onChange={() => setAttachmentKind('file')}
                  />
                  <span>File Storage Path (≤ 50MB)</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Label (e.g. 4K Cinematic Cut v1.2)"
                value={attachmentLabel}
                onChange={(e) => setAttachmentLabel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
              />

              {attachmentKind === 'link' ? (
                <input
                  type="url"
                  placeholder="https://..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
                />
              ) : (
                <input
                  type="text"
                  placeholder="client-uploads/... or file path"
                  value={attachmentFilePath}
                  onChange={(e) => setAttachmentFilePath(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
                />
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddAttachment(false)}
                  className="px-3 py-1.5 text-xs text-outline hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAttachment}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold"
                >
                  Save Deliverable
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(stage.attachments || []).map((att) => (
              <div
                key={att.id}
                className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {att.kind === 'link' ? (
                    <LinkIcon className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{att.label}</p>
                    <p className="text-[11px] text-outline truncate">
                      {att.url || att.file_path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1 rounded text-outline hover:text-error hover:bg-surface-container"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(!stage.attachments || stage.attachments.length === 0) && (
              <p className="text-xs text-outline italic">No deliverables attached to this stage yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
