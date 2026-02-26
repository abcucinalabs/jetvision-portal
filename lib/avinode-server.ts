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

async function getTripMessageById(messageId: string) {
  const json = await fetchAvinode(`/tripmsgs/${messageId}`)
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
  const ids = new Set<string>()

  for (const item of rfqs) {
    if (typeof item === "string") {
      const hrefMatch = item.match(/\/rfqs\/([^/?]+)/)
      if (hrefMatch?.[1]) ids.add(hrefMatch[1])
      else ids.add(item)
      continue
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>
      if (obj.id) ids.add(String(obj.id))
      else if (obj.href && typeof obj.href === "string") {
        const m = obj.href.match(/\/rfqs\/([^/?]+)/)
        if (m?.[1]) ids.add(m[1])
      }
    }
  }

  // Some trip payload variants expose RFQ links outside trip.rfqs.
  const walk = (value: unknown, depth: number) => {
    if (depth > 6 || value === null || value === undefined) return
    if (typeof value === "string") {
      const hrefMatch = value.match(/\/rfqs\/([^/?]+)/)
      if (hrefMatch?.[1]) ids.add(hrefMatch[1])
      return
    }
    if (Array.isArray(value)) {
      for (const v of value) walk(v, depth + 1)
      return
    }
    if (typeof value === "object") {
      for (const v of Object.values(value as Record<string, unknown>)) {
        walk(v, depth + 1)
      }
    }
  }

  walk(trip, 0)

  return Array.from(ids).filter(Boolean)
}

function extractQuotesFromRfq(rfq: Record<string, unknown>) {
  const sellerLift = (rfq.sellerLift as Record<string, unknown>[] | undefined) || []
  const quotesById = new Map<string, AvinodeQuoteSummary>()

  for (const lift of sellerLift) {
    const sourcingStatus = Number(lift.sourcingStatus ?? NaN)
    const sourcingDisplayStatus = String(lift.sourcingDisplayStatus || "").toLowerCase()
    const latestQuote = lift.latestQuote as Record<string, unknown> | undefined
    const hasOperatorResponse =
      Boolean(latestQuote?.id) ||
      sourcingStatus === 2 ||
      sourcingDisplayStatus.includes("accepted") ||
      sourcingDisplayStatus.includes("quoted")

    if (!hasOperatorResponse) {
      continue
    }

    const links = lift.links as Record<string, unknown> | undefined
    const linkedQuotes = (links?.quotes as unknown[] | undefined) || []

    for (const linked of linkedQuotes) {
      if (!linked || typeof linked !== "object") continue
      const linkedObj = linked as Record<string, unknown>
      const id = linkedObj.id ? String(linkedObj.id) : ""
      if (!id) continue
      if (!quotesById.has(id)) {
        quotesById.set(id, {
          id,
          amount: 0,
          currency: "USD",
        })
      }
    }

    if (!latestQuote) continue

    const price = latestQuote.price as Record<string, unknown> | undefined
    const operator = latestQuote.operator as Record<string, unknown> | undefined
    const id = String(latestQuote.id || "")
    if (!id) continue

    quotesById.set(id, {
      id,
      amount: Number(price?.amount || 0),
      currency: String(price?.currency || "USD"),
      operatorName: operator?.displayName ? String(operator.displayName) : undefined,
      createdOn: latestQuote.createdOn ? String(latestQuote.createdOn) : undefined,
    })
  }

  return Array.from(quotesById.values()).filter((q) => q.id)
}

function extractLinkedQuoteIdsFromRfq(rfq: Record<string, unknown>) {
  const sellerLift = (rfq.sellerLift as Record<string, unknown>[] | undefined) || []
  const ids = new Set<string>()

  for (const lift of sellerLift) {
    const links = lift.links as Record<string, unknown> | undefined
    const linkedQuotes = (links?.quotes as unknown[] | undefined) || []
    for (const linked of linkedQuotes) {
      if (!linked || typeof linked !== "object") continue
      const linkedObj = linked as Record<string, unknown>
      if (linkedObj.id) ids.add(String(linkedObj.id))
    }
  }

  return Array.from(ids)
}

