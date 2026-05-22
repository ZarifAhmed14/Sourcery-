import { generateText, Output } from "ai"
import type { ZodType } from "zod"
import {
  getAiGenerationProvider,
  getBargainAiProvider,
  getBargainModel,
  getGeminiApiKey,
  getGeminiModel,
  getGroqApiKey,
  getGroqModel,
  getPollinationsBaseUrl,
  getPollinationsModel,
  getReasoningModel,
  getSourceAiProvider,
} from "@/lib/env"

type PollinationsMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type PollinationsChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
    text?: string
  }>
  response?: string
  text?: string
  content?: string
  error?: {
    message?: string
  }
}

export type AiGenerationProvider = "ai_sdk" | "groq" | "gemini" | "pollinations" | "none"

export type StructuredGenerationResult<T> = {
  output: T
  provider: Exclude<AiGenerationProvider, "none">
}

export type TextGenerationResult = {
  text: string
  provider: Exclude<AiGenerationProvider, "none">
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf("{")
    const end = candidate.lastIndexOf("}")
    if (start === -1 || end === -1 || end <= start) throw new Error("Model response did not contain a JSON object")
    return JSON.parse(candidate.slice(start, end + 1))
  }
}

function parseStructuredResponse<T>(schema: ZodType<T>, text: string): T {
  return schema.parse(extractJsonObject(text))
}

async function callPollinations(messages: PollinationsMessage[], maxTokens: number): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    try {
      if (attempt > 0) await sleep(1500)

      const response = await fetch(`${getPollinationsBaseUrl().replace(/\/$/, "")}/openai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getPollinationsModel(),
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
          reasoning_effort: "low",
          private: true,
          referrer: "sourcery-buildfest-backend",
        }),
        signal: controller.signal,
      })

      const rawBody = await response.text()
      const body = tryParsePollinationsBody(rawBody)
      if (!response.ok) {
        const snippet = rawBody.trim().slice(0, 240)
        const message = body.error?.message ?? `Pollinations request failed (${response.status})${snippet ? `: ${snippet}` : ""}`
        lastError = new Error(message)
        if (response.status === 429 && attempt === 0) continue
        throw lastError
      }

      const text = firstNonEmpty(
        body.choices?.[0]?.message?.content,
        body.choices?.[0]?.text,
        body.response,
        body.text,
        body.content,
      )
      if (!text) {
        const snippet = rawBody.trim().slice(0, 240) || "<empty body>"
        throw new Error(`Pollinations returned no text. Raw body: ${snippet}`)
      }
      return text
    } catch (err) {
      lastError = err as Error
      if ((err as Error).name !== "AbortError" || attempt > 0) throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError ?? new Error("Pollinations request failed")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function tryParsePollinationsBody(rawBody: string): PollinationsChatResponse {
  try {
    return JSON.parse(rawBody) as PollinationsChatResponse
  } catch {
    return { text: rawBody }
  }
}

async function callGemini(args: {
  system?: string
  prompt: string
  maxTokens: number
  jsonMode?: boolean
}): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${encodeURIComponent(getGeminiApiKey())}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: args.system
          ? {
              parts: [{ text: args.system }],
            }
          : undefined,
        contents: [
          {
            role: "user",
            parts: [{ text: args.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: args.maxTokens,
          responseMimeType: args.jsonMode ? "application/json" : undefined,
        },
      }),
    },
  )

  const rawBody = await response.text()
  let body: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }

  try {
    body = JSON.parse(rawBody)
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawBody.slice(0, 240)}`)
  }

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Gemini request failed (${response.status})`)
  }

  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim()
  if (!text) throw new Error("Gemini returned no text")
  return text
}

async function callGroq(args: {
  system?: string
  prompt: string
  maxTokens: number
  responseFormat?:
    | {
        type: "json_object"
      }
    | {
        type: "json_schema"
        json_schema: {
          name: string
          strict?: boolean
          schema: Record<string, unknown>
        }
      }
}): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGroqModel(),
      messages: [
        ...(args.system ? [{ role: "system", content: args.system }] : []),
        { role: "user", content: args.prompt },
      ],
      temperature: 0.2,
      max_tokens: args.maxTokens,
      response_format: args.responseFormat,
    }),
  })

  const rawBody = await response.text()
  let body: {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  try {
    body = JSON.parse(rawBody)
  } catch {
    throw new Error(`Groq returned non-JSON response: ${rawBody.slice(0, 240)}`)
  }

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Groq request failed (${response.status})`)
  }

  const text = body.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error("Groq returned no text")
  return text
}

