import { NextRequest, NextResponse } from "next/server"

function getHeaders() {
  const apiToken = process.env.AVINODE_API_TOKEN || ""
  const authToken = process.env.AVINODE_AUTH_TOKEN || ""
  const product = process.env.AVINODE_PRODUCT || "JetStream Portal v1.0"
  const apiVersion = process.env.AVINODE_API_VERSION || "v1.0"
  const actAsAccount = process.env.AVINODE_ACT_AS_ACCOUNT || ""

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Avinode-ApiToken": apiToken,
    Authorization: `Bearer ${authToken}`,
    "X-Avinode-SentTimestamp": new Date().toISOString(),
    "X-Avinode-ApiVersion": apiVersion,
    "X-Avinode-Product": product,
  }
  if (actAsAccount) headers["X-Avinode-ActAsAccount"] = actAsAccount
  return headers
}

function getBaseUrl() {
  return process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
}

// GET /api/avinode/airports?filter=KTEB
export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get("filter") || ""
    if (!filter || filter.length < 2) {
      return NextResponse.json({ data: [] })
    }

    const baseUrl = getBaseUrl()
    const headers = getHeaders()

    const res = await fetch(
      `${baseUrl}/airports/search?filter=${encodeURIComponent(filter)}`,
      { headers }
    )

    const responseText = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: `Avinode returned non-JSON response (${res.status})`, data: [] },
        { status: 200 } // Return 200 with empty data to gracefully degrade
      )
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Avinode API error", status: res.status, details: data, data: [] },
        { status: 200 } // Gracefully degrade
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to connect to Avinode: ${error instanceof Error ? error.message : String(error)}`, data: [] },
      { status: 200 } // Gracefully degrade
    )
  }
}
