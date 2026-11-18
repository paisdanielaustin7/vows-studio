/**
 * VOWS — Data Management & Setup Mode Types
 * Reference: DECISION_LOG D-43, DATABASE_SCHEMA §12, SECURITY_PLAN §12.5
 */

import { ResetScope } from '@/lib/validations/data-management.schema';

export interface SetupChecklistItem {
  id: string;
  stepNumber: number;
  label: string;
  detail: string;
  completed: boolean;
  actionHref?: string;
}

export interface SetupStatus {
  setupMode: boolean;
  setupLockedAt: string | null;
  appMode: 'production' | 'demo';
  checklist: SetupChecklistItem[];
  totalChecklistCount: number;
  completedChecklistCount: number;
  progressPercentage: number;
  sampleDataLoaded: boolean;
}

export interface DryRunTableCount {
  tableName: string;
  recordCount: number;
  fileCount: number;
  cascadeSummary: string;
  impactType: 'Hard Delete' | 'Sequence Reset' | 'Orphan Decouple';
}

export interface DryRunResult {
  tables: DryRunTableCount[];
  totalRecords: number;
  totalFiles: number;
  restartNumbering: boolean;
  clearAuditLog: boolean;
  scopes: ResetScope[];
  simulationId: string;
}

export interface ResetExecutionResult {
  success: boolean;
  backupZipPath: string;
  backupSizeBytes: number;
  deletedCounts: Record<string, any>;
  resetTimestamp: string;
}
