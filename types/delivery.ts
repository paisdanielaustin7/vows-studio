// Types for Delivery Pipeline (Phase 6)
// Reference: DECISION_LOG D-36, GLOSSARY §5, UI_DESIGN_SPEC §8.5

export type DeliveryStageCode =
  | 'raw_import'
  | 'culling'
  | 'editing'
  | 'client_preview'
  | 'revisions'
  | 'final_export'
  | 'quality_check'
  | 'delivery'
  | 'completed';

export type DeliveryStageStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export type DeliveryAttachmentKind = 'link' | 'file';

export interface DeliveryStageAssignee {
  stage_id: string;
  profile_id: string;
  assigned_at: string;
  assigned_by?: string | null;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url?: string | null;
  } | null;
}

export interface DeliveryStageAttachment {
  id: string;
  stage_id: string;
  kind: DeliveryAttachmentKind;
  label: string;
  url?: string | null;
  file_id?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  created_by?: string | null;
  created_at: string;
  uploader?: {
    id: string;
    full_name: string;
  } | null;
}

export interface DeliveryStage {
  id: string;
  pipeline_id: string;
  stage_code: DeliveryStageCode;
  sort: number;
  status: DeliveryStageStatus;
  started_at?: string | null;
  completed_at?: string | null;
  blocked_reason?: string | null;
  notes?: string | null;
  override_reason?: string | null;
  overridden_by?: string | null;
  overridden_at?: string | null;
  assignees?: DeliveryStageAssignee[];
  attachments?: DeliveryStageAttachment[];
}

export interface DeliveryPipeline {
  id: string;
  booking_id: string;
  target_date?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  share_token_hash?: string | null;
  share_expires_at?: string | null;
  share_revoked_at?: string | null;
  created_at: string;
  updated_at: string;
  stages?: DeliveryStage[];
}

export interface DeliveryPipelineSummary {
  id: string;
  booking_id: string;
  booking_number: string;
  client_id?: string | null;
  client_name?: string | null;
  booking_status: string;
  target_date?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  share_token_hash?: string | null;
  share_expires_at?: string | null;
  share_revoked_at?: string | null;
  behind_schedule: boolean;
  is_share_active: boolean;
  completed_stages_count: number;
  total_stages_count: number;
  progress_percentage: number;
  has_blocked_stage: boolean;
  current_stage_code?: DeliveryStageCode | null;
  created_at: string;
  updated_at: string;
}

export interface PublicDeliverableItem {
  id: string;
  stageSort: number;
  stageCode: DeliveryStageCode;
  stageLabel: string;
  kind: DeliveryAttachmentKind;
  label: string;
  url?: string | null;
  filePath?: string | null;
  fileSizeBytes?: number | null;
  createdAt: string;
}

export interface PublicDeliveryClientView {
  bookingNumber: string;
  clientName: string;
  packageTitle?: string;
  eventDatesText?: string;
  venueText?: string;
  targetDeliveryDate?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
  currentStageTitle: string;
  currentStageSort: number;
  stages: {
    sort: number;
    code: DeliveryStageCode;
    label: string;
    status: DeliveryStageStatus;
    completedAt?: string | null;
  }[];
  deliverables: PublicDeliverableItem[];
}

export const DELIVERY_STAGE_CONFIG: Record<
  DeliveryStageCode,
  {
    sort: number;
    title: string;
    shortTitle: string;
    description: string;
    icon: string;
  }
> = {
  raw_import: {
    sort: 1,
    title: 'Raw Import & Backup',
    shortTitle: 'Raw Import',
    description: 'Ingesting camera cards, sound multitracks, and verifying redundant backups.',
    icon: 'HardDrive',
  },
  culling: {
    sort: 2,
    title: 'Culling & Selection',
    shortTitle: 'Culling',
    description: 'Selecting optimal frames, facial expressions, and organizing sequence bins.',
    icon: 'Filter',
  },
  editing: {
    sort: 3,
    title: 'Color Grading & Editorial',
    shortTitle: 'Editing',
    description: 'Narrative cut, audio synchronization, and visual grading pass.',
    icon: 'Palette',
  },
  client_preview: {
    sort: 4,
    title: 'Client Preview Stream',
    shortTitle: 'Preview',
    description: 'Watermarked review cut stream made available for client viewing.',
    icon: 'PlayCircle',
  },
  revisions: {
    sort: 5,
    title: 'Client Revisions',
    shortTitle: 'Revisions',
    description: 'Applying client feedback, audio timing adjustments, and cut refinements.',
    icon: 'RefreshCw',
  },
  final_export: {
    sort: 6,
    title: 'Final Master Export',
    shortTitle: 'Final Export',
    description: 'Rendering pristine 4K UHD masters and preparing high-resolution assets.',
    icon: 'Film',
  },
  quality_check: {
    sort: 7,
    title: 'Studio Quality Check',
    shortTitle: 'Quality Check',
    description: 'Studio review for color accuracy, loudness compliance, and frame fidelity.',
    icon: 'CheckCircle2',
  },
  delivery: {
    sort: 8,
    title: 'Client Delivery Dispatch',
    shortTitle: 'Delivery',
    description: 'Delivering full resolution downloads and final media assets to the client.',
    icon: 'Send',
  },
  completed: {
    sort: 9,
    title: 'Completed & Vault Archive',
    shortTitle: 'Completed',
    description: 'Assets cold-stored in archive vault; pipeline complete.',
    icon: 'Archive',
  },
};
