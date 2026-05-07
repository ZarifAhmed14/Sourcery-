type PublicSupabaseEnv = {
  url: string
  anonKey: string
}

type ServiceSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string
}

function readEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function readAnyEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = readEnv(name)
    if (value) return value
  }
  return null
}

function requireEnv(name: string): string {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    readAnyEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") &&
      readAnyEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
  )
}

export function hasServiceSupabaseEnv(): boolean {
  return Boolean(hasPublicSupabaseEnv() && readEnv("SUPABASE_SERVICE_ROLE_KEY"))
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = readAnyEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL")
  const anonKey = readAnyEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY")
  if (!url) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL")
  if (!anonKey) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY")

  return {
    url,
    anonKey,
  }
}

export function getServiceSupabaseEnv(): ServiceSupabaseEnv {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}

export function hasOpenAIEmbeddingsEnv(): boolean {
  return Boolean(readEnv("OPENAI_API_KEY"))
}

export function getEmbeddingProvider(): "openai" | "local_hash" {
  return hasOpenAIEmbeddingsEnv() ? "openai" : "local_hash"
}

export function isAiDisabled(): boolean {
  return readEnv("AI_DISABLE_LLM") === "1"
}

export function hasPaidAiGenerationEnv(): boolean {
  return Boolean(
    readEnv("VERCEL_OIDC_TOKEN") ||
      readEnv("AI_GATEWAY_API_KEY") ||
      readEnv("OPENAI_API_KEY") ||
      readEnv("ANTHROPIC_API_KEY"),
  )
}

export function getFreeAiProvider(): "pollinations" | "none" {
  const provider = readEnv("AI_FREE_PROVIDER")
  if (provider === "none" || readEnv("AI_DISABLE_FREE_PROVIDER") === "1") return "none"
  return "pollinations"
}

export function getAiGenerationProvider(): "ai_sdk" | "pollinations" | "none" {
  if (isAiDisabled()) return "none"
  if (hasPaidAiGenerationEnv()) return "ai_sdk"
  return getFreeAiProvider()
}

export function isFreeSourceAiEnabled(): boolean {
  return readEnv("AI_ENABLE_FREE_SOURCE_AI") === "1"
}

export function hasAiGenerationEnv(): boolean {
  return getAiGenerationProvider() !== "none"
}

export function getReasoningModel(): string {
  return readEnv("AI_REASONING_MODEL") ?? "openai/gpt-5-mini"
}

export function getBargainModel(): string {
  return readEnv("AI_BARGAIN_MODEL") ?? "openai/gpt-5-mini"
}

export function getEmbeddingModel(): string {
  return readEnv("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small"
}

export function getPollinationsModel(): string {
  return readEnv("POLLINATIONS_MODEL") ?? "openai-fast"
}

export function getPollinationsBaseUrl(): string {
  return readEnv("POLLINATIONS_BASE_URL") ?? "https://text.pollinations.ai"
}

export function publicRuntimeStatus() {
  const generationProvider = getAiGenerationProvider()
  return {
    supabase: hasPublicSupabaseEnv(),
    serviceRole: hasServiceSupabaseEnv(),
    aiGeneration: generationProvider !== "none",
    aiGenerationProvider: generationProvider,
    embeddings: true,
    embeddingProvider: getEmbeddingProvider(),
    reasoningModel: getReasoningModel(),
    embeddingModel: getEmbeddingModel(),
    freeProvider: getFreeAiProvider(),
    pollinationsModel: generationProvider === "pollinations" ? getPollinationsModel() : null,
  }
}
