import { NextRequest, NextResponse } from "next/server"

function getHeaders() {
  // AVINODE_API_TOKEN = OAuth Secret / API Key from Avinode developer portal (sent as X-Avinode-ApiToken)
  // AVINODE_AUTH_TOKEN = Authentication Token / JWT Bearer token from Avinode portal (sent as Authorization: Bearer)
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
    "Accept-Encoding": "gzip",
  }
  if (actAsAccount) {
    headers["X-Avinode-ActAsAccount"] = actAsAccount
  }
  return headers
}

function getBaseUrl() {
  return process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
}

// POST /api/avinode/trips - Create a trip in Avinode
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const baseUrl = getBaseUrl()
    const headers = getHeaders()

    const res = await fetch(`${baseUrl}/trips`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const responseText = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: `Avinode returned non-JSON response (${res.status}): ${responseText.slice(0, 300)}` },
        { status: res.status || 500 }
      )
    }

    if (!res.ok) {
      const firstError = ((data?.meta as { errors?: { message?: string; title?: string; path?: string }[] } | undefined)?.errors || [])[0]
      const errorMessage = firstError
        ? `${firstError.title || firstError.message || "Avinode validation error"}${firstError.path ? ` (${firstError.path})` : ""}`
        : (data?.error as string) || `Avinode API error ${res.status}`
      return NextResponse.json(
        { error: errorMessage, status: res.status, details: data },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to connect to Avinode: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
