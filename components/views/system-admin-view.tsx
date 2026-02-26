"use client"

import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/lib/store"
import { formatDistanceToNow } from "date-fns"
import { Activity, Bell, Database, Globe, PlaneTakeoff } from "lucide-react"

type HealthStatus = "healthy" | "degraded" | "down"

type OverviewCheck = {
  id: string
  name: string
  status: HealthStatus
  detail: string
  latencyMs?: number
  timestamp: string
}

type HealthOverview = {
  overall: HealthStatus
  checkedAt: string
  checks: OverviewCheck[]
}

type AdminLogItem = {
  id: string
  timestamp: string
  category: "avinode" | "notification" | "request"
  title: string
  detail: string
}

export function SystemAdminView() {
  const { currentUser, avinodeConnected, avinodeActivity, notifications, flightRequests } = useStore()
  const [healthOverview, setHealthOverview] = useState<HealthOverview | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  if (!currentUser || currentUser.role !== "manager") return null

  useEffect(() => {
    let cancelled = false

    const loadOverview = async () => {
      try {
        if (!cancelled) {
          setHealthLoading(true)
          setHealthError(null)
        }

        const res = await fetch("/api/health/overview", { cache: "no-store" })
        const json = (await res.json().catch(() => null)) as HealthOverview | null
        if (cancelled) return

        if (!res.ok || !json) {
          setHealthError(`Health overview failed (${res.status})`)
          return
        }

        setHealthOverview(json)
      } catch (error) {
        if (!cancelled) {
          setHealthError(error instanceof Error ? error.message : "Unknown health overview error")
        }
      } finally {
        if (!cancelled) setHealthLoading(false)
      }
    }

    void loadOverview()
    const interval = setInterval(() => {
      void loadOverview()
    }, 60000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const avinodeCheck = healthOverview?.checks.find((c) => c.id === "avinode_connectivity")
  const supabaseCheck = healthOverview?.checks.find((c) => c.id === "supabase_connectivity")

  const logs = useMemo<AdminLogItem[]>(() => {
    const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000
    const cutoff = Date.now() - RECENT_WINDOW_MS

    const avinodeLogs: AdminLogItem[] = avinodeActivity.map((item) => ({
      id: `avinode-${item.id}`,
      timestamp: item.timestamp,
      category: "avinode",
      title: item.title,
      detail: item.description,
    }))

    const notificationLogs: AdminLogItem[] = notifications.map((item) => ({
      id: `notification-${item.id}`,
      timestamp: item.createdAt,
      category: "notification",
      title: item.title,
      detail: item.body,
    }))

    const requestLogs: AdminLogItem[] = flightRequests.map((item) => ({
      id: `request-${item.id}`,
      timestamp: item.createdAt,
      category: "request",
      title: `Flight request created for ${item.clientName}`,
      detail: `${item.departure} -> ${item.arrival} (${item.status.replace(/_/g, " ")})`,
    }))

    return [...avinodeLogs, ...notificationLogs, ...requestLogs]
      .filter((item) => {
        const timestamp = new Date(item.timestamp).getTime()
        return Number.isFinite(timestamp) && timestamp >= cutoff
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [avinodeActivity, notifications, flightRequests])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor platform health, integrations, and system-level events.
        </p>
      </div>

      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
          avinodeCheck?.status === "healthy"
            ? "border-green-500/20 bg-green-500/5"
            : avinodeCheck?.status === "degraded"
              ? "border-amber-500/20 bg-amber-500/5"
            : "border-destructive/20 bg-destructive/5"
        }`}
      >
        <Globe
          className={`h-5 w-5 shrink-0 ${
            avinodeCheck?.status === "healthy"
              ? "text-green-600"
              : avinodeCheck?.status === "degraded"
                ? "text-amber-600"
                : "text-destructive"
          }`}
        />
        <div className="flex-1">
          <span
            className={`text-sm font-semibold ${
              avinodeCheck?.status === "healthy"
                ? "text-green-700"
                : avinodeCheck?.status === "degraded"
                  ? "text-amber-700"
                  : "text-destructive"
            }`}
          >
            {avinodeCheck?.status === "healthy"
              ? "Avinode Marketplace Connected"
              : avinodeCheck?.status === "degraded"
                ? "Avinode Marketplace Degraded"
                : "Avinode Not Connected"}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {avinodeCheck?.detail || (avinodeConnected ? `${avinodeActivity.length} Avinode events tracked` : "No health data")}
          </span>
        </div>
      </div>

      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
          supabaseCheck?.status === "healthy"
            ? "border-green-500/20 bg-green-500/5"
            : supabaseCheck?.status === "degraded"
              ? "border-amber-500/20 bg-amber-500/5"
              : supabaseCheck?.status === "down"
              ? "border-destructive/20 bg-destructive/5"
              : "border-border bg-muted/30"
        }`}
      >
        <Database
          className={`h-5 w-5 shrink-0 ${
            supabaseCheck?.status === "healthy"
              ? "text-green-600"
              : supabaseCheck?.status === "degraded"
                ? "text-amber-600"
                : supabaseCheck?.status === "down"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        />
        <div className="flex-1">
          <span
            className={`text-sm font-semibold ${
              supabaseCheck?.status === "healthy"
                ? "text-green-700"
                : supabaseCheck?.status === "degraded"
                  ? "text-amber-700"
                  : supabaseCheck?.status === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {supabaseCheck?.status === "healthy"
              ? "Supabase API Healthy"
              : supabaseCheck?.status === "degraded"
                ? "Supabase API Degraded"
                : supabaseCheck?.status === "down"
                ? "Supabase API Unhealthy"
                : "Checking Supabase API"}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {supabaseCheck?.detail || "Running health check"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">Health Checks</h2>
          <span className="text-xs text-muted-foreground">
            {healthOverview?.checkedAt
              ? `Updated ${formatDistanceToNow(new Date(healthOverview.checkedAt), { addSuffix: true })}`
              : "Not yet checked"}
          </span>
        </div>
        {healthLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Checking system health...</div>
        ) : healthError ? (
          <div className="p-4 text-sm text-destructive">{healthError}</div>
        ) : (
          <div className="divide-y divide-border">
            {(healthOverview?.checks || []).map((check) => (
              <div key={check.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-card-foreground">{check.name}</div>
                  <div className="text-xs text-muted-foreground">{check.detail}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      check.status === "healthy"
                        ? "bg-green-500/10 text-green-700"
                        : check.status === "degraded"
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {check.status}
                  </span>
                  <div className="mt-1 text-[10px] text-muted-foreground">{check.latencyMs ?? 0} ms</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-card-foreground">System Activity Log</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last 24 hours</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No recent system activity yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.slice(0, 100).map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                <LogIcon category={item.category} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-card-foreground">{item.title}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LogIcon({ category }: { category: AdminLogItem["category"] }) {
  if (category === "avinode") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Globe className="h-3.5 w-3.5 text-primary" />
      </div>
    )
  }

  if (category === "notification") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
        <Bell className="h-3.5 w-3.5 text-accent" />
      </div>
    )
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
      <PlaneTakeoff className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}
