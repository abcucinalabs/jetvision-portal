"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import {
  type AvinodeWebhookEventType,
} from "@/lib/avinode"

// ── Types ──────────────────────────────────────────────────────────

export type UserRole = "iso" | "manager"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Notification {
  id: string
  title: string
  body: string
  fromUserId: string
  fromUserName: string
  toRole: UserRole | "all"
  toUserId?: string
  createdAt: string
  read: boolean
  readAt?: string
  deleted?: boolean
  deletedAt?: string
  deletedByUserId?: string
}

export type FlightRequestStatus =
  | "pending"
  | "under_review"
  | "rfq_submitted"
  | "quote_received"
  | "proposal_ready"
  | "proposal_sent"
  | "accepted"
  | "declined"
  | "cancelled"

export interface FlightRequest {
  id: string
  isoId: string
  isoName: string
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
  status: FlightRequestStatus
  createdAt: string
  // Avinode integration fields
  avinodeTripId?: string        // Avinode trip display ID (e.g. "A1B2C3")
  avinodeTripHref?: string      // API href for the trip
  avinodeSearchLink?: string    // Deep link to search in Avinode
  avinodeViewLink?: string      // Deep link to view in Avinode
  avinodeRfqIds?: string[]      // Associated RFQ IDs from Avinode
  avinodeQuoteIds?: string[]    // Associated quote IDs from Avinode
  avinodeQuoteCount?: number
  avinodeBestQuoteAmount?: number
  avinodeBestQuoteCurrency?: string
  avinodeFirstQuoteAt?: string
  avinodeLastSyncAt?: string
  avinodeStatus?: "not_sent" | "sent_to_avinode" | "rfq_sent" | "quotes_received" | "booked" | "cancelled"
  // Proposal builder fields
  isoCommission?: number
  jetvisionCost?: number
  proposalNotes?: string
  selectedQuoteId?: string
  selectedQuoteAmount?: number
  totalPrice?: number
  proposalSentAt?: string
  clientDecisionAt?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  createdByUserId?: string
  visibleToIsoIds?: string[]
  createdAt: string
}

export interface MarketplaceJet {
  id: string
  operator: string
  aircraft: string
  category: string
  basePrice: number
  seats: number
  range: string
  imageUrl: string
  available: boolean
}

export interface Proposal {
  id: string
  flightRequestId: string
  isoId: string
  isoName: string
  clientName: string
  aircraft: string
  operator: string
  departure: string
  arrival: string
  departureDate: string
  returnDate?: string
  price: number
  isoCommissionPct: number   // 5–20%, default 10%
  jetstreamCostPct: number   // 5–25%
  notes?: string
  status: "pending" | "sent_to_client" | "accepted" | "declined"
  createdAt: string
  // Avinode integration fields
  avinodeQuoteId?: string
  avinodeRfqId?: string
  avinodeQuotePrice?: number
  avinodeQuoteCurrency?: string
  avinodeOperatorResponse?: "quoted" | "declined" | "pending"
}

// ── Seed Data ──────────────────────────────────────────────────────

const USERS: User[] = [
  { id: "iso-1", name: "Jordan Carter", email: "jordan@jetvision.com", role: "iso" },
  { id: "iso-2", name: "Alex Rivera", email: "alex@jetvision.com", role: "iso" },
  { id: "mgr-1", name: "Morgan Hayes", email: "morgan@jetvision.com", role: "manager" },
]

const SEED_NOTIFICATIONS: Notification[] = []

const SEED_FLIGHT_REQUESTS: FlightRequest[] = [
  {
    id: "fr-1",
    isoId: "iso-1",
    isoName: "Jordan Carter",
    clientName: "Richard Branson III",
    clientEmail: "rb3@example.com",
    clientPhone: "+1 (555) 234-5678",
    departure: "Teterboro (KTEB)",
    arrival: "Miami Opa-Locka (KOPF)",
    departureDate: "2026-03-15",
    departureTime: "09:30",
    returnDate: "2026-03-20",
    returnTime: "16:45",
    passengers: 6,
    specialRequests: "Catering: premium seafood. Ground transport on arrival.",
    status: "pending",
    createdAt: "2026-02-11T08:00:00Z",
  },
  {
    id: "fr-2",
    isoId: "iso-2",
    isoName: "Alex Rivera",
    clientName: "Elena Vasquez",
    clientEmail: "elena.v@example.com",
    clientPhone: "+1 (555) 876-5432",
    departure: "Van Nuys (KVNY)",
    arrival: "Aspen (KASE)",
    departureDate: "2026-03-22",
    departureTime: "14:15",
    passengers: 4,
    specialRequests: "Ski equipment storage required.",
    status: "pending",
    createdAt: "2026-02-12T10:30:00Z",
  },
  {
    id: "fr-3",
    isoId: "iso-1",
    isoName: "Jordan Carter",
    clientName: "Marcus Chen",
    clientEmail: "mchen@example.com",
    clientPhone: "+1 (555) 111-2233",
    departure: "Chicago Midway (KMDW)",
    arrival: "Scottsdale (KSDL)",
    departureDate: "2026-04-01",
    departureTime: "11:00",
    returnDate: "2026-04-05",
    returnTime: "13:30",
    passengers: 8,
    status: "proposal_ready",
    createdAt: "2026-02-09T15:45:00Z",
    avinodeBestQuoteAmount: 68500,
    avinodeBestQuoteCurrency: "USD",
    avinodeQuoteCount: 1,
  },
]

