import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

/**
 * Service-role Supabase client.
 *
 * NON-NEGOTIABLE SECURITY RULES (Decision D-12):
 * - Allowed ONLY in:
 *   1. System Administrator user operations & bootstrap
 *   2. Invitations and password reset link generation
 *   3. Token pages (/review/[token], /delivery/[token])
 *   4. Public enquiry form inserts (after validation, Turnstile, rate limit)
 *   5. Vercel Cron background maintenance jobs
 *   6. PDF generation / storage administration
 *   7. Token encryption / rotation paths
 * - NEVER use in proxy.ts / middleware.
 * - NEVER import or execute in Client Components.
 * - NEVER use to read or write data on behalf of ordinary user pages.
 */

let adminClientInstance: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.'
    );
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClientInstance;
}
