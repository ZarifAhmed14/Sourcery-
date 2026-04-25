// Server-side AI response cache backed by the public.ai_cache table.
// Every orchestrator call hashes its inputs and looks up a cached response first;
// this is the single biggest cost-saver — we never re-pay Opus for an identical query.

import { createClient } from "@/lib/supabase/server"
import { createHash } from "node:crypto"

// Build a stable cache key from the orchestrator inputs.
// We include all variables that affect the LLM output (query + bangladeshMode + topK).
export function buildCacheKey(args: { query: string; bangladeshMode: boolean; topK: number }): string {
  // Normalize the query (trim + lowercase) so trivial variations hit the same cache row.
  const normalized = args.query.trim().toLowerCase().replace(/\s+/g, " ")
  // Concatenate the key inputs with a delimiter that won't appear in the values.
  const raw = `${normalized}::bd=${args.bangladeshMode ? 1 : 0}::k=${args.topK}`
  // SHA-256 keeps the key short and collision-resistant.
  return createHash("sha256").update(raw).digest("hex")
}

// Look up a cached response. Returns null on miss or if the row has expired.
export async function getCached<T = unknown>(key: string): Promise<T | null> {
  // Server Supabase client — anon key is fine since ai_cache has a public_read policy.
  const supabase = await createClient()
  // Query for the cache row.
  const { data, error } = await supabase.from("ai_cache").select("response, expires_at").eq("cache_key", key).maybeSingle()
  // Treat missing rows as cache miss (no error thrown).
  if (error || !data) return null
  // Reject expired rows so stale Opus output doesn't leak through.
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  // Return the parsed JSON response.
  return data.response as T
}

// Persist a fresh response with a 24h TTL.
export async function setCached<T = unknown>(key: string, value: T, ttlSeconds = 60 * 60 * 24): Promise<void> {
  // Server Supabase client.
  const supabase = await createClient()
  // Compute the absolute expiry timestamp.
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  // Upsert by primary key so identical-key writes overwrite older entries.
  const { error } = await supabase
    .from("ai_cache")
    .upsert({ cache_key: key, response: value as object, expires_at }, { onConflict: "cache_key" })
  // Cache write failures are non-fatal — log and continue.
  if (error) console.log("[v0] ai_cache upsert error:", error.message)
}
