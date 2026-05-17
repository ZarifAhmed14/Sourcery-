import { createHash } from "node:crypto"
import { getEmbeddingModel, hasOpenAIEmbeddingsEnv } from "@/lib/env"

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>
  error?: { message?: string }
}

const EMBEDDING_DIMENSIONS = 1536

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest()
}

function tokenizeEmbeddingText(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 400)

  const features = [...tokens]
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`${tokens[index]}_${tokens[index + 1]}`)
  }
  return features
}

export function localHashEmbedding(text: string): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  const features = tokenizeEmbeddingText(text)

  for (const feature of features) {
    const hash = hashToken(feature)
    const dimension = hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS
    const sign = hash[4] % 2 === 0 ? 1 : -1
    vector[dimension] += sign
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / norm).toFixed(8)))
}

export async function embedQuery(query: string): Promise<number[] | null> {
  if (!hasOpenAIEmbeddingsEnv()) {
    return localHashEmbedding(query)
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: query,
    }),
  })

  const body = (await res.json().catch(() => ({}))) as OpenAIEmbeddingResponse
  if (!res.ok) {
    throw new Error(body.error?.message ?? `Embedding request failed (${res.status})`)
  }

  return body.data?.[0]?.embedding ?? null
}
