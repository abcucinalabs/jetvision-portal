"use client"

import { useState, useRef, useEffect } from "react"
import { useStore, type Customer, type FlightRequest } from "@/lib/store"
import { createTrip, searchAirports } from "@/lib/avinode-client"
import { formatDistanceToNow } from "date-fns"
import {
  PlaneTakeoff,
  Plus,
  X,
  Calendar,
  Users,
  MapPin,
  Search,
  UserPlus,
  ChevronDown,
  ExternalLink,
  Globe,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  XCircle,
  AlertCircle,
} from "lucide-react"

export function FlightRequestsView() {
  const {
    currentUser,
    flightRequests,
    addFlightRequest,
    avinodeConnected,
    updateFlightRequestAvinode,
    addAvinodeActivity,
    syncFlightRequestPipeline,
  } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [sendingToAvinode, setSendingToAvinode] = useState<string | null>(null)
  const [syncingPipeline, setSyncingPipeline] = useState<string | null>(null)
  const [copiedSearchFor, setCopiedSearchFor] = useState<string | null>(null)
  const [avinodeError, setAvinodeError] = useState<string | null>(null)

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"

  const requests = isManager
    ? flightRequests
    : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const handleSendToAvinode = async (fr: FlightRequest) => {
    setSendingToAvinode(fr.id)
    setAvinodeError(null)

    try {
      // Extract ICAO codes from airport strings like "Teterboro (KTEB)" or plain "KTEB"
      const extractIcao = (airportStr: string) => {
        const match = airportStr.match(/\(([A-Z]{4})\)/)
        return match ? match[1] : airportStr.replace(/[^A-Z]/g, "").slice(0, 4)
      }

      const segments = [
        {
          startAirportIcao: extractIcao(fr.departure),
          endAirportIcao: extractIcao(fr.arrival),
          date: fr.departureDate,    // YYYY-MM-DD
          timeTBD: true,
          paxCount: fr.passengers,
        },
      ]

      // Add return leg if round trip
      if (fr.returnDate) {
        segments.push({
          startAirportIcao: extractIcao(fr.arrival),
          endAirportIcao: extractIcao(fr.departure),
          date: fr.returnDate,
          timeTBD: true,
          paxCount: fr.passengers,
        })
      }

      // Real API call via our proxy route -- builds Avinode-format body internally
      const response = await createTrip(segments, { sourcing: true })

      // Avinode response shape: { data: { id, href, actions: { searchInAvinode, viewInAvinode } }, tripId: "XYZABC" }
      const trip = response.data
      const tripId = trip?.tripId || response.tripId || trip?.id || "unknown"
      const searchLink = trip?.actions?.searchInAvinode?.href
      const viewLink = trip?.actions?.viewInAvinode?.href

      console.log("[v0] handleSendToAvinode: tripId:", tripId, "searchLink:", searchLink, "viewLink:", viewLink)

      updateFlightRequestAvinode(fr.id, {
        avinodeTripId: tripId,
        avinodeTripHref: trip?.href,
        avinodeSearchLink: searchLink || undefined,
        avinodeViewLink: viewLink || undefined,
        avinodeStatus: "sent_to_avinode",
      })

      addAvinodeActivity({
        type: "trip_created",
        title: "Trip Created in Avinode",
        description: `Trip for ${fr.clientName}: ${fr.departure} to ${fr.arrival} on ${fr.departureDate}. ${fr.passengers} passengers. Trip ID: ${tripId}`,
        flightRequestId: fr.id,
        avinodeTripId: tripId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create trip in Avinode"
      setAvinodeError(message)
      addAvinodeActivity({
        type: "trip_cancelled",
        title: "Trip Creation Failed",
        description: `Failed to create trip for ${fr.clientName}: ${message}`,
        flightRequestId: fr.id,
      })
    } finally {
      setSendingToAvinode(null)
    }
  }

  const handleSyncPipeline = async (fr: FlightRequest) => {
    setSyncingPipeline(fr.id)
    setAvinodeError(null)
    try {
      await syncFlightRequestPipeline(fr.id)
      addAvinodeActivity({
        type: "search_completed",
        title: "Sourcing Pipeline Synced",
        description: `RFQ/quote status synced for ${fr.clientName}.`,
        flightRequestId: fr.id,
        avinodeTripId: fr.avinodeTripId,
      })
    } catch (error) {
      setAvinodeError(error instanceof Error ? error.message : "Failed to sync Avinode pipeline")
    } finally {
      setSyncingPipeline(null)
    }
  }

  const handleCopySearchLink = async (frId: string, searchLink: string) => {
    await navigator.clipboard.writeText(searchLink)
    setCopiedSearchFor(frId)
    setTimeout(() => setCopiedSearchFor(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flight Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isManager
              ? "View and manage all incoming flight requests. Send to Avinode for aircraft sourcing."
              : "Submit and track flight requests for your clients."}
          </p>
        </div>
        {!isManager && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        )}
      </div>

      {avinodeError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-destructive">{avinodeError}</p>
          <button
            onClick={() => setAvinodeError(null)}
            className="rounded-md p-1 text-destructive hover:bg-destructive/10"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showForm && (
        <NewFlightRequestForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            addFlightRequest({
              ...data,
              isoId: currentUser.id,
              isoName: currentUser.name,
            })
            setShowForm(false)
          }}
        />
      )}

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <PlaneTakeoff className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No flight requests yet
          </p>
          {!isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Create your first request
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((fr) => (
            <div
              key={fr.id}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-card-foreground">
                      {fr.clientName}
                    </h3>
                    <StatusBadge status={fr.status} />
                    {fr.avinodeStatus && (
                      <AvinodeStatusBadge status={fr.avinodeStatus} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {fr.departure} &rarr; {fr.arrival}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {fr.departureDate}
                      {fr.returnDate && ` - ${fr.returnDate}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {fr.passengers} pax
                    </span>
                  </div>
                  {fr.specialRequests && (
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{fr.specialRequests}&rdquo;
                    </p>
                  )}

                  {/* Avinode Trip ID */}
                  {fr.avinodeTripId && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                        Avinode: {fr.avinodeTripId}
                      </span>
                      <SlaBadge status={fr.avinodeSlaStatus} />
                      {typeof fr.avinodeQuoteCount === "number" && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                          Quotes: {fr.avinodeQuoteCount}
                        </span>
                      )}
                    </div>
                  )}

                  {fr.avinodeTripId && (
                    <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                        <span>RFQs: {fr.avinodeRfqIds?.length || 0}</span>
                        <span>Quotes: {fr.avinodeQuoteCount || 0}</span>
                        {fr.avinodeBestQuoteAmount && (
                          <span className="font-medium text-card-foreground">
                            Best: {fr.avinodeBestQuoteCurrency || "USD"} {fr.avinodeBestQuoteAmount.toLocaleString()}
                          </span>
                        )}
                        {fr.avinodeSlaDueAt && (
                          <span>SLA due {formatDistanceToNow(new Date(fr.avinodeSlaDueAt), { addSuffix: true })}</span>
                        )}
                        {fr.avinodeLastSyncAt && (
                          <span>Synced {formatDistanceToNow(new Date(fr.avinodeLastSyncAt), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {isManager && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-card-foreground">ISO:</span>{" "}
                      {fr.isoName}
                    </div>
                  )}

                  {/* Avinode Actions for Manager */}
                  {isManager && (
                    <div className="flex flex-col gap-1.5">
                      {!fr.avinodeTripId ? (
                        <button
                          onClick={() => handleSendToAvinode(fr)}
                          disabled={!avinodeConnected || sendingToAvinode === fr.id}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!avinodeConnected ? "Set Avinode credentials in .env.local first" : "Create trip in Avinode via POST /trips"}
                        >
                          {sendingToAvinode === fr.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Globe className="h-3 w-3" />
                              Send to Avinode
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          {fr.avinodeSearchLink && (
                            <div className="flex gap-1.5">
                              <a
                                href={fr.avinodeSearchLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                              >
                                <Search className="h-3 w-3" />
                                Search in Avinode
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopySearchLink(fr.id, fr.avinodeSearchLink!)}
                                className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                              >
                                {copiedSearchFor === fr.id ? "Copied" : "Copy URL"}
                              </button>
                            </div>
                          )}
                          {fr.avinodeViewLink && (
                            <a
                              href={fr.avinodeViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View in Avinode
                            </a>
                          )}
                          <button
                            onClick={() => handleSyncPipeline(fr)}
                            disabled={syncingPipeline === fr.id}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            title="Sync RFQ and quote pipeline from Avinode"
                          >
                            {syncingPipeline === fr.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3" />
                                Sync Pipeline
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SlaBadge({ status }: { status?: "on_track" | "at_risk" | "overdue" | "met" }) {
  if (!status) return null
  const config: Record<string, { bg: string; text: string; label: string }> = {
    on_track: { bg: "bg-primary/10", text: "text-primary", label: "SLA On Track" },
    at_risk: { bg: "bg-accent/10", text: "text-accent", label: "SLA At Risk" },
    overdue: { bg: "bg-destructive/10", text: "text-destructive", label: "SLA Overdue" },
    met: { bg: "bg-green-500/10", text: "text-green-700", label: "SLA Met" },
  }

  const c = config[status]
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function AvinodeStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    not_sent: { bg: "bg-muted", text: "text-muted-foreground", label: "Not in Avinode" },
    sent_to_avinode: { bg: "bg-primary/10", text: "text-primary", label: "In Avinode" },
    rfq_sent: { bg: "bg-accent/10", text: "text-accent", label: "RFQ Sent" },
    quotes_received: { bg: "bg-green-500/10", text: "text-green-600", label: "Quotes Received" },
    booked: { bg: "bg-green-500/10", text: "text-green-600", label: "Booked" },
    cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
  }
  const c = config[status] || config.not_sent
  return (
    <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      <Globe className="h-3 w-3" />
      {c.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-accent/10", text: "text-accent", label: "Pending" },
    proposal_sent: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Sent" },
    accepted: { bg: "bg-success/10", text: "text-success", label: "Accepted" },
    declined: { bg: "bg-destructive/10", text: "text-destructive", label: "Declined" },
  }
  const c = config[status] || config.pending
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

interface FormData {
  clientName: string
  clientEmail: string
  clientPhone: string
  departure: string
  arrival: string
  departureDate: string
  returnDate?: string
  passengers: number
  specialRequests?: string
}

interface AirportSuggestion {
  id: string
  name: string
  icao: string
  iata: string
  city: string
  country: { code: string; name: string }
}

function manualIcaoOption(input: string): AirportSuggestion | null {
  const code = input.trim().toUpperCase()
  if (!/^[A-Z]{4}$/.test(code)) return null
  return {
    id: `manual-${code}`,
    name: code,
    icao: code,
    iata: "",
    city: "",
    country: { code: "", name: "" },
  }
}

function NewFlightRequestForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: FormData) => void
}) {
  const { customers, addCustomer, avinodeConnected } = useStore()
  const [customerMode, setCustomerMode] = useState<"select" | "new">("select")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const departureRef = useRef<HTMLDivElement>(null)
  const arrivalRef = useRef<HTMLDivElement>(null)
  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false)
  const [showArrivalDropdown, setShowArrivalDropdown] = useState(false)
  const [tripType, setTripType] = useState<"one_way" | "round_trip">("one_way")
  const [departureOptions, setDepartureOptions] = useState<AirportSuggestion[]>([])
  const [arrivalOptions, setArrivalOptions] = useState<AirportSuggestion[]>([])
  const [selectedDepartureIcao, setSelectedDepartureIcao] = useState("")
  const [selectedArrivalIcao, setSelectedArrivalIcao] = useState("")
  const [searchingDeparture, setSearchingDeparture] = useState(false)
  const [searchingArrival, setSearchingArrival] = useState(false)
  const [availabilitySearching, setAvailabilitySearching] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [airportLookupError, setAirportLookupError] = useState<string | null>(null)
  const [copiedSearchUrl, setCopiedSearchUrl] = useState(false)
  const [availabilityResult, setAvailabilityResult] = useState<{
    tripId?: string
    href?: string
    searchLink?: string
    viewLink?: string
  } | null>(null)

  const [form, setForm] = useState<FormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    departure: "",
    arrival: "",
    departureDate: "",
    returnDate: "",
    passengers: 1,
    specialRequests: "",
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (departureRef.current && !departureRef.current.contains(e.target as Node)) {
        setShowDepartureDropdown(false)
      }
      if (arrivalRef.current && !arrivalRef.current.contains(e.target as Node)) {
        setShowArrivalDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!avinodeConnected || !form.departure || form.departure.length < 3) {
      setDepartureOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingDeparture(true)
      try {
        const airports = await searchAirports(form.departure)
        const fallback = manualIcaoOption(form.departure)
        setDepartureOptions(airports.length > 0 ? airports.slice(0, 20) : fallback ? [fallback] : [])
        setAirportLookupError(null)
      } catch (error) {
        const fallback = manualIcaoOption(form.departure)
        setDepartureOptions(fallback ? [fallback] : [])
        setAirportLookupError(error instanceof Error ? error.message : "Airport search failed")
      } finally {
        setSearchingDeparture(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [avinodeConnected, form.departure])

  useEffect(() => {
    if (!avinodeConnected || !form.arrival || form.arrival.length < 3) {
      setArrivalOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingArrival(true)
      try {
        const airports = await searchAirports(form.arrival)
        const fallback = manualIcaoOption(form.arrival)
        setArrivalOptions(airports.length > 0 ? airports.slice(0, 20) : fallback ? [fallback] : [])
        setAirportLookupError(null)
      } catch (error) {
        const fallback = manualIcaoOption(form.arrival)
        setArrivalOptions(fallback ? [fallback] : [])
        setAirportLookupError(error instanceof Error ? error.message : "Airport search failed")
      } finally {
        setSearchingArrival(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [avinodeConnected, form.arrival])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const selectExistingCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setForm((prev) => ({
      ...prev,
      clientName: customer.name,
      clientEmail: customer.email,
      clientPhone: customer.phone,
    }))
    setCustomerSearch("")
    setShowDropdown(false)
  }

  const switchToNewCustomer = () => {
    setCustomerMode("new")
    setSelectedCustomer(null)
    setForm((prev) => ({
      ...prev,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    }))
    setCustomerSearch("")
    setShowDropdown(false)
  }

  const switchToSelectCustomer = () => {
    setCustomerMode("select")
    setSelectedCustomer(null)
    setForm((prev) => ({
      ...prev,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // If creating a new customer, save them to the store
    if (customerMode === "new" && form.clientName && form.clientEmail) {
      addCustomer({
        name: form.clientName,
        email: form.clientEmail,
        phone: form.clientPhone,
      })
    }

    onSubmit({
      ...form,
      returnDate: tripType === "round_trip" ? form.returnDate || undefined : undefined,
      specialRequests: form.specialRequests || undefined,
    })
  }

  const extractIcao = (airportStr: string) => {
    const match = airportStr.match(/\(([A-Z]{4})\)/)
    return match ? match[1] : airportStr.replace(/[^A-Z]/g, "").slice(0, 4)
  }

  const handleAvailabilitySearch = async () => {
    setAvailabilityError(null)
    setAvailabilityResult(null)

    if (!avinodeConnected) {
      setAvailabilityError("Avinode credentials are not configured in environment variables.")
      return
    }

    if (!form.departure || !form.arrival || !form.departureDate || form.passengers < 1) {
      setAvailabilityError("Add departure/arrival airports, departure date, and passengers first.")
      return
    }

    setAvailabilitySearching(true)
    try {
      const outboundStart = selectedDepartureIcao || extractIcao(form.departure)
      const outboundEnd = selectedArrivalIcao || extractIcao(form.arrival)

      if (outboundStart.length !== 4 || outboundEnd.length !== 4) {
        throw new Error("Use airports with valid ICAO codes (4 letters).")
      }

      const segments = [
        {
          startAirportIcao: outboundStart,
          endAirportIcao: outboundEnd,
          date: form.departureDate,
          timeTBD: true,
          paxCount: form.passengers,
        },
      ]

      if (tripType === "round_trip") {
        if (!form.returnDate) {
          throw new Error("Select a return date for round-trip searches.")
        }
        segments.push({
          startAirportIcao: outboundEnd,
          endAirportIcao: outboundStart,
          date: form.returnDate,
          timeTBD: true,
          paxCount: form.passengers,
        })
      }

      const response = await createTrip(segments, { sourcing: true })
      const trip = response.data
      setAvailabilityResult({
        tripId: trip?.tripId || response.tripId || trip?.id,
        href: trip?.href,
        searchLink: trip?.actions?.searchInAvinode?.href,
        viewLink: trip?.actions?.viewInAvinode?.href,
      })
      setCopiedSearchUrl(false)
    } catch (error) {
      setAvailabilityError(error instanceof Error ? error.message : "Availability search failed")
    } finally {
      setAvailabilitySearching(false)
    }
  }

  const handleCopySearchUrl = async () => {
    if (!availabilityResult?.searchLink) return
    await navigator.clipboard.writeText(availabilityResult.searchLink)
    setCopiedSearchUrl(true)
    setTimeout(() => setCopiedSearchUrl(false), 1500)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">
          New Flight Request
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Selection Tabs */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={switchToSelectCustomer}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                customerMode === "select"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Existing Customer
            </button>
            <button
              type="button"
              onClick={switchToNewCustomer}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                customerMode === "new"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              New Customer
            </button>
          </div>

          {customerMode === "select" ? (
            <div className="space-y-3">
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomer.email}
                      {selectedCustomer.phone && ` \u00B7 ${selectedCustomer.phone}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setForm((prev) => ({
                        ...prev,
                        clientName: "",
                        clientEmail: "",
                        clientPhone: "",
                      }))
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remove selected customer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Search customers by name or email..."
                    />
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {showDropdown && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectExistingCustomer(customer)}
                            className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-muted"
                          >
                            <span className="text-sm font-medium text-card-foreground">
                              {customer.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {customer.email}
                              {customer.phone && ` \u00B7 ${customer.phone}`}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center">
                          <p className="text-sm text-muted-foreground">No customers found</p>
                          <button
                            type="button"
                            onClick={switchToNewCustomer}
                            className="mt-1 text-sm font-medium text-primary hover:underline"
                          >
                            Create a new customer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Client Name *</span>
                <input
                  required
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Full name"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Client Email *</span>
                <input
                  required
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="email@example.com"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Client Phone</span>
                <input
                  value={form.clientPhone}
                  onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+1 (555) 000-0000"
                />
              </label>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div ref={departureRef}>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Departure Airport *</span>
              <input
                required
                value={form.departure}
                onChange={(e) => {
                  setForm({ ...form, departure: e.target.value })
                  setSelectedDepartureIcao("")
                  setShowDepartureDropdown(true)
                }}
                onFocus={() => setShowDepartureDropdown(true)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Teterboro (KTEB)"
              />
              {searchingDeparture && form.departure.length >= 3 && (
                <p className="text-[11px] text-muted-foreground">Searching airports...</p>
              )}
              {!searchingDeparture && showDepartureDropdown && form.departure.length >= 3 && departureOptions.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-background">
                  {departureOptions.map((airport) => (
                    <button
                      key={airport.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, departure: `${airport.name} (${airport.icao})` })
                        setSelectedDepartureIcao(airport.icao)
                        setDepartureOptions([])
                        setShowDepartureDropdown(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      {airport.name} ({airport.icao}) {airport.city ? `- ${airport.city}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>
          <div ref={arrivalRef}>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Arrival Airport *</span>
              <input
                required
                value={form.arrival}
                onChange={(e) => {
                  setForm({ ...form, arrival: e.target.value })
                  setSelectedArrivalIcao("")
                  setShowArrivalDropdown(true)
                }}
                onFocus={() => setShowArrivalDropdown(true)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Miami Opa-Locka (KOPF)"
              />
              {searchingArrival && form.arrival.length >= 3 && (
                <p className="text-[11px] text-muted-foreground">Searching airports...</p>
              )}
              {!searchingArrival && showArrivalDropdown && form.arrival.length >= 3 && arrivalOptions.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-background">
                  {arrivalOptions.map((airport) => (
                    <button
                      key={airport.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, arrival: `${airport.name} (${airport.icao})` })
                        setSelectedArrivalIcao(airport.icao)
                        setArrivalOptions([])
                        setShowArrivalDropdown(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      {airport.name} ({airport.icao}) {airport.city ? `- ${airport.city}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>
        </div>

        {airportLookupError && (
          <p className="text-xs text-muted-foreground">
            Airport lookup unavailable right now. You can still enter ICAO codes manually.
          </p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Trip Type</span>
          <button
            type="button"
            onClick={() => {
              setTripType("one_way")
              setForm((prev) => ({ ...prev, returnDate: "" }))
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${tripType === "one_way" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => setTripType("round_trip")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${tripType === "round_trip" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Round-trip
          </button>
        </div>

        <div className={`grid gap-4 ${tripType === "round_trip" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Departure Date *</span>
            <input
              required
              type="date"
              value={form.departureDate}
              onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {tripType === "round_trip" && (
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Return Date *</span>
              <input
                required
                type="date"
                value={form.returnDate}
                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Passengers *</span>
            <input
              required
              type="number"
              min={1}
              max={50}
              value={form.passengers}
              onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) || 1 })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Special Requests</span>
          <textarea
            value={form.specialRequests}
            onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Catering, ground transport, special accommodations..."
          />
        </label>

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAvailabilitySearch}
              disabled={!avinodeConnected || availabilitySearching}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availabilitySearching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" />
                  Search Available Flights
                </>
              )}
            </button>
            {!avinodeConnected && (
              <span className="text-[11px] text-muted-foreground">
                Configure Avinode first in Settings.
              </span>
            )}
          </div>
          {availabilityError && (
            <p className="text-xs text-destructive">{availabilityError}</p>
          )}
          {availabilityResult?.tripId && (
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Search ready in Avinode Marketplace. No booking is made.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {availabilityResult.searchLink && (
                  <a
                    href={availabilityResult.searchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 font-semibold text-accent hover:bg-accent/20"
                  >
                    Open Availability
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {availabilityResult.searchLink && (
                  <button
                    type="button"
                    onClick={handleCopySearchUrl}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-muted-foreground hover:bg-muted"
                  >
                    {copiedSearchUrl ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3" />
                        Copy Search URL
                      </>
                    )}
                  </button>
                )}
                {availabilityResult.viewLink && (
                  <a
                    href={availabilityResult.viewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-muted-foreground hover:bg-muted"
                  >
                    View Trip
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={customerMode === "select" && !selectedCustomer}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  )
}
