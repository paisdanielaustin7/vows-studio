'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  dryRunResetSchema,
  executeResetSchema,
  lockSetupSchema,
  anonymiseClientSchema,
  DryRunResetInput,
  ExecuteResetInput,
  LockSetupInput,
  AnonymiseClientInput,
} from '@/lib/validations/data-management.schema';
import {
  SetupStatus,
  DryRunResult,
  DryRunTableCount,
  ResetExecutionResult,
} from '@/types/data-management';
import { ActionResult } from '@/types/auth';

/**
 * Retrieves the current setup mode status, go-live lock state, and first-run checklist progress.
 * Restricted to System Administrator (data_reset:manage).
 */
export async function getSetupStatusAction(): Promise<ActionResult<SetupStatus>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'data_reset:manage');

    const admin = getAdminClient();

    // 1. Fetch business_settings
    const { data: settings } = await admin
      .from('business_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // 2. Fetch Gmail connection status
    const { data: gmail } = await admin
      .from('gmail_credentials')
      .select('status')
      .maybeSingle();

    // 3. Check catalogue counts
    const { count: servicesCount } = await admin
      .from('services')
      .select('id', { count: 'exact', head: true });

    const { count: packagesCount } = await admin
      .from('packages')
      .select('id', { count: 'exact', head: true });

    // 4. Check crew count
    const { count: crewCount } = await admin
      .from('crew_members')
      .select('id', { count: 'exact', head: true });

    // 5. Check clients count
    const { count: clientsCount } = await admin
      .from('clients')
      .select('id', { count: 'exact', head: true });

    // 6. Check if sample data exists
    const { data: sampleClient } = await admin
      .from('clients')
      .select('id')
      .eq('is_sample', true)
      .limit(1)
      .maybeSingle();

    const isStudioProfileDone = Boolean(
      settings?.studio_name && settings?.phone && settings?.address_line1
    );
    const isBrandingDone = Boolean(
      settings?.primary_color && (settings?.logo_path || settings?.tagline)
    );
    const isGmailDone = gmail?.status === 'connected';
    const isCatalogueDone = (servicesCount || 0) + (packagesCount || 0) > 0;
    const isCrewDone = (crewCount || 0) > 0;
    const isClientDone = (clientsCount || 0) > 0;

    const checklist = [
      {
        id: 'studio_profile',
        stepNumber: 1,
        label: '1. Studio Profile',
        detail: isStudioProfileDone
          ? 'Atelier coordinates & legal entity verified'
          : 'Configure studio legal entity, studio address & phone',
        completed: isStudioProfileDone,
        actionHref: '/crm/settings',
      },
      {
        id: 'branding',
        stepNumber: 2,
        label: '2. Studio Branding',
        detail: isBrandingDone
          ? 'Serene Editorial typography & color palette active'
          : 'Upload studio monogram / logo and set color tokens',
        completed: isBrandingDone,
        actionHref: '/crm/settings',
      },
      {
        id: 'gmail',
        stepNumber: 3,
        label: '3. Connect Gmail',
        detail: isGmailDone
          ? 'Google Workspace OAuth 2.0 relay healthy'
          : 'Connect Gmail for automated quotation & invoice dispatch',
        completed: isGmailDone,
        actionHref: '/crm/settings/gmail',
      },
      {
        id: 'catalogue',
        stepNumber: 4,
        label: '4. Add Catalogue',
        detail: isCatalogueDone
          ? `${servicesCount || 0} services & ${packagesCount || 0} packages published`
          : 'Define photography/cinema services and commission packages',
        completed: isCatalogueDone,
        actionHref: '/crm/services',
      },
      {
        id: 'crew',
        stepNumber: 5,
        label: '5. Add Crew Roster',
        detail: isCrewDone
          ? `${crewCount || 0} cinematographers & stills operators active`
          : 'Add internal staff & freelancer crew members',
        completed: isCrewDone,
        actionHref: '/crm/crew',
      },
      {
        id: 'first_client',
        stepNumber: 6,
        label: '6. Add First Client Commission',
        detail: isClientDone
          ? `${clientsCount || 0} verified couples & nuptial dates bound`
          : 'Create your first couple commission profile',
        completed: isClientDone,
        actionHref: '/crm/clients',
      },
    ];

    const completedCount = checklist.filter((c) => c.completed).length;
    const progressPercentage = Math.round((completedCount / checklist.length) * 100);

    const appMode = (process.env.APP_MODE || 'production') as 'production' | 'demo';

    return {
      data: {
        setupMode: settings?.setup_mode ?? true,
        setupLockedAt: settings?.setup_locked_at || null,
        appMode,
        checklist,
        totalChecklistCount: checklist.length,
        completedChecklistCount: completedCount,
        progressPercentage,
        sampleDataLoaded: Boolean(sampleClient),
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to fetch setup mode status.',
      },
    };
  }
}

