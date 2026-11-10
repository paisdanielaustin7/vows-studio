'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import {
  businessSettingsSchema,
  BusinessSettingsInput,
  documentNumberConfigSchema,
  DocumentNumberConfigInput,
  emailTemplateSchema,
  EmailTemplateInput,
  expenseCategorySchema,
  ExpenseCategoryInput,
} from '@/lib/validations/sales.schema';
import { BusinessSettings, DocumentNumberConfig, EmailTemplate, ExpenseCategory } from '@/types/sales';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

const ALLOWED_MERGE_TAGS: Record<string, string[]> = {
  quotation: ['client_name', 'quotation_number', 'event_date', 'total_amount', 'valid_until'],
  invoice: ['client_name', 'invoice_number', 'total_amount', 'due_date'],
  receipt: ['client_name', 'receipt_number', 'invoice_number', 'payment_amount'],
  payment_reminder: ['client_name', 'invoice_number', 'balance_due', 'due_date'],
  review_request: ['client_name', 'review_link'],
  invitation: ['recipient_name', 'role_name', 'invite_link'],
  password_reset: ['reset_link'],
};

/**
 * Reads business settings. Public studio profile returned to all active authenticated users;
 * sensitive billing and bank details included only for System Administrator and Business Owner.
 */
export async function getBusinessSettingsAction(): Promise<ActionResult<BusinessSettings>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return { error: { code: 'NOT_FOUND', message: 'Business settings not found' } };
    }

    const isPrivileged = user.role === 'system_admin' || user.role === 'business_owner';

    const settings: BusinessSettings = {
      id: data.id,
      studioName: data.studio_name,
      tagline: data.tagline,
      phone: data.phone,
      email: data.email,
      website: data.website,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      city: data.city,
      state: data.state,
      stateCode: data.state_code,
      pincode: data.pincode,
      // Privileged billing & banking info
      gstin: isPrivileged ? data.gstin : null,
      pan: isPrivileged ? data.pan : null,
      bankName: isPrivileged ? data.bank_name : null,
      bankAccountHolder: isPrivileged ? data.bank_account_holder : null,
      bankAccountNumber: isPrivileged ? data.bank_account_number : null,
      bankIfsc: isPrivileged ? data.bank_ifsc : null,
      upiId: isPrivileged ? data.upi_id : null,
      setupMode: data.setup_mode,
      setupLockedAt: data.setup_locked_at,
      gstEnabled: data.gst_enabled,
      defaultCgstBps: data.default_cgst_bps,
      defaultSgstBps: data.default_sgst_bps,
      defaultIgstBps: data.default_igst_bps,
      logoPath: data.logo_path,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      letterheadLayout: data.letterhead_layout,
      emailSignature: data.email_signature,
      socialLinks: (data.social_links as Record<string, string>) || {},
      defaultQuoteValidityDays: data.default_quote_validity_days,
      defaultQuoteTerms: data.default_quote_terms,
      defaultInvoiceTerms: data.default_invoice_terms,
      defaultPaymentTerms: data.default_payment_terms,
      receiptNote: data.receipt_note,
      updatedAt: data.updated_at,
    };

    return { data: settings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve settings';
    return { error: { code: 'INTERNAL_ERROR', message } };
  }
}

/**
 * Updates business settings. Accessible to System Administrator and Business Owner.
 * If gst_enabled flips, writes an explicit 'gst_toggle' audit event.
 */
export async function updateBusinessSettingsAction(
  rawInput: BusinessSettingsInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const parsed = businessSettingsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    // Fetch existing settings to check GST toggle change
    const { data: existing } = await supabase
      .from('business_settings')
      .select('gst_enabled')
      .eq('id', 1)
      .single();

    const { error } = await supabase
      .from('business_settings')
      .update({
        studio_name: input.studioName,
        tagline: input.tagline || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        address_line1: input.addressLine1 || null,
        address_line2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        state_code: input.stateCode || null,
        pincode: input.pincode || null,
        gstin: input.gstin || null,
        pan: input.pan || null,
        bank_name: input.bankName || null,
        bank_account_holder: input.bankAccountHolder || null,
        bank_account_number: input.bankAccountNumber || null,
        bank_ifsc: input.bankIfsc || null,
        upi_id: input.upiId || null,
        gst_enabled: input.gstEnabled,
        default_cgst_bps: input.defaultCgstBps,
        default_sgst_bps: input.defaultSgstBps,
        default_igst_bps: input.defaultIgstBps,
        logo_path: input.logoPath || null,
        primary_color: input.primaryColor || '#4c6452',
        secondary_color: input.secondaryColor || '#ceead2',
        letterhead_layout: input.letterheadLayout || 'classic',
        email_signature: input.emailSignature || null,
        social_links: input.socialLinks || {},
        default_quote_validity_days: input.defaultQuoteValidityDays,
        default_quote_terms: input.defaultQuoteTerms || null,
        default_invoice_terms: input.defaultInvoiceTerms || null,
        default_payment_terms: input.defaultPaymentTerms || null,
        receipt_note: input.receiptNote || null,
        updated_by: user.id,
      })
      .eq('id', 1);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    // If GST toggle state changed, audit it specifically
    if (existing && existing.gst_enabled !== input.gstEnabled) {
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'gst_toggle',
        table_name: 'business_settings',
        record_id: '1',
        old_values: { gst_enabled: existing.gst_enabled },
        new_values: { gst_enabled: input.gstEnabled },
        metadata: { changed_by: user.email },
      });
    }

    revalidatePath('/crm/settings');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update settings',
      },
    };
  }
}

