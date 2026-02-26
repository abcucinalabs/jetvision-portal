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

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || undefined
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data || []) as NotificationRow[]
    const visibleRows = userId
      ? rows.filter((row) => !(row.deleted_by_user_ids || []).includes(userId))
      : rows.filter((row) => !row.deleted)
    return NextResponse.json({ data: visibleRows.map((row) => toNotification(row, userId)) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const payload = {
      title: body.title,
      body: body.body,
      from_user_id: body.fromUserId,
      from_user_name: body.fromUserName,
      to_role: body.toRole,
      to_user_id: body.toUserId || null,
      read_by_user_ids: [],
      deleted_by_user_ids: [],
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toNotification(data as NotificationRow) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