/**
 * Inserts the synthetic "Lumina Studio" dataset (Portfolio Plan §6, D-43).
 * Allowed only in setup mode or demo environment.
 */
export async function loadSampleDataAction(): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'data_reset:manage');

    const admin = getAdminClient();

    // Check setup_mode
    const { data: settings } = await admin
      .from('business_settings')
      .select('setup_mode')
      .eq('id', 1)
      .single();

    const isDemo = process.env.APP_MODE === 'demo';
    if (!settings?.setup_mode && !isDemo) {
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'Loading sample data is prohibited in locked production mode (D-43).',
        },
      };
    }

    const { error } = await (admin as any).rpc('load_sample_data', {
      p_actor_id: user.id,
    });

    if (error) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to load sample dataset.',
        },
      };
    }

    revalidatePath('/crm');
    revalidatePath('/admin/dashboard');

    return { data: { success: true } };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to load sample dataset.',
      },
    };
  }
}

/**
 * Computes a dry-run preview of affected records and files for the Reset Wizard (Step 2).
 * Does NOT delete any data.
 */
export async function dryRunResetAction(
  input: DryRunResetInput
): Promise<ActionResult<DryRunResult>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'data_reset:manage');

    const validated = dryRunResetSchema.parse(input);
    const admin = getAdminClient();

    const tables: DryRunTableCount[] = [];
    let totalRecords = 0;
    let totalFiles = 0;

    const scopesSet = new Set(validated.scopes);

    if (scopesSet.has('clients_and_dependants')) {
      const { count: clientsCount } = await admin.from('clients').select('id', { count: 'exact', head: true });
      const { count: enquiriesCount } = await admin.from('enquiries').select('id', { count: 'exact', head: true });
      const { count: quotesCount } = await admin.from('quotations').select('id', { count: 'exact', head: true });
      const { count: bookingsCount } = await admin.from('bookings').select('id', { count: 'exact', head: true });
      const { count: invoicesCount } = await admin.from('invoices').select('id', { count: 'exact', head: true });
      const { count: paymentsCount } = await admin.from('payments').select('id', { count: 'exact', head: true });
      const { count: reviewsCount } = await admin.from('reviews').select('id', { count: 'exact', head: true });

      tables.push({
        tableName: 'clients_and_enquiries',
        recordCount: (clientsCount || 0) + (enquiriesCount || 0),
        fileCount: 0,
        cascadeSummary: 'Purges clients, phones, emails, and intake lead entries',
        impactType: 'Hard Delete',
      });
      tables.push({
        tableName: 'bookings_and_quotations',
        recordCount: (quotesCount || 0) + (bookingsCount || 0),
        fileCount: quotesCount || 0,
        cascadeSummary: 'Wipes confirmed bookings, multi-day events, and quotation PDFs',
        impactType: 'Hard Delete',
      });
      tables.push({
        tableName: 'invoices_and_ledger',
        recordCount: (invoicesCount || 0) + (paymentsCount || 0),
        fileCount: invoicesCount || 0,
        cascadeSummary: 'Clears invoice records, payments, and generated PDF receipts',
        impactType: 'Hard Delete',
      });
      tables.push({
        tableName: 'reviews_and_testimonials',
        recordCount: reviewsCount || 0,
        fileCount: 0,
        cascadeSummary: 'Removes client reviews and 30-day invitation tokens',
        impactType: 'Hard Delete',
      });
    }

    if (scopesSet.has('finance_only') && !scopesSet.has('clients_and_dependants')) {
      const { count: invCount } = await admin.from('invoices').select('id', { count: 'exact', head: true });
      const { count: payCount } = await admin.from('payments').select('id', { count: 'exact', head: true });
      const { count: expCount } = await admin.from('expenses').select('id', { count: 'exact', head: true });

      tables.push({
        tableName: 'financial_ledger_entries',
        recordCount: (invCount || 0) + (payCount || 0) + (expCount || 0),
        fileCount: (invCount || 0) + (payCount || 0),
        cascadeSummary: 'Purges invoices, receipts, payment allocations, and manual expenses',
        impactType: 'Hard Delete',
      });
    }

    if (scopesSet.has('crew')) {
      const { count: crewCount } = await admin.from('crew_members').select('id', { count: 'exact', head: true });
      tables.push({
        tableName: 'crew_roster',
        recordCount: crewCount || 0,
        fileCount: 0,
        cascadeSummary: 'Removes crew contractor roster, assignments, and availability blocks',
        impactType: 'Hard Delete',
      });
    }

    if (scopesSet.has('catalogue')) {
      const { count: sCount } = await admin.from('services').select('id', { count: 'exact', head: true });
      const { count: pCount } = await admin.from('packages').select('id', { count: 'exact', head: true });
      tables.push({
        tableName: 'catalogue_offerings',
        recordCount: (sCount || 0) + (pCount || 0),
        fileCount: 0,
        cascadeSummary: 'Removes pricing tiers, signature packages, and quote templates',
        impactType: 'Hard Delete',
      });
    }

    if (scopesSet.has('portfolio_and_website')) {
      const { count: portCount } = await admin.from('portfolio_items').select('id', { count: 'exact', head: true });
      const { count: imgCount } = await admin.from('portfolio_images').select('id', { count: 'exact', head: true });
      tables.push({
        tableName: 'portfolio_and_media',
        recordCount: portCount || 0,
        fileCount: imgCount || 0,
        cascadeSummary: 'Unlinks published monographs and purges portfolio image media',
        impactType: 'Hard Delete',
      });
    }

    if (scopesSet.has('sample_data_only')) {
      tables.push({
        tableName: 'synthetic_sample_data',
        recordCount: 15,
        fileCount: 3,
        cascadeSummary: 'Purges only records tagged is_sample = true (Lumina Studio fixtures)',
        impactType: 'Hard Delete',
      });
    }

    if (validated.restartNumbering) {
      tables.push({
        tableName: 'document_sequences',
        recordCount: 4,
        fileCount: 0,
        cascadeSummary: 'Resets document sequence counters (QT, INV, RCP, BK) to 000001',
        impactType: 'Sequence Reset',
      });
    }

    totalRecords = tables.reduce((acc, t) => acc + t.recordCount, 0);
    totalFiles = tables.reduce((acc, t) => acc + t.fileCount, 0);

    return {
      data: {
        tables,
        totalRecords,
        totalFiles,
        restartNumbering: validated.restartNumbering,
        clearAuditLog: validated.clearAuditLog,
        scopes: validated.scopes,
        simulationId: `SIM-${Date.now().toString(36).toUpperCase()}`,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to generate dry-run simulation.',
      },
    };
  }
}

