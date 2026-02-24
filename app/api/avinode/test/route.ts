import { NextRequest, NextResponse } from "next/server"
import { buildAuthorizationHeader } from "@/lib/avinode-auth"

// POST /api/avinode/test - Test env-based server connection by searching for a known airport
export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}))

    const apiToken = process.env.AVINODE_API_TOKEN || ""
    const authToken = process.env.AVINODE_AUTH_TOKEN || ""
    const baseUrl = process.env.AVINODE_BASE_URL || "https://sandbox.avinode.com/api"
    const product = process.env.AVINODE_PRODUCT || "JetStream Portal v1.0"
    const apiVersion = process.env.AVINODE_API_VERSION || "v1.0"
    const actAsAccount = process.env.AVINODE_ACT_AS_ACCOUNT || ""

    if (!apiToken || !authToken) {
      return NextResponse.json(
        { error: "Missing Avinode env vars. Set AVINODE_API_TOKEN and AVINODE_AUTH_TOKEN.", connected: false },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Avinode-ApiToken": apiToken,
      Authorization: buildAuthorizationHeader(authToken),
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
