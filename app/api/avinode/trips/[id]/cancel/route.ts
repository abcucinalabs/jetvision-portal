import { NextRequest, NextResponse } from "next/server"

function getHeaders(req: NextRequest) {
  const apiToken = req.headers.get("x-avinode-apitoken") || process.env.AVINODE_API_TOKEN || ""
  const authToken = req.headers.get("x-avinode-authtoken") || process.env.AVINODE_AUTH_TOKEN || ""
  const product = req.headers.get("x-avinode-product") || "JetStream Portal v1.0"
  const apiVersion = req.headers.get("x-avinode-apiversion") || "v1.0"
  const actAsAccount = req.headers.get("x-avinode-actasaccount") || ""

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

function getBaseUrl(req: NextRequest) {
  return req.headers.get("x-avinode-baseurl") || process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
}

// PUT /api/avinode/trips/[id]/cancel
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const baseUrl = getBaseUrl(req)
    const headers = getHeaders(req)

    const res = await fetch(`${baseUrl}/trips/${id}/cancel`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: "Avinode API error", status: res.status, details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to Avinode", message: String(error) },
      { status: 500 }
    )
  }
}
