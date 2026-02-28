"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Send, ExternalLink, CheckCircle2, Loader2, RefreshCw, ArrowRight, TrendingUp } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { getQuoteById, getRfq, getTripById, getTripMessage } from "@/lib/avinode-client"
import { formatDistanceToNow } from "date-fns"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
  onSync?: () => Promise<void>
  onNavigateToProposal?: () => void
}

type QuoteLineItem = {
  description: string
  amount: number
  currency: string
}

type QuoteSection = {
  name: string
  lineItems: QuoteLineItem[]
}

type SellerSubmittedQuote = {
  id: string
  amount?: number
  currency?: string
  createdOn?: string
  sellerCompanyName?: string
}

type SellerInfo = {
  key: string
  sellerLiftId?: string
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
  // requestedAmount: the per-aircraft target price sent to this operator (from RFQ sellerLift)
  requestedAmount?: number
  requestedCurrency?: string
  // latestQuoteAmount: the operator's actual quoted price (from the fetched quote object only)
  latestQuoteAmount?: number
  latestQuoteCurrency?: string
  latestQuoteValidUntil?: string
  latestQuoteCreatedOn?: string
  quoteBreakdown?: QuoteSection[]
}

type RfqGroup = {
  rfqId: string
  status?: string
  createdOn?: string
  sellers: SellerInfo[]
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
    "displayName", "displayname", "name", "companyName", "companyname",
    "sellerName", "sellername", "sellerCompanyName", "sellercompanyname",
    "operatorName", "operatorname",
  ])
  if (direct) return direct

  for (const next of Object.values(value)) {
    const found = findNestedName(next, depth + 1)
    if (found) return found
  }
  return undefined
}

// Extracts a positive numeric price from an Avinode price object,
// trying common field names Avinode uses across API versions.
function extractNumericPrice(obj: Record<string, unknown>): number | undefined {
  for (const key of ["price", "amount", "total", "priceWithoutTax", "netPrice", "totalAmount", "sellerTotal", "value"]) {
    const val = obj[key]
    if (typeof val === "number" && val > 0) return val
    if (typeof val === "string") {
      const n = parseFloat(val)
      if (n > 0) return n
    }
  }
  return undefined
}

function extractPriceAndCurrency(value: unknown): { amount?: number; currency?: string } {
  if (isRecord(value)) {
    return {
      amount: extractNumericPrice(value),
      currency: value.currency ? String(value.currency) : undefined,
    }
  }

  if (typeof value === "number" && value > 0) {
    return { amount: value }
  }

  if (typeof value === "string") {
    const n = parseFloat(value)
    if (n > 0) return { amount: n }
  }

  return {}
}

function normalizeName(value?: string) {
  return value?.trim().toLowerCase() || undefined
}

