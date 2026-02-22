/**
 * Client-side helper for calling our Next.js API routes that proxy to Avinode.
 * Passes the user-configured credentials via custom headers so the API routes
 * can forward them to Avinode's servers.
 */

import type { AvinodeConfig, AvinodeTrip, AvinodeRfq } from "@/lib/avinode"

function buildProxyHeaders(config: AvinodeConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-avinode-baseurl": config.baseUrl,
    "x-avinode-apitoken": config.apiToken,
    "x-avinode-authtoken": config.authToken,
    "x-avinode-product": config.product,
    "x-avinode-apiversion": config.apiVersion,
  }
  if (config.actAsAccount) {
    headers["x-avinode-actasaccount"] = config.actAsAccount
  }
  return headers
}

/** Test the Avinode connection with current credentials */
export async function testConnection(config: AvinodeConfig): Promise<{
  connected: boolean
  environment?: string
  testResult?: string
  error?: string
}> {
  console.log("[v0] testConnection: calling /api/avinode/test with baseUrl:", config.baseUrl)

  const res = await fetch("/api/avinode/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiToken: config.apiToken,
      authToken: config.authToken,
      baseUrl: config.baseUrl,
      product: config.product,
      apiVersion: config.apiVersion,
      actAsAccount: config.actAsAccount || undefined,
    }),
  })
  const responseText = await res.text()
  console.log("[v0] testConnection: response status:", res.status, "body:", responseText.slice(0, 500))

  let data: Record<string, unknown>
  try {
    data = JSON.parse(responseText)
  } catch {
    return { connected: false, error: `Non-JSON response (${res.status}): ${responseText.slice(0, 200)}` }
  }
  if (!res.ok && !data.connected) {
    return { connected: false, error: (data.error as string) || `Request failed with status ${res.status}` }
  }
  return data as { connected: boolean; environment?: string; testResult?: string; error?: string }
}

/** Create a trip in Avinode via POST /trips */
export async function createTrip(
  config: AvinodeConfig,
  segments: {
    startAirportId: string
    endAirportId: string
    departureDate: string
    departureTime?: string
    timeTBD?: boolean
    paxCount: number
  }[],
  options?: {
    aircraftCategory?: string
    postToTripBoard?: boolean
    tripBoardPostMessage?: string
  }
): Promise<{ data: AvinodeTrip; meta: { errors: { message: string }[]; warnings: { message: string }[]; infos: { message: string }[] } }> {
  const body: Record<string, unknown> = { segments }
  if (options?.aircraftCategory) body.aircraftCategory = options.aircraftCategory
  if (options?.postToTripBoard) body.postToTripBoard = options.postToTripBoard
  if (options?.tripBoardPostMessage) body.tripBoardPostMessage = options.tripBoardPostMessage

  console.log("[v0] createTrip: sending to /api/avinode/trips with segments:", JSON.stringify(body))

  const res = await fetch("/api/avinode/trips", {
    method: "POST",
    headers: buildProxyHeaders(config),
    body: JSON.stringify(body),
  })

  const responseText = await res.text()
  console.log("[v0] createTrip: response status:", res.status, "body:", responseText.slice(0, 500))

  let data: Record<string, unknown>
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(`Avinode returned non-JSON response (${res.status}): ${responseText.slice(0, 200)}`)
  }

  if (!res.ok) {
    const errorMsg = (data as { error?: string }).error || `API error ${res.status}`
    console.log("[v0] createTrip: error:", errorMsg)
    throw new Error(errorMsg)
  }

  return data as { data: AvinodeTrip; meta: { errors: { message: string }[]; warnings: { message: string }[]; infos: { message: string }[] } }
}

/** Search airports via GET /airports/search?filter=... */
export async function searchAirports(
  config: AvinodeConfig,
  filter: string
): Promise<{ id: string; name: string; icao: string; iata: string; city: string; country: { code: string; name: string } }[]> {
  if (!filter || filter.length < 2) return []

  const res = await fetch(
    `/api/avinode/airports?filter=${encodeURIComponent(filter)}`,
    { headers: buildProxyHeaders(config) }
  )

  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

/** Download an RFQ by ID */
export async function getRfq(
  config: AvinodeConfig,
  rfqId: string,
  fields?: string[]
): Promise<{ data: AvinodeRfq }> {
  const queryParams = fields ? `?fields=${fields.join(",")}` : ""
  const res = await fetch(`/api/avinode/rfqs/${rfqId}${queryParams}`, {
    headers: buildProxyHeaders(config),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `RFQ fetch failed: ${res.status}`)
  }

  return res.json()
}

/** Cancel a trip */
export async function cancelTrip(
  config: AvinodeConfig,
  tripId: string,
  reason: string,
  messageToSeller: string
): Promise<void> {
  const res = await fetch(`/api/avinode/trips/${tripId}/cancel`, {
    method: "PUT",
    headers: buildProxyHeaders(config),
    body: JSON.stringify({ id: tripId, reason, messageToSeller }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Cancel failed: ${res.status}`)
  }
}

/** Configure webhooks */
export async function configureWebhooks(
  config: AvinodeConfig,
  settings: { url: string; eventTypes: string[]; active: boolean }
): Promise<void> {
  const res = await fetch("/api/avinode/webhooks", {
    method: "POST",
    headers: buildProxyHeaders(config),
    body: JSON.stringify(settings),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Webhook config failed: ${res.status}`)
  }
}

/** Create a client lead */
export async function createLead(
  config: AvinodeConfig,
  lead: {
    leadContactInfo: { name: string; emails: string[]; phone: string }
    segments: { startAirportId: string; endAirportId: string; departureDate: string; paxCount: number }[]
    message?: string
  }
): Promise<unknown> {
  const res = await fetch("/api/avinode/leads", {
    method: "POST",
    headers: buildProxyHeaders(config),
    body: JSON.stringify(lead),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Lead creation failed: ${res.status}`)
  }

  return res.json()
}
