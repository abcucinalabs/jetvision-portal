import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { buildAuthorizationHeader } from "@/lib/avinode-auth"

export interface AvinodeQuoteSummary {
  id: string
  amount: number
  currency: string
  operatorName?: string
  createdOn?: string
}

function getHeaders() {
  const apiToken = process.env.AVINODE_API_TOKEN || ""
  const authToken = process.env.AVINODE_AUTH_TOKEN || ""
  const product = process.env.AVINODE_PRODUCT || "Jetvision Portal v1.0"
  const apiVersion = process.env.AVINODE_API_VERSION || "v1.0"
  const actAsAccount = process.env.AVINODE_ACT_AS_ACCOUNT || ""

  if (!apiToken || !authToken) {
    throw new Error("Missing Avinode env vars. Required: AVINODE_API_TOKEN and AVINODE_AUTH_TOKEN")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Avinode-ApiToken": apiToken,
    Authorization: buildAuthorizationHeader(authToken),
    "X-Avinode-SentTimestamp": new Date().toISOString(),
    "X-Avinode-ApiVersion": apiVersion,
    "X-Avinode-Product": product,
  }

  if (actAsAccount) {
    headers["X-Avinode-ActAsAccount"] = actAsAccount
  }

  return headers
}

function getBaseUrl() {
  return process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
}

