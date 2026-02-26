import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 503 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 503 }
    )
  }
}
