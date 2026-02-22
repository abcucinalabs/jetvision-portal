"use client"

import { useState, useRef, useEffect } from "react"
import { useStore, type Customer, type FlightRequest } from "@/lib/store"
import { createTrip } from "@/lib/avinode-client"
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
  const { currentUser, flightRequests, addFlightRequest } = useStore()
  const [showForm, setShowForm] = useState(false)

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const { avinodeConnected, avinodeConfig, updateFlightRequestAvinode, addAvinodeActivity } = useStore()

  const requests = isManager
    ? flightRequests
    : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const [sendingToAvinode, setSendingToAvinode] = useState<string | null>(null)
  const [avinodeError, setAvinodeError] = useState<string | null>(null)

  const handleSendToAvinode = async (fr: FlightRequest) => {
    setSendingToAvinode(fr.id)
    setAvinodeError(null)

    try {
      // Extract ICAO codes from airport strings like "Teterboro (KTEB)"
      const extractIcao = (airportStr: string) => {
        const match = airportStr.match(/\(([A-Z]{4})\)/)
        return match ? match[1] : airportStr
      }

      const segments = [
        {
          startAirportId: extractIcao(fr.departure),
          endAirportId: extractIcao(fr.arrival),
          departureDate: fr.departureDate,
          timeTBD: true,
          paxCount: fr.passengers,
        },
      ]

      // Add return leg if round trip
      if (fr.returnDate) {
        segments.push({
          startAirportId: extractIcao(fr.arrival),
          endAirportId: extractIcao(fr.departure),
          departureDate: fr.returnDate,
          timeTBD: true,
          paxCount: fr.passengers,
        })
      }

      // Real API call via our proxy route
      const response = await createTrip(avinodeConfig, segments)
      const trip = response.data

      updateFlightRequestAvinode(fr.id, {
        avinodeTripId: trip.tripId || trip.id,
        avinodeTripHref: trip.href,
        avinodeSearchLink: trip.actions?.searchInAvinode?.href || undefined,
        avinodeViewLink: trip.actions?.viewInAvinode?.href || undefined,
        avinodeStatus: "sent_to_avinode",
      })

      addAvinodeActivity({
        type: "trip_created",
        title: "Trip Created in Avinode",
        description: `Trip for ${fr.clientName}: ${fr.departure} to ${fr.arrival} on ${fr.departureDate}. ${fr.passengers} passengers. Trip ID: ${trip.tripId || trip.id}`,
        flightRequestId: fr.id,
        avinodeTripId: trip.tripId || trip.id,
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
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                        Avinode: {fr.avinodeTripId}
                      </span>
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
                          title={!avinodeConnected ? "Configure Avinode API credentials first" : "Create trip in Avinode via POST /trips"}
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

function NewFlightRequestForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: FormData) => void
}) {
  const { customers, addCustomer } = useStore()
  const [customerMode, setCustomerMode] = useState<"select" | "new">("select")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      returnDate: form.returnDate || undefined,
      specialRequests: form.specialRequests || undefined,
    })
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
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Departure Airport *</span>
            <input
              required
              value={form.departure}
              onChange={(e) => setForm({ ...form, departure: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Teterboro (KTEB)"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Arrival Airport *</span>
            <input
              required
              value={form.arrival}
              onChange={(e) => setForm({ ...form, arrival: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Miami Opa-Locka (KOPF)"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
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
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Return Date</span>
            <input
              type="date"
              value={form.returnDate}
              onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
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