async function fetchAvinode(path: string) {
  const res = await fetch(`${getBaseUrl()}${path}`, { headers: getHeaders() })
  const text = await res.text()

  let json: Record<string, unknown>
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Avinode ${path} returned non-JSON (${res.status})`)
  }

  if (!res.ok) {
    const errorMsg =
      (json?.meta as { errors?: { message?: string }[] } | undefined)?.errors?.[0]?.message ||
      (json?.error as string | undefined) ||
      `Avinode request failed (${res.status})`
    throw new Error(errorMsg)
  }

  return json
}

export async function getRfqById(rfqId: string) {
  const json = await fetchAvinode(`/rfqs/${rfqId}`)
  return json.data as Record<string, unknown>
}

export async function getTripById(tripId: string) {
  const json = await fetchAvinode(`/trips/${tripId}`)
  return json.data as Record<string, unknown>
}

export async function getQuoteById(quoteId: string) {
  const json = await fetchAvinode(`/quotes/${quoteId}`)
  return json.data as Record<string, unknown>
}

function extractTripResourceId(flightRequest: Record<string, unknown>) {
  const direct = String(flightRequest.avinode_trip_id || "")
  if (direct.startsWith("atrip-")) return direct

  const href = String(flightRequest.avinode_trip_href || "")
  const hrefMatch = href.match(/\/trips\/(atrip-[A-Za-z0-9-]+)/)
  if (hrefMatch?.[1]) return hrefMatch[1]

  const searchLink = String(flightRequest.avinode_search_link || "")
  const searchMatch = searchLink.match(/\/search\/load\/(atrip-[A-Za-z0-9-]+)/)
  if (searchMatch?.[1]) return searchMatch[1]

  return null
}

function extractRfqIdsFromTrip(trip: Record<string, unknown>) {
  const rfqs = (trip.rfqs as unknown[] | undefined) || []
  const ids: string[] = []

  for (const item of rfqs) {
    if (typeof item === "string") {
      ids.push(item)
      continue
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>
      if (obj.id) ids.push(String(obj.id))
      else if (obj.href && typeof obj.href === "string") {
        const m = obj.href.match(/\/rfqs\/([^/?]+)/)
        if (m?.[1]) ids.push(m[1])
      }
    }
  }

  return Array.from(new Set(ids.filter(Boolean)))
}

function extractQuotesFromRfq(rfq: Record<string, unknown>) {
  const sellerLift = (rfq.sellerLift as Record<string, unknown>[] | undefined) || []
  const quotes: AvinodeQuoteSummary[] = []

  for (const lift of sellerLift) {
    const latestQuote = lift.latestQuote as Record<string, unknown> | undefined
    if (!latestQuote) continue

    const price = latestQuote.price as Record<string, unknown> | undefined
    const operator = latestQuote.operator as Record<string, unknown> | undefined

    quotes.push({
      id: String(latestQuote.id || ""),
      amount: Number(price?.amount || 0),
      currency: String(price?.currency || "USD"),
      operatorName: operator?.displayName ? String(operator.displayName) : undefined,
      createdOn: latestQuote.createdOn ? String(latestQuote.createdOn) : undefined,
    })
  }

  return quotes.filter((q) => q.id && Number.isFinite(q.amount) && q.amount > 0)
}

function computeSla(createdAt: string, quoteCount: number) {
  const now = Date.now()
  const createdMs = new Date(createdAt).getTime()
  const dueMs = createdMs + 6 * 60 * 60 * 1000

  let slaStatus: "on_track" | "at_risk" | "overdue" | "met" = "on_track"

  if (quoteCount > 0) {
    slaStatus = "met"
  } else if (now > dueMs) {
    slaStatus = "overdue"
  } else if (now > dueMs - 60 * 60 * 1000) {
    slaStatus = "at_risk"
  }

  return {
    dueAt: new Date(dueMs).toISOString(),
    slaStatus,
  }
}

export async function syncFlightRequestPipeline(flightRequestId: string) {
  const supabase = getSupabaseAdmin()

  const { data: flightRequest, error: frError } = await supabase
    .from("flight_requests")
    .select("id, created_at, avinode_rfq_ids, avinode_status, avinode_trip_id, avinode_trip_href, avinode_search_link")
    .eq("id", flightRequestId)
    .single()

  if (frError || !flightRequest) {
    throw new Error(frError?.message || "Flight request not found")
  }

  let rfqIds = ((flightRequest.avinode_rfq_ids as string[] | null) || []).filter(Boolean)

  // If webhooks haven't populated RFQ ids yet, discover them from the trip resource.
  if (rfqIds.length === 0) {
    const tripResourceId = extractTripResourceId(flightRequest as Record<string, unknown>)
    if (tripResourceId) {
      try {
        const trip = await getTripById(tripResourceId)
        rfqIds = extractRfqIdsFromTrip(trip)
      } catch {
        // Continue with empty RFQ list; sync still updates SLA/sync timestamp.
      }
    }
  }

  let quoteCount = 0
  let firstQuoteAt: string | null = null
  let bestQuoteAmount: number | null = null
  let bestQuoteCurrency: string | null = null
  let bestQuoteId: string | null = null
  const allQuoteIds: string[] = []

  for (const rfqId of rfqIds) {
    const rfq = await getRfqById(rfqId)
    const quotes = extractQuotesFromRfq(rfq)

    for (const quote of quotes) {
      quoteCount += 1
      allQuoteIds.push(quote.id)

      if (!firstQuoteAt || (quote.createdOn && new Date(quote.createdOn) < new Date(firstQuoteAt))) {
        firstQuoteAt = quote.createdOn || firstQuoteAt
      }

      if (bestQuoteAmount === null || quote.amount < bestQuoteAmount) {
        bestQuoteAmount = quote.amount
        bestQuoteCurrency = quote.currency
        bestQuoteId = quote.id
      }
    }
  }

  if (bestQuoteId) {
    const quote = await getQuoteById(bestQuoteId)
    const price = quote.price as Record<string, unknown> | undefined
    if (price?.amount) {
      bestQuoteAmount = Number(price.amount)
      bestQuoteCurrency = String(price.currency || bestQuoteCurrency || "USD")
    }
  }

  const { dueAt, slaStatus } = computeSla(String(flightRequest.created_at), quoteCount)
  const avinodeStatus = quoteCount > 0 ? "quotes_received" : rfqIds.length > 0 ? "rfq_sent" : (flightRequest.avinode_status || "sent_to_avinode")

  const updates = {
    avinode_status: avinodeStatus,
    avinode_rfq_ids: rfqIds,
    avinode_quote_count: quoteCount,
    avinode_quote_ids: allQuoteIds,
    avinode_first_quote_at: firstQuoteAt,
    avinode_best_quote_amount: bestQuoteAmount,
    avinode_best_quote_currency: bestQuoteCurrency,
    avinode_sla_due_at: dueAt,
    avinode_sla_status: slaStatus,
    avinode_last_sync_at: new Date().toISOString(),
  }

  const { data: updated, error: updateError } = await supabase
    .from("flight_requests")
    .update(updates)
    .eq("id", flightRequestId)
    .select("*")
    .single()

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to persist synced pipeline")
  }

  return updated as Record<string, unknown>
}

export async function upsertRfqFromWebhook(event: { tripId?: string; rfqId?: string }) {
  if (!event.tripId || !event.rfqId) return null

  const supabase = getSupabaseAdmin()
  let fr: { id: string; avinode_rfq_ids: string[] | null } | null = null

  const { data: directMatch } = await supabase
    .from("flight_requests")
    .select("id, avinode_rfq_ids")
    .eq("avinode_trip_id", event.tripId)
    .maybeSingle()

  if (directMatch) {
    fr = directMatch
  } else {
    const { data: linkMatch } = await supabase
      .from("flight_requests")
      .select("id, avinode_rfq_ids")
      .or(`avinode_trip_href.ilike.%${event.tripId}%,avinode_search_link.ilike.%${event.tripId}%`)
      .maybeSingle()
    if (linkMatch) fr = linkMatch
  }

  if (!fr) return null

  const rfqIds = new Set<string>(((fr.avinode_rfq_ids as string[] | null) || []).filter(Boolean))
  rfqIds.add(event.rfqId)

  const { error: updateError } = await supabase
    .from("flight_requests")
    .update({ avinode_rfq_ids: Array.from(rfqIds), avinode_status: "rfq_sent" })
    .eq("id", fr.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return String(fr.id)
}