const SEED_PROPOSALS: Proposal[] = [
  {
    id: "p-1",
    flightRequestId: "fr-3",
    isoId: "iso-1",
    isoName: "Jordan Carter",
    clientName: "Marcus Chen",
    aircraft: "Gulfstream G650",
    operator: "NetJets",
    departure: "Chicago Midway (KMDW)",
    arrival: "Scottsdale (KSDL)",
    departureDate: "2026-04-01",
    returnDate: "2026-04-05",
    price: 68500,
    isoCommissionPct: 10,
    jetstreamCostPct: 15,
    notes: "Round trip pricing. Includes ground transportation at both airports.",
    status: "pending",
    createdAt: "2026-02-10T12:00:00Z",
  },
]

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Richard Branson III",
    email: "rb3@example.com",
    phone: "+1 (555) 234-5678",
    createdByUserId: "iso-1",
    visibleToIsoIds: ["iso-1"],
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "cust-2",
    name: "Elena Vasquez",
    email: "elena.v@example.com",
    phone: "+1 (555) 876-5432",
    createdByUserId: "iso-2",
    visibleToIsoIds: ["iso-2"],
    createdAt: "2026-01-20T14:30:00Z",
  },
  {
    id: "cust-3",
    name: "Marcus Chen",
    email: "mchen@example.com",
    phone: "+1 (555) 111-2233",
    createdByUserId: "iso-1",
    visibleToIsoIds: ["iso-1"],
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "cust-4",
    name: "Sophia Laurent",
    email: "slaurent@example.com",
    phone: "+1 (555) 444-7788",
    createdByUserId: "iso-2",
    visibleToIsoIds: ["iso-2"],
    createdAt: "2026-02-05T16:45:00Z",
  },
  {
    id: "cust-5",
    name: "James Worthington",
    email: "jworthington@example.com",
    phone: "+1 (555) 999-3311",
    createdByUserId: "iso-1",
    visibleToIsoIds: ["iso-1"],
    createdAt: "2026-02-10T08:15:00Z",
  },
]

const MARKETPLACE_JETS: MarketplaceJet[] = [
  {
    id: "jet-1",
    operator: "NetJets",
    aircraft: "Gulfstream G650",
    category: "Heavy",
    basePrice: 12500,
    seats: 16,
    range: "7,000 nm",
    imageUrl: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=250&fit=crop",
    available: true,
  },
  {
    id: "jet-2",
    operator: "VistaJet",
    aircraft: "Bombardier Global 7500",
    category: "Ultra Long Range",
    basePrice: 15000,
    seats: 19,
    range: "7,700 nm",
    imageUrl: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=400&h=250&fit=crop",
    available: true,
  },
  {
    id: "jet-3",
    operator: "Flexjet",
    aircraft: "Embraer Praetor 600",
    category: "Super Midsize",
    basePrice: 7800,
    seats: 12,
    range: "4,018 nm",
    imageUrl: "https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=400&h=250&fit=crop",
    available: true,
  },
  {
    id: "jet-4",
    operator: "Wheels Up",
    aircraft: "Citation X+",
    category: "Midsize",
    basePrice: 5400,
    seats: 8,
    range: "3,460 nm",
    imageUrl: "https://images.unsplash.com/photo-1583395838144-09af498abfed?w=400&h=250&fit=crop",
    available: false,
  },
  {
    id: "jet-5",
    operator: "Jet Linx",
    aircraft: "Challenger 350",
    category: "Super Midsize",
    basePrice: 6200,
    seats: 10,
    range: "3,200 nm",
    imageUrl: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&h=250&fit=crop",
    available: true,
  },
  {
    id: "jet-6",
    operator: "Sentient Jet",
    aircraft: "Phenom 300E",
    category: "Light",
    basePrice: 3800,
    seats: 6,
    range: "2,010 nm",
    imageUrl: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=400&h=250&fit=crop",
    available: true,
  },
]

