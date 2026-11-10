'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { serviceSchema, ServiceInput, packageSchema, PackageInput } from '@/lib/validations/sales.schema';
import { Service, Package, ServiceCategory, ServiceUnit } from '@/types/sales';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

/**
 * Lists all active services with their current price from services_current_price_v.
 */
export async function listServicesAction(): Promise<ActionResult<Service[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('services_current_price_v')
      .select('*')
      .is('deleted_at', null)
      .order('sort', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const services: Service[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as ServiceCategory,
      description: row.description,
      unit: row.unit as ServiceUnit,
      isActive: row.is_active,
      showOnWebsite: row.show_on_website,
      sort: row.sort || 0,
      currentPricePaise: row.current_price_paise,
      priceEffectiveFrom: row.price_effective_from,
      deletedAt: row.deleted_at,
    }));

    return { data: services };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list services',
      },
    };
  }
}

/**
 * Creates a new service with initial price history record. SA and BO only.
 */
export async function createServiceAction(rawInput: ServiceInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const parsed = serviceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    // Insert service
    const { data: service, error: sErr } = await supabase
      .from('services')
      .insert({
        name: input.name,
        category: input.category,
        description: input.description || null,
        unit: input.unit,
        is_active: input.isActive,
        show_on_website: input.showOnWebsite,
        sort: input.sort,
      })
      .select('id')
      .single();

    if (sErr || !service) {
      return { error: { code: 'INTERNAL_ERROR', message: sErr?.message || 'Failed to create service' } };
    }

    // Insert initial price
    const { error: pErr } = await supabase.from('service_prices').insert({
      service_id: service.id,
      price_paise: input.pricePaise,
      effective_from: input.effectiveFrom,
      created_by: user.id,
    });

    if (pErr) {
      return { error: { code: 'INTERNAL_ERROR', message: pErr.message } };
    }

    revalidatePath('/crm/services');
    return { data: service.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create service',
      },
    };
  }
}

/**
 * Updates an existing service. If price is specified, updates or inserts into service_prices.
 */
export async function updateServiceAction(
  id: string,
  rawInput: ServiceInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const parsed = serviceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { error: sErr } = await supabase
      .from('services')
      .update({
        name: input.name,
        category: input.category,
        description: input.description || null,
        unit: input.unit,
        is_active: input.isActive,
        show_on_website: input.showOnWebsite,
        sort: input.sort,
      })
      .eq('id', id);

    if (sErr) {
      return { error: { code: 'INTERNAL_ERROR', message: sErr.message } };
    }

    // Upsert price history for effective date
    const { error: pErr } = await supabase
      .from('service_prices')
      .upsert(
        {
          service_id: id,
          price_paise: input.pricePaise,
          effective_from: input.effectiveFrom,
          created_by: user.id,
        },
        { onConflict: 'service_id,effective_from' }
      );

    if (pErr) {
      return { error: { code: 'INTERNAL_ERROR', message: pErr.message } };
    }

    revalidatePath('/crm/services');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update service',
      },
    };
  }
}

/**
 * Soft deletes an existing service.
 */
export async function archiveServiceAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/services');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to archive service',
      },
    };
  }
}

/**
 * Lists all active packages with current prices and included items.
 */
export async function listPackagesAction(): Promise<ActionResult<Package[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:view');

    const supabase = await createClient();
    const { data: pkgs, error: pErr } = await supabase
      .from('packages_current_price_v')
      .select('*')
      .is('deleted_at', null)
      .order('sort', { ascending: true })
      .order('name', { ascending: true });

    if (pErr) {
      return { error: { code: 'INTERNAL_ERROR', message: pErr.message } };
    }

    // Fetch items
    const { data: items, error: iErr } = await supabase
      .from('package_items')
      .select('package_id, service_id, quantity, services(name, unit)');

    if (iErr) {
      return { error: { code: 'INTERNAL_ERROR', message: iErr.message } };
    }

    const itemsByPkg = new Map<string, any[]>();
    for (const item of items || []) {
      const list = itemsByPkg.get(item.package_id) || [];
      list.push({
        serviceId: item.service_id,
        serviceName: (item.services as any)?.name || 'Unknown',
        unit: (item.services as any)?.unit || 'day',
        quantity: item.quantity,
      });
      itemsByPkg.set(item.package_id, list);
    }

    const packages: Package[] = (pkgs || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      showOnWebsite: row.show_on_website,
      sort: row.sort || 0,
      currentPricePaise: row.current_price_paise,
      priceEffectiveFrom: row.price_effective_from,
      items: itemsByPkg.get(row.id) || [],
      deletedAt: row.deleted_at,
    }));

    return { data: packages };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list packages',
      },
    };
  }
}

/**
 * Creates a new package with items and price history.
 */
export async function createPackageAction(rawInput: PackageInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const parsed = packageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { data: pkg, error: pErr } = await supabase
      .from('packages')
      .insert({
        name: input.name,
        description: input.description || null,
        is_active: input.isActive,
        show_on_website: input.showOnWebsite,
        sort: input.sort,
      })
      .select('id')
      .single();

    if (pErr || !pkg) {
      return { error: { code: 'INTERNAL_ERROR', message: pErr?.message || 'Failed to create package' } };
    }

    // Insert price
    await supabase.from('package_prices').insert({
      package_id: pkg.id,
      price_paise: input.pricePaise,
      effective_from: input.effectiveFrom,
      created_by: user.id,
    });

    // Insert items
    if (input.items.length > 0) {
      await supabase.from('package_items').insert(
        input.items.map((item) => ({
          package_id: pkg.id,
          service_id: item.serviceId,
          quantity: item.quantity,
        }))
      );
    }

    revalidatePath('/crm/packages');
    return { data: pkg.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create package',
      },
    };
  }
}

/**
 * Updates a package, upserting price history and replacing package items.
 */
export async function updatePackageAction(
  id: string,
  rawInput: PackageInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const parsed = packageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { error: pErr } = await supabase
      .from('packages')
      .update({
        name: input.name,
        description: input.description || null,
        is_active: input.isActive,
        show_on_website: input.showOnWebsite,
        sort: input.sort,
      })
      .eq('id', id);

    if (pErr) {
      return { error: { code: 'INTERNAL_ERROR', message: pErr.message } };
    }

    // Upsert price history
    await supabase.from('package_prices').upsert(
      {
        package_id: id,
        price_paise: input.pricePaise,
        effective_from: input.effectiveFrom,
        created_by: user.id,
      },
      { onConflict: 'package_id,effective_from' }
    );

    // Refresh items
    await supabase.from('package_items').delete().eq('package_id', id);
    if (input.items.length > 0) {
      await supabase.from('package_items').insert(
        input.items.map((item) => ({
          package_id: id,
          service_id: item.serviceId,
          quantity: item.quantity,
        }))
      );
    }

    revalidatePath('/crm/packages');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update package',
      },
    };
  }
}

/**
 * Soft deletes an existing package.
 */
export async function archivePackageAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'services:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('packages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/packages');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to archive package',
      },
    };
  }
}
