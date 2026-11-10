'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { clientSchema, ClientInput } from '@/lib/validations/sales.schema';
import { Client, ClientDuplicateMatch } from '@/types/sales';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

/**
 * Escapes CSV values against Formula Injection (CSV Injection).
 * If a value starts with '=', '+', '-', or '@', prepends a single apostrophe.
 */
function escapeCsvFormula(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Lists clients with optional text search and pagination.
 */
export async function listClientsAction(
  searchQuery?: string,
  limit = 50,
  offset = 0
): Promise<ActionResult<{ clients: Client[]; totalCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:view');

    const supabase = await createClient();
    let query = supabase
      .from('clients')
      .select('*, client_phones(*), client_emails(*)', { count: 'exact' })
      .is('deleted_at', null);

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      query = query.or(`full_name.ilike.%${q}%,city.ilike.%${q}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const clients: Client[] = (data || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      stateCode: row.state_code,
      pincode: row.pincode,
      gstin: row.gstin,
      referralSource: row.referral_source,
      notes: row.notes,
      phones: ((row as any).client_phones || []).map((p: any) => ({
        id: p.id,
        clientId: p.client_id,
        phoneE164: p.phone_e164,
        label: p.label,
        isPrimary: p.is_primary,
        isInternational: p.is_international,
      })),
      emails: ((row as any).client_emails || []).map((e: any) => ({
        id: e.id,
        clientId: e.client_id,
        email: e.email,
        isPrimary: e.is_primary,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: { clients, totalCount: count || 0 } };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list clients',
      },
    };
  }
}

/**
 * Checks for duplicate clients by phone, email, or similar name.
 */
export async function checkDuplicateClientsAction(params: {
  phone?: string;
  email?: string;
  name?: string;
}): Promise<ActionResult<ClientDuplicateMatch[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:view');

    const supabase = await createClient();
    const matches: ClientDuplicateMatch[] = [];

    // Check phone
    if (params.phone && params.phone.trim().length > 0) {
      const { data: phoneRows } = await supabase
        .from('client_phones')
        .select('client_id, phone_e164, clients(full_name)')
        .eq('phone_e164', params.phone.trim());

      for (const p of phoneRows || []) {
        matches.push({
          clientId: p.client_id,
          fullName: (p.clients as any)?.full_name || 'Client',
          matchField: 'phone',
          matchValue: p.phone_e164,
        });
      }
    }

    // Check email
    if (params.email && params.email.trim().length > 0) {
      const { data: emailRows } = await supabase
        .from('client_emails')
        .select('client_id, email, clients(full_name)')
        .ilike('email', params.email.trim().toLowerCase());

      for (const e of emailRows || []) {
        matches.push({
          clientId: e.client_id,
          fullName: (e.clients as any)?.full_name || 'Client',
          matchField: 'email',
          matchValue: e.email,
        });
      }
    }

    // Check similar name
    if (params.name && params.name.trim().length >= 3) {
      const { data: nameRows } = await supabase
        .from('clients')
        .select('id, full_name')
        .ilike('full_name', `%${params.name.trim()}%`)
        .is('deleted_at', null)
        .limit(5);

      for (const n of nameRows || []) {
        if (!matches.some((m) => m.clientId === n.id)) {
          matches.push({
            clientId: n.id,
            fullName: n.full_name,
            matchField: 'name',
            matchValue: n.full_name,
          });
        }
      }
    }

    return { data: matches };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Duplicate check failed',
      },
    };
  }
}

/**
 * Retrieves a single client with contact records and recent activities.
 */
export async function getClientAction(id: string): Promise<ActionResult<{ client: Client; activities: any[] }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*, client_phones(*), client_emails(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return { error: { code: 'NOT_FOUND', message: 'Client not found' } };
    }

    // Fetch activities
    const { data: activities } = await supabase
      .from('activities')
      .select('*, profiles(full_name)')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    const client: Client = {
      id: data.id,
      fullName: data.full_name,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      city: data.city,
      state: data.state,
      stateCode: data.state_code,
      pincode: data.pincode,
      gstin: data.gstin,
      referralSource: data.referral_source,
      notes: data.notes,
      phones: ((data as any).client_phones || []).map((p: any) => ({
        id: p.id,
        clientId: p.client_id,
        phoneE164: p.phone_e164,
        label: p.label,
        isPrimary: p.is_primary,
        isInternational: p.is_international,
      })),
      emails: ((data as any).client_emails || []).map((e: any) => ({
        id: e.id,
        clientId: e.client_id,
        email: e.email,
        isPrimary: e.is_primary,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: { client, activities: activities || [] } };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get client',
      },
    };
  }
}

/**
 * Creates a client with phones and emails. SA, BO, Manager.
 */
export async function createClientAction(rawInput: ClientInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:create');

    const parsed = clientSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { data: client, error: cErr } = await supabase
      .from('clients')
      .insert({
        full_name: input.fullName,
        address_line1: input.addressLine1 || null,
        address_line2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        state_code: input.stateCode || null,
        pincode: input.pincode || null,
        gstin: input.gstin || null,
        referral_source: input.referralSource,
        notes: input.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (cErr || !client) {
      return { error: { code: 'INTERNAL_ERROR', message: cErr?.message || 'Failed to create client' } };
    }

    // Insert phones (guaranteed max 3 and one primary by schema)
    if (input.phones.length > 0) {
      await supabase.from('client_phones').insert(
        input.phones.map((p) => ({
          client_id: client.id,
          phone_e164: p.phoneE164,
          label: p.label || 'Mobile',
          is_primary: p.isPrimary,
          is_international: p.isInternational,
        }))
      );
    }

    // Insert emails (guaranteed max 2 by schema)
    if (input.emails && input.emails.length > 0) {
      await supabase.from('client_emails').insert(
        input.emails.map((e) => ({
          client_id: client.id,
          email: e.email,
          is_primary: e.isPrimary,
        }))
      );
    }

    // Record activity
    await supabase.from('activities').insert({
      client_id: client.id,
      entity_type: 'client',
      entity_id: client.id,
      action: 'client_created',
      metadata: { full_name: input.fullName, created_by_role: user.role },
      actor_id: user.id,
    });

    revalidatePath('/crm/clients');
    return { data: client.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create client',
      },
    };
  }
}

/**
 * Updates a client, replacing phones and emails. SA, BO, Manager.
 */
export async function updateClientAction(
  id: string,
  rawInput: ClientInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:update');

    const parsed = clientSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { error: cErr } = await supabase
      .from('clients')
      .update({
        full_name: input.fullName,
        address_line1: input.addressLine1 || null,
        address_line2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        state_code: input.stateCode || null,
        pincode: input.pincode || null,
        gstin: input.gstin || null,
        referral_source: input.referralSource,
        notes: input.notes || null,
      })
      .eq('id', id);

    if (cErr) {
      return { error: { code: 'INTERNAL_ERROR', message: cErr.message } };
    }

    // Replace phones
    await supabase.from('client_phones').delete().eq('client_id', id);
    if (input.phones.length > 0) {
      await supabase.from('client_phones').insert(
        input.phones.map((p) => ({
          client_id: id,
          phone_e164: p.phoneE164,
          label: p.label || 'Mobile',
          is_primary: p.isPrimary,
          is_international: p.isInternational,
        }))
      );
    }

    // Replace emails
    await supabase.from('client_emails').delete().eq('client_id', id);
    if (input.emails && input.emails.length > 0) {
      await supabase.from('client_emails').insert(
        input.emails.map((e) => ({
          client_id: id,
          email: e.email,
          is_primary: e.isPrimary,
        }))
      );
    }

    // Record activity
    await supabase.from('activities').insert({
      client_id: id,
      entity_type: 'client',
      entity_id: id,
      action: 'client_updated',
      metadata: { full_name: input.fullName },
      actor_id: user.id,
    });

    revalidatePath(`/crm/clients/${id}`);
    revalidatePath('/crm/clients');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update client',
      },
    };
  }
}

/**
 * Soft deletes a client. RESTRICTED TO SYSTEM ADMIN AND BUSINESS OWNER ONLY.
 * Managers are explicitly denied by RBAC R1.
 */
export async function deleteClientAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:delete');

    if (user.role !== 'system_admin' && user.role !== 'business_owner') {
      return {
        error: { code: 'FORBIDDEN', message: 'Only System Administrator and Business Owner may delete clients.' },
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/clients');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to delete client',
      },
    };
  }
}

/**
 * Exports clients as CSV with Formula Injection protection.
 */
export async function exportClientsCsvAction(): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'clients:export');

    const supabase = await createClient();
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*, client_phones(*), client_emails(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const headers = [
      'ID',
      'Full Name',
      'Primary Phone',
      'Primary Email',
      'City',
      'State',
      'Pincode',
      'GSTIN',
      'Referral Source',
      'Created At',
    ];

    const rows = (clients || []).map((c: any) => {
      const primaryPhone = c.client_phones?.find((p: any) => p.is_primary)?.phone_e164 || c.client_phones?.[0]?.phone_e164 || '';
      const primaryEmail = c.client_emails?.find((e: any) => e.is_primary)?.email || c.client_emails?.[0]?.email || '';

      return [
        escapeCsvFormula(c.id),
        `"${escapeCsvFormula(c.full_name).replace(/"/g, '""')}"`,
        escapeCsvFormula(primaryPhone),
        escapeCsvFormula(primaryEmail),
        `"${escapeCsvFormula(c.city).replace(/"/g, '""')}"`,
        `"${escapeCsvFormula(c.state).replace(/"/g, '""')}"`,
        escapeCsvFormula(c.pincode),
        escapeCsvFormula(c.gstin),
        escapeCsvFormula(c.referral_source),
        c.created_at,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    return { data: csv };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to export clients',
      },
    };
  }
}
