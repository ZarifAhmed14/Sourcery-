// Login page for Sourcery — Supabase email + password auth.
// Stays consistent with the editorial / cream-and-ink visual language used on the marketing site.
"use client"

// Browser-side Supabase client (singleton) — used only for auth, not for direct DB writes.
import { createClient } from "@/lib/supabase/client"
// shadcn primitives — already installed in the project.
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Next.js link + router for navigation after a successful sign-in.
import Link from "next/link"
import { useRouter } from "next/navigation"
// React state hooks for the controlled form fields and loading/error UI.
import { useState } from "react"

// Default export — the route renders this client component.
export default function LoginPage() {
  // Controlled email input state.
  const [email, setEmail] = useState("")
  // Controlled password input state.
  const [password, setPassword] = useState("")
  // Surface any auth errors back to the user (wrong password, missing user, etc.).
  const [error, setError] = useState<string | null>(null)
  // Disable the submit button while the request is in flight.
  const [isLoading, setIsLoading] = useState(false)
  // Router lets us redirect into the authenticated app after a successful login.
  const router = useRouter()

  // Handle the sign-in form submit — uses Supabase password auth.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      // signInWithPassword does NOT take an emailRedirectTo — that's only for signUp/OAuth.
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Route into the agent dashboard after a successful login.
      router.push("/app/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // Full-viewport centered layout with the cream background inherited from globals.css.
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Sourcery wordmark above the card so users see brand context. */}
          <Link href="/" className="text-center font-serif text-3xl italic tracking-tight">
            Sourcery
          </Link>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to access your sourcing runs.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@brand.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {/* Inline error message shown only when an auth error occurred. */}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in…" : "Sign in"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {"Don't have an account? "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4 text-foreground">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
