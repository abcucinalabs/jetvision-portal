"use client"

import { useState } from "react"
import { ExternalLink, Copy, Check, Loader2, Search, CheckCircle2 } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { createTrip } from "@/lib/avinode-client"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
}

function extractIcao(airportStr: string): string {
  const match = airportStr.match(/\(([A-Z]{4})\)/)
  return match ? match[1] : airportStr.replace(/[^A-Z]/g, "").slice(0, 4)
}

export function Step2Review({ request, currentUser, onUpdate }: Props) {
  const isManager = currentUser.role === "manager"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasVisitedAvinode, setHasVisitedAvinode] = useState(false)
  const [markingSubmitted, setMarkingSubmitted] = useState(false)

  const hasTrip = Boolean(request.avinodeTripId)
  const avinodeUrl = request.avinodeSearchLink || request.avinodeViewLink

  const ensureAvinodeUrl = async (forceRefresh = false): Promise<string | null> => {
    if (!forceRefresh && avinodeUrl) return avinodeUrl

    const segments = [
      {
        startAirportIcao: extractIcao(request.departure),
        endAirportIcao: extractIcao(request.arrival),
        date: request.departureDate,
        time: request.departureTime || undefined,
        timeTBD: !request.departureTime,
        paxCount: request.passengers,
      },
    ]
    if (request.returnDate) {
      segments.push({
        startAirportIcao: extractIcao(request.arrival),
        endAirportIcao: extractIcao(request.departure),
        date: request.returnDate,
        time: request.returnTime || undefined,
        timeTBD: !request.returnTime,
        paxCount: request.passengers,
      })
    }

    const response = await createTrip(segments, { sourcing: true })
    const trip = response.data
    const tripId = trip?.tripId || response.tripId || trip?.id || "unknown"
    const searchLink = trip?.actions?.searchInAvinode?.href
    const viewLink = trip?.actions?.viewInAvinode?.href
    const nextUrl = searchLink || viewLink || null

    await onUpdate({
      status: "under_review",
      avinodeTripId: tripId,
      avinodeTripHref: trip?.href,
      avinodeSearchLink: searchLink || undefined,
      avinodeViewLink: viewLink || undefined,
      avinodeStatus: "sent_to_avinode",
    })

    return nextUrl
  }

  const handleOpenInAvinode = async () => {
    setHasVisitedAvinode(true)

    setLoading(true)
    setError(null)
    try {
      const nextUrl = await ensureAvinodeUrl(true)
      if (nextUrl) window.open(nextUrl, "_blank")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip in Avinode")
      setHasVisitedAvinode(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    setHasVisitedAvinode(true)
    setLoading(true)
    setError(null)
    try {
      const nextUrl = await ensureAvinodeUrl()
      if (!nextUrl) throw new Error("No Avinode URL is available to copy.")
      await navigator.clipboard.writeText(nextUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy Avinode URL")
      setHasVisitedAvinode(false)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRfqSubmitted = async () => {
    setMarkingSubmitted(true)
    try {
      await onUpdate({ status: "rfq_submitted", avinodeStatus: "rfq_sent" })
    } finally {
      setMarkingSubmitted(false)
    }
  }

  // ISO view
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mb-4">
          <Search className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Your request is under review</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
          Our operations team is reviewing your request and searching for available aircraft.
        </p>
      </div>
    )
  }

  // Manager view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Search for Aircraft in Avinode</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Open Avinode to search for available aircraft and send RFQs. Come back and confirm when done.
        </p>
      </div>

      {/* Request summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
        <div><span className="font-medium text-gray-900">Route:</span> {request.departure} → {request.arrival}</div>
          <div>
            <span className="font-medium text-gray-900">Date:</span> {request.departureDate}
            {request.departureTime ? ` at ${request.departureTime}` : ""}
            {request.returnDate ? ` → ${request.returnDate}` : ""}
            {request.returnDate && request.returnTime ? ` at ${request.returnTime}` : ""}
          </div>
        <div><span className="font-medium text-gray-900">Passengers:</span> {request.passengers}</div>
        <div><span className="font-medium text-gray-900">Client:</span> {request.clientName}</div>
      </div>

      {hasTrip && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-800 font-medium">Avinode trip created</span>
          <span className="text-emerald-600">— Trip ID: {request.avinodeTripId}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={handleOpenInAvinode}
          disabled={loading}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Open in Avinode
        </button>

        <button
          onClick={handleCopyUrl}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy URL"}
        </button>
      </div>

      {hasVisitedAvinode && (
        <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Once you have sent RFQs to operators in Avinode, confirm below to start tracking quotes.
          </p>
          <button
            onClick={handleMarkRfqSubmitted}
            disabled={markingSubmitted}
            className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {markingSubmitted ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            I&apos;ve Submitted RFQs
          </button>
        </div>
      )}
    </div>
  )
}
