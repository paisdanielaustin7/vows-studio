import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory fallback store for local development and test environments
class InMemoryRateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async limit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
    }

    if (entry.count >= limit) {
      return { success: false, limit, remaining: 0, reset: entry.resetAt };
    }

    entry.count += 1;
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetAt,
    };
  }
}

const memoryStore = new InMemoryRateLimiter();

function getRedisInstance(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && !url.includes('example.com')) {
    try {
      return new Redis({ url, token });
    } catch {
      return null;
    }
  }
  return null;
}

export type RateLimitTier =
  | 'login'
  | 'password_reset'
  | 'public_api'
  | 'public_form'
  | 'authenticated'
  | 'pdf_generation'
  | 'email_send'
  | 'token_pages';

interface TierConfig {
  limit: number;
  windowSeconds: number;
  upstashWindow: '1 m' | '15 m' | '1 h';
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  // 10 per 15 min per IP
  login: { limit: 10, windowSeconds: 900, upstashWindow: '15 m' },
  // 5 per hour per IP/email
  password_reset: { limit: 5, windowSeconds: 3600, upstashWindow: '1 h' },
  // 60 per minute per IP
  public_api: { limit: 60, windowSeconds: 60, upstashWindow: '1 m' },
  // 5 per hour per IP
  public_form: { limit: 5, windowSeconds: 3600, upstashWindow: '1 h' },
  // 300 per minute per user
  authenticated: { limit: 300, windowSeconds: 60, upstashWindow: '1 m' },
  // 10 per minute per user
  pdf_generation: { limit: 10, windowSeconds: 60, upstashWindow: '1 m' },
  // 20 per hour per user
  email_send: { limit: 20, windowSeconds: 3600, upstashWindow: '1 h' },
  // 30 per minute per IP
  token_pages: { limit: 30, windowSeconds: 60, upstashWindow: '1 m' },
};

/**
 * Check rate limit for a specific tier and identifier (IP or User ID)
 */
export async function checkRateLimit(
  tier: RateLimitTier,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const config = TIER_CONFIGS[tier];
  const redis = getRedisInstance();

  if (!redis) {
    // In-memory fallback
    return memoryStore.limit(
      `${tier}:${identifier}`,
      config.limit,
      config.windowSeconds * 1000
    );
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, config.upstashWindow),
    analytics: false,
    prefix: `ratelimit:${tier}`,
  });

  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Cloudflare Turnstile token validation helper
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; errorCodes?: string[] }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In test or local dev without secret key, accept test tokens
  if (!secretKey || secretKey.startsWith('1x0000000000000000000000000000000AA')) {
    if (token === 'test-token-pass' || process.env.APP_MODE === 'demo' || !secretKey) {
      return { success: true };
    }
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey || '');
  formData.append('response', token);
  if (remoteIp) {
    formData.append('remoteip', remoteIp);
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    return {
      success: data.success,
      errorCodes: data['error-codes'],
    };
  } catch {
    return {
      success: false,
      errorCodes: ['internal-verification-error'],
    };
  }
}