function extractSellerSubmittedQuote(message: unknown): {
  quote: SellerSubmittedQuote
  linkedQuoteIds: string[]
  rfqIds: string[]
} | null {
  if (!isRecord(message)) return null

  const payload = isRecord(message.data) ? message.data : message

  const sellerQuote = isRecord(payload.sellerQuote) ? payload.sellerQuote : null
  if (!sellerQuote) return null

  const sellerPrice = isRecord(sellerQuote.sellerPrice)
    ? sellerQuote.sellerPrice
    : isRecord(sellerQuote.price)
    ? sellerQuote.price
    : null
  const amount = sellerPrice ? extractNumericPrice(sellerPrice) : extractNumericPrice(sellerQuote)
  const currency =
    (sellerPrice?.currency ? String(sellerPrice.currency) : undefined) ??
    (sellerQuote.currency ? String(sellerQuote.currency) : undefined)
  const quoteId = sellerQuote.id ? String(sellerQuote.id) : ""

  if (!quoteId || amount === undefined) return null

  const sellerCompany = isRecord(payload.sellerCompany) ? payload.sellerCompany : {}
  const sellerEntity = isRecord(payload.seller) ? payload.seller : {}
  const quoteOperator = isRecord(sellerQuote.operator) ? sellerQuote.operator : {}

  const linkedQuoteIds = new Set<string>()
  const lifts = Array.isArray(payload.lift) ? payload.lift : []
  for (const lift of lifts) {
    if (!isRecord(lift)) continue
    const links = isRecord(lift.links) ? lift.links : {}
    const quotes = Array.isArray(links.quotes) ? links.quotes : []
    for (const quote of quotes) {
      if (isRecord(quote) && quote.id) linkedQuoteIds.add(String(quote.id))
    }
    if (isRecord(links.quote) && links.quote.id) linkedQuoteIds.add(String(links.quote.id))
  }

  const rfqIds = new Set<string>()
  const links = isRecord(payload.links) ? payload.links : {}
  const rfqs = Array.isArray(links.rfqs) ? links.rfqs : []
  for (const rfq of rfqs) {
    if (isRecord(rfq) && rfq.id) rfqIds.add(String(rfq.id))
  }

  return {
    quote: {
      id: quoteId,
      amount,
      currency,
      createdOn: sellerQuote.createdOn ? String(sellerQuote.createdOn) : undefined,
      sellerCompanyName: (
        getStringCaseInsensitive(sellerCompany, ["displayName", "displayname", "name", "companyName", "companyname"]) ||
        getStringCaseInsensitive(sellerEntity, ["displayName", "displayname", "name", "companyName", "companyname"]) ||
        getStringCaseInsensitive(quoteOperator, ["displayName", "displayname", "name", "operatorName", "operatorname"])
      ),
    },
    linkedQuoteIds: Array.from(linkedQuoteIds),
    rfqIds: Array.from(rfqIds),
  }
}

const POLL_INTERVAL_MS = 15 * 60 * 1000

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
}

