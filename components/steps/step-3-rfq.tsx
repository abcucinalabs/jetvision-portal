"use client"

import { useEffect, useState } from "react"
import { Send, ExternalLink, CheckCircle2, Loader2, MessageSquare, RefreshCw } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { chatTripRequest, getQuoteById, getRfq, getTripMessage } from "@/lib/avinode-client"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
  onSync?: () => Promise<void>
}

type SellerInfo = {
  key: string
  sellerLiftId?: string
  tripMessageId?: string
  quoteId?: string
  sellerCompanyName: string
  sellerCompanyId?: string
  sellerEmail?: string
  sellerPhone?: string
  sourcingDisplayStatus?: string
  sourcingStatus?: number
  aircraftType?: string
  aircraftCategory?: string
  tailNumber?: string
  seatCapacity?: number
  yearOfMake?: number
  latestQuoteAmount?: number
  latestQuoteCurrency?: string
  latestQuoteValidUntil?: string
  latestQuoteCreatedOn?: string
}

type RfqGroup = {
  rfqId: string
  status?: string
  createdOn?: string
  tripMessageId?: string
  tripMessageIds: string[]
  sellers: SellerInfo[]
}

type ChatDirection = "incoming" | "outgoing" | "unknown"

type ChatExchange = {
  key: string
  message: string
  createdOn?: string
  sender?: string
  direction: ChatDirection
  liftId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getStringCaseInsensitive(source: Record<string, unknown>, keys: string[]): string | undefined {
  const wanted = new Set(keys.map((k) => k.toLowerCase()))
  for (const [key, value] of Object.entries(source)) {
    if (!wanted.has(key.toLowerCase())) continue
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function findNestedName(value: unknown, depth = 0): string | undefined {
  if (depth > 3) return undefined
  if (typeof value === "string") return value.trim() || undefined
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedName(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (!isRecord(value)) return undefined

  const direct = getStringCaseInsensitive(value, [
    "displayName",
    "displayname",
    "name",
    "companyName",
    "companyname",
    "sellerName",
    "sellername",
    "sellerCompanyName",
    "sellercompanyname",
    "operatorName",
    "operatorname",
  ])
  if (direct) return direct

  for (const next of Object.values(value)) {
    const found = findNestedName(next, depth + 1)
    if (found) return found
  }
  return undefined
}

function getFirstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function getFirstBoolean(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "boolean") return value
  }
  return undefined
}

function normalizeDirection(raw: string): ChatDirection {
  const value = raw.trim().toLowerCase()
  if (!value) return "unknown"
  if (
    value.includes("incoming") ||
    value.includes("fromseller") ||
    value.includes("from_seller") ||
    value.includes("operator")
  ) {
    return "incoming"
  }
  if (
    value.includes("outgoing") ||
    value.includes("mine") ||
    value.includes("frombuyer") ||
    value.includes("from_buyer")
  ) {
    return "outgoing"
  }
  return "unknown"
}

function extractChatExchanges(rawPayload: Record<string, unknown> | undefined, seller: SellerInfo): ChatExchange[] {
  if (!rawPayload) return []

  const payload = isRecord(rawPayload.data) ? (rawPayload.data as Record<string, unknown>) : rawPayload
  const items: ChatExchange[] = []
  const seen = new Set<string>()

  const pushItem = (record: Record<string, unknown>, depth: number) => {
    const message = getFirstString(record, ["message", "text", "body", "chatMessage", "messageText"])
    if (!message) return

    const createdOn = getFirstString(record, ["createdOn", "createdAt", "timestamp", "sentOn", "dateTime"])
    const senderName =
      getFirstString(record, ["senderName", "fromName", "authorName", "userName", "operatorName"]) ||
      (isRecord(record.sender) ? findNestedName(record.sender) : undefined) ||
      (isRecord(record.from) ? findNestedName(record.from) : undefined) ||
      (isRecord(record.author) ? findNestedName(record.author) : undefined) ||
      undefined

    const liftId = getFirstString(record, ["liftId", "sellerLiftId"])
    const fromSeller = getFirstBoolean(record, ["isFromSeller", "fromSeller"])
    const isMine = getFirstBoolean(record, ["isMine", "mine"])
    const directionRaw =
      getFirstString(record, ["direction", "messageDirection", "chatDirection", "eventType"]) ||
      (typeof record.type === "string" ? record.type : undefined)

    let direction: ChatDirection = "unknown"
    if (fromSeller === true) direction = "incoming"
    if (fromSeller === false) direction = "outgoing"
    if (isMine === true) direction = "outgoing"
    if (direction === "unknown" && directionRaw) {
      direction = normalizeDirection(directionRaw)
    }
    if (
      direction === "unknown" &&
      senderName &&
      seller.sellerCompanyName &&
      senderName.toLowerCase().includes(seller.sellerCompanyName.toLowerCase())
    ) {
      direction = "incoming"
    }

    const uniqueKey = `${createdOn || "na"}|${message}|${liftId || "na"}|${depth}`
    if (seen.has(uniqueKey)) return
    seen.add(uniqueKey)

    items.push({
      key: uniqueKey,
      message,
      createdOn,
      sender: senderName,
      direction,
      liftId,
    })
  }

  const walk = (value: unknown, depth: number) => {
    if (depth > 6) return
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, depth + 1)
      return
    }
    if (!isRecord(value)) return
    pushItem(value, depth)
    for (const child of Object.values(value)) {
      walk(child, depth + 1)
    }
  }

  walk(payload, 0)

  return items.sort((a, b) => {
    const t1 = a.createdOn ? Date.parse(a.createdOn) : NaN
    const t2 = b.createdOn ? Date.parse(b.createdOn) : NaN
    if (Number.isNaN(t1) && Number.isNaN(t2)) return 0
    if (Number.isNaN(t1)) return -1
    if (Number.isNaN(t2)) return 1
    return t1 - t2
  })
}

