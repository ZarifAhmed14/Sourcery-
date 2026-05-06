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

function requireEnv(name: string): string {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
}

export function hasServiceSupabaseEnv(): boolean {
  return Boolean(hasPublicSupabaseEnv() && readEnv("SUPABASE_SERVICE_ROLE_KEY"))
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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

export function hasAiGenerationEnv(): boolean {
  return Boolean(
    readEnv("VERCEL_OIDC_TOKEN") ||
      readEnv("AI_GATEWAY_API_KEY") ||
      readEnv("OPENAI_API_KEY") ||
      readEnv("ANTHROPIC_API_KEY"),
  )
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

export function isAiDisabled(): boolean {
  return readEnv("AI_DISABLE_LLM") === "1"
}

export function publicRuntimeStatus() {
  return {
    supabase: hasPublicSupabaseEnv(),
    serviceRole: hasServiceSupabaseEnv(),
    aiGeneration: hasAiGenerationEnv() && !isAiDisabled(),
    embeddings: true,
    embeddingProvider: getEmbeddingProvider(),
    reasoningModel: getReasoningModel(),
    embeddingModel: getEmbeddingModel(),
  }
}