/**
 * Retrieves document numbering configs. SA and BO only.
 */
export async function getDocumentNumberConfigsAction(): Promise<ActionResult<DocumentNumberConfig[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('document_number_config')
      .select('*')
      .order('doc_type');

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const configs: DocumentNumberConfig[] = (data || []).map((row) => ({
      docType: row.doc_type as DocumentNumberConfig['docType'],
      prefix: row.prefix,
      padding: row.padding,
      yearFormat: row.year_format as 'YYYY' | 'YY',
      fyStartMonth: row.fy_start_month,
      updatedAt: row.updated_at,
    }));

    return { data: configs };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to retrieve numbering configs',
      },
    };
  }
}

/**
 * Updates document numbering configuration. SYSTEM ADMINISTRATOR ONLY.
 */
export async function updateDocumentNumberConfigAction(
  rawInput: DocumentNumberConfigInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'document_numbering:manage');

    const parsed = documentNumberConfigSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase
      .from('document_number_config')
      .update({
        prefix: input.prefix,
        padding: input.padding,
        year_format: input.yearFormat,
        fy_start_month: input.fyStartMonth,
        updated_by: user.id,
      })
      .eq('doc_type', input.docType);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/settings/numbering');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update numbering configuration',
      },
    };
  }
}

/**
 * Retrieves all email templates. SA, BO, MG, AC.
 */
export async function getEmailTemplatesAction(): Promise<ActionResult<EmailTemplate[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('code');

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const templates: EmailTemplate[] = (data || []).map((row) => ({
      code: row.code,
      subject: row.subject,
      bodyHtml: row.body_html,
      isActive: row.is_active,
      updatedAt: row.updated_at,
    }));

    return { data: templates };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to retrieve email templates',
      },
    };
  }
}

/**
 * Updates an email template. SA and BO only. Validates merge tags against whitelist.
 */
export async function updateEmailTemplateAction(
  rawInput: EmailTemplateInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const parsed = emailTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    // Check merge tags against whitelist
    const allowed = ALLOWED_MERGE_TAGS[input.code] || [];
    const foundTags = (input.subject + ' ' + input.bodyHtml).match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    for (const tagWithBraces of foundTags) {
      const tag = tagWithBraces.replace(/\{\{|\}\}/g, '');
      if (!allowed.includes(tag)) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unsupported merge tag: {{${tag}}}. Allowed tags for ${input.code}: ${allowed.map((t) => `{{${t}}}`).join(', ')}`,
          },
        };
      }
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: input.subject,
        body_html: input.bodyHtml,
        is_active: input.isActive,
        updated_by: user.id,
      })
      .eq('code', input.code);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/settings/email-templates');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update email template',
      },
    };
  }
}

/**
 * Retrieves expense categories. SA, BO, AC.
 */
export async function getExpenseCategoriesAction(): Promise<ActionResult<ExpenseCategory[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('sort', { ascending: true });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const categories: ExpenseCategory[] = (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      isBuiltin: row.is_builtin,
      isArchived: row.is_archived,
      sort: row.sort || 0,
    }));

    return { data: categories };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to retrieve expense categories',
      },
    };
  }
}

/**
 * Creates a custom expense category. SA and BO only.
 */
export async function createExpenseCategoryAction(
  rawInput: ExpenseCategoryInput
): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:manage');

    const parsed = expenseCategorySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        code: input.code.toLowerCase().replace(/\s+/g, '_'),
        name: input.name,
        sort: input.sort,
        is_builtin: false,
        is_archived: false,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create category' } };
    }

    revalidatePath('/crm/settings/expense-categories');
    return { data: data.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create expense category',
      },
    };
  }
}

/**
 * Toggles archiving of an expense category. Built-in categories cannot be archived.
 */
export async function archiveExpenseCategoryAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:manage');

    const supabase = await createClient();

    // Verify it is not built-in
    const { data: cat } = await supabase
      .from('expense_categories')
      .select('is_builtin, is_archived')
      .eq('id', id)
      .single();

    if (!cat) {
      return { error: { code: 'NOT_FOUND', message: 'Category not found' } };
    }

    if (cat.is_builtin) {
      return { error: { code: 'FORBIDDEN', message: 'Built-in system expense categories cannot be archived.' } };
    }

    const { error } = await supabase
      .from('expense_categories')
      .update({ is_archived: !cat.is_archived })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/settings/expense-categories');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to archive category',
      },
    };
  }
}
