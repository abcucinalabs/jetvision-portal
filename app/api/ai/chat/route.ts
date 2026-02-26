import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type ChatBody = {
  message?: unknown
  userId?: unknown
  userRole?: unknown
}

type FlightRequestRow = {
  id: string
  iso_id: string
  iso_name: string
  client_name: string
  client_email: string
  client_phone: string | null
  departure: string
  arrival: string
  departure_date: string
  departure_time: string | null
  return_date: string | null
  return_time: string | null
  passengers: number
  special_requests: string | null
  status: string
  created_at: string
}

type CustomerRow = {
  id: string
  name: string
  email: string
  phone: string | null
  created_by_user_id: string | null
  visible_to_iso_ids?: string[] | null
  created_at: string
}

function isMissingVisibilityColumn(message: string | undefined) {
  return (message || "").toLowerCase().includes("visible_to_iso_ids")
}

function buildContext(requests: FlightRequestRow[], customers: CustomerRow[]) {
  const requestLines = requests.slice(0, 80).map((row) => (
    [
      `- [${row.id}] ${row.client_name} (${row.status})`,
      `${row.departure} -> ${row.arrival}`,
      `depart ${row.departure_date}${row.departure_time ? ` ${row.departure_time}` : ""}`,
      row.return_date ? `return ${row.return_date}${row.return_time ? ` ${row.return_time}` : ""}` : null,
      `pax ${row.passengers}`,
      row.iso_name ? `iso ${row.iso_name}` : null,
      row.special_requests ? `notes: ${row.special_requests}` : null,
    ].filter(Boolean).join(" | ")
  ))

  const customerLines = customers.slice(0, 120).map((row) => (
    [
      `- [${row.id}] ${row.name}`,
      row.email ? `email ${row.email}` : null,
      row.phone ? `phone ${row.phone}` : null,
      row.created_by_user_id ? `owner ${row.created_by_user_id}` : null,
      row.visible_to_iso_ids && row.visible_to_iso_ids.length > 0 ? `visible_to ${row.visible_to_iso_ids.join(",")}` : null,
    ].filter(Boolean).join(" | ")
  ))

  return [
    "Flight Requests:",
    requestLines.length > 0 ? requestLines.join("\n") : "- none",
    "",
    "Customers:",
    customerLines.length > 0 ? customerLines.join("\n") : "- none",
  ].join("\n")
}

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const parts = data.candidates?.[0]?.content?.parts || []
  const combined = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim()

  return combined || null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const userId = typeof body.userId === "string" ? body.userId : ""
    const userRole = body.userRole === "iso" || body.userRole === "manager" ? body.userRole : null

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }

    if (!userId || !userRole) {
      return NextResponse.json({ error: "User context is required." }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()

    const requestsQuery = supabase
      .from("flight_requests")
      .select("id, iso_id, iso_name, client_name, client_email, client_phone, departure, arrival, departure_date, departure_time, return_date, return_time, passengers, special_requests, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200)

    const scopedRequestsQuery = userRole === "iso" ? requestsQuery.eq("iso_id", userId) : requestsQuery
    const requestsResult = await scopedRequestsQuery
    if (requestsResult.error) {
      return NextResponse.json({ error: requestsResult.error.message }, { status: 500 })
    }
    const requests = ((requestsResult.data || []) as FlightRequestRow[])

    const customerSelect = "id, name, email, phone, created_by_user_id, visible_to_iso_ids, created_at"
    const customerFallbackSelect = "id, name, email, phone, created_by_user_id, created_at"
    const primaryCustomers = await supabase
      .from("customers")
      .select(customerSelect)
      .order("created_at", { ascending: false })
      .limit(300)

    let customers = ((primaryCustomers.data || []) as CustomerRow[])
    let customersError = primaryCustomers.error
    if (customersError && isMissingVisibilityColumn(customersError.message)) {
      const fallback = await supabase
        .from("customers")
        .select(customerFallbackSelect)
        .order("created_at", { ascending: false })
        .limit(300)
      customers = ((fallback.data || []) as CustomerRow[])
      customersError = fallback.error
    }
    if (customersError) {
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    const scopedCustomers = (userRole === "manager"
      ? customers
      : customers.filter((row) => {
        if (row.created_by_user_id === userId) return true
        if (!Array.isArray(row.visible_to_iso_ids)) return false
        return row.visible_to_iso_ids.includes(userId)
      }))

    const context = buildContext(requests, scopedCustomers)
    const systemInstruction = [
      "You are Jetvision Portal AI Assistant.",
      "Answer questions using ONLY the provided Flight Request and Customer data context.",
      "If information is unavailable, clearly say you cannot find it in the available data.",
      "Be concise and operationally useful.",
      "Do not invent records, IDs, statuses, or values.",
    ].join(" ")

    const prompt = [
      `Current date: ${new Date().toISOString().slice(0, 10)}`,
      `User role: ${userRole}`,
      `User id: ${userId}`,
      "",
      "Data context:",
      context,
      "",
      `User question: ${message}`,
    ].join("\n")

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700,
          },
        }),
      }
    )

    const geminiJson = await geminiResponse.json().catch(() => ({}))
    if (!geminiResponse.ok) {
      const errorMessage =
        (geminiJson as { error?: { message?: string } })?.error?.message ||
        `Gemini request failed: HTTP ${geminiResponse.status}`
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    const text = extractGeminiText(geminiJson)
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        answer: text,
        recordCounts: {
          flightRequests: requests.length,
          customers: scopedCustomers.length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
