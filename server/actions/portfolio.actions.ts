'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import {
  portfolioItemSchema,
  portfolioImageSchema,
  PortfolioItemInput,
  PortfolioImageInput,
} from '@/lib/validations/portfolio.schema';
import { ActionResult } from '@/types/auth';
import { PortfolioItem, PortfolioImage } from '@/types/portfolio';
import { revalidatePath } from 'next/cache';

/**
 * Lists portfolio items for CRM.
 * Allowed for SA, BO, MG, Staff, Crew.
 */
export async function listPortfolioItemsAction(
  includeUnpublished = true
): Promise<ActionResult<PortfolioItem[]>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const supabase = await createClient();
    let query = supabase
      .from('portfolio_items')
      .select('*, portfolio_images(*)')
      .is('deleted_at', null)
      .order('sort', { ascending: true })
      .order('shoot_date', { ascending: false });

    if (!includeUnpublished) {
      query = query.eq('is_published', true).not('client_consent_confirmed_at', 'is', null);
    }

    const { data, error } = await query;
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const items: PortfolioItem[] = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      eventType: row.event_type as unknown as PortfolioItem['eventType'],
      description: row.description,
      shootDate: row.shoot_date,
      coverImagePath: row.cover_image_path,
      videoUrl: row.video_url,
      tags: row.tags || [],
      sort: row.sort,
      isPublished: row.is_published,
      clientConsentConfirmedAt: row.client_consent_confirmed_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      images: ((row.portfolio_images as unknown as Array<Record<string, unknown>>) || []).map((img) => ({
        id: String(img.id),
        itemId: String(img.item_id),
        storagePath: String(img.storage_path),
        altText: String(img.alt_text),
        width: typeof img.width === 'number' ? img.width : null,
        height: typeof img.height === 'number' ? img.height : null,
        sort: typeof img.sort === 'number' ? img.sort : 0,
        createdAt: String(img.created_at),
      })),
    }));

    return { data: items };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Creates a portfolio item.
 * Requires portfolio:manage (SA, BO, MG).
 * Strictly enforces that if isPublished is true, clientConsentConfirmedAt must be provided.
 */
