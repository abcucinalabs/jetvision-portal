"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

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
  createdAt: string
  read: boolean
}

export type FlightRequestStatus = "pending" | "proposal_sent" | "accepted" | "declined"

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
  returnDate?: string
  passengers: number
  specialRequests?: string
  status: FlightRequestStatus
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
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
  notes?: string
  status: "pending" | "sent_to_client" | "accepted" | "declined"
  createdAt: string
}

// ── Seed Data ──────────────────────────────────────────────────────

const USERS: User[] = [
  { id: "iso-1", name: "Jordan Carter", email: "jordan@jetstream.com", role: "iso" },
  { id: "iso-2", name: "Alex Rivera", email: "alex@jetstream.com", role: "iso" },
  { id: "mgr-1", name: "Morgan Hayes", email: "morgan@jetstream.com", role: "manager" },
]

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n-4",
    title: "New Flight Request Awaiting Your Review",
    body: "Jordan Carter submitted a new flight request for Richard Branson III: Teterboro (KTEB) to Miami Opa-Locka (KOPF) on March 15, 2026 for 6 passengers. Please review the request details, source available flights via your preferred operator network, and generate an RFQ to send to operators. Once an operator responds with pricing, you can accept their quote or negotiate a new price before creating a proposal.",
    fromUserId: "iso-1",
    fromUserName: "Jordan Carter",
    toRole: "manager",
    createdAt: "2026-02-13T08:15:00Z",
    read: false,
  },
  {
    id: "n-1",
    title: "Q1 Revenue Update",
    body: "We exceeded our Q1 targets by 14%. Great work across all teams. New commission structures take effect next month.",
    fromUserId: "mgr-1",
    fromUserName: "Morgan Hayes",
    toRole: "all",
    createdAt: "2026-02-12T09:00:00Z",
    read: false,
  },
  {
    id: "n-2",
    title: "New Safety Protocols",
    body: "Updated FAA compliance requirements are now in effect. Please review the new checklist before submitting any flight requests. Training session scheduled for Friday.",
    fromUserId: "mgr-1",
    fromUserName: "Morgan Hayes",
    toRole: "iso",
    createdAt: "2026-02-10T14:30:00Z",
    read: false,
  },
  {
    id: "n-3",
    title: "Required: New Portal Training Available",
    body: "A new training module on the latest JetStream Portal enhancements is now available. Topics include the updated customer selection workflow, improved proposal builder, and new marketplace filters. All team members must complete this training by February 28th. Access it from the Help section in your profile.",
    fromUserId: "mgr-1",
    fromUserName: "Morgan Hayes",
    toRole: "all",
    createdAt: "2026-02-08T11:00:00Z",
    read: true,
  },
]

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
    returnDate: "2026-03-20",
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
    returnDate: "2026-04-05",
    passengers: 8,
    status: "proposal_sent",
    createdAt: "2026-02-09T15:45:00Z",
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
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "cust-2",
    name: "Elena Vasquez",
    email: "elena.v@example.com",
    phone: "+1 (555) 876-5432",
    createdAt: "2026-01-20T14:30:00Z",
  },
  {
    id: "cust-3",
    name: "Marcus Chen",
    email: "mchen@example.com",
    phone: "+1 (555) 111-2233",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "cust-4",
    name: "Sophia Laurent",
    email: "slaurent@example.com",
    phone: "+1 (555) 444-7788",
    createdAt: "2026-02-05T16:45:00Z",
  },
  {
    id: "cust-5",
    name: "James Worthington",
    email: "jworthington@example.com",
    phone: "+1 (555) 999-3311",
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
  unreadCount: number

  flightRequests: FlightRequest[]
  addFlightRequest: (fr: Omit<FlightRequest, "id" | "createdAt" | "status">) => void
  updateFlightRequestStatus: (id: string, status: FlightRequestStatus) => void

  proposals: Proposal[]
  addProposal: (p: Omit<Proposal, "id" | "createdAt" | "status">) => void
  updateProposalStatus: (id: string, status: Proposal["status"]) => void

  customers: Customer[]
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer

  marketplaceJets: MarketplaceJet[]
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
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS)

  const login = useCallback((userId: string) => {
    const user = USERS.find((u) => u.id === userId)
    if (user) setCurrentUser(user)
  }, [])

  const logout = useCallback(() => setCurrentUser(null), [])

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "createdAt" | "read">) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `n-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ])
    },
    []
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const unreadCount = notifications.filter(
    (n) =>
      !n.read &&
      currentUser &&
      (n.toRole === "all" || n.toRole === currentUser.role)
  ).length

  const addFlightRequest = useCallback(
    (fr: Omit<FlightRequest, "id" | "createdAt" | "status">) => {
      setFlightRequests((prev) => [
        {
          ...fr,
          id: `fr-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
        ...prev,
      ])
    },
    []
  )

  const updateFlightRequestStatus = useCallback((id: string, status: FlightRequestStatus) => {
    setFlightRequests((prev) => prev.map((fr) => (fr.id === id ? { ...fr, status } : fr)))
  }, [])

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
      return newCustomer
    },
    []
  )

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
        unreadCount,
        flightRequests,
        addFlightRequest,
        updateFlightRequestStatus,
        proposals,
        addProposal,
        updateProposalStatus,
        customers,
        addCustomer,
        marketplaceJets: MARKETPLACE_JETS,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
