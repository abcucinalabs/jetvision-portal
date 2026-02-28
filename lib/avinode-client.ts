import type { AvinodeTrip, AvinodeRfq } from "@/lib/avinode"

function extractApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const record = data as Record<string, unknown>
  const details = record.details && typeof record.details === "object"
    ? (record.details as Record<string, unknown>)
    : undefined
  const meta = details?.meta && typeof details.meta === "object"
    ? (details.meta as Record<string, unknown>)
    : undefined
  const metaErrors = Array.isArray(meta?.errors) ? meta?.errors : []
  const firstMetaError = metaErrors[0]
  if (firstMetaError && typeof firstMetaError === "object") {
    const title = (firstMetaError as Record<string, unknown>).title
    const message = (firstMetaError as Record<string, unknown>).message
    if (typeof title === "string" && title.trim()) return title
    if (typeof message === "string" && message.trim()) return message
  }
  const error = record.error
  if (typeof error === "string" && error.trim()) return error
  const message = record.message
  if (typeof message === "string" && message.trim()) return message
  return fallback
}

/** Create a trip in Avinode via POST /trips.
 *  Builds the exact request body format Avinode expects:
 *  { segments: [{ startAirport: { icao }, endAirport: { icao }, dateTime: { date, time?, departure, local }, paxCount, paxSegment, timeTBD }], sourcing: true }
 */
export async function createTrip(
  segments: {
    startAirportIcao: string
    endAirportIcao: string
    date: string             // YYYY-MM-DD
    time?: string            // HH:mm (24h), omit if timeTBD
    timeTBD?: boolean
    paxCount: number
  }[],
  options?: {
    aircraftCategory?: string
    postToTripBoard?: boolean
    tripBoardPostMessage?: string
    sourcing?: boolean
  }
): Promise<{ data: AvinodeTrip; tripId?: string; meta?: { errors: { message: string }[]; warnings: { message: string }[]; infos: { message: string }[] } }> {
  // Build the Avinode-formatted request body
  const avinodeSegments = segments.map((seg) => ({
    startAirport: { icao: seg.startAirportIcao },
    endAirport: { icao: seg.endAirportIcao },
    dateTime: {
      date: seg.date,
      time: seg.time || "12:00",
      departure: true,
      local: true,
    },
    paxCount: seg.paxCount,
    paxSegment: true,
    paxTBD: false,
    timeTBD: seg.timeTBD ?? false,
  }))

  const body: Record<string, unknown> = {
    segments: avinodeSegments,
    criteria: {},
    sourcing: options?.sourcing ?? true,
  }

  if (options?.aircraftCategory) {
    body.criteria = {
      requiredLift: [{ aircraftCategory: options.aircraftCategory, aircraftType: "", aircraftTail: "" }],
    }
  }
  if (options?.postToTripBoard) body.postToTripBoard = options.postToTripBoard
  if (options?.tripBoardPostMessage) body.tripBoardPostMessage = options.tripBoardPostMessage

  console.log("[v0] createTrip: sending to /api/avinode/trips with body:", JSON.stringify(body))

  const res = await fetch("/api/avinode/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  filter: string
): Promise<{ id: string; name: string; icao: string; iata: string; city: string; country: { code: string; name: string } }[]> {
  if (!filter || filter.length < 3) return []

  const res = await fetch(`/api/avinode/airports?filter=${encodeURIComponent(filter)}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Airport search failed: ${res.status}` }))
    throw new Error(err.error || `Airport search failed: ${res.status}`)
  }
  const json = await res.json()
  return json.data || []
}

/** Download an RFQ by ID */
export async function getRfq(
  rfqId: string,
  fields?: string[]
): Promise<{ data: AvinodeRfq }> {
  const queryParams = fields ? `?fields=${fields.join(",")}` : ""
  const res = await fetch(`/api/avinode/rfqs/${rfqId}${queryParams}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `RFQ fetch failed: ${res.status}`)
  }

  return res.json()
}

/** Download a trip by ID */
export async function getTripById(tripId: string): Promise<{ data: Record<string, unknown> }> {
  const res = await fetch(`/api/avinode/trips/${tripId}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Trip fetch failed: ${res.status}`)
  }

  return res.json()
}

/** Download a quote by ID */
export async function getQuoteById(quoteId: string): Promise<{ data: Record<string, unknown> }> {
  const res = await fetch(`/api/avinode/quotes/${quoteId}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Quote fetch failed: ${res.status}`)
  }

  return res.json()
}

/** Cancel a trip */
export async function cancelTrip(
  tripId: string,
  reason: string,
  messageToSeller: string
): Promise<void> {
  const res = await fetch(`/api/avinode/trips/${tripId}/cancel`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: tripId, reason, messageToSeller }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Cancel failed: ${res.status}`)
  }
}

/** Create a client lead */
export async function createLead(
  lead: {
    leadContactInfo: { name: string; emails: string[]; phone: string }
    segments: { startAirportId: string; endAirportId: string; departureDate: string; paxCount: number }[]
    message?: string
  }
): Promise<unknown> {
  const res = await fetch("/api/avinode/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `Lead creation failed: ${res.status}`)
  }

  return res.json()
}

/** Read a trip message/request by ID */
export async function getTripMessage(messageId: string): Promise<unknown> {
  const res = await fetch(`/api/avinode/tripmsgs/${messageId}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiError(data, `Trip message fetch failed: ${res.status}`))
  }
  return data
}

/** Submit quote to a trip message/request */
export async function submitTripQuote(messageId: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/avinode/tripmsgs/${messageId}/submit-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiError(data, `Submit quote failed: ${res.status}`))
  }
  return data
}

/** Decline a trip message/request */
export async function declineTripRequest(messageId: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/avinode/tripmsgs/${messageId}/decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiError(data, `Decline failed: ${res.status}`))
  }
  return data
}

/** Send chat message on a trip message/request */
export async function chatTripRequest(messageId: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/avinode/tripmsgs/${messageId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractApiError(data, `Chat send failed: ${res.status}`))
  }
  return data
}
