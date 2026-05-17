import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServiceSupabaseEnv, hasServiceSupabaseEnv } from "@/lib/env"

let adminClient: SupabaseClient | null = null

export function isAdminSupabaseConfigured(): boolean {
  return hasServiceSupabaseEnv()
}

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const env = getServiceSupabaseEnv()
    adminClient = createSupabaseClient(env.url, env.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "x-application-name": "sourcery-buildfest-backend",
        },
      },
    })
  }
  return adminClient
}
