import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { buildAuthorizationHeader, normalizeAuthToken } from "@/lib/avinode-auth"

type HealthStatus = "healthy" | "degraded" | "down"

type HealthCheck = {
  id: string
  name: string
  status: HealthStatus
  detail: string
  latencyMs?: number
  timestamp: string
}

function nowIso() {
  return new Date().toISOString()
}

function evaluateOverall(checks: HealthCheck[]): HealthStatus {
  if (checks.some((c) => c.status === "down")) return "down"
  if (checks.some((c) => c.status === "degraded")) return "degraded"
  return "healthy"
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  }
}

async function runCheck(id: string, name: string, fn: () => Promise<Omit<HealthCheck, "id" | "name" | "timestamp">>) {
  const started = Date.now()
  try {
    const result = await fn()
    return {
      id,
      name,
      ...result,
      latencyMs: Date.now() - started,
      timestamp: nowIso(),
    } satisfies HealthCheck
  } catch (error) {
    return {
      id,
      name,
      status: "down",
      detail: error instanceof Error ? error.message : "Unknown check failure",
      latencyMs: Date.now() - started,
      timestamp: nowIso(),
    } satisfies HealthCheck
  }
}

async function checkSupabaseConnectivity() {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("customers").select("id", { count: "exact", head: true })
  if (error) {
    return { status: "down" as const, detail: error.message }
  }
  return { status: "healthy" as const, detail: "Supabase reachable" }
}

async function checkSupabaseTables() {
  const supabase = getSupabaseAdmin()
  const [customers, flightRequests, notifications] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("flight_requests").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }),
  ])

  const failures = [customers.error, flightRequests.error, notifications.error].filter(Boolean)
  if (failures.length > 0) {
    return {
      status: "degraded" as const,
      detail: failures.map((f) => f?.message).join(" | "),
    }
  }

  return { status: "healthy" as const, detail: "Core tables responding" }
}

async function checkSupabaseSchema() {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from("customers")
    .select("id, visible_to_iso_ids")
    .limit(1)

  if (error) {
    return {
      status: "degraded" as const,
      detail: `Schema mismatch or query error: ${error.message}`,
    }
  }

  return { status: "healthy" as const, detail: "Expected customer visibility schema present" }
}

async function checkAvinodeConfig() {
  const apiToken = (process.env.AVINODE_API_TOKEN || "").trim()
  const authToken = normalizeAuthToken(process.env.AVINODE_AUTH_TOKEN || "")

  if (!apiToken || !authToken) {
    return {
      status: "degraded" as const,
      detail: "Missing AVINODE_API_TOKEN and/or AVINODE_AUTH_TOKEN",
    }
  }

  return { status: "healthy" as const, detail: "Avinode credentials configured" }
}

async function checkAvinodeConnectivity() {
  const apiToken = (process.env.AVINODE_API_TOKEN || "").trim()
  const authToken = normalizeAuthToken(process.env.AVINODE_AUTH_TOKEN || "")
  const baseUrl = process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
  const product = process.env.AVINODE_PRODUCT || "Jetvision Portal v1.0"
  const apiVersion = process.env.AVINODE_API_VERSION || "v1.0"
  const actAsAccount = process.env.AVINODE_ACT_AS_ACCOUNT || ""

  if (!apiToken || !authToken) {
    return {
      status: "degraded" as const,
      detail: "Connectivity check skipped: Avinode credentials missing",
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Avinode-ApiToken": apiToken,
    Authorization: buildAuthorizationHeader(authToken),
    "X-Avinode-SentTimestamp": new Date().toISOString(),
    "X-Avinode-ApiVersion": apiVersion,
    "X-Avinode-Product": product,
  }
  if (actAsAccount) headers["X-Avinode-ActAsAccount"] = actAsAccount

  const { signal, clear } = timeoutSignal(8000)
  try {
    // Use the same upstream endpoint as the active airport lookup workflow.
    const res = await fetch(`${baseUrl}/airports/search?filter=KTEB`, {
      headers,
      signal,
      cache: "no-store",
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      const isAuthFailure = res.status === 401 || res.status === 403
      const status: HealthStatus = res.status >= 500 ? "down" : "degraded"
      return {
        status: isAuthFailure ? "degraded" : status,
        detail: `Airport lookup workflow failed (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`,
      }
    }

    return { status: "healthy" as const, detail: "Airport lookup workflow succeeded" }
  } finally {
    clear()
  }
}

async function checkAvinodeFreshness() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("flight_requests")
    .select("avinode_last_sync_at")
    .not("avinode_last_sync_at", "is", null)
    .order("avinode_last_sync_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { status: "degraded" as const, detail: `Could not read Avinode sync freshness: ${error.message}` }
  }

  const lastSync = data?.avinode_last_sync_at ? new Date(String(data.avinode_last_sync_at)).getTime() : NaN
  if (!Number.isFinite(lastSync)) {
    return { status: "degraded" as const, detail: "No Avinode sync timestamp found yet" }
  }

  const ageMs = Date.now() - lastSync
  const ageMinutes = Math.round(ageMs / 60000)

  if (ageMs > 6 * 60 * 60 * 1000) {
    return { status: "degraded" as const, detail: `Last Avinode sync ${ageMinutes} min ago` }
  }

  return { status: "healthy" as const, detail: `Last Avinode sync ${ageMinutes} min ago` }
}

async function checkGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim()
  const model = (process.env.GEMINI_MODEL || "").trim() || "gemini-2.5-flash"

  if (!apiKey) {
    return {
      status: "degraded" as const,
      detail: "Missing GEMINI_API_KEY",
    }
  }

  return { status: "healthy" as const, detail: `Gemini configured (${model})` }
}

async function checkGeminiConnectivity() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim()
  const model = (process.env.GEMINI_MODEL || "").trim() || "gemini-2.5-flash"

  if (!apiKey) {
    return {
      status: "degraded" as const,
      detail: "Connectivity check skipped: GEMINI_API_KEY missing",
    }
  }

  const { signal, clear } = timeoutSignal(8000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        cache: "no-store",
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Reply with OK." }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8,
          },
        }),
      }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      const status: HealthStatus = res.status >= 500 ? "down" : "degraded"
      return {
        status,
        detail: `Gemini request failed (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`,
      }
    }

    return { status: "healthy" as const, detail: `Gemini reachable (${model})` }
  } finally {
    clear()
  }
}

export const dynamic = "force-dynamic"

export async function GET() {
  const checks = await Promise.all([
    runCheck("supabase_connectivity", "Supabase Connectivity", checkSupabaseConnectivity),
    runCheck("supabase_tables", "Supabase Core Tables", checkSupabaseTables),
    runCheck("supabase_schema", "Supabase Schema", checkSupabaseSchema),
    runCheck("avinode_config", "Avinode Configuration", checkAvinodeConfig),
    runCheck("avinode_connectivity", "Avinode Connectivity", checkAvinodeConnectivity),
    runCheck("avinode_freshness", "Avinode Sync Freshness", checkAvinodeFreshness),
    runCheck("gemini_config", "Gemini Configuration", checkGeminiConfig),
    runCheck("gemini_connectivity", "Gemini Connectivity", checkGeminiConnectivity),
  ])

  const overall = evaluateOverall(checks)

  return NextResponse.json({
    overall,
    checkedAt: nowIso(),
    checks,
  })
}