function formatChatDate(value?: string): string {
  if (!value) return "Unknown time"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

function extractTripResourceId(request: FlightRequest): string | null {
  const direct = String(request.avinodeTripId || "")
  if (direct.startsWith("atrip-")) return direct

  const href = String(request.avinodeTripHref || "")
  const hrefMatch = href.match(/\/trips\/(atrip-[A-Za-z0-9-]+)/)
  if (hrefMatch?.[1]) return hrefMatch[1]

  const searchLink = String(request.avinodeSearchLink || "")
  const searchMatch = searchLink.match(/\/search\/load\/(atrip-[A-Za-z0-9-]+)/)
  if (searchMatch?.[1]) return searchMatch[1]

  return null
}

export function Step3Rfq({ request, currentUser, onUpdate, onSync }: Props) {
  const isManager = currentUser.role === "manager"
  const [loading, setLoading] = useState(false)
  const [rfqLoading, setRfqLoading] = useState(false)
  const [rfqSyncing, setRfqSyncing] = useState(false)
  const [rfqData, setRfqData] = useState<Record<string, unknown>[]>([])
  const [quoteById, setQuoteById] = useState<Record<string, Record<string, unknown>>>({})
  const [tripMessagesById, setTripMessagesById] = useState<Record<string, Record<string, unknown>>>({})
  const [tripMessageLoadingById, setTripMessageLoadingById] = useState<Record<string, boolean>>({})
  const [tripMessageErrorById, setTripMessageErrorById] = useState<Record<string, string>>({})
  const [rfqError, setRfqError] = useState<string | null>(null)
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({})
  const [chatSendingKey, setChatSendingKey] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isManager) return
    if (!request.avinodeRfqIds || request.avinodeRfqIds.length === 0) {
      setRfqData([])
      setRfqError(null)
      return
    }

    let cancelled = false
    const loadRfqData = async () => {
      setRfqLoading(true)
      setRfqError(null)
      try {
        const results = await Promise.all(
          request.avinodeRfqIds!.map(async (rfqId) => {
            const response = await getRfq(rfqId)
            return response.data as unknown as Record<string, unknown>
          })
        )

        const quoteIds = new Set<string>()
        for (const rfq of results) {
          const sellerLift = Array.isArray(rfq.sellerLift) ? rfq.sellerLift : []
          for (const rawSeller of sellerLift) {
            if (!isRecord(rawSeller)) continue
            const links = isRecord(rawSeller.links) ? rawSeller.links : {}
            const quotes = Array.isArray(links.quotes) ? links.quotes : []
            for (const q of quotes) {
              if (isRecord(q) && q.id) quoteIds.add(String(q.id))
            }
          }
        }

        const quoteEntries = await Promise.all(
          Array.from(quoteIds).map(async (qid) => {
            try {
              const res = await getQuoteById(qid)
              return [qid, (res.data || {}) as Record<string, unknown>] as const
            } catch {
              return [qid, {} as Record<string, unknown>] as const
            }
          })
        )
        const quoteMap = Object.fromEntries(quoteEntries)

        const tripMessageIds = new Set<string>()
        for (const rfq of results) {
          const links = isRecord(rfq.links) ? rfq.links : {}
          const tripmsgs = Array.isArray(links.tripmsgs) ? links.tripmsgs : []
          for (const tripmsg of tripmsgs) {
            if (isRecord(tripmsg) && tripmsg.id) tripMessageIds.add(String(tripmsg.id))
          }

          const sellerLift = Array.isArray(rfq.sellerLift) ? rfq.sellerLift : []
          for (const seller of sellerLift) {
            if (!isRecord(seller)) continue
            const sellerLinks = isRecord(seller.links) ? seller.links : {}
            const sellerTripmsgs = Array.isArray(sellerLinks.tripmsgs) ? sellerLinks.tripmsgs : []
            for (const tripmsg of sellerTripmsgs) {
              if (isRecord(tripmsg) && tripmsg.id) tripMessageIds.add(String(tripmsg.id))
            }
          }
        }

        const tripResourceId = extractTripResourceId(request)
        if (tripResourceId) {
          try {
            const tripRes = await fetch(`/api/avinode/trips/${tripResourceId}`)
            if (tripRes.ok) {
              const tripJson = await tripRes.json().catch(() => ({}))
              const tripRecord = isRecord(tripJson) ? tripJson : {}
              const tripData = isRecord(tripRecord.data) ? (tripRecord.data as Record<string, unknown>) : tripRecord
              const tripLinks = isRecord(tripData.links) ? tripData.links : {}
              const tripMsgs = Array.isArray(tripLinks.tripmsgs) ? tripLinks.tripmsgs : []
              for (const tripMsg of tripMsgs) {
                if (isRecord(tripMsg) && tripMsg.id) tripMessageIds.add(String(tripMsg.id))
              }
            }
          } catch {
            // Ignore trip-level lookup failures; RFQ-linked messages may still be available.
          }
        }

        const nextTripMessages: Record<string, Record<string, unknown>> = {}
        const nextTripMessageErrors: Record<string, string> = {}
        if (tripMessageIds.size > 0) {
          const messageResults = await Promise.all(
            Array.from(tripMessageIds).map(async (tripMessageId) => {
              try {
                const response = await getTripMessage(tripMessageId)
                const payload = isRecord(response) ? response : {}
                return {
                  tripMessageId,
                  payload,
                  error: null as string | null,
                }
              } catch (error) {
                return {
                  tripMessageId,
                  payload: {} as Record<string, unknown>,
                  error: error instanceof Error ? error.message : "Failed to load chat history",
                }
              }
            })
          )

          for (const item of messageResults) {
            nextTripMessages[item.tripMessageId] = item.payload
            if (item.error) nextTripMessageErrors[item.tripMessageId] = item.error
          }
        }

        if (!cancelled) {
          setRfqData(results)
          setQuoteById(quoteMap)
          setTripMessagesById(nextTripMessages)
          setTripMessageErrorById(nextTripMessageErrors)
          setTripMessageLoadingById({})
        }
      } catch (error) {
        if (!cancelled) {
          setRfqError(error instanceof Error ? error.message : "Failed to load RFQ details")
          setRfqData([])
          setQuoteById({})
          setTripMessagesById({})
          setTripMessageErrorById({})
          setTripMessageLoadingById({})
        }
      } finally {
        if (!cancelled) {
          setRfqLoading(false)
        }
      }
    }

    void loadRfqData()
    return () => {
      cancelled = true
    }
  }, [isManager, request.avinodeRfqIds, request.avinodeTripId, request.avinodeTripHref, request.avinodeSearchLink])

  const syncRfqData = async () => {
    if (!onSync) return
    setRfqSyncing(true)
    setRfqError(null)
    try {
      await onSync()
    } catch (error) {
      setRfqError(error instanceof Error ? error.message : "Failed to sync RFQ data")
    } finally {
      setRfqSyncing(false)
    }
  }

  useEffect(() => {
    if (!isManager) return
    if (!request.avinodeTripId) return
    if (request.avinodeRfqIds && request.avinodeRfqIds.length > 0) return
    if (!onSync) return
    void syncRfqData()
  }, [isManager, request.avinodeTripId, request.avinodeRfqIds, onSync])

  const rfqGroups: RfqGroup[] = rfqData.map((rfq, rfqIdx) => {
    const rfqId = String(rfq.id || request.avinodeRfqIds?.[rfqIdx] || `RFQ-${rfqIdx + 1}`)
    const links = isRecord(rfq.links) ? rfq.links : {}
    const tripmsgs = Array.isArray(links.tripmsgs) ? links.tripmsgs : []
    const firstTripMsg = tripmsgs[0]
    const tripMessageId = isRecord(firstTripMsg) && firstTripMsg.id ? String(firstTripMsg.id) : undefined
    const rfqTripMessageIds = tripmsgs
      .filter((item) => isRecord(item) && item.id)
      .map((item) => String((item as Record<string, unknown>).id))

    const sellerLift = Array.isArray(rfq.sellerLift) ? rfq.sellerLift : []
    const sellers: SellerInfo[] = sellerLift
      .filter((item) => isRecord(item))
      .map((seller, sellerIdx) => {
        const sellerCompany = isRecord(seller.sellerCompany) ? seller.sellerCompany : {}
        const sellerEntity = isRecord(seller.seller) ? seller.seller : {}
        const aircraft = isRecord(seller.aircraft) ? seller.aircraft : {}
        const latestQuote = isRecord(seller.latestQuote) ? seller.latestQuote : {}
        const quoteOperator = isRecord(latestQuote.operator) ? latestQuote.operator : {}
        const quotePrice = isRecord(latestQuote.price) ? latestQuote.price : {}
        const sellerLiftId = seller.id ? String(seller.id) : undefined
        const links = isRecord(seller.links) ? seller.links : {}
        const linkedQuotes = Array.isArray(links.quotes) ? links.quotes : []
        const sellerTripMsgs = Array.isArray(links.tripmsgs) ? links.tripmsgs : []
        const sellerTripMsg = sellerTripMsgs.find((item) => isRecord(item) && item.id)
        const sellerTripMessageId = sellerTripMsg && isRecord(sellerTripMsg) && sellerTripMsg.id ? String(sellerTripMsg.id) : undefined
        const linkedQuoteId = linkedQuotes.find((q) => isRecord(q) && q.id)
        const quoteId = linkedQuoteId && isRecord(linkedQuoteId) && linkedQuoteId.id ? String(linkedQuoteId.id) : undefined
        const quotePayload = quoteId ? quoteById[quoteId] : undefined
        const quoteSellerCompany = quotePayload && isRecord(quotePayload.sellerCompany) ? quotePayload.sellerCompany : {}
        const quoteContactInfo = isRecord(quoteSellerCompany.contactInfo) ? quoteSellerCompany.contactInfo : {}
        const quoteEmails = Array.isArray(quoteContactInfo.emails) ? quoteContactInfo.emails : []
        const firstEmail = quoteEmails.find((email) => typeof email === "string" && email.trim())
        const quoteLift = quotePayload && isRecord(quotePayload.lift) ? quotePayload.lift : {}
        const quoteSellerPrice = quotePayload && isRecord(quotePayload.sellerPrice) ? quotePayload.sellerPrice : {}
        const sellerCompanyName = (
          getStringCaseInsensitive(quoteSellerCompany, ["displayName", "displayname", "name", "companyName", "companyname"]) ||
          getStringCaseInsensitive(sellerCompany, ["displayName", "displayname", "name", "companyName", "companyname"]) ||
          getStringCaseInsensitive(sellerEntity, ["displayName", "displayname", "name", "companyName", "companyname"]) ||
          getStringCaseInsensitive(quoteOperator, ["displayName", "displayname", "name", "operatorName", "operatorname"]) ||
          (typeof seller.sellerCompanyName === "string" ? seller.sellerCompanyName : undefined) ||
          (typeof seller.sellerDisplayName === "string" ? seller.sellerDisplayName : undefined) ||
          findNestedName(seller) ||
          (sellerCompany.id ? String(sellerCompany.id) : undefined) ||
          "Unknown Seller"
        )
        return {
          key: `${rfqId}:${sellerLiftId || sellerIdx}`,
          sellerLiftId,
          tripMessageId: sellerTripMessageId,
          quoteId,
          sellerCompanyName,
          sellerCompanyId: quoteSellerCompany.id
            ? String(quoteSellerCompany.id)
            : sellerCompany.id
            ? String(sellerCompany.id)
            : undefined,
          sellerEmail: (typeof quoteContactInfo.email === "string" && quoteContactInfo.email.trim())
            ? quoteContactInfo.email.trim()
            : typeof firstEmail === "string"
            ? firstEmail.trim()
            : undefined,
          sellerPhone: getStringCaseInsensitive(quoteContactInfo, ["phone", "mobilePhone", "mobile"]),
          sourcingDisplayStatus: seller.sourcingDisplayStatus ? String(seller.sourcingDisplayStatus) : undefined,
          sourcingStatus: seller.sourcingStatus !== undefined ? Number(seller.sourcingStatus) : undefined,
          aircraftType: quoteLift.aircraftType ? String(quoteLift.aircraftType) : aircraft.aircraftType ? String(aircraft.aircraftType) : undefined,
          aircraftCategory: quoteLift.aircraftCategory ? String(quoteLift.aircraftCategory) : aircraft.aircraftCategory ? String(aircraft.aircraftCategory) : undefined,
          tailNumber: quoteLift.aircraftTail ? String(quoteLift.aircraftTail) : aircraft.tailNumber ? String(aircraft.tailNumber) : undefined,
          seatCapacity: quoteLift.maxPax !== undefined ? Number(quoteLift.maxPax) : aircraft.seatCapacity !== undefined ? Number(aircraft.seatCapacity) : undefined,
          yearOfMake: aircraft.yearOfMake !== undefined ? Number(aircraft.yearOfMake) : undefined,
          latestQuoteAmount: quoteSellerPrice.price !== undefined ? Number(quoteSellerPrice.price) : quotePrice.amount !== undefined ? Number(quotePrice.amount) : undefined,
          latestQuoteCurrency: quoteSellerPrice.currency ? String(quoteSellerPrice.currency) : quotePrice.currency ? String(quotePrice.currency) : undefined,
          latestQuoteValidUntil: latestQuote.validUntil ? String(latestQuote.validUntil) : undefined,
          latestQuoteCreatedOn: quotePayload?.createdOn ? String(quotePayload.createdOn) : latestQuote.createdOn ? String(latestQuote.createdOn) : undefined,
        }
      })

    return {
      rfqId,
      status: rfq.status ? String(rfq.status) : undefined,
      createdOn: rfq.createdOn ? String(rfq.createdOn) : undefined,
      tripMessageId,
      tripMessageIds: Array.from(new Set([...(tripMessageId ? [tripMessageId] : []), ...rfqTripMessageIds])),
      sellers,
    }
  })
  const rfqThreadCount = request.avinodeRfqIds?.length || 0
  const submittedRfqCount = Math.max(
    rfqThreadCount,
    rfqGroups.reduce((sum, rfq) => sum + rfq.sellers.length, 0)
  )

  const refreshTripMessage = async (tripMessageId?: string) => {
    if (!tripMessageId) return
    setTripMessageLoadingById((prev) => ({ ...prev, [tripMessageId]: true }))
    setTripMessageErrorById((prev) => ({ ...prev, [tripMessageId]: "" }))
    try {
      const response = await getTripMessage(tripMessageId)
      const payload = isRecord(response) ? response : {}
      setTripMessagesById((prev) => ({ ...prev, [tripMessageId]: payload }))
    } catch (error) {
      setTripMessageErrorById((prev) => ({
        ...prev,
        [tripMessageId]: error instanceof Error ? error.message : "Failed to refresh chat history",
      }))
    } finally {
      setTripMessageLoadingById((prev) => ({ ...prev, [tripMessageId]: false }))
    }
  }

  const handleSendSellerChat = async (rfq: RfqGroup, seller: SellerInfo) => {
    const draft = (chatDrafts[seller.key] || "").trim()
    if (!draft) return
    const targetTripMessageId = seller.tripMessageId || rfq.tripMessageId || rfq.tripMessageIds[0]
    if (!targetTripMessageId) {
      setChatMessage((prev) => ({ ...prev, [seller.key]: "Missing trip message ID for this RFQ." }))
      return
    }

    setChatSendingKey(seller.key)
    setChatMessage((prev) => ({ ...prev, [seller.key]: "" }))
    try {
      await chatTripRequest(targetTripMessageId, {
        message: draft,
        liftId: seller.sellerLiftId,
      })
      await refreshTripMessage(targetTripMessageId)
      setChatDrafts((prev) => ({ ...prev, [seller.key]: "" }))
      setChatMessage((prev) => ({ ...prev, [seller.key]: "Message sent to operator." }))
    } catch (error) {
      setChatMessage((prev) => ({
        ...prev,
        [seller.key]: error instanceof Error ? error.message : "Failed to send message.",
      }))
    } finally {
      setChatSendingKey(null)
    }
  }

  const handleMarkSubmitted = async () => {
    setLoading(true)
    try {
      await onUpdate({ status: "rfq_submitted", avinodeStatus: "rfq_sent" })
    } finally {
      setLoading(false)
    }
  }

  // ISO view
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 mb-4">
          <Send className="h-6 w-6 text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Sourcing aircraft operators</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
          Our team has sent RFQs to aircraft operators and is awaiting their quotes.
        </p>
      </div>
    )
  }

  // Manager view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Submit RFQ in Avinode</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Go to Avinode, select operators, and send RFQs. Once done, come back and confirm below.
        </p>
      </div>

      {request.avinodeSearchLink && (
        <a
          href={request.avinodeSearchLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Open trip in Avinode
        </a>
      )}

      {request.avinodeTripId && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm space-y-1.5">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Avinode Trip</div>
          <div><span className="font-medium text-gray-900">Trip ID:</span> <span className="font-mono text-gray-700">{request.avinodeTripId}</span></div>
          {submittedRfqCount > 0 && (
            <div><span className="font-medium text-gray-900">RFQs sent:</span> {submittedRfqCount}</div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Seller Information</div>
          {onSync && (
            <button
              type="button"
              onClick={() => void syncRfqData()}
              disabled={rfqSyncing || rfqLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {rfqSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync RFQ Data
            </button>
          )}
        </div>
        {rfqSyncing && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing RFQ pipeline...
          </div>
        )}
        {rfqLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading RFQ details...
          </div>
        )}
        {!rfqLoading && rfqError && (
          <p className="text-sm text-red-600">{rfqError}</p>
        )}
        {!rfqLoading && !rfqError && rfqData.length === 0 && (
          <p className="text-sm text-gray-500">No RFQ seller data available yet. RFQs may still be syncing from Avinode.</p>
        )}
        {!rfqLoading && !rfqError && rfqData.length > 0 && (
          <div className="space-y-3">
            {rfqGroups.map((rfq) => (
              <div key={rfq.rfqId} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-gray-900">RFQ ID: {rfq.rfqId}</span>
                  {rfq.status && <span className="text-gray-600">Status: {rfq.status}</span>}
                  {rfq.createdOn && <span className="text-gray-600">Created: {rfq.createdOn}</span>}
                  {rfq.tripMessageId && <span className="text-gray-600">TripMsg: {rfq.tripMessageId}</span>}
                </div>

                {rfq.sellers.length === 0 ? (
                  <p className="text-sm text-gray-500">No sellers returned for this RFQ.</p>
                ) : (
                  <div className="space-y-2">
                    {rfq.sellers.map((seller, sellerIdx) => {
                      const sellerThreadIds = Array.from(
                        new Set([...(rfq.tripMessageIds || []), ...(seller.tripMessageId ? [seller.tripMessageId] : [])])
                      )
                      const chatEntries = sellerThreadIds
                        .flatMap((id) => extractChatExchanges(tripMessagesById[id], seller))
                        .sort((a, b) => {
                          const t1 = a.createdOn ? Date.parse(a.createdOn) : NaN
                          const t2 = b.createdOn ? Date.parse(b.createdOn) : NaN
                          if (Number.isNaN(t1) && Number.isNaN(t2)) return 0
                          if (Number.isNaN(t1)) return -1
                          if (Number.isNaN(t2)) return 1
                          return t1 - t2
                        })
                        .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.key === entry.key) === index)
                      const hasIncoming = chatEntries.some((entry) => entry.direction === "incoming")
                      const threadLoading = sellerThreadIds.some((id) => Boolean(tripMessageLoadingById[id]))
                      const threadError = sellerThreadIds.map((id) => tripMessageErrorById[id]).find(Boolean) || ""
                      const sellerCard = (
                        <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Operator</div>
                              <div className="text-sm font-medium text-gray-900">{seller.sellerCompanyName}</div>
                              <div className="text-xs text-gray-500">
                                {seller.sellerCompanyId || "—"}
                                {seller.sellerEmail ? ` · ${seller.sellerEmail}` : ""}
                                {seller.sellerPhone ? ` · ${seller.sellerPhone}` : ""}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sourcing Status</div>
                              <div className="text-sm text-gray-800">{seller.sourcingDisplayStatus || "—"}</div>
                              <div className="text-xs text-gray-500">Code: {seller.sourcingStatus ?? "—"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Aircraft Type</div>
                              <div className="text-sm text-gray-800">{seller.aircraftType || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Category</div>
                              <div className="text-sm text-gray-800">{seller.aircraftCategory || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tail Number</div>
                              <div className="text-sm text-gray-800">{seller.tailNumber || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Seats / Year</div>
                              <div className="text-sm text-gray-800">
                                {seller.seatCapacity ?? "—"} seats
                                {seller.yearOfMake ? ` · ${seller.yearOfMake}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-md border border-gray-200 bg-white p-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Latest Quote</div>
                            <div className="text-sm text-gray-800">
                              {seller.latestQuoteAmount !== undefined
                                ? `${seller.latestQuoteCurrency || "USD"} ${seller.latestQuoteAmount.toLocaleString()}`
                                : "No quote yet"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Created: {seller.latestQuoteCreatedOn || "—"} · Valid until: {seller.latestQuoteValidUntil || "—"}
                            </div>
                          </div>

                          <div className="rounded-md border border-gray-200 bg-white p-2.5">
                            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Chat Exchanges
                            </div>
                            {threadLoading && (
                              <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading chat history...
                              </div>
                            )}
                            {!threadLoading && Boolean(threadError) && (
                              <p className="mb-2 text-xs text-red-600">{threadError}</p>
                            )}
                            {!threadLoading && !threadError && (
                              <div className="mb-2 max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-2">
                                {chatEntries.length === 0 ? (
                                  <p className="text-xs text-gray-500">No chat exchanges yet.</p>
                                ) : (
                                  chatEntries.map((entry) => (
                                    <div key={entry.key} className={`rounded-md px-2 py-1.5 text-xs ${
                                      entry.direction === "incoming"
                                        ? "bg-blue-50 text-blue-800"
                                        : entry.direction === "outgoing"
                                        ? "bg-emerald-50 text-emerald-800"
                                        : "bg-white text-gray-700"
                                    }`}>
                                      <div className="font-medium">
                                        {entry.direction === "incoming"
                                          ? "Incoming"
                                          : entry.direction === "outgoing"
                                          ? "Outgoing"
                                          : "Chat"}
                                        {entry.sender ? ` · ${entry.sender}` : ""}
                                      </div>
                                      <div className="mt-0.5 whitespace-pre-wrap">{entry.message}</div>
                                      <div className="mt-1 text-[10px] opacity-75">{formatChatDate(entry.createdOn)}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                            {!threadLoading && !threadError && chatEntries.length > 0 && (
                              <p className="mb-2 text-[11px] text-gray-500">
                                {chatEntries.length} messages • {hasIncoming ? "Incoming messages detected" : "No incoming messages yet"}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <input
                                value={chatDrafts[seller.key] || ""}
                                onChange={(e) => setChatDrafts((prev) => ({ ...prev, [seller.key]: e.target.value }))}
                                placeholder="Type message to operator..."
                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSendSellerChat(rfq, seller)}
                                disabled={chatSendingKey === seller.key || !(chatDrafts[seller.key] || "").trim()}
                                className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                              >
                                {chatSendingKey === seller.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Send
                              </button>
                            </div>
                            {chatMessage[seller.key] && (
                              <p className="mt-1.5 text-xs text-gray-600">{chatMessage[seller.key]}</p>
                            )}
                          </div>
                        </div>
                      )

                      if (rfq.sellers.length === 1) {
                        return <div key={seller.key}>{sellerCard}</div>
                      }

                      return (
                        <details key={seller.key} className="rounded-md border border-gray-200 bg-white p-2.5">
                          <summary className="cursor-pointer text-sm font-medium text-gray-800">
                            Seller {sellerIdx + 1}: {seller.sellerCompanyName}
                          </summary>
                          <div className="mt-2">{sellerCard}</div>
                        </details>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        After sending the RFQs in Avinode, click the button below to update the request status and start tracking quotes.
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleMarkSubmitted}
          disabled={loading}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          RFQ Submitted in Avinode
        </button>
      </div>
    </div>
  )
}
