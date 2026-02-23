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

// GET /api/avinode/rfqs/[id] - Download an RFQ with quote data
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const fields = req.nextUrl.searchParams.get("fields") || ""
    const baseUrl = getBaseUrl()
    const headers = getHeaders()

    const queryParams = fields ? `?fields=${fields}` : ""
    const res = await fetch(`${baseUrl}/rfqs/${id}${queryParams}`, { headers })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: "Avinode API error", status: res.status, details: data },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to Avinode", message: String(error) },
      { status: 500 }
    )
  }
}
