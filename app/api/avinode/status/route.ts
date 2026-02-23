import { NextResponse } from "next/server"

export async function GET() {
  const connected = Boolean(process.env.AVINODE_API_TOKEN && process.env.AVINODE_AUTH_TOKEN)
  return NextResponse.json({
    connected,
    baseUrl: process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api",
  })
}