export async function createPortfolioItemAction(
  input: PortfolioItemInput
): Promise<ActionResult<PortfolioItem>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const parsed = portfolioItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid portfolio data',
        },
      };
    }

    const { data: valid } = parsed;

    // Security check: cannot be published without client consent
    if (valid.isPublished && !valid.clientConsentConfirmedAt) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client consent must be confirmed before publishing to the public portfolio',
        },
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({
        title: valid.title,
        event_type: valid.eventType,
        description: valid.description || null,
        shoot_date: valid.shootDate || null,
        cover_image_path: valid.coverImagePath || null,
        video_url: valid.videoUrl || null,
        tags: valid.tags || [],
        sort: valid.sort ?? 0,
        is_published: valid.isPublished ?? false,
        client_consent_confirmed_at: valid.isPublished ? (valid.clientConsentConfirmedAt || new Date().toISOString()) : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create portfolio item' } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return {
      data: {
        id: data.id,
        title: data.title,
        eventType: data.event_type as unknown as PortfolioItem['eventType'],
        description: data.description,
        shootDate: data.shoot_date,
        coverImagePath: data.cover_image_path,
        videoUrl: data.video_url,
        tags: data.tags || [],
        sort: data.sort,
        isPublished: data.is_published,
        clientConsentConfirmedAt: data.client_consent_confirmed_at,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Updates a portfolio item.
 * If attempting to publish, enforces client consent confirmation.
 */
export async function updatePortfolioItemAction(
  id: string,
  input: Partial<PortfolioItemInput>
): Promise<ActionResult<PortfolioItem>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const supabase = await createClient();

    // Fetch existing item to check current consent
    const { data: existing, error: fetchErr } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !existing) {
      return { error: { code: 'NOT_FOUND', message: 'Portfolio item not found' } };
    }

    const merged = {
      title: input.title ?? existing.title,
      eventType: input.eventType ?? existing.event_type,
      description: input.description !== undefined ? input.description : existing.description,
      shootDate: input.shootDate !== undefined ? input.shootDate : existing.shoot_date,
      coverImagePath: input.coverImagePath !== undefined ? input.coverImagePath : existing.cover_image_path,
      videoUrl: input.videoUrl !== undefined ? input.videoUrl : existing.video_url,
      tags: input.tags ?? existing.tags,
      sort: input.sort ?? existing.sort,
      isPublished: input.isPublished ?? existing.is_published,
      clientConsentConfirmedAt:
        input.clientConsentConfirmedAt !== undefined
          ? input.clientConsentConfirmedAt
          : existing.client_consent_confirmed_at,
    };

    const parsed = portfolioItemSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid portfolio data',
        },
      };
    }

    const { data: valid } = parsed;

    if (valid.isPublished && !valid.clientConsentConfirmedAt) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client consent must be confirmed before publishing to the public portfolio',
        },
      };
    }

    const { data, error } = await supabase
      .from('portfolio_items')
      .update({
        title: valid.title,
        event_type: valid.eventType,
        description: valid.description || null,
        shoot_date: valid.shootDate || null,
        cover_image_path: valid.coverImagePath || null,
        video_url: valid.videoUrl || null,
        tags: valid.tags || [],
        sort: valid.sort ?? 0,
        is_published: valid.isPublished ?? false,
        client_consent_confirmed_at: valid.isPublished ? valid.clientConsentConfirmedAt : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update portfolio item' } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return {
      data: {
        id: data.id,
        title: data.title,
        eventType: data.event_type as unknown as PortfolioItem['eventType'],
        description: data.description,
        shootDate: data.shoot_date,
        coverImagePath: data.cover_image_path,
        videoUrl: data.video_url,
        tags: data.tags || [],
        sort: data.sort,
        isPublished: data.is_published,
        clientConsentConfirmedAt: data.client_consent_confirmed_at,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Publishes a portfolio item with mandatory client consent confirmation.
 * Strictly checks consent confirmation flag.
 */
export async function publishPortfolioItemAction(
  id: string,
  consentConfirmed: boolean
): Promise<ActionResult<{ success: boolean; publishedAt: string }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    if (!consentConfirmed) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Written or verified client consent is required before publishing to public showcase',
        },
      };
    }

    const now = new Date().toISOString();
    const supabase = await createClient();

    const { error } = await supabase
      .from('portfolio_items')
      .update({
        is_published: true,
        client_consent_confirmed_at: now,
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return { data: { success: true, publishedAt: now } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Unpublishes a portfolio item.
 */
export async function unpublishPortfolioItemAction(
  id: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('portfolio_items')
      .update({
        is_published: false,
      })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return { data: { success: true } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Deletes a portfolio item (soft delete).
 */
export async function deletePortfolioItemAction(
  id: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('portfolio_items')
      .update({
        deleted_at: new Date().toISOString(),
        is_published: false,
      })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return { data: { success: true } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Adds an image to a portfolio item.
 * Alt text is strictly validated (min 5 characters).
 */
export async function addPortfolioImageAction(
  itemId: string,
  input: PortfolioImageInput
): Promise<ActionResult<PortfolioImage>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const parsed = portfolioImageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid image data',
        },
      };
    }

    const { data: valid } = parsed;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('portfolio_images')
      .insert({
        item_id: itemId,
        storage_path: valid.storagePath,
        alt_text: valid.altText,
        width: valid.width ?? null,
        height: valid.height ?? null,
        sort: valid.sort ?? 0,
      })
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to add image' } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return {
      data: {
        id: data.id,
        itemId: data.item_id,
        storagePath: data.storage_path,
        altText: data.alt_text,
        width: data.width,
        height: data.height,
        sort: data.sort,
        createdAt: data.created_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Deletes a portfolio image.
 */
export async function deletePortfolioImageAction(
  imageId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'portfolio:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('portfolio_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/portfolio');
    revalidatePath('/crm/portfolio');

    return { data: { success: true } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}