export async function generateStructuredObject<T>(args: {
  schema: ZodType<T>
  system: string
  prompt: string
  maxOutputTokens: number
  providerOverride?: AiGenerationProvider
  jsonSchema?: {
    name: string
    strict?: boolean
    schema: Record<string, unknown>
  }
}): Promise<StructuredGenerationResult<T>> {
  const provider = args.providerOverride ?? getSourceAiProvider()

  if (provider === "none") {
    throw new Error("AI generation provider is disabled")
  }

  if (provider === "ai_sdk") {
    const { output } = await generateText({
      model: getReasoningModel(),
      system: args.system,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
      output: Output.object({ schema: args.schema }),
    })
    if (!output) throw new Error("AI SDK returned no structured output")
    return { output: output as T, provider }
  }

  if (provider === "gemini") {
    const text = await callGemini({
      system: `${args.system}\n\nReturn strict JSON only. Do not include markdown, prose, comments, or code fences.`,
      prompt: args.prompt,
      maxTokens: args.maxOutputTokens,
      jsonMode: true,
    })
    try {
      return { output: parseStructuredResponse(args.schema, text), provider }
    } catch (err) {
      const repairedText = await callGemini({
        system: `${args.system}\n\nRepair invalid JSON into one valid JSON object only. Do not add markdown or commentary.`,
        prompt: [
          "The previous response failed JSON parsing or schema validation.",
          `Validation error: ${(err as Error).message}`,
          "Repair this response into one valid JSON object that follows the requested schema exactly:",
          text,
        ].join("\n\n"),
        maxTokens: args.maxOutputTokens,
        jsonMode: true,
      })
      return { output: parseStructuredResponse(args.schema, repairedText), provider }
    }
  }

  if (provider === "groq") {
    const text = await callGroq({
      system: `${args.system}\n\nReturn strict JSON only. Do not include markdown, prose, comments, or code fences.`,
      prompt: args.prompt,
      maxTokens: args.maxOutputTokens,
      responseFormat: args.jsonSchema
        ? {
            type: "json_schema",
            json_schema: {
              name: args.jsonSchema.name,
              strict: args.jsonSchema.strict ?? true,
              schema: args.jsonSchema.schema,
            },
          }
        : { type: "json_object" },
    })
    return { output: parseStructuredResponse(args.schema, text), provider }
  }

  const messages: PollinationsMessage[] = [
    {
      role: "system",
      content: `${args.system}\n\nReturn strict JSON only. Do not include markdown, prose, comments, or code fences.`,
    },
    {
      role: "user",
      content: args.prompt,
    },
  ]

  const text = await callPollinations(messages, args.maxOutputTokens)
  try {
    return { output: parseStructuredResponse(args.schema, text), provider }
  } catch (err) {
    const repairText = await callPollinations(
      [
        ...messages,
        {
          role: "assistant",
          content: text,
        },
        {
          role: "user",
          content: [
            `The previous response failed JSON parsing or schema validation: ${(err as Error).message}`,
            "Repair it into one valid JSON object that follows the requested response shape exactly.",
            "Return JSON only.",
          ].join("\n"),
        },
      ],
      args.maxOutputTokens,
    )
    return { output: parseStructuredResponse(args.schema, repairText), provider }
  }
}

export async function generatePlainText(args: {
  prompt: string
  maxOutputTokens: number
  providerOverride?: AiGenerationProvider
}): Promise<TextGenerationResult> {
  const provider = args.providerOverride ?? getBargainAiProvider()
  if (provider === "none") throw new Error("AI generation provider is disabled")

  if (provider === "ai_sdk") {
    const result = await generateText({
      model: getBargainModel(),
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
    })
    return { text: result.text.trim(), provider }
  }

  if (provider === "gemini") {
    const text = await callGemini({
      prompt: args.prompt,
      maxTokens: args.maxOutputTokens,
    })
    return { text: text.trim(), provider }
  }

  if (provider === "groq") {
    const text = await callGroq({
      prompt: args.prompt,
      maxTokens: args.maxOutputTokens,
    })
    return { text: text.trim(), provider }
  }

  const text = await callPollinations(
    [
      {
        role: "user",
        content: args.prompt,
      },
    ],
    args.maxOutputTokens,
  )

  return { text: text.trim(), provider }
}