function extractSellerQuoteFromTripMessage(msg: Record<string, unknown>) {
  const sellerQuote = msg.sellerQuote as Record<string, unknown> | undefined
  if (!sellerQuote) return null

  const sellerPrice = sellerQuote.sellerPrice as Record<string, unknown> | undefined
  const quote: AvinodeQuoteSummary = {
    id: String(sellerQuote.id || ""),
    amount: Number(sellerPrice?.amount || sellerPrice?.price || 0),
    currency: String(sellerPrice?.currency || "USD"),
    createdOn: sellerQuote.createdOn ? String(sellerQuote.createdOn) : undefined,
  }

  if (!quote.id) return null

  const linkedQuoteIds = new Set<string>()
  const lifts = (msg.lift as Record<string, unknown>[] | undefined) || []
  for (const lift of lifts) {
    const links = lift.links as Record<string, unknown> | undefined
    const linkedQuotes = (links?.quotes as unknown[] | undefined) || []
    for (const linked of linkedQuotes) {
      if (!linked || typeof linked !== "object") continue
      const linkedObj = linked as Record<string, unknown>
      if (linkedObj.id) linkedQuoteIds.add(String(linkedObj.id))
    }
  }

  const rfqIds = new Set<string>()
  const rfqLinks = ((msg.links as Record<string, unknown> | undefined)?.rfqs as unknown[] | undefined) || []
  for (const rfq of rfqLinks) {
    if (!rfq || typeof rfq !== "object") continue
    const rfqObj = rfq as Record<string, unknown>
    if (rfqObj.id) rfqIds.add(String(rfqObj.id))
  }

  return {
    quote,
    linkedQuoteIds: Array.from(linkedQuoteIds),
    rfqIds: Array.from(rfqIds),
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

  // Always attempt trip-based RFQ discovery and merge with stored IDs.
  // This recovers missing RFQs when only a subset arrived through webhooks.
  const tripResourceId = extractTripResourceId(flightRequest as Record<string, unknown>)
  if (tripResourceId) {
    try {
      const trip = await getTripById(tripResourceId)
      const discovered = extractRfqIdsFromTrip(trip)
      rfqIds = Array.from(new Set([...rfqIds, ...discovered]))
    } catch {
      // Continue with currently known RFQ IDs; sync still updates timestamp.
    }
  }

  let quoteCount = 0
  let firstQuoteAt: string | null = null
  let bestQuoteAmount: number | null = null
  let bestQuoteCurrency: string | null = null
  let bestQuoteId: string | null = null
  const linkedQuoteIds = new Set<string>()
  const respondedQuoteIds = new Set<string>()
  const sellerQuoteByLinkedQuoteId = new Map<string, AvinodeQuoteSummary>()
  const sellerQuotesByRfqId = new Map<string, AvinodeQuoteSummary[]>()

  if (tripResourceId) {
    try {
      const trip = await getTripById(tripResourceId)
      const tripMessages = (((trip.links as Record<string, unknown> | undefined)?.tripmsgs as unknown[] | undefined) || [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")

      for (const msgLink of tripMessages) {
        const msgId = msgLink.id ? String(msgLink.id) : ""
        if (!msgId) continue
        try {
          const msg = await getTripMessageById(msgId)
          const extracted = extractSellerQuoteFromTripMessage(msg)
          if (!extracted) continue

          for (const linkedId of extracted.linkedQuoteIds) {
            sellerQuoteByLinkedQuoteId.set(linkedId, extracted.quote)
          }
          for (const rfqId of extracted.rfqIds) {
            const existing = sellerQuotesByRfqId.get(rfqId) || []
            if (!existing.some((q) => q.id === extracted.quote.id)) {
              existing.push(extracted.quote)
              sellerQuotesByRfqId.set(rfqId, existing)
            }
          }
        } catch {
          // Ignore individual trip message parse failures.
        }
      }
    } catch {
      // Ignore trip-message enrichment failures.
    }
  }

  for (const rfqId of rfqIds) {
    const rfq = await getRfqById(rfqId)
    const linkedQuotesForRfq = extractLinkedQuoteIdsFromRfq(rfq)
    for (const linkedId of linkedQuotesForRfq) linkedQuoteIds.add(linkedId)

    const rawQuotes = extractQuotesFromRfq(rfq)
    const mappedQuotes = rawQuotes.map((q) => sellerQuoteByLinkedQuoteId.get(q.id) || q)
    const rfqSellerQuotes = sellerQuotesByRfqId.get(rfqId) || []
    const quotes = [...mappedQuotes, ...rfqSellerQuotes]

    for (const quote of quotes) {
      if (respondedQuoteIds.has(quote.id)) continue
      respondedQuoteIds.add(quote.id)
      quoteCount += 1

      if (!firstQuoteAt || (quote.createdOn && new Date(quote.createdOn) < new Date(firstQuoteAt))) {
        firstQuoteAt = quote.createdOn || firstQuoteAt
      }
    }
  }

  // Fetch quote details to compute best quote and accurate firstQuoteAt.
  for (const quoteId of respondedQuoteIds) {
    try {
      const quote = await getQuoteById(quoteId)
      const price =
        (quote.price as Record<string, unknown> | undefined) ||
        (quote.sellerPrice as Record<string, unknown> | undefined)
      const amount = Number(price?.amount || price?.price || 0)
      const currency = String(price?.currency || "USD")
      const createdOn = quote.createdOn ? String(quote.createdOn) : null

      if (createdOn && (!firstQuoteAt || new Date(createdOn) < new Date(firstQuoteAt))) {
        firstQuoteAt = createdOn
      }

      if (amount > 0 && (bestQuoteAmount === null || amount < bestQuoteAmount)) {
        bestQuoteAmount = amount
        bestQuoteCurrency = currency
        bestQuoteId = quoteId
      }
    } catch {
      // Keep quote count from RFQ links even if quote details lookup fails.
    }
  }

  const avinodeStatus = quoteCount > 0 ? "quotes_received" : rfqIds.length > 0 ? "rfq_sent" : (flightRequest.avinode_status || "sent_to_avinode")

  const updates = {
    avinode_status: avinodeStatus,
    avinode_rfq_ids: rfqIds,
    avinode_quote_count: quoteCount,
    avinode_quote_ids: Array.from(linkedQuoteIds),
    avinode_first_quote_at: firstQuoteAt,
    avinode_best_quote_amount: bestQuoteAmount,
    avinode_best_quote_currency: bestQuoteCurrency,
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
