import { NextRequest, NextResponse } from "next/server"

// GET /api/avinode/test - Test connection by searching for a known airport
export async function GET(req: NextRequest) {
  try {
    const apiToken = req.nextUrl.searchParams.get("apiToken") || process.env.AVINODE_API_TOKEN || ""
    const authToken = req.nextUrl.searchParams.get("authToken") || process.env.AVINODE_AUTH_TOKEN || ""
    const baseUrl = req.nextUrl.searchParams.get("baseUrl") || process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
    const product = req.nextUrl.searchParams.get("product") || "JetStream Portal v1.0"
    const apiVersion = req.nextUrl.searchParams.get("apiVersion") || "v1.0"
    const actAsAccount = req.nextUrl.searchParams.get("actAsAccount") || ""

    if (!apiToken || !authToken) {
      return NextResponse.json(
        { error: "Missing API credentials", connected: false },
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
      "Accept-Encoding": "gzip",
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
        testResult: `Found ${data.data?.length ?? 0} airports matching "KJFK"`,
      })
    } else {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json({
        connected: false,
        error: `API returned ${res.status}`,
        details: errorData,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: "Connection failed", message: String(error) },
      { status: 500 }
    )
  }
}
