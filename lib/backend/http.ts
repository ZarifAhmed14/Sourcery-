import { NextResponse } from "next/server"
import { z } from "zod"

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFIGURATION_ERROR"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR"

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return req.headers.get("x-real-ip") ?? "unknown"
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({}))
}

export function parseJson<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
    throw new ApiRequestError("BAD_REQUEST", message, 400)
  }
  return parsed.data
}

export class ApiRequestError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 500,
  ) {
    super(message)
  }
}

export function okJson<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function errorJson(code: ApiErrorCode, message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: process.env.NODE_ENV === "production" ? undefined : details,
      },
    },
    { status },
  )
}

export function handleApiError(err: unknown, fallback = "Request failed.") {
  if (err instanceof ApiRequestError) {
    return errorJson(err.code, err.message, err.status)
  }
  const message = err instanceof Error ? err.message : fallback
  console.log("[sourcery] api error:", message)
  return errorJson("INTERNAL_ERROR", fallback, 500)
}