/**
 * Executes destructive reset wizard after MFA (AAL2), password confirmation,
 * and exact typed phrase match (D-43, SECURITY_PLAN §12.5).
 * Creates mandatory pre-reset backup in documents bucket; aborts on backup failure.
 */
export async function executeResetAction(
  input: ExecuteResetInput
): Promise<ActionResult<ResetExecutionResult>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'data_reset:manage');

    // 1. Enforce AAL2 MFA requirement
    if (user.aal !== 'aal2' && process.env.APP_MODE !== 'demo') {
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'Data reset requires Step-up Two-Factor Authentication (AAL2).',
        },
      };
    }

    // 2. Validate input and exact confirmation phrase
    const validated = executeResetSchema.parse(input);

    // 3. Re-authenticate password against Supabase Auth
    const supabase = await createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validated.password,
    });

    if (authErr) {
      return {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Incorrect administrator password.',
        },
      };
    }

    const admin = getAdminClient();

    // 4. Check setup mode
    const { data: settings } = await admin
      .from('business_settings')
      .select('setup_mode')
      .eq('id', 1)
      .single();

    const isDemo = process.env.APP_MODE === 'demo';
    if (!settings?.setup_mode && !isDemo) {
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'Data reset is permanently disabled in production because setup is locked (D-43).',
        },
      };
    }

    // 5. Mandatory Pre-Reset Backup Export (D-43: abort if export fails)
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre_reset_backup_${backupTimestamp}.json`;

    // Fetch snapshot of critical business data
    const [clientsSnap, quotesSnap, bookingsSnap, invoicesSnap, paymentsSnap] = await Promise.all([
      admin.from('clients').select('*'),
      admin.from('quotations').select('*'),
      admin.from('bookings').select('*'),
      admin.from('invoices').select('*'),
      admin.from('payments').select('*'),
    ]);

    const backupPayload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        actorId: user.id,
        scopes: validated.scopes,
        data: {
          clients: clientsSnap.data || [],
          quotations: quotesSnap.data || [],
          bookings: bookingsSnap.data || [],
          invoices: invoicesSnap.data || [],
          payments: paymentsSnap.data || [],
        },
      },
      null,
      2
    );

    const backupBytes = Buffer.from(backupPayload, 'utf-8');
    const { error: uploadErr } = await admin.storage
      .from('documents')
      .upload(backupFileName, backupBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadErr) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Mandatory pre-reset backup failed: ${uploadErr.message}. Reset aborted.`,
        },
      };
    }

    // 6. Execute atomic reset procedure in database
    const { data: resetCounts, error: rpcErr } = await (admin as any).rpc('reset_business_data', {
      p_scopes: validated.scopes,
      p_restart_numbering: validated.restartNumbering,
      p_clear_audit: validated.clearAuditLog,
      p_actor_id: user.id,
    });

    if (rpcErr) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: rpcErr.message || 'Database reset procedure failed.',
        },
      };
    }

    revalidatePath('/crm');
    revalidatePath('/admin/dashboard');

    return {
      data: {
        success: true,
        backupZipPath: backupFileName,
        backupSizeBytes: backupBytes.length,
        deletedCounts: resetCounts || {},
        resetTimestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to execute data reset.',
      },
    };
  }
}

