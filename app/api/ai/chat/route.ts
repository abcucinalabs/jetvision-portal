import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

type ChatBody = {
  message?: unknown
  userId?: unknown
  userRole?: unknown
  history?: unknown
}

type ChatHistoryMessage = {
  role: "user" | "assistant"
  content: string
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
  avinode_quote_count: number | null
  avinode_best_quote_amount: number | null
  avinode_best_quote_currency: string | null
  avinode_last_sync_at: string | null
  avinode_sla_due_at: string | null
  avinode_sla_status: string | null
  avinode_status: string | null
  selected_quote_amount: number | null
  total_price: number | null
  proposal_sent_at: string | null
  client_decision_at: string | null
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

type NotificationRow = {
  id: string
  title: string
  body: string
  from_user_name: string
  to_role: "iso" | "manager" | "all"
  to_user_id: string | null
  created_at: string
  read_by_user_ids: string[] | null
  deleted_by_user_ids: string[] | null
}

type FlightRequestDraft = {
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  departure?: string
  arrival?: string
  departureDate?: string
  departureTime?: string
  returnDate?: string
  returnTime?: string
  passengers?: number
  specialRequests?: string
}

type ClientDraft = {
  name?: string
  email?: string
  phone?: string
}

type IsoActionModelResponse = {
  mode?: "answer" | "draft_flight_request" | "draft_client"
  reply?: string
  draft?: Record<string, unknown>
}

type AssistantAction =
  | {
    type: "draft_flight_request"
    draft: FlightRequestDraft
    missingFields: string[]
    ready: boolean
  }
  | {
    type: "draft_client"
    draft: ClientDraft
    missingFields: string[]
    ready: boolean
  }

function isMissingVisibilityColumn(message: string | undefined) {
  return (message || "").toLowerCase().includes("visible_to_iso_ids")
}

function isNotificationVisibleToUser(notification: NotificationRow, userRole: "iso" | "manager", userId: string) {
  if ((notification.deleted_by_user_ids || []).includes(userId)) return false
  if (notification.to_role === "all") return true
  if (notification.to_role !== userRole) return false
  if (notification.to_user_id && notification.to_user_id !== userId) return false
  return true
}

function buildContext(
  requests: FlightRequestRow[],
  customers: CustomerRow[],
  notifications: NotificationRow[],
  userId: string
) {
  const requestLines = requests.slice(0, 80).map((row) => (
    [
      `- [${row.id}] ${row.client_name} (${row.status})`,
      `${row.departure} -> ${row.arrival}`,
      `depart ${row.departure_date}${row.departure_time ? ` ${row.departure_time}` : ""}`,
      row.return_date ? `return ${row.return_date}${row.return_time ? ` ${row.return_time}` : ""}` : null,
      `pax ${row.passengers}`,
      row.iso_name ? `iso ${row.iso_name}` : null,
      row.avinode_status ? `avinode ${row.avinode_status}` : null,
      row.avinode_sla_status ? `sla ${row.avinode_sla_status}` : null,
      row.avinode_sla_due_at ? `sla_due ${row.avinode_sla_due_at}` : null,
      typeof row.avinode_quote_count === "number" ? `quotes ${row.avinode_quote_count}` : null,
      row.avinode_best_quote_amount ? `best_quote ${row.avinode_best_quote_amount}${row.avinode_best_quote_currency ? ` ${row.avinode_best_quote_currency}` : ""}` : null,
      row.selected_quote_amount ? `selected_quote ${row.selected_quote_amount}` : null,
      row.total_price ? `total ${row.total_price}` : null,
      row.proposal_sent_at ? `proposal_sent ${row.proposal_sent_at}` : null,
      row.client_decision_at ? `client_decision ${row.client_decision_at}` : null,
      row.avinode_last_sync_at ? `synced ${row.avinode_last_sync_at}` : null,
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

  const notificationLines = notifications.slice(0, 80).map((row) => {
    const readBy = row.read_by_user_ids || []
    const isRead = readBy.includes(userId)
    return [
      `- [${row.id}] ${isRead ? "read" : "unread"}`,
      row.title,
      `from ${row.from_user_name}`,
      `audience ${row.to_role}${row.to_user_id ? `:${row.to_user_id}` : ""}`,
      `created ${row.created_at}`,
      row.body,
    ].filter(Boolean).join(" | ")
  })

  return [
    "Flight Requests:",
    requestLines.length > 0 ? requestLines.join("\n") : "- none",
    "",
    "Customers:",
    customerLines.length > 0 ? customerLines.join("\n") : "- none",
    "",
    "Notifications:",
    notificationLines.length > 0 ? notificationLines.join("\n") : "- none",
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

function normalizeHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const item = entry as { role?: unknown; content?: unknown }
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return null
      const content = item.content.trim()
      if (!content) return null
      return { role: item.role, content }
    })
    .filter((item): item is ChatHistoryMessage => Boolean(item))
    .slice(-12)
}

function buildConversationTranscript(history: ChatHistoryMessage[], latestMessage: string) {
  const combined = [...history]
  const last = combined[combined.length - 1]
  if (!last || last.role !== "user" || last.content !== latestMessage) {
    combined.push({ role: "user", content: latestMessage })
  }

  return combined
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n")
}

function parseJsonObject<T>(text: string): T | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || trimmed

  try {
    return JSON.parse(candidate) as T
  } catch {
    return null
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeFlightRequestDraft(value: Record<string, unknown> | undefined): FlightRequestDraft {
  const passengersRaw = value?.passengers
  const passengersNumber = typeof passengersRaw === "number"
    ? passengersRaw
    : typeof passengersRaw === "string"
      ? Number.parseInt(passengersRaw, 10)
      : NaN

  return {
    clientName: cleanText(value?.clientName),
    clientEmail: cleanText(value?.clientEmail),
    clientPhone: cleanText(value?.clientPhone),
    departure: cleanText(value?.departure),
    arrival: cleanText(value?.arrival),
    departureDate: cleanText(value?.departureDate),
    departureTime: cleanText(value?.departureTime),
    returnDate: cleanText(value?.returnDate),
    returnTime: cleanText(value?.returnTime),
    passengers: Number.isFinite(passengersNumber) && passengersNumber > 0 ? passengersNumber : undefined,
    specialRequests: cleanText(value?.specialRequests),
  }
}

function normalizeClientDraft(value: Record<string, unknown> | undefined): ClientDraft {
  return {
    name: cleanText(value?.name),
    email: cleanText(value?.email),
    phone: cleanText(value?.phone),
  }
}

function getFlightRequestMissingFields(draft: FlightRequestDraft) {
  const missing: string[] = []

  if (!draft.clientName) missing.push("clientName")
  if (!draft.clientEmail) missing.push("clientEmail")
  if (!draft.departure) missing.push("departure")
  if (!draft.arrival) missing.push("arrival")
  if (!draft.departureDate) missing.push("departureDate")
  if (!draft.passengers) missing.push("passengers")

  const hasAnyReturnField = Boolean(draft.returnDate || draft.returnTime)
  if (hasAnyReturnField && !draft.returnDate) missing.push("returnDate")
  if (hasAnyReturnField && !draft.returnTime) missing.push("returnTime")

  return missing
}

function getClientMissingFields(draft: ClientDraft) {
  const missing: string[] = []
  if (!draft.name) missing.push("name")
  if (!draft.email) missing.push("email")
  return missing
}

function formatMissingFieldLabels(fields: string[]) {
  const labels: Record<string, string> = {
    clientName: "client name",
    clientEmail: "client email",
    clientPhone: "client phone",
    departure: "departure airport",
    arrival: "arrival airport",
    departureDate: "departure date",
    departureTime: "departure time",
    returnDate: "return date",
    returnTime: "return time",
    passengers: "passenger count",
    specialRequests: "special requests",
    name: "client name",
    email: "client email",
    phone: "client phone",
  }

  return fields.map((field) => labels[field] || field)
}

function buildCompletionReply(target: "flight_request" | "client") {
  if (target === "flight_request") {
    return "I drafted the new flight request. Review it on the page and submit it if everything looks good. Is there anything else I can help you with?"
  }

  return "I drafted the new client. Review it on the page and save it if everything looks good. Is there anything else I can help you with?"
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const userId = typeof body.userId === "string" ? body.userId : ""
    const userRole = body.userRole === "iso" || body.userRole === "manager" ? body.userRole : null
    const history = normalizeHistory(body.history)

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
      .select("id, iso_id, iso_name, client_name, client_email, client_phone, departure, arrival, departure_date, departure_time, return_date, return_time, passengers, special_requests, status, created_at, avinode_quote_count, avinode_best_quote_amount, avinode_best_quote_currency, avinode_last_sync_at, avinode_sla_due_at, avinode_sla_status, avinode_status, selected_quote_amount, total_price, proposal_sent_at, client_decision_at")
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

    const notificationsResult = await supabase
      .from("notifications")
      .select("id, title, body, from_user_name, to_role, to_user_id, created_at, read_by_user_ids, deleted_by_user_ids")
      .order("created_at", { ascending: false })
      .limit(200)

    if (notificationsResult.error) {
      return NextResponse.json({ error: notificationsResult.error.message }, { status: 500 })
    }

    const scopedNotifications = ((notificationsResult.data || []) as NotificationRow[]).filter((row) => (
      isNotificationVisibleToUser(row, userRole, userId)
    ))

    const context = buildContext(requests, scopedCustomers, scopedNotifications, userId)
    const transcript = buildConversationTranscript(history, message)

    if (userRole === "iso") {
      const isoInstruction = [
        "You are Jetvision Portal AI Assistant for an ISO user.",
        "Use ONLY the provided data context and conversation.",
        "You can either answer operational questions or help draft one of two actions: creating a new client, or creating a new flight request.",
        "When the user is trying to create a client, set mode to draft_client.",
        "When the user is trying to create a flight request, set mode to draft_flight_request.",
        "When neither applies, set mode to answer.",
        "For draft modes, extract only fields explicitly stated by the user in this conversation.",
        "Do not invent values.",
        "Return ONLY valid JSON with keys: mode, reply, draft.",
        "For draft_flight_request use draft keys: clientName, clientEmail, clientPhone, departure, arrival, departureDate, departureTime, returnDate, returnTime, passengers, specialRequests.",
        "For draft_client use draft keys: name, email, phone.",
      ].join(" ")

      const isoPrompt = [
        `Current date: ${new Date().toISOString().slice(0, 10)}`,
        `User id: ${userId}`,
        "",
        "Data context:",
        context,
        "",
        "Conversation:",
        transcript,
        "",
        "Return JSON now.",
      ].join("\n")

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: isoInstruction }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: isoPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
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

      const raw = extractGeminiText(geminiJson)
      if (!raw) {
        return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 500 })
      }

      const parsed = parseJsonObject<IsoActionModelResponse>(raw)
      if (!parsed || !parsed.mode) {
        return NextResponse.json({ error: "AI returned an invalid structured response." }, { status: 500 })
      }

      let answer = parsed.reply?.trim() || ""
      let action: AssistantAction | undefined

      if (parsed.mode === "draft_flight_request") {
        const draft = normalizeFlightRequestDraft(parsed.draft)
        const missingFields = getFlightRequestMissingFields(draft)
        const ready = missingFields.length === 0
        action = {
          type: "draft_flight_request",
          draft,
          missingFields,
          ready,
        }

        if (ready) {
          answer = buildCompletionReply("flight_request")
        } else if (!answer) {
          answer = `I can set up the request. I still need ${formatMissingFieldLabels(missingFields).join(", ")}.`
        }
      } else if (parsed.mode === "draft_client") {
        const draft = normalizeClientDraft(parsed.draft)
        const missingFields = getClientMissingFields(draft)
        const ready = missingFields.length === 0
        action = {
          type: "draft_client",
          draft,
          missingFields,
          ready,
        }

        if (ready) {
          answer = buildCompletionReply("client")
        } else if (!answer) {
          answer = `I can add the client. I still need ${formatMissingFieldLabels(missingFields).join(", ")}.`
        }
      }

      if (!answer) {
        answer = "I can help with request follow-ups, new clients, or a new flight request."
      }

      return NextResponse.json({
        data: {
          answer,
          action,
          recordCounts: {
            flightRequests: requests.length,
            customers: scopedCustomers.length,
            notifications: scopedNotifications.length,
          },
        },
      })
    }

    const systemInstruction = [
      "You are Jetvision Portal AI Assistant.",
      "Answer questions using ONLY the provided Flight Request, Customer, and Notification data context.",
      "If information is unavailable, clearly say you cannot find it in the available data.",
      "Be concise and operationally useful.",
      "When asked about tasks, follow-ups, priorities, or what to do next, infer the best next actions from statuses, proposal state, SLA fields, and unread notifications.",
      "You can recommend actions, but do not claim you completed anything in the product.",
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
      "Conversation:",
      transcript,
      "",
      `Latest user question: ${message}`,
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
          notifications: scopedNotifications.length,
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
