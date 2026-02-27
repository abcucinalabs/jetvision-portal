"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore, type Customer } from "@/lib/store"
import { searchAirports } from "@/lib/avinode-client"
import { searchAirportDirectory } from "@/lib/airport-directory"
import {
  PlaneTakeoff,
  Plus,
  X,
  Search,
  UserPlus,
  ChevronDown,
  RefreshCw,
} from "lucide-react"
import { FlightRequestDataTable } from "@/components/flight-request-data-table"

export function FlightRequestsView() {
  const {
    currentUser,
    flightRequests,
    addFlightRequest,
    refreshFlightRequests,
  } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const refreshInFlightRef = useRef(false)

  const router = useRouter()

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const isCreateMode = showForm && !isManager

  const requests = isManager
    ? flightRequests
    : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const performRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true
    setRefreshing(true)
    try {
      await refreshFlightRequests()
      setLastRefreshedAt(new Date())
    } finally {
      setRefreshing(false)
      refreshInFlightRef.current = false
    }
  }, [refreshFlightRequests])

  useEffect(() => {
    void performRefresh()
    const intervalId = window.setInterval(() => {
      void performRefresh()
    }, 15 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [performRefresh])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flight Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isManager
              ? "View and manage all incoming flight requests."
              : "Submit and track flight requests for your clients."}
          </p>
        </div>
        {isCreateMode ? (
          <button
            onClick={() => setShowForm(false)}
            className="rounded-xl border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Back to Flight Requests
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">
                {lastRefreshedAt
                  ? `Last refreshed: ${lastRefreshedAt.toLocaleString()}`
                  : "Last refreshed: --"}
              </div>
              <div className="text-[10px] text-muted-foreground/80">Auto refresh every 15 minutes</div>
            </div>
            <button
              onClick={() => void performRefresh()}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
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
        )}
      </div>

      {isCreateMode ? (
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
      ) : (
        <>
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
            <div className="rounded-xl border border-border bg-card p-4">
              <FlightRequestDataTable
                data={requests}
                isManager={isManager}
                onRowClick={(fr) => router.push(`/requests/${fr.id}`)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}


export interface FormData {
  clientName: string
  clientEmail: string
  clientPhone: string
  departure: string
  arrival: string
  departureDate: string
  departureTime?: string
  returnDate?: string
  returnTime?: string
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

function mapDirectoryAirport(airport: ReturnType<typeof searchAirportDirectory>[number]): AirportSuggestion {
  return {
    id: `dir-${airport.icao}`,
    name: airport.name,
    icao: airport.icao,
    iata: airport.iata,
    city: airport.city,
    country: { code: airport.countryCode, name: airport.countryName },
  }
}

function mergeAirportOptions(
  remote: AirportSuggestion[],
  local: AirportSuggestion[],
  fallback: AirportSuggestion | null
) {
  const merged = [...remote, ...local, ...(fallback ? [fallback] : [])]
  const seen = new Set<string>()
  const unique: AirportSuggestion[] = []

  for (const airport of merged) {
    const key = airport.icao || airport.id
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(airport)
    if (unique.length >= 20) break
  }

  return unique
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (!digits) return ""

  const hasCountryCode = digits.length > 10 && digits.startsWith("1")
  const local = hasCountryCode ? digits.slice(1) : digits.slice(0, 10)
  const prefix = hasCountryCode ? "+1 " : ""

  if (local.length <= 3) return `${prefix}(${local}`
  if (local.length <= 6) return `${prefix}(${local.slice(0, 3)}) ${local.slice(3)}`
  return `${prefix}(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

export function NewFlightRequestForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: FormData) => void
}) {
  const { currentUser, customers, addCustomer, avinodeConnected } = useStore()
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
  const [airportLookupError, setAirportLookupError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    departure: "",
    arrival: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
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
    if (!form.departure || form.departure.length < 3) {
      setDepartureOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingDeparture(true)
      const fallback = manualIcaoOption(form.departure)
      const localMatches = searchAirportDirectory(form.departure, 20).map(mapDirectoryAirport)
      try {
        const remote = avinodeConnected ? await searchAirports(form.departure) : []
        setDepartureOptions(mergeAirportOptions(remote, localMatches, fallback))
        setAirportLookupError(null)
      } catch (error) {
        setDepartureOptions(mergeAirportOptions([], localMatches, fallback))
        setAirportLookupError("Live lookup unavailable. Showing local airport directory.")
      } finally {
        setSearchingDeparture(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [avinodeConnected, form.departure])

  useEffect(() => {
    if (!form.arrival || form.arrival.length < 3) {
      setArrivalOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingArrival(true)
      const fallback = manualIcaoOption(form.arrival)
      const localMatches = searchAirportDirectory(form.arrival, 20).map(mapDirectoryAirport)
      try {
        const remote = avinodeConnected ? await searchAirports(form.arrival) : []
        setArrivalOptions(mergeAirportOptions(remote, localMatches, fallback))
        setAirportLookupError(null)
      } catch (error) {
        setArrivalOptions(mergeAirportOptions([], localMatches, fallback))
        setAirportLookupError("Live lookup unavailable. Showing local airport directory.")
      } finally {
        setSearchingArrival(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [avinodeConnected, form.arrival])

  const visibleCustomers = currentUser?.role === "iso"
    ? customers.filter((c) => c.visibleToIsoIds?.includes(currentUser.id))
    : customers

  const filteredCustomers = visibleCustomers.filter(
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
      clientPhone: formatPhoneNumber(customer.phone),
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
        createdByUserId: currentUser?.id,
        visibleToIsoIds: currentUser?.role === "iso" ? [currentUser.id] : [],
      })
    }

    onSubmit({
      ...form,
      departureTime: form.departureTime || undefined,
      returnDate: tripType === "round_trip" ? form.returnDate || undefined : undefined,
      returnTime: tripType === "round_trip" ? form.returnTime || undefined : undefined,
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
                  onChange={(e) => setForm({ ...form, clientPhone: formatPhoneNumber(e.target.value) })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+1 (555) 000-0000"
                  inputMode="tel"
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
          <p className="text-xs text-muted-foreground">{airportLookupError}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Trip Type</span>
          <button
            type="button"
            onClick={() => {
              setTripType("one_way")
              setForm((prev) => ({ ...prev, returnDate: "", returnTime: "" }))
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

        <div className={`grid gap-4 ${tripType === "round_trip" ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-3"}`}>
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
            <span className="text-xs font-medium text-muted-foreground">Requested Departure Time</span>
            <input
              type="time"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
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
          {tripType === "round_trip" && (
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Return Time *</span>
              <input
                required
                type="time"
                value={form.returnTime}
                onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
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
