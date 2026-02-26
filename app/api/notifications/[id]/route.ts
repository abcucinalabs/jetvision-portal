import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type NotificationRow = {
  id: string
  title: string
  body: string
  from_user_id: string
  from_user_name: string
  to_role: "iso" | "manager" | "all"
  to_user_id: string | null
  created_at: string
  read: boolean
  read_at: string | null
  deleted: boolean
  deleted_at: string | null
  deleted_by_user_id: string | null
  read_by_user_ids: string[] | null
  deleted_by_user_ids: string[] | null
}

function toNotification(row: NotificationRow, viewerUserId?: string) {
  const readBy = row.read_by_user_ids || []
  const deletedBy = row.deleted_by_user_ids || []
  const isRead = viewerUserId ? readBy.includes(viewerUserId) : row.read
  const isDeleted = viewerUserId ? deletedBy.includes(viewerUserId) : row.deleted

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    toRole: row.to_role,
    toUserId: row.to_user_id || undefined,
    createdAt: row.created_at,
    read: isRead,
    readAt: row.read_at || undefined,
    deleted: isDeleted,
    deletedAt: row.deleted_at || undefined,
    deletedByUserId: row.deleted_by_user_id || undefined,
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null

    const { data: existing, error: existingError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .single()

    if (existingError) {
      if (existingError.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    const current = existing as NotificationRow

    if (body.read !== undefined) {
      updates.read = Boolean(body.read)
      updates.read_at = body.read ? new Date().toISOString() : null
      if (userId && body.read) {
        updates.read_by_user_ids = Array.from(new Set([...(current.read_by_user_ids || []), userId]))
      }
    }

    if (body.deleted !== undefined) {
      updates.deleted = Boolean(body.deleted)
      updates.deleted_at = body.deleted ? new Date().toISOString() : null
      updates.deleted_by_user_id = body.deleted ? body.deletedByUserId || null : null
      if (userId && body.deleted) {
        updates.deleted_by_user_ids = Array.from(new Set([...(current.deleted_by_user_ids || []), userId]))
      }
    } else if (body.deletedByUserId !== undefined) {
      updates.deleted_by_user_id = body.deletedByUserId || null
    }

    const { data, error } = await supabase
      .from("notifications")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toNotification(data as NotificationRow, userId || undefined) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
