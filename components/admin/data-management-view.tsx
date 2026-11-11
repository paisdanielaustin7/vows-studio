'use client';

import * as React from 'react';
import {
  ShieldAlert,
  Database,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  X,
  ArrowLeft,
  UserX,
  Server,
  CloudLightning,
} from 'lucide-react';
import {
  SetupStatus,
  DryRunResult,
  ResetExecutionResult,
} from '@/types/data-management';
import { ResetScope } from '@/lib/validations/data-management.schema';
import {
  getSetupStatusAction,
  loadSampleDataAction,
  dryRunResetAction,
  executeResetAction,
  lockSetupAction,
  anonymiseClientAction,
} from '@/server/actions/data-management.actions';

interface DataManagementViewProps {
  initialStatus: SetupStatus;
}

export function DataManagementView({ initialStatus }: DataManagementViewProps) {
  const [status, setStatus] = React.useState<SetupStatus>(initialStatus);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Step 1: Scopes
  const [selectedScopes, setSelectedScopes] = React.useState<ResetScope[]>([
    'clients_and_dependants',
  ]);
  const [restartNumbering, setRestartNumbering] = React.useState(true);
  const [clearAuditLog, setClearAuditLog] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);

  // Step 2: Simulation Result
  const [dryRunResult, setDryRunResult] = React.useState<DryRunResult | null>(
    null
  );

  // Step 3: Verification
  const [adminPassword, setAdminPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = React.useState('');
  const [ackMediaDecouple, setAckMediaDecouple] = React.useState(false);
  const [ackCounterRevert, setAckCounterRevert] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);

  // Step 4: Completion Result
  const [resetResult, setResetResult] =
    React.useState<ResetExecutionResult | null>(null);

  // Lock Setup modal
  const [isLockModalOpen, setIsLockModalOpen] = React.useState(false);
  const [lockPhrase, setLockPhrase] = React.useState('');
  const [isLocking, setIsLocking] = React.useState(false);

  // Sample data loading
  const [isLoadingSample, setIsLoadingSample] = React.useState(false);

  // Anonymise Client modal
  const [isAnonModalOpen, setIsAnonModalOpen] = React.useState(false);
  const [anonClientId, setAnonClientId] = React.useState('');
  const [anonPhrase, setAnonPhrase] = React.useState('');
  const [isAnonymising, setIsAnonymising] = React.useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    const res = await getSetupStatusAction();
    if (res.data) {
      setStatus(res.data);
    }
    setIsRefreshing(false);
  };

  const handleToggleScope = (scope: ResetScope) => {
    setSelectedScopes((prev) => {
      if (prev.includes(scope)) {
        return prev.filter((s) => s !== scope);
      } else {
        return [...prev, scope];
      }
    });
  };

  const handleStartSimulation = async () => {
    if (selectedScopes.length === 0) {
      setActionMessage({
        type: 'error',
        text: 'Please select at least one partition scope to wipe.',
      });
      return;
    }
    setIsSimulating(true);
    setActionMessage(null);
    try {
      const res = await dryRunResetAction({
        scopes: selectedScopes,
        restartNumbering,
        clearAuditLog,
      });
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error.message });
      } else if (res.data) {
        setDryRunResult(res.data);
        setWizardStep(2);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to generate dry run simulation.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecuteReset = async () => {
    if (confirmationPhrase !== 'RESET VOWS DATA') {
      setActionMessage({
        type: 'error',
        text: 'Confirmation phrase does not match "RESET VOWS DATA".',
      });
      return;
    }
    if (!adminPassword) {
      setActionMessage({
        type: 'error',
        text: 'Administrator password is required.',
      });
      return;
    }
    if (!ackMediaDecouple || !ackCounterRevert) {
      setActionMessage({
        type: 'error',
        text: 'Please check both safeguard acknowledgement checkboxes.',
      });
      return;
    }

    setIsExecuting(true);
    setActionMessage(null);
    try {
      const res = await executeResetAction({
        scopes: selectedScopes,
        restartNumbering,
        clearAuditLog,
        confirmationPhrase: 'RESET VOWS DATA',
        password: adminPassword,
      });

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error.message });
      } else if (res.data) {
        setResetResult(res.data);
        setWizardStep(4);
        refreshStatus();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Data reset execution failed.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLoadSampleData = async () => {
    if (
      !confirm(
        'Load standard Indian wedding demonstration data (clients, packages, crew, sample bookings)? This will not overwrite existing customized studio profile settings.'
      )
    ) {
      return;
    }

    setIsLoadingSample(true);
    setActionMessage(null);
    try {
      const res = await loadSampleDataAction();
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error.message });
      } else {
        setActionMessage({
          type: 'success',
          text: 'Sample demonstration records loaded successfully.',
        });
        refreshStatus();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to load sample data.',
      });
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleLockSetup = async () => {
    if (lockPhrase !== 'LOCK SETUP') return;
    setIsLocking(true);
    setActionMessage(null);
    try {
      const res = await lockSetupAction({ confirmPhrase: 'LOCK SETUP' });
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error.message });
      } else {
        setActionMessage({
          type: 'success',
          text: 'Setup Mode has been permanently locked for production go-live.',
        });
        setIsLockModalOpen(false);
        setLockPhrase('');
        refreshStatus();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to lock setup.',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleAnonymiseClient = async () => {
    if (anonPhrase !== 'ANONYMISE' || !anonClientId.trim()) return;
    setIsAnonymising(true);
    setActionMessage(null);
    try {
      const res = await anonymiseClientAction({
        clientId: anonClientId.trim(),
      });
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error.message });
      } else {
        setActionMessage({
          type: 'success',
          text: `Client ${anonClientId} anonymised per DPDP Section 3.18. Financial records retained.`,
        });
        setIsAnonModalOpen(false);
        setAnonClientId('');
        setAnonPhrase('');
        refreshStatus();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Client anonymisation failed.',
      });
    } finally {
      setIsAnonymising(false);
    }
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setDryRunResult(null);
    setConfirmationPhrase('');
    setAdminPassword('');
    setAckMediaDecouple(false);
    setAckCounterRevert(false);
    setResetResult(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Notice */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-sm transition-all ${
            actionMessage.type === 'error'
              ? 'bg-error-container text-on-error-container border border-error/20'
              : actionMessage.type === 'success'
              ? 'bg-secondary-container text-on-secondary-container border border-secondary/20'
              : 'bg-surface-container-high text-on-surface'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-error shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] uppercase tracking-wider font-semibold">
              SYSTEM GOVERNANCE • ROOT RESTRICTED • SA ONLY
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              ISOLATION ENGINE v4.8
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-on-surface">
            Data Management &amp; Partition Governance
          </h1>
          <p className="text-sm text-outline">
            High-integrity tenant controls, database seed isolation, and
            irreversible multi-entity purge operations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm border border-outline-variant/30 text-xs">
            <Server className="w-4 h-4 text-outline" />
            <span className="font-medium text-on-surface">Postgres Primary Cluster</span>
            <span
              className="w-2 h-2 rounded-full bg-secondary ml-1"
              title="Cluster synchronized"
            ></span>
          </div>
          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Section 1: Setup Management Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Card: Setup Mode */}
        <div className="lg:col-span-4 flex flex-col justify-between p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-outline">
                Tenancy Schema Guard
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                {status.setupMode ? 'Flexible Setup' : 'Immutable'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  status.setupMode
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container text-primary'
                }`}
              >
                {status.setupMode ? (
                  <Unlock className="w-6 h-6" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-lg font-semibold text-on-surface">
                  {status.setupMode
                    ? 'Setup Mode: ACTIVE'
                    : 'Setup Mode: LOCKED'}
                </div>
                <div className="text-xs text-outline mt-0.5">
                  {status.setupMode
                    ? 'Studio onboarding in progress. Sample loaders enabled.'
                    : `Locked on ${
                        status.setupLockedAt
                          ? new Date(status.setupLockedAt).toLocaleDateString(
                              'en-IN',
                              { day: 'numeric', month: 'short', year: 'numeric' }
                            )
                          : 'Go-Live'
                      }`}
                </div>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {status.setupMode
                ? 'Foundational commissioning mode active. Demo fixtures and sample catalogs can be safely loaded or refreshed.'
                : 'Foundational architecture is protected against demo fixture rehydration. Live client ledger indexing active.'}
            </p>

            {/* Staging / Mode Info Box */}
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-outline">
                <span>App Runtime Mode</span>
                <span className="font-semibold uppercase tracking-wider text-primary">
                  {status.appMode}
                </span>
              </div>
              <div className="flex items-center justify-between text-outline">
                <span>Sample Data Loaded</span>
                <span className="font-medium text-on-surface">
                  {status.sampleDataLoaded ? 'Yes (Tagged)' : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-outline font-mono">
            <span>SLA: 99.98% High-Avail</span>
            <span>ENC: AES-256-GCM</span>
          </div>
        </div>

        {/* Checklist & Metrics Card */}
        <div className="lg:col-span-8 flex flex-col p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-outline">
                Foundational Commissioning
              </span>
              <h2 className="text-lg font-semibold text-on-surface">
                First-Run Setup Checklist
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-secondary">
                {status.completedChecklistCount} of {status.totalChecklistCount}{' '}
                completed ({status.progressPercentage}%)
              </span>
              <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-300"
                  style={{ width: `${status.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {status.checklist.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-surface-container-low flex items-start gap-2.5 border border-outline-variant/20"
              >
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    item.completed ? 'text-secondary' : 'text-outline/40'
                  }`}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        item.completed
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {item.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <span className="text-[11px] text-outline truncate">
                    {item.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Setup Action Bar */}
          <div className="pt-3 mt-auto flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-4 rounded-lg border border-outline-variant/20">
            <div className="flex flex-wrap items-center gap-2">
              {/* Load Sample Data */}
              <button
                onClick={handleLoadSampleData}
                disabled={isLoadingSample || (!status.setupMode && status.appMode !== 'demo')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  status.setupMode || status.appMode === 'demo'
                    ? 'bg-surface-container-highest hover:bg-surface-container text-on-surface'
                    : 'bg-surface-container text-outline/60 cursor-not-allowed'
                }`}
                title={
                  status.setupMode || status.appMode === 'demo'
                    ? 'Load standard wedding catalog and sample fixtures'
                    : 'Sample loading is disabled in locked production mode'
                }
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span>
                  {isLoadingSample ? 'Loading...' : 'Load Sample Data'}
                </span>
              </button>

              {/* Lock Setup Button */}
              {status.setupMode ? (
                <button
                  onClick={() => setIsLockModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-xs font-medium transition-colors shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Setup for Production</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-outline text-xs font-medium cursor-not-allowed">
                  <Lock className="w-4 h-4" />
                  <span>Setup Already Locked</span>
                </div>
              )}

              {/* Anonymise Client trigger */}
              <button
                onClick={() => setIsAnonModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-medium transition-colors"
              >
                <UserX className="w-4 h-4 text-outline" />
                <span>Anonymise Client (DPDP)</span>
              </button>
            </div>

            {/* Launch Reset Wizard */}
            <button
              onClick={() => {
                setIsWizardOpen(true);
                setWizardStep(1);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error text-xs font-semibold transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Launch Reset Wizard →</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-outline pt-1">
            <span className="flex items-center gap-1 text-on-error-container/80">
              <AlertTriangle className="w-3.5 h-3.5" />
              Note: Locking setup disables sample rehydration. It does NOT disable the Reset Wizard.
            </span>
            <span>Tenant Node: vows_production_01</span>
          </div>
        </div>
      </div>

      {/* Visual Partition Overview Strip */}
      <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-on-surface">
              Active Studio Partition Allocation
            </div>
            <div className="text-xs text-outline">
              Multi-tier Postgres schemas with physical isolation for media
              metadata &amp; client ledger.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end text-right">
          <div>
            <div className="text-base font-semibold text-on-surface">Healthy</div>
            <div className="text-[11px] text-outline">Cluster Telemetry</div>
          </div>
          <div className="h-8 w-px bg-outline-variant/30"></div>
          <div>
            <div className="text-base font-semibold text-secondary">Enforced</div>
            <div className="text-[11px] text-outline">Row-Level Security</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RESET WIZARD MODAL (4 Steps)
          ========================================================================= */}
      {isWizardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-3xl my-8 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header & Stepper */}
            <div className="p-6 bg-surface-container-low border-b border-outline-variant/20 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-error" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-error font-semibold">
                      Destructive Action Suite
                    </span>
                    <h2 className="text-xl font-serif font-bold text-on-surface leading-tight">
                      Studio Reset Wizard
                    </h2>
                  </div>
                </div>
                <button
                  onClick={closeWizard}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4-Step Stepper Header */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { step: 1, label: 'Select Scope' },
                  { step: 2, label: 'Dry-run Preview' },
                  { step: 3, label: 'Verification' },
                  { step: 4, label: 'Summary' },
                ].map((s) => {
                  const isActive = wizardStep === s.step;
                  const isDone = wizardStep > s.step;
                  return (
                    <div key={s.step} className="flex flex-col gap-1.5">
                      <div
                        className={`h-1.5 w-full rounded-full transition-colors ${
                          isActive || isDone
                            ? 'bg-primary'
                            : 'bg-surface-container-highest'
                        }`}
                      ></div>
                      <div
                        className={`flex items-center gap-1 ${
                          isActive || isDone ? '' : 'opacity-60'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                            isActive || isDone
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-highest text-on-surface'
                          }`}
                        >
                          {s.step}
                        </span>
                        <span className="text-xs text-on-surface font-semibold truncate">
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Scope Selection */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-5 max-h-[600px] overflow-y-auto">
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    Choose Target Data Partitions
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Select the specific schema partitions to wipe. Unselected areas
                    remain pristine. All purges cascade down through relational foreign keys.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* 1. Clients & Dependent Records */}
                  <label
                    onClick={() => handleToggleScope('clients_and_dependants')}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedScopes.includes('clients_and_dependants')
                        ? 'bg-secondary-container/20 border-secondary'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes('clients_and_dependants')}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface">
                          Clients and all dependent records
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-error-container text-on-error-container font-semibold">
                          Critical Impact
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-0.5">
                        Purges clients and cascading timelines, guest notes, and contract assets.
                      </p>
                      <div className="mt-2 text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded">
                        Cascades to: Enquiries, Quotations, Bookings, Proofing Galleries, and Invoices
                      </div>
                    </div>
                  </label>

                  {/* 2. Finance only */}
                  <label
                    onClick={() => handleToggleScope('finance_only')}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedScopes.includes('finance_only')
                        ? 'bg-secondary-container/20 border-secondary'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes('finance_only')}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface">
                          Finance &amp; Ledger only
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                          Fiscal Ledger
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-0.5">
                        Clears invoices, payments, credit notes, and manual expenses while preserving clients.
                      </p>
                    </div>
                  </label>

                  {/* 3. Crew */}
                  <label
                    onClick={() => handleToggleScope('crew')}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedScopes.includes('crew')
                        ? 'bg-secondary-container/20 border-secondary'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes('crew')}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface">
                          Crew Roster &amp; Assignments
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                          Roster
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-0.5">
                        Wipes crew member profiles, gear assignments, and event crew allocations.
                      </p>
                    </div>
                  </label>

                  {/* 4. Catalogue */}
                  <label
                    onClick={() => handleToggleScope('catalogue')}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedScopes.includes('catalogue')
                        ? 'bg-secondary-container/20 border-secondary'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes('catalogue')}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface">
                          Services &amp; Packages Catalogue
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                          Product Tree
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-0.5">
                        Clears all defined services, packages, itemized prices, and website offerings.
                      </p>
                    </div>
                  </label>

                  {/* 5. Portfolio */}
                  <label
                    onClick={() => handleToggleScope('portfolio_and_website')}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedScopes.includes('portfolio_and_website')
                        ? 'bg-secondary-container/20 border-secondary'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes('portfolio_and_website')}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface">
                          Portfolio &amp; Showcase Media
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                          Gallery
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-0.5">
                        Wipes public portfolio collections, cover images, and proofing media metadata.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Additional Options */}
                <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restartNumbering}
                      onChange={(e) => setRestartNumbering(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>
                      <strong>Restart sequence numbering</strong> (reverts invoice, quotation, and receipt sequences to #000001)
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearAuditLog}
                      onChange={(e) => setClearAuditLog(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>
                      <strong>Clear non-essential audit events</strong> (preserves user login and security events)
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={closeWizard}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-outline hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    disabled={isSimulating || selectedScopes.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold shadow-sm transition-all"
                  >
                    <span>
                      {isSimulating ? 'Simulating Dry-Run...' : 'Generate Dry-Run Simulation →'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Dry-run Preview */}
            {wizardStep === 2 && dryRunResult && (
              <div className="p-6 space-y-5 max-h-[600px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">
                      Dry-Run Preview Registry
                    </h3>
                    <p className="text-xs text-outline">
                      Simulation generated against live replica cluster thread.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
                    Deterministic Sandbox Active
                  </span>
                </div>

                {/* Advisory Tag */}
                <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-start gap-2.5 text-xs text-on-surface-variant">
                  <CloudLightning className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-on-surface">DRY-RUN PREVIEW ONLY:</strong> No
                    database changes have been applied. Data remains fully intact. This
                    projection accurately computes foreign key cascade constraints and media unlinks.
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-container-low text-[11px] text-outline uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Database Table Name</th>
                        <th className="py-2.5 px-3 text-right">Records Affected</th>
                        <th className="py-2.5 px-3 text-right">Files Affected</th>
                        <th className="py-2.5 px-4 text-right">Execution Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {dryRunResult.tables.map((t) => (
                        <tr
                          key={t.tableName}
                          className="hover:bg-surface-container-low/40"
                        >
                          <td className="py-2.5 px-4 font-mono font-medium text-on-surface">
                            {t.tableName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-error">
                            {t.recordCount} records
                          </td>
                          <td className="py-2.5 px-3 text-right text-outline">
                            {t.fileCount} files
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-error-container/60 text-on-error-container">
                              {t.impactType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cumulative Impact Bar */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4 text-error" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-outline">
                        Cumulative Impact
                      </div>
                      <div className="text-sm font-semibold text-on-surface">
                        {dryRunResult.totalRecords} Database Records •{' '}
                        {dryRunResult.totalFiles} Files / Artifacts
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-on-secondary-container px-2 py-1 bg-surface-container-lowest rounded border border-outline-variant/20">
                    {dryRunResult.restartNumbering
                      ? 'Sequence reset enabled (#000001)'
                      : 'Sequence preserved'}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Scope</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-error hover:bg-error/90 text-on-error text-xs font-semibold shadow-sm transition-all"
                  >
                    <span>Proceed to Safety Verification →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Safety Verification & Safeguards */}
            {wizardStep === 3 && (
              <div className="p-6 space-y-5 max-h-[600px] overflow-y-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-error font-semibold">
                      Step 03 • Authorisation
                    </span>
                    <h3 className="text-base font-semibold text-on-surface">
                      Safety Verification &amp; Safeguards
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container">
                    Irreversible Phase
                  </span>
                </div>

                {/* Permanent Loss Warning Banner */}
                <div className="p-4 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div className="text-xs text-on-error-container leading-relaxed">
                    <strong className="text-error uppercase block mb-0.5">
                      Permanent Data Loss
                    </strong>
                    This operation cannot be undone. All selected tables, files, and
                    customer records will be irreversibly erased from the primary
                    database cluster. A mandatory pre-reset archive will be created and
                    stored in the documents storage bucket.
                  </div>
                </div>

                {/* Automated Pre-Reset Snapshot Box */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                      <span className="font-semibold text-on-surface">
                        Automated Pre-Reset Snapshot
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-secondary font-semibold">
                      GUARANTEED BY SERVER ACTION
                    </span>
                  </div>
                  <p className="text-[11px] text-outline">
                    A compressed logical snapshot of all tables will be exported and
                    saved to Supabase Storage before any row is deleted. If snapshot
                    creation fails, the reset aborts instantly.
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Admin Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                      <span>Administrator Password Verification</span>
                      <span className="text-[11px] text-outline">Required</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter your SuperAdmin password"
                        className="w-full h-10 px-3 pr-10 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Phrase Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface">
                      To confirm destruction, type the exact phrase below:
                    </label>
                    <div className="px-3 py-1.5 rounded bg-error-container/30 text-error font-mono text-xs font-bold tracking-wider select-all flex items-center justify-between border border-error/20">
                      <span>RESET VOWS DATA</span>
                      <span className="text-[10px] font-sans opacity-70">
                        Case Sensitive
                      </span>
                    </div>
                    <input
                      type="text"
                      value={confirmationPhrase}
                      onChange={(e) => setConfirmationPhrase(e.target.value)}
                      placeholder="Type RESET VOWS DATA"
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs font-mono font-medium focus:outline-none focus:border-error"
                    />
                  </div>

                  {/* Safeguards Checkboxes */}
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ackMediaDecouple}
                        onChange={(e) => setAckMediaDecouple(e.target.checked)}
                        className="rounded accent-error"
                      />
                      <span className="text-on-surface">
                        I understand studio media and document links will decouple permanently.
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ackCounterRevert}
                        onChange={(e) => setAckCounterRevert(e.target.checked)}
                        className="rounded accent-error"
                      />
                      <span className="text-on-surface">
                        I acknowledge sequence counters will revert to initial seed configuration.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    disabled={
                      isExecuting ||
                      confirmationPhrase !== 'RESET VOWS DATA' ||
                      !adminPassword ||
                      !ackMediaDecouple ||
                      !ackCounterRevert
                    }
                    className={`w-full h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
                      confirmationPhrase === 'RESET VOWS DATA' &&
                      adminPassword &&
                      ackMediaDecouple &&
                      ackCounterRevert
                        ? 'bg-error hover:bg-error/90 text-on-error cursor-pointer'
                        : 'bg-surface-container text-outline/50 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw
                      className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {isExecuting
                        ? 'Executing Permanent Data Reset...'
                        : 'Execute Permanent Data Reset'}
                    </span>
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-outline hover:text-on-surface flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dry-run</span>
                    </button>
                    <button
                      type="button"
                      onClick={closeWizard}
                      className="text-outline hover:text-error"
                    >
                      Cancel Wizard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Completion Summary */}
            {wizardStep === 4 && resetResult && (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8 text-secondary" />
                </div>

                <div>
                  <h3 className="text-xl font-serif font-bold text-on-surface">
                    Studio Data Reset Complete
                  </h3>
                  <p className="text-xs text-outline mt-1">
                    The requested data partitions have been successfully wiped and sequences reset.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 max-w-md mx-auto text-xs text-left space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-outline">Timestamp:</span>
                    <span className="text-on-surface">
                      {new Date(resetResult.resetTimestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Pre-Reset Archive:</span>
                    <span className="text-primary truncate max-w-[200px]" title={resetResult.backupZipPath}>
                      {resetResult.backupZipPath.split('/').pop()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Archive Size:</span>
                    <span className="text-on-surface">
                      {(resetResult.backupSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Status:</span>
                    <span className="text-secondary font-bold">READY FOR DISPATCH</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeWizard}
                  className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold shadow-sm transition-all"
                >
                  Done &amp; Close Wizard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LOCK SETUP MODAL
          ========================================================================= */}
      {isLockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-on-surface">
                  Lock Setup Mode Permanently
                </h3>
                <p className="text-xs text-outline">
                  Irreversible production go-live lock
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Locking setup finalizes foundational studio schema and disables demo
              data loaders. This operation cannot be undone from the CRM interface.
              Type <strong>LOCK SETUP</strong> below to confirm.
            </p>

            <input
              type="text"
              value={lockPhrase}
              onChange={(e) => setLockPhrase(e.target.value)}
              placeholder="Type LOCK SETUP"
              className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono font-medium focus:outline-none focus:border-primary"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLockModalOpen(false);
                  setLockPhrase('');
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLockSetup}
                disabled={isLocking || lockPhrase !== 'LOCK SETUP'}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                  lockPhrase === 'LOCK SETUP'
                    ? 'bg-error hover:bg-error/90 text-on-error'
                    : 'bg-surface-container text-outline/50 cursor-not-allowed'
                }`}
              >
                {isLocking ? 'Locking...' : 'Confirm Permanent Lock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ANONYMISE CLIENT MODAL (DPDP)
          ========================================================================= */}
      {isAnonModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-on-surface">
                  Client Data Anonymisation (DPDP)
                </h3>
                <p className="text-xs text-outline">
                  Right to be forgotten compliance tool
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Scans client profile, replaces PII with salted hashes, and wipes
              personal notes and phone numbers. Tax invoices, receipts, and ledger
              records are preserved with masked customer identifiers.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">
                Client UUID:
              </label>
              <input
                type="text"
                value={anonClientId}
                onChange={(e) => setAnonClientId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono focus:outline-none focus:border-primary"
              />

              <label className="text-xs font-semibold text-on-surface block pt-1">
                Type <strong>ANONYMISE</strong> to confirm:
              </label>
              <input
                type="text"
                value={anonPhrase}
                onChange={(e) => setAnonPhrase(e.target.value)}
                placeholder="Type ANONYMISE"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAnonModalOpen(false);
                  setAnonClientId('');
                  setAnonPhrase('');
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnonymiseClient}
                disabled={isAnonymising || anonPhrase !== 'ANONYMISE' || !anonClientId.trim()}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                  anonPhrase === 'ANONYMISE' && anonClientId.trim()
                    ? 'bg-error hover:bg-error/90 text-on-error'
                    : 'bg-surface-container text-outline/50 cursor-not-allowed'
                }`}
              >
                {isAnonymising ? 'Anonymising...' : 'Execute Anonymisation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