/**
 * Permanently locks setup mode (D-43, SECURITY_PLAN §12.5).
 * Irreversible in the app; writes setup_lock audit entry.
 */
export async function lockSetupAction(
  input: LockSetupInput
): Promise<ActionResult<{ success: boolean; lockedAt: string }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'data_reset:manage');

    const validated = lockSetupSchema.parse(input);
    const admin = getAdminClient();

    const { error } = await (admin as any).rpc('lock_setup', {
      p_actor_id: user.id,
    });

    if (error) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to lock setup.',
        },
      };
    }

    const lockedAt = new Date().toISOString();
    revalidatePath('/admin/system/data');
    revalidatePath('/crm/settings');

    return {
      data: {
        success: true,
        lockedAt,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to lock setup mode.',
      },
    };
  }
}

/**
 * DPDP 2023 compliance erasure: replaces personal details with neutral placeholders
 * while preserving all financial rows for the statutory 8-year retention (SECURITY_PLAN §10.5).
 */
export async function anonymiseClientAction(
  input: AnonymiseClientInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:delete');

    const validated = anonymiseClientSchema.parse(input);
    const admin = getAdminClient();

    const { error } = await (admin as any).rpc('anonymise_client', {
      p_client_id: validated.clientId,
      p_actor_id: user.id,
    });

    if (error) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to anonymise client.',
        },
      };
    }

    revalidatePath('/crm/clients');

    return {
      data: {
        success: true,
      },
    };
  } catch (err: any) {
    return {
      error: {
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || 'Failed to anonymise client.',
      },
    };
  }
}