// ── Context ────────────────────────────────────────────────────────

interface StoreContextType {
  currentUser: User | null
  users: User[]
  login: (userId: string) => void
  logout: () => void

  notifications: Notification[]
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void
  markNotificationRead: (id: string) => void
  deleteNotification: (id: string) => void
  unreadCount: number

  flightRequests: FlightRequest[]
  addFlightRequest: (fr: Omit<FlightRequest, "id" | "createdAt" | "status">) => void
  refreshFlightRequests: () => Promise<void>
  updateFlightRequestStatus: (id: string, status: FlightRequestStatus) => void
  updateFlightRequest: (id: string, data: Partial<Omit<FlightRequest, "id" | "createdAt">>) => Promise<FlightRequest>

  proposals: Proposal[]
  addProposal: (p: Omit<Proposal, "id" | "createdAt" | "status">) => void
  updateProposalStatus: (id: string, status: Proposal["status"]) => void

  customers: Customer[]
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer
  updateCustomer: (id: string, data: Partial<Pick<Customer, "name" | "email" | "phone" | "visibleToIsoIds">>) => void
  deleteCustomer: (id: string) => void

  marketplaceJets: MarketplaceJet[]

  // Avinode integration
  avinodeConnected: boolean
  avinodeActivity: AvinodeActivityItem[]
  addAvinodeActivity: (item: Omit<AvinodeActivityItem, "id" | "timestamp">) => void
  updateFlightRequestAvinode: (
    id: string,
    data: Partial<Pick<FlightRequest, "avinodeTripId" | "avinodeTripHref" | "avinodeSearchLink" | "avinodeViewLink" | "avinodeRfqIds" | "avinodeQuoteIds" | "avinodeQuoteCount" | "avinodeBestQuoteAmount" | "avinodeBestQuoteCurrency" | "avinodeFirstQuoteAt" | "avinodeLastSyncAt" | "avinodeStatus">>
  ) => void
  syncFlightRequestPipeline: (id: string) => Promise<void>
  avinodeWebhookEvents: AvinodeWebhookEventType[]
  setAvinodeWebhookEvents: (events: AvinodeWebhookEventType[]) => void
}

export interface AvinodeActivityItem {
  id: string
  type: "trip_created" | "rfq_sent" | "quote_received" | "message_sent" | "message_received" | "lead_created" | "trip_cancelled" | "webhook_received" | "search_completed"
  title: string
  description: string
  flightRequestId?: string
  avinodeTripId?: string
  timestamp: string
}

export function isNotificationVisibleToUser(notification: Notification, user: User): boolean {
  if (notification.toRole === "all") return true
  if (notification.toRole !== user.role) return false
  if (notification.toUserId && notification.toUserId !== user.id) return false
  return true
}

