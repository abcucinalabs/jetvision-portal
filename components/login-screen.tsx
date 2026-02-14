"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Plane, ChevronRight } from "lucide-react"

export function LoginScreen() {
  const { users, login } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Plane className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">
            JetStream Portal
          </h1>
          <p className="text-sm text-primary-foreground/60">
            Private aviation management platform
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-card-foreground">Sign in</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Select your account to continue
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-primary-foreground/40">
          JetStream Aviation &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  )
}
