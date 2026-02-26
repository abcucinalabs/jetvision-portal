import { NextRequest, NextResponse } from "next/server"
import { buildAuthorizationHeader } from "@/lib/avinode-auth"

function getHeaders() {
  const apiToken = process.env.AVINODE_API_TOKEN || ""
  const authToken = process.env.AVINODE_AUTH_TOKEN || ""
  const product = process.env.AVINODE_PRODUCT || "JetStream Portal v1.0"
  const apiVersion = process.env.AVINODE_API_VERSION || "v1.0"
  const actAsAccount = process.env.AVINODE_ACT_AS_ACCOUNT || ""

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Avinode-ApiToken": apiToken,
    Authorization: buildAuthorizationHeader(authToken),
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

function pickErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const record = data as Record<string, unknown>
  const meta = record.meta as Record<string, unknown> | undefined
  const metaErrors = Array.isArray(meta?.errors) ? meta?.errors : []
  const firstMetaError = metaErrors[0]
  if (firstMetaError && typeof firstMetaError === "object") {
    const maybeMessage = (firstMetaError as Record<string, unknown>).message
    const maybeTitle = (firstMetaError as Record<string, unknown>).title
    if (typeof maybeTitle === "string" && maybeTitle.trim()) return maybeTitle
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
  }
  const error = record.error
  if (typeof error === "string" && error.trim()) return error
  const message = record.message
  if (typeof message === "string" && message.trim()) return message
  return fallback
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

    const chatRes = await fetch(`${getBaseUrl()}/tripmsgs/${id}/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    const chatData = await chatRes.json().catch(() => ({}))

    if (chatRes.ok) {
      return NextResponse.json(chatData)
    }

    // Fallback for tenants that require POST /tripmsgs instead of /tripmsgs/{id}/chat.
    const tripMsgRes = await fetch(`${getBaseUrl()}/tripmsgs/${id}`, { headers: getHeaders() })
    const tripMsgData = await tripMsgRes.json().catch(() => ({}))
    const tripMsgRecord = tripMsgData && typeof tripMsgData === "object" ? (tripMsgData as Record<string, unknown>) : {}
    const tripMsgPayload = tripMsgRecord.data && typeof tripMsgRecord.data === "object"
      ? (tripMsgRecord.data as Record<string, unknown>)
      : tripMsgRecord

    const fallbackTripId = typeof tripMsgPayload.tripId === "string" ? tripMsgPayload.tripId : ""
    const liftArray = Array.isArray(tripMsgPayload.lift) ? tripMsgPayload.lift : []
    const fallbackLiftId = payload.liftId
      ? String(payload.liftId)
      : liftArray[0] && typeof liftArray[0] === "object" && (liftArray[0] as Record<string, unknown>).id
      ? String((liftArray[0] as Record<string, unknown>).id)
      : undefined

    if (fallbackTripId && typeof payload.message === "string" && payload.message.trim()) {
      const fallbackPayload: Record<string, unknown> = {
        tripId: fallbackTripId,
        message: payload.message,
      }
      if (fallbackLiftId) fallbackPayload.liftId = fallbackLiftId

      const fallbackRes = await fetch(`${getBaseUrl()}/tripmsgs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(fallbackPayload),
      })
      const fallbackData = await fallbackRes.json().catch(() => ({}))
      if (fallbackRes.ok) {
        return NextResponse.json(fallbackData)
      }

      const fallbackError = pickErrorMessage(fallbackData, `Avinode API error ${fallbackRes.status}`)
      return NextResponse.json(
        {
          error: fallbackError,
          status: fallbackRes.status,
          details: fallbackData,
          primaryError: pickErrorMessage(chatData, `Avinode API error ${chatRes.status}`),
          primaryStatus: chatRes.status,
          primaryDetails: chatData,
        },
        { status: fallbackRes.status }
      )
    }

    return NextResponse.json(
      {
        error: pickErrorMessage(chatData, `Avinode API error ${chatRes.status}`),
        status: chatRes.status,
        details: chatData,
      },
      { status: chatRes.status }
    )
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to Avinode", message: String(error) }, { status: 500 })
  }
}
