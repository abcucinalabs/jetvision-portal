import { NextResponse } from "next/server"
import { syncFlightRequestPipeline } from "@/lib/avinode-server"

type FlightRequestRow = {
  id: string
  iso_id: string
  iso_name: string
  client_name: string
  client_email: string
  client_phone: string
  departure: string
  arrival: string
  departure_date: string
  return_date: string | null
  passengers: number
  special_requests: string | null
  status: "pending" | "proposal_sent" | "accepted" | "declined"
  created_at: string
  avinode_trip_id: string | null
  avinode_trip_href: string | null
  avinode_search_link: string | null
  avinode_view_link: string | null
  avinode_rfq_ids: string[] | null
  avinode_quote_ids: string[] | null
  avinode_quote_count: number | null
  avinode_best_quote_amount: number | null
  avinode_best_quote_currency: string | null
  avinode_first_quote_at: string | null
  avinode_last_sync_at: string | null
  avinode_sla_due_at: string | null
  avinode_sla_status: "on_track" | "at_risk" | "overdue" | "met" | null
  avinode_status: "not_sent" | "sent_to_avinode" | "rfq_sent" | "quotes_received" | "booked" | "cancelled" | null
}

function toFlightRequest(row: FlightRequestRow) {
  return {
    id: row.id,
    isoId: row.iso_id,
    isoName: row.iso_name,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    departure: row.departure,
    arrival: row.arrival,
    departureDate: row.departure_date,
    returnDate: row.return_date || undefined,
    passengers: row.passengers,
    specialRequests: row.special_requests || undefined,
    status: row.status,
    createdAt: row.created_at,
    avinodeTripId: row.avinode_trip_id || undefined,
    avinodeTripHref: row.avinode_trip_href || undefined,
    avinodeSearchLink: row.avinode_search_link || undefined,
    avinodeViewLink: row.avinode_view_link || undefined,
    avinodeRfqIds: row.avinode_rfq_ids || undefined,
    avinodeQuoteIds: row.avinode_quote_ids || undefined,
    avinodeQuoteCount: row.avinode_quote_count || 0,
    avinodeBestQuoteAmount: row.avinode_best_quote_amount || undefined,
    avinodeBestQuoteCurrency: row.avinode_best_quote_currency || undefined,
    avinodeFirstQuoteAt: row.avinode_first_quote_at || undefined,
    avinodeLastSyncAt: row.avinode_last_sync_at || undefined,
    avinodeSlaDueAt: row.avinode_sla_due_at || undefined,
    avinodeSlaStatus: row.avinode_sla_status || undefined,
    avinodeStatus: row.avinode_status || undefined,
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await syncFlightRequestPipeline(id)
    return NextResponse.json({ data: toFlightRequest(data as FlightRequestRow) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown sync error" },
      { status: 500 }
    )
  }
}
