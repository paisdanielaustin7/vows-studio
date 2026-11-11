'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import {
  faqItemSchema,
  updateSiteContentSchema,
  updateSitePageSeoSchema,
  FaqItemInput,
  UpdateSiteContentInput,
  UpdateSitePageSeoInput,
} from '@/lib/validations/portfolio.schema';
import { ActionResult } from '@/types/auth';
import { FaqItem, SitePageSeo } from '@/types/portfolio';
import { revalidatePath } from 'next/cache';

/**
 * Reads site content by key.
 */
export async function getSiteContentAction(
  key: string
): Promise<ActionResult<{ key: string; value: Record<string, unknown> }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', key)
      .single();

    if (error || !data) {
      return { error: { code: 'NOT_FOUND', message: 'Site content not found' } };
    }

    return {
      data: {
        key: data.key,
        value: data.value as Record<string, unknown>,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Updates site content by key (SA/BO only).
 */
export async function updateSiteContentAction(
  input: UpdateSiteContentInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const parsed = updateSiteContentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid site content',
        },
      };
    }

    const { key, value } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase
      .from('site_content')
      .upsert({
        key,
        value: value as any,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/', 'layout');
    return { data: { success: true } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Lists FAQ items.
 */
export async function listFaqItemsAction(
  publishedOnly = false
): Promise<ActionResult<FaqItem[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('faq_items')
      .select('*')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const items: FaqItem[] = (data || []).map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      sort: row.sort,
      isPublished: row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: items };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Creates an FAQ item (SA/BO only).
 */
export async function createFaqItemAction(
  input: FaqItemInput
): Promise<ActionResult<FaqItem>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const parsed = faqItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid FAQ item',
        },
      };
    }

    const { data: valid } = parsed;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('faq_items')
      .insert({
        question: valid.question,
        answer: valid.answer,
        sort: valid.sort ?? 0,
        is_published: valid.isPublished ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create FAQ item' } };
    }

    revalidatePath('/faq');
    return {
      data: {
        id: data.id,
        question: data.question,
        answer: data.answer,
        sort: data.sort,
        isPublished: data.is_published,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Updates an FAQ item.
 */
export async function updateFaqItemAction(
  id: string,
  input: Partial<FaqItemInput>
): Promise<ActionResult<FaqItem>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('faq_items')
      .update({
        ...(input.question !== undefined ? { question: input.question } : {}),
        ...(input.answer !== undefined ? { answer: input.answer } : {}),
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
        ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update FAQ item' } };
    }

    revalidatePath('/faq');
    return {
      data: {
        id: data.id,
        question: data.question,
        answer: data.answer,
        sort: data.sort,
        isPublished: data.is_published,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Deletes an FAQ item.
 */
export async function deleteFaqItemAction(
  id: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const supabase = await createClient();
    const { error } = await supabase.from('faq_items').delete().eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/faq');
    return { data: { success: true } };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Reads SEO metadata for a page.
 */
export async function getSitePageSeoAction(
  pageKey: string
): Promise<ActionResult<SitePageSeo>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_page_seo')
      .select('*')
      .eq('page_key', pageKey)
      .single();

    if (error || !data) {
      return { error: { code: 'NOT_FOUND', message: 'SEO data not found' } };
    }

    return {
      data: {
        pageKey: data.page_key,
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        ogImagePath: data.og_image_path,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}

/**
 * Updates SEO metadata for a page (SA/BO only).
 */
export async function updateSitePageSeoAction(
  input: UpdateSitePageSeoInput
): Promise<ActionResult<SitePageSeo>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'business_settings:update');

    const parsed = updateSitePageSeoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid SEO data',
        },
      };
    }

    const { pageKey, metaTitle, metaDescription, ogImagePath } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_page_seo')
      .upsert({
        page_key: pageKey,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        og_image_path: ogImagePath || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update SEO' } };
    }

    revalidatePath(pageKey);
    return {
      data: {
        pageKey: data.page_key,
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        ogImagePath: data.og_image_path,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { error: { code: 'INTERNAL_ERROR', message: (err as Error).message } };
  }
}
