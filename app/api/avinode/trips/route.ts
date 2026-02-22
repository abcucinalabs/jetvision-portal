import { NextRequest, NextResponse } from "next/server"

function getHeaders(req: NextRequest) {
  // AVINODE_API_TOKEN = OAuth Secret / API Key from Avinode developer portal (sent as X-Avinode-ApiToken)
  // AVINODE_AUTH_TOKEN = Authentication Token / JWT Bearer token from Avinode portal (sent as Authorization: Bearer)
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
    "Accept-Encoding": "gzip",
  }
  if (actAsAccount) {
    headers["X-Avinode-ActAsAccount"] = actAsAccount
  }
  return headers
}

function getBaseUrl(req: NextRequest) {
  return req.headers.get("x-avinode-baseurl") || process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
}

// POST /api/avinode/trips - Create a trip in Avinode
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const baseUrl = getBaseUrl(req)
    const headers = getHeaders(req)

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
      const errorMessage = (data?.meta as Record<string, unknown[]>)?.errors?.[0]
        ? ((data.meta as Record<string, { message: string }[]>).errors[0].message)
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
