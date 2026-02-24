import { NextResponse } from "next/server"
import { normalizeAuthToken } from "@/lib/avinode-auth"

export async function GET() {
  const connected = Boolean(
    (process.env.AVINODE_API_TOKEN || "").trim() &&
      normalizeAuthToken(process.env.AVINODE_AUTH_TOKEN || "")
  )
  return NextResponse.json({
    connected,
    baseUrl: process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api",
  })
}
