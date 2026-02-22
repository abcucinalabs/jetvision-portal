import { NextRequest, NextResponse } from "next/server"

// POST /api/avinode/test - Test connection by searching for a known airport
// Uses POST so credentials go in the body (JWTs can be very long and exceed URL limits in GET)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // AVINODE_API_TOKEN = OAuth Secret / API Key (X-Avinode-ApiToken header)
    // AVINODE_AUTH_TOKEN = Authentication Token / JWT Bearer (Authorization header)
    const apiToken = body.apiToken || process.env.AVINODE_API_TOKEN || ""
    const authToken = body.authToken || process.env.AVINODE_AUTH_TOKEN || ""
    const baseUrl = body.baseUrl || process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
    const product = body.product || "JetStream Portal v1.0"
    const apiVersion = body.apiVersion || "v1.0"
    const actAsAccount = body.actAsAccount || ""

    if (!apiToken || !authToken) {
      return NextResponse.json(
        { error: "Missing API credentials. Please enter both API Token and Authentication Token.", connected: false },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Avinode-ApiToken": apiToken,
      Authorization: `Bearer ${authToken}`,
      "X-Avinode-SentTimestamp": new Date().toISOString(),
      "X-Avinode-ApiVersion": apiVersion,
      "X-Avinode-Product": product,
    }
    if (actAsAccount) headers["X-Avinode-ActAsAccount"] = actAsAccount

    // Test with a simple airport search for "KJFK"
    const res = await fetch(
      `${baseUrl}/airports/search?filter=KJFK`,
      { headers }
    )

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        connected: true,
        environment: baseUrl.includes("sandbox") ? "sandbox" : "production",
        testResult: `Connected successfully. Found ${data.data?.length ?? 0} airports matching "KJFK"`,
      })
    } else {
      const errorText = await res.text().catch(() => "")
      let errorDetail = `API returned ${res.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorDetail = errorJson?.meta?.errors?.[0]?.message || errorJson?.message || errorDetail
      } catch {
        if (errorText) errorDetail += `: ${errorText.slice(0, 200)}`
      }
      return NextResponse.json({
        connected: false,
        error: errorDetail,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: `Connection failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
