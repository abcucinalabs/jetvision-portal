"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Plane, ChevronRight, LogOut } from "lucide-react"

export function LoginScreen() {
  const { users, login } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const handleSupabaseSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Plane className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">
            Jetvision Portal
          </h1>
          <p className="text-sm text-primary-foreground/60">
            Private aviation management platform
          </p>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-card-foreground">Select account</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            You are authenticated. Choose an internal portal role to continue.
          </p>

          <div className="flex flex-col gap-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedId(user.id)}
                className={`group flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedId === user.id
                    ? "border-accent bg-accent/10 ring-2 ring-accent"
                    : "border-border bg-card hover:border-accent/40 hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    user.role === "manager"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {user.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-card-foreground">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.role === "manager" ? "Manager" : "ISO"} &middot; {user.email}
                  </div>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    user.role === "manager"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  {user.role === "manager" ? "MGR" : "ISO"}
                </span>
              </button>
            ))}
          </div>

          <button
            disabled={!selectedId}
            onClick={() => selectedId && login(selectedId)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to portal
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleSupabaseSignOut}
            disabled={signingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign out of Supabase"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/40">
          Jetvision Aviation &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  )
}