export function Step3Rfq({ request, currentUser, onUpdate, onSync, onNavigateToProposal }: Props) {
  const isManager = currentUser.role === "manager"
  const isQuoteReceived = request.status === "quote_received"

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [proceeding, setProceeding] = useState(false)
  const [rfqLoading, setRfqLoading] = useState(false)
  const [rfqSyncing, setRfqSyncing] = useState(false)
  const [rfqData, setRfqData] = useState<Record<string, unknown>[]>([])
  const [quoteById, setQuoteById] = useState<Record<string, Record<string, unknown>>>({})
  const [sellerQuoteByQuoteId, setSellerQuoteByQuoteId] = useState<Record<string, SellerSubmittedQuote>>({})
  const [sellerQuotesByRfqId, setSellerQuotesByRfqId] = useState<Record<string, SellerSubmittedQuote[]>>({})
  const [rfqError, setRfqError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load RFQ data from Avinode
  useEffect(() => {
    if (!isManager) return
    if (!request.avinodeRfqIds || request.avinodeRfqIds.length === 0) {
      setRfqData([])
      setQuoteById({})
      setSellerQuoteByQuoteId({})
      setSellerQuotesByRfqId({})
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
            // links.quotes[] (array)
            const quotes = Array.isArray(links.quotes) ? links.quotes : []
            for (const q of quotes) {
              if (isRecord(q) && q.id) quoteIds.add(String(q.id))
            }
            // links.quote (singular)
            if (isRecord(links.quote) && links.quote.id) quoteIds.add(String(links.quote.id))
            // seller.quoteId directly
            if (typeof rawSeller.quoteId === "string" && rawSeller.quoteId) quoteIds.add(rawSeller.quoteId)
            // latestQuote.id
            const rawLatestQuote = isRecord(rawSeller.latestQuote) ? rawSeller.latestQuote : {}
            if (rawLatestQuote.id) quoteIds.add(String(rawLatestQuote.id))
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

        const tripResourceId = (() => {
          const href = request.avinodeTripHref || ""
          const fromHref = href.split("/").filter(Boolean).pop()
          return fromHref || request.avinodeTripId || ""
        })()

        const nextSellerQuoteByQuoteId: Record<string, SellerSubmittedQuote> = {}
        const nextSellerQuotesByRfqId: Record<string, SellerSubmittedQuote[]> = {}

        if (tripResourceId) {
          try {
            const tripResponse = await getTripById(tripResourceId)
            const trip = (tripResponse.data || {}) as Record<string, unknown>
            const tripLinks = isRecord(trip.links) ? trip.links : {}
            const tripMsgMap = new Map<string, Record<string, unknown>>()
            const addTripMsgRefs = (value: unknown) => {
              const refs = Array.isArray(value) ? value : []
              for (const ref of refs) {
                if (!isRecord(ref) || !ref.id) continue
                tripMsgMap.set(String(ref.id), ref)
              }
            }

            addTripMsgRefs(tripLinks.tripmsgs)
            for (const rfq of results) {
              if (!isRecord(rfq)) continue
              const rfqLinks = isRecord(rfq.links) ? rfq.links : {}
              addTripMsgRefs(rfqLinks.tripmsgs)

              const sellerLift = Array.isArray(rfq.sellerLift) ? rfq.sellerLift : []
              for (const seller of sellerLift) {
                if (!isRecord(seller)) continue
                const sellerLinks = isRecord(seller.links) ? seller.links : {}
                addTripMsgRefs(sellerLinks.tripmsgs)
              }
            }

            const sellerQuoteEntries = await Promise.all(
              Array.from(tripMsgMap.values()).map(async (tripMsg) => {
                if (!isRecord(tripMsg) || !tripMsg.id) return null
                try {
                  const msg = await getTripMessage(String(tripMsg.id))
                  return extractSellerSubmittedQuote(msg)
                } catch {
                  return null
                }
              })
            )

            for (const entry of sellerQuoteEntries) {
              if (!entry) continue

              if (entry.linkedQuoteIds.length === 0 && entry.quote.id) {
                nextSellerQuoteByQuoteId[entry.quote.id] = entry.quote
              }

              for (const linkedQuoteId of entry.linkedQuoteIds) {
                nextSellerQuoteByQuoteId[linkedQuoteId] = entry.quote
              }

              for (const rfqId of entry.rfqIds) {
                const existing = nextSellerQuotesByRfqId[rfqId] || []
                if (!existing.some((quote) => quote.id === entry.quote.id)) {
                  existing.push(entry.quote)
                  nextSellerQuotesByRfqId[rfqId] = existing
                }
              }
            }
          } catch {
            // Keep rendering RFQ/quote data even if trip-message enrichment fails.
          }
        }

        if (!cancelled) {
          setRfqData(results)
          setQuoteById(Object.fromEntries(quoteEntries))
          setSellerQuoteByQuoteId(nextSellerQuoteByQuoteId)
          setSellerQuotesByRfqId(nextSellerQuotesByRfqId)
        }
      } catch (error) {
        if (!cancelled) {
          setRfqError(error instanceof Error ? error.message : "Failed to load RFQ details")
          setRfqData([])
          setQuoteById({})
          setSellerQuoteByQuoteId({})
          setSellerQuotesByRfqId({})
        }
      } finally {
        if (!cancelled) setRfqLoading(false)
      }
    }

    void loadRfqData()
    return () => { cancelled = true }
  }, [isManager, request.avinodeRfqIds, request.avinodeTripHref, request.avinodeTripId])

  const syncRfqData = useCallback(async () => {
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
  }, [onSync])

  // Auto-trigger sync if no RFQ IDs yet
  useEffect(() => {
    if (!isManager) return
    if (!request.avinodeTripId) return
    if (request.avinodeRfqIds && request.avinodeRfqIds.length > 0) return
    void syncRfqData()
  }, [isManager, request.avinodeTripId, request.avinodeRfqIds, syncRfqData])

  // Auto-poll while awaiting quotes
  useEffect(() => {
    if (!isManager || isQuoteReceived) return
    intervalRef.current = setInterval(() => void syncRfqData(), POLL_INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isManager, isQuoteReceived, syncRfqData])

  const rfqGroups: RfqGroup[] = rfqData.map((rfq, rfqIdx) => {
    const rfqId = String(rfq.id || request.avinodeRfqIds?.[rfqIdx] || `RFQ-${rfqIdx + 1}`)
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
        const quoteId = (() => {
          // 1. links.quotes[0].id
          const linkedQuotes = Array.isArray(links.quotes) ? links.quotes : []
          const fromLinksQuotes = linkedQuotes.find((q) => isRecord(q) && q.id)
          if (fromLinksQuotes && isRecord(fromLinksQuotes) && fromLinksQuotes.id) return String(fromLinksQuotes.id)
          // 2. links.quote.id (singular)
          if (isRecord(links.quote) && links.quote.id) return String(links.quote.id)
          // 3. seller.quoteId directly
          if (typeof seller.quoteId === "string" && seller.quoteId) return seller.quoteId
          // 4. latestQuote.id
          if (latestQuote.id) return String(latestQuote.id)
          return undefined
        })()
        const quotePayload = quoteId ? quoteById[quoteId] : undefined
        const linkedSellerQuote = quoteId ? sellerQuoteByQuoteId[quoteId] : undefined
        const quoteSellerCompany = quotePayload && isRecord(quotePayload.sellerCompany) ? quotePayload.sellerCompany : {}
        const quoteContactInfo = isRecord(quoteSellerCompany.contactInfo) ? quoteSellerCompany.contactInfo : {}
        const quoteEmails = Array.isArray(quoteContactInfo.emails) ? quoteContactInfo.emails : []
        const firstEmail = quoteEmails.find((email) => typeof email === "string" && email.trim())
        const quoteLift = quotePayload && isRecord(quotePayload.lift) ? quotePayload.lift : {}
        const quoteSellerPrice = quotePayload && isRecord(quotePayload.sellerPrice) ? quotePayload.sellerPrice : {}
        const quotePayloadPrice = quotePayload && isRecord(quotePayload.price) ? quotePayload.price : {}
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

        // requestedAmount: the original quote attached to the RFQ. In the live Avinode payload,
        // this is the linked quote's sellerPrice (for example 95,200), while the operator's
        // response is a separate sellerQuote in a seller trip message.
        const requestedPrice = (() => {
          const candidates: unknown[] = [
            quotePayload?.sellerPrice,
            quotePayload?.sellerPriceWithoutCommission,
            quotePayload?.price,
            quotePayload?.buyerPrice,
            quotePayload?.requestPrice,
            quotePayload?.targetPrice,
            seller.price,
            seller.requestedPrice,
            seller.targetPrice,
            seller.buyerPrice,
            seller.requestPrice,
            quotePrice,
          ]

          for (const candidate of candidates) {
            const parsed = extractPriceAndCurrency(candidate)
            if (parsed.amount !== undefined) return parsed
          }

          return {}
        })()
        const requestedAmount = requestedPrice.amount
        const requestedCurrency = requestedPrice.currency

        const rfqScopedSellerQuote = (() => {
          if (linkedSellerQuote) return linkedSellerQuote
          const quotes = sellerQuotesByRfqId[rfqId] || []
          if (quotes.length === 0) return undefined
          if (quotes.length === 1) return quotes[0]

          const normalizedSellerName = normalizeName(sellerCompanyName)
          if (!normalizedSellerName) return undefined

          return quotes.find((quote) => normalizeName(quote.sellerCompanyName) === normalizedSellerName)
        })()

        // latestQuoteAmount: the operator's actual quoted price.
        // Prefer the operator-submitted seller quote from trip messages, then the fetched quote
        // object, then fall back to the RFQ's linked quote value only if nothing better exists.
        const latestQuoteAmount = (() => {
          if (rfqScopedSellerQuote?.amount !== undefined) return rfqScopedSellerQuote.amount
          // 1. Fetched quote: sellerPrice object
          if (Object.keys(quoteSellerPrice).length > 0) {
            const p = extractNumericPrice(quoteSellerPrice)
            if (p) return p
          }
          // 2. Fetched quote: top-level numeric fields (totalPrice, price, amount, total)
          if (quotePayload) {
            for (const f of ["totalPrice", "price", "amount", "total"] as const) {
              const v = quotePayload[f]
              if (typeof v === "number" && v > 0) return v
            }
          }
          // 3. Fetched quote: price object
          if (Object.keys(quotePayloadPrice).length > 0) {
            const p = extractNumericPrice(quotePayloadPrice)
            if (p) return p
          }
          // 4. Fallback: sellerLift's latestQuote.price (operator's base quote or estimate)
          if (Object.keys(quotePrice).length > 0) return extractNumericPrice(quotePrice)
          return undefined
        })()

        const latestQuoteCurrency =
          (rfqScopedSellerQuote?.currency || undefined) ??
          (quoteSellerPrice.currency ? String(quoteSellerPrice.currency) : undefined) ??
          (quotePayloadPrice.currency ? String(quotePayloadPrice.currency) : undefined) ??
          (quotePrice.currency ? String(quotePrice.currency) : undefined)

        return {
          key: `${rfqId}:${sellerLiftId || sellerIdx}`,
          sellerLiftId,
          quoteId,
          sellerCompanyName,
          sellerCompanyId: quoteSellerCompany.id ? String(quoteSellerCompany.id) : sellerCompany.id ? String(sellerCompany.id) : undefined,
          sellerEmail: (typeof quoteContactInfo.email === "string" && quoteContactInfo.email.trim())
            ? quoteContactInfo.email.trim()
            : typeof firstEmail === "string" ? firstEmail.trim() : undefined,
          sellerPhone: getStringCaseInsensitive(quoteContactInfo, ["phone", "mobilePhone", "mobile"]),
          sourcingDisplayStatus: seller.sourcingDisplayStatus ? String(seller.sourcingDisplayStatus) : undefined,
          sourcingStatus: seller.sourcingStatus !== undefined ? Number(seller.sourcingStatus) : undefined,
          aircraftType: quoteLift.aircraftType ? String(quoteLift.aircraftType) : aircraft.aircraftType ? String(aircraft.aircraftType) : undefined,
          aircraftCategory: quoteLift.aircraftCategory ? String(quoteLift.aircraftCategory) : aircraft.aircraftCategory ? String(aircraft.aircraftCategory) : undefined,
          tailNumber: quoteLift.aircraftTail ? String(quoteLift.aircraftTail) : aircraft.tailNumber ? String(aircraft.tailNumber) : undefined,
          seatCapacity: quoteLift.maxPax !== undefined ? Number(quoteLift.maxPax) : aircraft.seatCapacity !== undefined ? Number(aircraft.seatCapacity) : undefined,
          yearOfMake: aircraft.yearOfMake !== undefined ? Number(aircraft.yearOfMake) : undefined,
          requestedAmount,
          requestedCurrency,
          latestQuoteAmount,
          latestQuoteCurrency,
          latestQuoteValidUntil: latestQuote.validUntil ? String(latestQuote.validUntil) : undefined,
          latestQuoteCreatedOn:
            rfqScopedSellerQuote?.createdOn ||
            (quotePayload?.createdOn ? String(quotePayload.createdOn) : undefined) ||
            (latestQuote.createdOn ? String(latestQuote.createdOn) : undefined),
          quoteBreakdown: (() => {
            const raw = quotePayload && isRecord(quotePayload.quoteBreakdown) ? quotePayload.quoteBreakdown : null
            if (!raw) return undefined
            const sections = Array.isArray(raw.sections) ? raw.sections : []
            return sections
              .filter((s) => isRecord(s))
              .map((s) => ({
                name: typeof s.name === "string" ? s.name : "Other",
                lineItems: (Array.isArray(s.lineItems) ? s.lineItems : [])
                  .filter((li) => isRecord(li))
                  .map((li) => ({
                    description: typeof li.description === "string" ? li.description : "",
                    amount: typeof li.amount === "number" ? li.amount : Number(li.amount) || 0,
                    currency: typeof li.currency === "string" ? li.currency : "USD",
                  })),
              }))
          })(),
        }
      })
    return {
      rfqId,
      status: rfq.status ? String(rfq.status) : undefined,
      createdOn: rfq.createdOn ? String(rfq.createdOn) : undefined,
      sellers,
    }
  })

  const rfqThreadCount = request.avinodeRfqIds?.length || 0
  const submittedRfqCount = Math.max(
    rfqThreadCount,
    rfqGroups.reduce((sum, rfq) => sum + rfq.sellers.length, 0)
  )

  const allSellers = rfqGroups.flatMap((g) => g.sellers)
  const selectedSeller = allSellers.find((s) => s.key === selectedKey) ?? null

  // Pre-select the saved quote card when one has already been chosen.
  useEffect(() => {
    if (selectedKey) return
    if (!request.selectedQuoteId) return
    const match = allSellers.find((s) => s.quoteId === request.selectedQuoteId)
    if (match) setSelectedKey(match.key)
  }, [isQuoteReceived, allSellers, request.selectedQuoteId, selectedKey])

  const handleProceed = async () => {
    if (!selectedSeller) return
    setProceeding(true)
    try {
      await onUpdate({
        status: "quote_received",
        selectedQuoteId: selectedSeller.quoteId,
        selectedQuoteAmount: selectedSeller.latestQuoteAmount,
        avinodeBestQuoteAmount: selectedSeller.latestQuoteAmount,
        avinodeBestQuoteCurrency: selectedSeller.latestQuoteCurrency,
      })
      onNavigateToProposal?.()
    } finally {
      setProceeding(false)
    }
  }

  const handleBuildProposal = async () => {
    if (!selectedSeller) return
    setProceeding(true)
    try {
      await onUpdate({
        selectedQuoteId: selectedSeller.quoteId,
        selectedQuoteAmount: selectedSeller.latestQuoteAmount,
        avinodeBestQuoteAmount: selectedSeller.latestQuoteAmount,
        avinodeBestQuoteCurrency: selectedSeller.latestQuoteCurrency,
      })
      onNavigateToProposal?.()
    } finally {
      setProceeding(false)
    }
  }

  const lastSync = request.avinodeLastSyncAt
    ? formatDistanceToNow(new Date(request.avinodeLastSyncAt), { addSuffix: true })
    : null

  // ── ISO view ──────────────────────────────────────────────────────────────
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        {isQuoteReceived ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Quotes received</h3>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
              Our team is reviewing the quotes and building your proposal.
            </p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 mb-4">
              <Send className="h-6 w-6 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Sourcing aircraft operators</h3>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
              Our team has sent RFQs to aircraft operators and is awaiting their quotes.
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Manager view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isQuoteReceived ? "Quote Confirmed" : "RFQ — Awaiting Operator Quotes"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isQuoteReceived
              ? "A quote has been confirmed. Proceed to the Proposal step to build and send the proposal."
              : "Select an operator quote to proceed to the proposal builder."}
          </p>
        </div>
        <button
          onClick={() => void syncRfqData()}
          disabled={rfqSyncing || rfqLoading}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${rfqSyncing ? "animate-spin" : ""}`} />
          Sync
          {lastSync && <span className="text-gray-400 ml-1">· {lastSync}</span>}
        </button>
      </div>

      {/* Avinode trip info */}
      {request.avinodeTripId && (
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <div className="text-gray-500">
            Trip <span className="font-mono text-gray-700">{request.avinodeTripId}</span>
            {submittedRfqCount > 0 && <span className="ml-3 text-gray-400">· {submittedRfqCount} RFQs sent</span>}
          </div>
          {request.avinodeSearchLink && (
            <a
              href={request.avinodeSearchLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Avinode
            </a>
          )}
        </div>
      )}

      {/* RFQ operator cards */}
      <div>
        {rfqLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading operator quotes...
          </div>
        )}
        {!rfqLoading && rfqError && (
          <p className="py-4 text-sm text-red-600">{rfqError}</p>
        )}
        {!rfqLoading && !rfqError && rfqData.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No RFQ data yet — try syncing to pull the latest from Avinode.
          </p>
        )}
        {!rfqLoading && !rfqError && rfqData.length > 0 && (
          <div className="space-y-5">
            {rfqGroups.map((rfq) => (
              <div key={rfq.rfqId}>
                {rfqGroups.length > 1 && (
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="font-semibold text-gray-600">RFQ {rfq.rfqId}</span>
                    {rfq.status && <span>· {rfq.status}</span>}
                    {rfq.createdOn && <span>· {rfq.createdOn}</span>}
                  </div>
                )}

                {rfq.sellers.length === 0 ? (
                  <p className="text-sm text-gray-400">No operators returned for this RFQ.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {rfq.sellers.map((seller) => {
                      // "Unanswered", "Awaiting", "NotInvited", "Pending" statuses mean no real quote.
                      // Use a blocklist so that any other status (Accepted, Quoted, Submitted, etc.)
                      // is treated as having returned a quote.
                      const isUnanswered = !!(
                        seller.sourcingDisplayStatus &&
                        /unanswer|awaiting|pending|notinvit/i.test(seller.sourcingDisplayStatus)
                      )
                      // Show quote box when the operator responded (not unanswered) AND we have a price.
                      const hasActualQuote = !isUnanswered && seller.latestQuoteAmount !== undefined
                      const isSelected = selectedKey === seller.key
                      const isClickable = hasActualQuote

                      return (
                        <div
                          key={seller.key}
                          onClick={isClickable ? () => setSelectedKey(seller.key) : undefined}
                          className={`rounded-xl border-2 bg-white p-4 space-y-3 transition-all ${
                            isSelected
                              ? "border-emerald-400 shadow-sm"
                              : isClickable
                              ? "border-gray-200 hover:border-gray-300 cursor-pointer"
                              : "border-gray-100 opacity-60"
                          }`}
                        >
                          {/* Operator header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Operator</div>
                              <div className="text-sm font-semibold text-gray-900">{seller.sellerCompanyName}</div>
                              {(seller.sellerEmail || seller.sellerPhone) && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {[seller.sellerEmail, seller.sellerPhone].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasActualQuote && (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  Quote Received
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              )}
                            </div>
                          </div>

                          {/* Quote / price area */}
                          {hasActualQuote ? (
                            <div className={`rounded-lg border ${isSelected ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 bg-gray-50"}`}>
                              {/* Requested and quoted prices */}
                              <div className="flex items-start justify-between gap-4 px-3 pt-2.5 pb-2">
                                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                  {seller.requestedAmount !== undefined ? (
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Requested</div>
                                      <div className="text-base font-semibold text-gray-700 tabular-nums">
                                        {fmt(seller.requestedAmount, seller.requestedCurrency || "USD")}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Requested</div>
                                      <div className="text-base font-semibold text-gray-400 tabular-nums">—</div>
                                    </div>
                                  )}
                                  <div className="sm:text-right">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Quoted</div>
                                    <div className="text-xl font-bold text-gray-900 tabular-nums">
                                      {seller.latestQuoteAmount !== undefined
                                        ? fmt(seller.latestQuoteAmount, seller.latestQuoteCurrency || "USD")
                                        : "—"}
                                    </div>
                                  </div>
                                </div>
                                {seller.requestedAmount !== undefined &&
                                  seller.latestQuoteAmount !== undefined &&
                                  seller.requestedAmount !== seller.latestQuoteAmount && (
                                  <div className={`self-end shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                    seller.latestQuoteAmount > seller.requestedAmount
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {seller.latestQuoteAmount > seller.requestedAmount ? "+" : ""}
                                    {Math.round(((seller.latestQuoteAmount - seller.requestedAmount) / seller.requestedAmount) * 100)}%
                                  </div>
                                )}
                              </div>

                              {/* Quote breakdown */}
                              {seller.quoteBreakdown && seller.quoteBreakdown.length > 0 && (
                                <div className="border-t border-gray-200 px-3 pb-2.5 pt-2 space-y-2">
                                  {seller.quoteBreakdown.map((section, si) => (
                                    <div key={si}>
                                      {section.name && (
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{section.name}</div>
                                      )}
                                      <div className="space-y-0.5">
                                        {section.lineItems.map((li, li_i) => (
                                          <div key={li_i} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                            <span>{li.description}</span>
                                            <span className="shrink-0 tabular-nums">
                                              {fmt(li.amount, li.currency || "USD")}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(seller.latestQuoteCreatedOn || seller.latestQuoteValidUntil) && (
                                <div className="border-t border-gray-200 px-3 py-1.5 text-xs text-gray-400">
                                  {seller.latestQuoteCreatedOn && `Received: ${seller.latestQuoteCreatedOn}`}
                                  {seller.latestQuoteCreatedOn && seller.latestQuoteValidUntil && " · "}
                                  {seller.latestQuoteValidUntil && `Valid until: ${seller.latestQuoteValidUntil}`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                              <span className="text-sm text-gray-400">Awaiting quote from operator</span>
                              {seller.requestedAmount !== undefined && (
                                <span className="text-xs text-gray-400 tabular-nums">
                                  Requested: {fmt(seller.requestedAmount, seller.requestedCurrency || "USD")}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Aircraft info grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {[
                              { label: "Status", value: seller.sourcingDisplayStatus },
                              { label: "Aircraft", value: seller.aircraftType },
                              { label: "Category", value: seller.aircraftCategory },
                              {
                                label: "Tail / Seats",
                                value: [seller.tailNumber, seller.seatCapacity ? `${seller.seatCapacity} seats` : undefined]
                                  .filter(Boolean).join(" · ") || undefined,
                              },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
                                <div className="text-sm text-gray-800">{value || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom action area ─────────────────────────────────────────────── */}

      {/* Phase 1: rfq_submitted — select a quote and proceed */}
      {!isQuoteReceived && (
        selectedSeller ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">{selectedSeller.sellerCompanyName}</div>
              {selectedSeller.latestQuoteAmount !== undefined && (
                <div className="text-sm text-emerald-700 font-medium">
                  {fmt(selectedSeller.latestQuoteAmount, selectedSeller.latestQuoteCurrency || "USD")}
                </div>
              )}
            </div>
            <button
              onClick={() => void handleProceed()}
              disabled={proceeding}
              className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {proceeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Proceed with this quote
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-2">
            Select an operator quote above to proceed to the proposal builder.
          </p>
        )
      )}

      {/* Phase 2: quote_received — quote confirmed, go build the proposal */}
      {isQuoteReceived && (
        selectedSeller ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {selectedSeller.sellerCompanyName}
              </div>
              {selectedSeller.latestQuoteAmount !== undefined && (
                <div className="text-sm text-emerald-700 font-medium">
                  {fmt(selectedSeller.latestQuoteAmount, selectedSeller.latestQuoteCurrency || "USD")}
                </div>
              )}
            </div>
            <button
              onClick={() => void handleBuildProposal()}
              disabled={proceeding}
              className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {proceeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Build Proposal
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-2">
            Select one operator quote above before continuing to Build Proposal.
          </p>
        )
      )}
    </div>
  )
}