const StoreContext = createContext<StoreContextType | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS)
  const [flightRequests, setFlightRequests] = useState<FlightRequest[]>(SEED_FLIGHT_REQUESTS)
  const [proposals, setProposals] = useState<Proposal[]>(SEED_PROPOSALS)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [avinodeConnected, setAvinodeConnected] = useState(false)
  const [avinodeActivity, setAvinodeActivity] = useState<AvinodeActivityItem[]>([])
  const [avinodeWebhookEvents, setAvinodeWebhookEvents] = useState<AvinodeWebhookEventType[]>([
    "TripRequestSellerResponse",
    "TripRequestMine",
    "TripChatFromSeller",
    "TripChatMine",
    "ClientLeads",
  ])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const [customersRes, requestsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/flight-requests"),
        ])

        if (!cancelled && customersRes.ok) {
          const customersJson = await customersRes.json()
          if (Array.isArray(customersJson.data)) {
            setCustomers(customersJson.data)
          }
        }

        if (!cancelled && requestsRes.ok) {
          const requestsJson = await requestsRes.json()
          if (Array.isArray(requestsJson.data)) {
            setFlightRequests(requestsJson.data)
          }
        }

      } catch (error) {
        console.error("Failed to load Supabase-backed data:", error)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setNotifications([])
      return
    }

    let cancelled = false
    const loadNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${encodeURIComponent(currentUser.id)}`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled && Array.isArray(json?.data)) {
          setNotifications(json.data)
        }
      } catch (error) {
        console.error("Failed to load notifications:", error)
      }
    }

    void loadNotifications()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  useEffect(() => {
    let cancelled = false

    const checkAvinodeStatus = async () => {
      try {
        const res = await fetch("/api/avinode/status")
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setAvinodeConnected(Boolean(json.connected))
        }
      } catch {
        if (!cancelled) {
          setAvinodeConnected(false)
        }
      }
    }

    void checkAvinodeStatus()
    return () => {
      cancelled = true
    }
  }, [])

  // Restore the selected user role across page navigations
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("jv_user_id") : null
    if (saved) {
      const user = USERS.find((u) => u.id === saved)
      if (user) setCurrentUser(user)
    }
  }, [])

  const login = useCallback((userId: string) => {
    const user = USERS.find((u) => u.id === userId)
    if (user) {
      setCurrentUser(user)
      localStorage.setItem("jv_user_id", userId)
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem("jv_user_id")
  }, [])

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "createdAt" | "read">) => {
      const optimistic: Notification = {
        ...n,
        id: `n-${Date.now()}`,
        createdAt: new Date().toISOString(),
        read: false,
      }

      setNotifications((prev) => [
        optimistic,
        ...prev,
      ])

      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          if (!json?.data) return
          setNotifications((prev) => prev.map((item) => (item.id === optimistic.id ? json.data : item)))
        })
        .catch((error) => {
          console.error("Failed to persist notification:", error)
        })
    },
    []
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    )

    void fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true, userId: currentUser?.id || null }),
    }).catch((error) => {
      console.error("Failed to mark notification as read:", error)
    })
  }, [currentUser?.id])

  const deleteNotification = useCallback((id: string) => {
    const deletedByUserId = currentUser?.id || null
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    void fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleted: true, deletedByUserId, userId: deletedByUserId }),
    }).catch((error) => {
      console.error("Failed to delete notification:", error)
    })
  }, [currentUser?.id])

  const unreadCount = notifications.filter(
    (n) =>
      !n.read &&
      currentUser &&
      isNotificationVisibleToUser(n, currentUser)
  ).length

  const addFlightRequest = useCallback(
    (fr: Omit<FlightRequest, "id" | "createdAt" | "status">) => {
      const optimistic: FlightRequest = {
        ...fr,
        id: `fr-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: "pending",
      }

      setFlightRequests((prev) => [optimistic, ...prev])

      // Notify manager of new request
      addNotification({
        title: "New Flight Request Submitted",
        body: `${fr.isoName} submitted a new request for ${fr.clientName}: ${fr.departure} → ${fr.arrival} on ${fr.departureDate} for ${fr.passengers} passenger${fr.passengers === 1 ? "" : "s"}.`,
        fromUserId: fr.isoId,
        fromUserName: fr.isoName,
        toRole: "manager",
      })

      void fetch("/api/flight-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          if (!json?.data) return
          setFlightRequests((prev) => prev.map((item) => (item.id === optimistic.id ? json.data : item)))
        })
        .catch((error) => {
          console.error("Failed to persist flight request:", error)
        })
    },
    [addNotification]
  )

  const refreshFlightRequests = useCallback(async () => {
    const res = await fetch("/api/flight-requests")
    if (!res.ok) {
      throw new Error(`Failed to refresh flight requests: HTTP ${res.status}`)
    }

    const json = await res.json()
    if (!Array.isArray(json?.data)) return

    const latest = json.data as FlightRequest[]
    setFlightRequests(latest)

    const syncEligibleStatuses = new Set<FlightRequestStatus>([
      "under_review",
      "rfq_submitted",
      "quote_received",
      "proposal_ready",
    ])
    const syncTargets = latest.filter((fr) => fr.avinodeTripId && syncEligibleStatuses.has(fr.status))
    if (syncTargets.length === 0) return

    const syncedRows = await Promise.all(
      syncTargets.map(async (fr) => {
        try {
          const syncRes = await fetch(`/api/flight-requests/${fr.id}/sync`, { method: "POST" })
          if (!syncRes.ok) return null
          const syncJson = await syncRes.json()
          return (syncJson?.data || null) as FlightRequest | null
        } catch {
          return null
        }
      })
    )

    const syncedById = new Map(
      syncedRows.filter((item): item is FlightRequest => Boolean(item)).map((item) => [item.id, item])
    )

    if (syncedById.size > 0) {
      setFlightRequests((prev) => prev.map((fr) => syncedById.get(fr.id) || fr))
    }
  }, [])

  const updateFlightRequestStatus = useCallback((id: string, status: FlightRequestStatus) => {
    setFlightRequests((prev) => prev.map((fr) => (fr.id === id ? { ...fr, status } : fr)))

    void fetch(`/api/flight-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch((error) => {
      console.error("Failed to persist flight request status:", error)
    })
  }, [])

  const updateFlightRequest = useCallback(async (id: string, data: Partial<Omit<FlightRequest, "id" | "createdAt">>): Promise<FlightRequest> => {
    const previous = flightRequests.find((fr) => fr.id === id)
    const isTransitionToProposalReady =
      previous &&
      previous.status !== "proposal_ready" &&
      data.status === "proposal_ready"

    if (isTransitionToProposalReady) {
      addNotification({
        title: "Your Proposal is Ready",
        body: `Your proposal for ${previous.clientName} (${previous.departure} → ${previous.arrival}) is ready. Please review and send to your client.`,
        fromUserId: currentUser?.id || "system",
        fromUserName: currentUser?.name || "System",
        toRole: "iso",
        toUserId: previous.isoId,
      })
    }

    setFlightRequests((prev) => prev.map((fr) => (fr.id === id ? { ...fr, ...data } : fr)))

    const res = await fetch(`/api/flight-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Failed to update flight request: HTTP ${res.status}`)
    const json = await res.json()
    if (json?.data) {
      setFlightRequests((prev) => prev.map((fr) => (fr.id === id ? json.data : fr)))
      return json.data
    }
    return data as FlightRequest
  }, [addNotification, currentUser?.id, currentUser?.name, flightRequests])

  const addProposal = useCallback(
    (p: Omit<Proposal, "id" | "createdAt" | "status">) => {
      setProposals((prev) => [
        {
          ...p,
          id: `p-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
        ...prev,
      ])
    },
    []
  )

  const updateProposalStatus = useCallback((id: string, status: Proposal["status"]) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }, [])

  const addCustomer = useCallback(
    (c: Omit<Customer, "id" | "createdAt">): Customer => {
      const newCustomer: Customer = {
        ...c,
        id: `cust-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      setCustomers((prev) => [newCustomer, ...prev])

      void fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          if (!json?.data) return
          setCustomers((prev) => prev.map((item) => (item.id === newCustomer.id ? json.data : item)))
        })
        .catch((error) => {
          console.error("Failed to persist customer:", error)
        })
      return newCustomer
    },
    []
  )

  const updateCustomer = useCallback((id: string, data: Partial<Pick<Customer, "name" | "email" | "phone" | "visibleToIsoIds">>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))

    void fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((error) => {
      console.error("Failed to update customer:", error)
    })
  }, [])

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id))

    void fetch(`/api/customers/${id}`, {
      method: "DELETE",
    }).catch((error) => {
      console.error("Failed to delete customer:", error)
    })
  }, [])

  const addAvinodeActivity = useCallback(
    (item: Omit<AvinodeActivityItem, "id" | "timestamp">) => {
      setAvinodeActivity((prev) => [
        {
          ...item,
          id: `av-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
    },
    []
  )

  const updateFlightRequestAvinode = useCallback(
    (
      id: string,
      data: Partial<Pick<FlightRequest, "avinodeTripId" | "avinodeTripHref" | "avinodeSearchLink" | "avinodeViewLink" | "avinodeRfqIds" | "avinodeQuoteIds" | "avinodeQuoteCount" | "avinodeBestQuoteAmount" | "avinodeBestQuoteCurrency" | "avinodeFirstQuoteAt" | "avinodeLastSyncAt" | "avinodeStatus">>
    ) => {
      setFlightRequests((prev) =>
        prev.map((fr) => (fr.id === id ? { ...fr, ...data } : fr))
      )

      void fetch(`/api/flight-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch((error) => {
        console.error("Failed to persist Avinode fields:", error)
      })
    },
    []
  )

  const syncFlightRequestPipeline = useCallback(async (id: string) => {
    const res = await fetch(`/api/flight-requests/${id}/sync`, { method: "POST" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error || "Failed to sync flight request pipeline")
    }

    const json = await res.json()
    if (!json?.data) return
    setFlightRequests((prev) => prev.map((fr) => (fr.id === id ? json.data : fr)))
  }, [])

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        users: USERS,
        login,
        logout,
        notifications,
        addNotification,
        markNotificationRead,
        deleteNotification,
        unreadCount,
        flightRequests,
        addFlightRequest,
        refreshFlightRequests,
        updateFlightRequestStatus,
        updateFlightRequest,
        proposals,
        addProposal,
        updateProposalStatus,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        marketplaceJets: MARKETPLACE_JETS,
        avinodeConnected,
        avinodeActivity,
        addAvinodeActivity,
        updateFlightRequestAvinode,
        syncFlightRequestPipeline,
        avinodeWebhookEvents,
        setAvinodeWebhookEvents,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
