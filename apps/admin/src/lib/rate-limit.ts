/**
 * SURV-002 fixed-window rate limiter (per-IP, in-memory).
 *
 * A simple, dependency-free sliding window. This is per-instance state: on a
 * single Vercel lambda or local dev it is correct; at scale, multiple
 * instances each enforce their own budget. The DB idempotency key remains
 * the authoritative duplicate guard regardless of instance count.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

/** Default: 10 submissions per 15 minutes per IP. */
export const DEFAULT_LIMIT = 10;
export const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export function rateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return { allowed: true, remaining: Math.max(0, limit - bucket.count) };
}

/** Test hook: clear all buckets. */
export function resetRateLimiter(): void {
  buckets.clear();
}
