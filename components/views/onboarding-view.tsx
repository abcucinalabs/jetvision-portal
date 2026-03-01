"use client"

import { useMemo } from "react"
import { CheckCircle2, GraduationCap, LogOut, PlayCircle } from "lucide-react"
import { useStore } from "@/lib/store"

export function OnboardingView() {
  const {
    currentUser,
    beginUserOnboarding,
    completeUserOnboarding,
    logout,
  } = useStore()

  const status = currentUser?.onboardingStatus ?? "not_started"
  const hasStarted = status === "in_progress" || status === "complete"
  const canComplete = status === "in_progress"

  const tasks = useMemo(
    () => [
      {
        label: "Review Jetvision workflow overview",
        done: hasStarted,
      },
      {
        label: "Complete illustrative training checklist",
        done: canComplete || status === "complete",
      },
      {
        label: "Unlock portal dashboard access",
        done: status === "complete",
      },
    ],
    [canComplete, hasStarted, status]
  )

  if (!currentUser) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              Illustrative Onboarding
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Training required before dashboard access
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {currentUser.name} has been added with {currentUser.role === "manager" ? "Manager" : "ISO"} view access.
                Complete the training steps below to unlock the portal dashboard. This workflow is for illustrative purposes only.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {tasks.map((task) => (
            <div key={task.label} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${task.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">{task.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-background p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Training Controls
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start training to move this user into onboarding, then complete training to unlock dashboard access.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => beginUserOnboarding(currentUser.id)}
              disabled={hasStarted}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlayCircle className="h-4 w-4" />
              Start Training
            </button>
            <button
              type="button"
              onClick={() => completeUserOnboarding(currentUser.id)}
              disabled={!canComplete}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Training and Enter Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
