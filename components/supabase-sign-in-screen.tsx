"use client"

import { FormEvent, useMemo, useState } from "react"
import { Plane, Loader2, AlertCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

export function SupabaseSignInScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { supabase, configError } = useMemo(() => {
    try {
      return { supabase: getSupabaseBrowserClient(), configError: null as string | null }
    } catch (err) {
      return {
        supabase: null,
        configError: err instanceof Error ? err.message : "Supabase client not configured",
      }
    }
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase || loading) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (!data.session) {
        setError("Sign-in succeeded but no session was returned. Check your Supabase auth settings.")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected sign-in error"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Plane className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">Jetvision Portal</h1>
          <p className="text-sm text-primary-foreground/60">Private aviation management platform</p>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-card-foreground">Sign in with Supabase</h2>
          <p className="mb-6 text-sm text-muted-foreground">Authenticate to continue to account selection</p>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-card-foreground">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-card-foreground">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {(error || configError) && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error || configError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !supabase}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/40">
          Jetvision Group &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  )
}
