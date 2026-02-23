import { NextRequest, NextResponse } from "next/server"
import { syncFlightRequestPipeline, upsertRfqFromWebhook } from "@/lib/avinode-server"

type IncomingEvent = {
  id?: string
  href?: string
  type?: string
  tripId?: string
}

function getEventType(req: NextRequest, body: Record<string, unknown>) {
  const fromHeader =
    req.headers.get("x-avinode-eventtype") ||
    req.headers.get("X-Avinode-EventType") ||
    req.headers.get("x-event-type") ||
    req.headers.get("eventtype")

  if (fromHeader) return fromHeader
  if (typeof body.eventType === "string") return body.eventType
  if (typeof body.type === "string") return body.type
  return "unknown"
}

function normalizeEvents(body: Record<string, unknown>): IncomingEvent[] {
  const data = body.data

  if (Array.isArray(data)) {
    return data as IncomingEvent[]
  }

  if (data && typeof data === "object") {
    return [data as IncomingEvent]
  }

  return [body as IncomingEvent]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const eventType = getEventType(req, body)
    const events = normalizeEvents(body)

    if (eventType !== "TripRequestSellerResponse") {
      return NextResponse.json({ ok: true, ignored: true, eventType })
    }

    const syncedFlightRequestIds = new Set<string>()

    for (const event of events) {
      const rfqId = event.type === "rfqs" && event.id ? String(event.id) : undefined
      const tripId = event.tripId ? String(event.tripId) : undefined

      const flightRequestId = await upsertRfqFromWebhook({ tripId, rfqId })
      if (!flightRequestId) continue

      await syncFlightRequestPipeline(flightRequestId)
      syncedFlightRequestIds.add(flightRequestId)
    }

    return NextResponse.json({ ok: true, syncedFlightRequestIds: Array.from(syncedFlightRequestIds) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown webhook error" },
      { status: 500 }
    )
  }
}
