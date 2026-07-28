import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from "./constants";

/**
 * In-memory, per-IP sliding window rate limiter.
 *
 * Honest limitation: this state lives in module scope, which means it only
 * persists for the lifetime of one warm serverless instance. A cold start
 * (or Vercel routing a request to a different instance under concurrent
 * load) resets the counter. This is NOT a distributed guarantee — it will
 * not stop a determined, distributed abuser.
 *
 * What it DOES do: catch runaway loops from a client bug, and casual
 * scripted hammering from a single warm instance. For a hard guarantee
 * you'd need shared state (Vercel KV, Upstash Redis) — which is exactly the
 * "external service" this project was scoped to avoid. If you ever want
 * that upgrade, this function's signature is the only thing call sites
 * depend on, so swapping the implementation is a one-file change.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Bounded cleanup so this map can't grow forever across a long-lived warm instance.
  if (hits.size > 500) {
    for (const [k, timestamps] of hits) {
      const fresh = timestamps.filter((t) => t > windowStart);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
  }

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    hits.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - timestamps.length };
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return "unknown";
}
