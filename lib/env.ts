import { z } from 'zod';

export const envSchema = z.object({
  // Public
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').default('http://localhost:3000'),
  NEXT_PUBLIC_APP_MODE: z.enum(['production', 'demo']).default('production'),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional().default(''),

  // Server only
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  APP_MODE: z.enum(['production', 'demo']).default('production'),
  ALLOWED_SUPABASE_PROJECT_REF: z.string().optional().default(''),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((val) => !val || /^[0-9a-fA-F]{64}$/.test(val), {
      message: 'GOOGLE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    })
    .optional()
    .default(''),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),
  TURNSTILE_SECRET_KEY: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Extracts the project ref from a Supabase URL (e.g. "https://xyzcompany.supabase.co" -> "xyzcompany").
 */
export function extractSupabaseProjectRef(url: string): string {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length >= 3 && hostParts[1] === 'supabase' && hostParts[2] === 'co') {
      return hostParts[0];
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Validates environment variables and enforces the Decision D-32 Boot Guard.
 * Fails fast on startup if configuration is invalid or if project ref mismatch occurs.
 */
export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`[BOOT GUARD] Missing or invalid environment variables:\n${errorDetails}`);
  }

  const env = result.data;

  // Enforce Decision D-32 Boot Guard:
  // Refuse to start if ALLOWED_SUPABASE_PROJECT_REF is configured and does not match the connected Supabase URL
  assertRuntimeBootGuard(rawEnv);

  return env;
}

/**
 * Runtime-safe Decision D-32 Boot Guard.
 * Can be called inside proxy.ts or server entrypoints without failing static Next.js builds
 * where non-public env vars are intentionally absent.
 */
export function assertRuntimeBootGuard(rawEnv: Record<string, string | undefined> = process.env): void {
  const allowedRef = rawEnv.ALLOWED_SUPABASE_PROJECT_REF;
  const supabaseUrl = rawEnv.NEXT_PUBLIC_SUPABASE_URL;

  if (allowedRef && supabaseUrl) {
    const connectedRef = extractSupabaseProjectRef(supabaseUrl);
    if (connectedRef && connectedRef !== allowedRef) {
      throw new Error(
        `[BOOT GUARD FATAL] Supabase project mismatch! Connected ref "${connectedRef}" does not match ALLOWED_SUPABASE_PROJECT_REF "${allowedRef}". Halting for safety.`
      );
    }
  }

  // Prevent split-brain production/demo configuration
  const serverMode = rawEnv.APP_MODE;
  const publicMode = rawEnv.NEXT_PUBLIC_APP_MODE;
  if (serverMode && publicMode && serverMode !== publicMode) {
    throw new Error(
      `[BOOT GUARD FATAL] Mode mismatch! APP_MODE ("${serverMode}") disagrees with NEXT_PUBLIC_APP_MODE ("${publicMode}").`
    );
  }
}

/**
 * Returns true ONLY when Demo Mode is explicitly verified on both server and client
 * and matches ALLOWED_SUPABASE_PROJECT_REF if configured (Decision D-32).
 */
export function isDemoModeVerified(rawEnv: Record<string, string | undefined> = process.env): boolean {
  if (rawEnv.APP_MODE !== 'demo' || rawEnv.NEXT_PUBLIC_APP_MODE !== 'demo') {
    return false;
  }

  const allowedRef = rawEnv.ALLOWED_SUPABASE_PROJECT_REF;
  const supabaseUrl = rawEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (allowedRef && supabaseUrl) {
    const connectedRef = extractSupabaseProjectRef(supabaseUrl);
    if (connectedRef && connectedRef !== allowedRef) {
      return false;
    }
  }

  return true;
}
