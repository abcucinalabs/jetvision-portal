import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string | null
  created_by_user_id: string | null
  visible_to_iso_ids?: string[] | null
  created_at: string
}

function toCustomer(row: CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    createdByUserId: row.created_by_user_id || undefined,
    visibleToIsoIds: row.visible_to_iso_ids || (row.created_by_user_id ? [row.created_by_user_id] : []),
    createdAt: row.created_at,
  }
}

function isMissingVisibilityColumn(message: string | undefined) {
  return (message || "").toLowerCase().includes("visible_to_iso_ids")
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    if (typeof body.name === "string") updates.name = body.name
    if (typeof body.email === "string") updates.email = body.email
    if (typeof body.phone === "string") updates.phone = body.phone || null
    if (Array.isArray(body.visibleToIsoIds)) updates.visible_to_iso_ids = body.visibleToIsoIds

    const primary = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select("id, name, email, phone, created_by_user_id, visible_to_iso_ids, created_at")
      .single()
    let data = (primary.data as CustomerRow | null) || null
    let error = primary.error

    if (error && isMissingVisibilityColumn(error.message)) {
      const fallbackUpdates: Record<string, unknown> = {}
      if (typeof body.name === "string") fallbackUpdates.name = body.name
      if (typeof body.email === "string") fallbackUpdates.email = body.email
      if (typeof body.phone === "string") fallbackUpdates.phone = body.phone || null

      const fallback = await supabase
        .from("customers")
        .update(fallbackUpdates)
        .eq("id", id)
        .select("id, name, email, phone, created_by_user_id, created_at")
        .single()
      data = (fallback.data as CustomerRow | null) || null
      error = fallback.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toCustomer(data as CustomerRow) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
