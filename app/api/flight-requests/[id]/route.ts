import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

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
  status: "pending" | "proposal_sent" | "accepted" | "declined" | "cancelled"
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.avinodeTripId !== undefined) updates.avinode_trip_id = body.avinodeTripId || null
    if (body.avinodeTripHref !== undefined) updates.avinode_trip_href = body.avinodeTripHref || null
    if (body.avinodeSearchLink !== undefined) updates.avinode_search_link = body.avinodeSearchLink || null
    if (body.avinodeViewLink !== undefined) updates.avinode_view_link = body.avinodeViewLink || null
    if (body.avinodeRfqIds !== undefined) updates.avinode_rfq_ids = body.avinodeRfqIds || null
    if (body.avinodeQuoteIds !== undefined) updates.avinode_quote_ids = body.avinodeQuoteIds || null
    if (body.avinodeQuoteCount !== undefined) updates.avinode_quote_count = body.avinodeQuoteCount || 0
    if (body.avinodeBestQuoteAmount !== undefined) updates.avinode_best_quote_amount = body.avinodeBestQuoteAmount || null
    if (body.avinodeBestQuoteCurrency !== undefined) updates.avinode_best_quote_currency = body.avinodeBestQuoteCurrency || null
    if (body.avinodeFirstQuoteAt !== undefined) updates.avinode_first_quote_at = body.avinodeFirstQuoteAt || null
    if (body.avinodeLastSyncAt !== undefined) updates.avinode_last_sync_at = body.avinodeLastSyncAt || null
    if (body.avinodeSlaDueAt !== undefined) updates.avinode_sla_due_at = body.avinodeSlaDueAt || null
    if (body.avinodeSlaStatus !== undefined) updates.avinode_sla_status = body.avinodeSlaStatus || null
    if (body.avinodeStatus !== undefined) updates.avinode_status = body.avinodeStatus || null

    const { data, error } = await supabase
      .from("flight_requests")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toFlightRequest(data as FlightRequestRow) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
