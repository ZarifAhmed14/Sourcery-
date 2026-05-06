import { createHash } from "node:crypto"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"

type MemoryCacheValue = {
  response: unknown
  expiresAt: number
}

const memoryCache = new Map<string, MemoryCacheValue>()

export function buildCacheKey(args: { query: string; bangladeshMode: boolean; topK: number; version?: string }): string {
  const normalized = args.query.trim().toLowerCase().replace(/\s+/g, " ")
  const raw = `${args.version ?? "source-v2"}::${normalized}::bd=${args.bangladeshMode ? 1 : 0}::k=${args.topK}`
  return createHash("sha256").update(raw).digest("hex")
}

export async function getCached<T = unknown>(key: string): Promise<T | null> {
  const memory = memoryCache.get(key)
  if (memory) {
    if (memory.expiresAt > Date.now()) return memory.response as T
    memoryCache.delete(key)
  }

  if (!isAdminSupabaseConfigured()) return null

  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from("ai_cache")
      .select("response, expires_at")
      .eq("cache_key", key)
      .maybeSingle()

    if (error || !data) return null
    if (new Date(data.expires_at).getTime() < Date.now()) return null
    return data.response as T
  } catch (err) {
    console.log("[sourcery] cache read skipped:", (err as Error).message)
    return null
  }
}

export async function setCached<T = unknown>(key: string, value: T, ttlSeconds = 60 * 60 * 24): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000
  memoryCache.set(key, { response: value, expiresAt })

  if (!isAdminSupabaseConfigured()) return

  try {
    const supabase = getAdminClient()
    const { error } = await supabase.from("ai_cache").upsert(
      {
        cache_key: key,
        response: value as object,
        expires_at: new Date(expiresAt).toISOString(),
      },
      { onConflict: "cache_key" },
    )
    if (error) console.log("[sourcery] cache upsert skipped:", error.message)
  } catch (err) {
    console.log("[sourcery] cache write skipped:", (err as Error).message)
  }
}
