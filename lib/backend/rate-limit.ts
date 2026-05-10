type Bucket = {
  tokens: number
  updatedAt: number
}

export type RateLimitPolicy = {
  capacity: number
  refillTokens: number
  refillMs: number
}

const buckets = new Map<string, Bucket>()

function nowMs() {
  return Date.now()
}

export function checkRateLimit(key: string, policy: RateLimitPolicy): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = nowMs()
  const bucket = buckets.get(key) ?? { tokens: policy.capacity, updatedAt: now }
  const elapsed = now - bucket.updatedAt
  const refill = Math.floor(elapsed / policy.refillMs) * policy.refillTokens
  const tokens = Math.min(policy.capacity, bucket.tokens + refill)
  const updatedAt = refill > 0 ? now : bucket.updatedAt

  if (tokens <= 0) {
    buckets.set(key, { tokens, updatedAt })
    const retryAfter = Math.max(1, Math.ceil((policy.refillMs - (elapsed % policy.refillMs)) / 1000))
    return { allowed: false, retryAfter }
  }

  buckets.set(key, { tokens: tokens - 1, updatedAt })
  return { allowed: true }
}

export const SOURCE_RATE_LIMIT: RateLimitPolicy = {
  capacity: 40,
  refillTokens: 20,
  refillMs: 60_000,
}

export const BARGAIN_RATE_LIMIT: RateLimitPolicy = {
  capacity: 12,
  refillTokens: 3,
  refillMs: 60_000,
}
