// ═══════════════════════════════════════════════════════
// Rate Limiter (In-Memory)
//
// NOTE: On Vercel serverless, each instance has its own
// memory. This limits per-instance abuse but won't catch
// distributed attacks. For production at scale, swap to:
//   - Vercel WAF rate limiting (Pro plan)
//   - Upstash Redis (@upstash/ratelimit)
//   - Cloudflare rate limiting
//
// This still prevents: form spam, brute force login from
// a single connection, and accidental client-side loops.
// ═══════════════════════════════════════════════════════

const stores = new Map();

function getStore(prefix) {
  if (!stores.has(prefix)) {
    stores.set(prefix, new Map());
  }
  return stores.get(prefix);
}

// Clean expired entries periodically
function cleanup(store, windowMs) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.start > windowMs) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (IP, user ID, etc.)
 * @param {object} options
 * @param {number} options.windowMs - Time window in ms
 * @param {number} options.max - Max requests per window
 * @param {string} options.prefix - Store namespace
 * @returns {{ limited: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, { windowMs = 60_000, max = 20, prefix = 'default' } = {}) {
  const store = getStore(prefix);
  const now = Date.now();

  // Periodic cleanup (every 100 calls)
  if (Math.random() < 0.01) cleanup(store, windowMs);

  const entry = store.get(key);

  if (!entry || now - entry.start > windowMs) {
    store.set(key, { count: 1, start: now });
    return { limited: false, remaining: max - 1, resetMs: windowMs };
  }

  entry.count++;

  if (entry.count > max) {
    return {
      limited: true,
      remaining: 0,
      resetMs: windowMs - (now - entry.start),
    };
  }

  return {
    limited: false,
    remaining: max - entry.count,
    resetMs: windowMs - (now - entry.start),
  };
}

/**
 * Get client IP from request
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check rate limit for a request — returns null if OK, error response if limited
 */
export function applyRateLimit(request, options = {}) {
  const ip = getClientIp(request);
  return checkRateLimit(ip, options);
}
