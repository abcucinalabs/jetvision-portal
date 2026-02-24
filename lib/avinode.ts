/**
 * Avinode API Integration Layer
 *
 * Based on: https://developer.avinodegroup.com/docs/introduction
 *
 * This module provides TypeScript types, configuration, and service functions
 * for interacting with the Avinode Marketplace API. It supports:
 *
 * - Authentication (API Token + Bearer Auth)
 * - Trip creation (POST /trips) with searchInAvinode deep links
 * - Airport search (GET /airports/search)
 * - RFQ management (GET /rfqs/{id})
 * - Quote handling (seller responses, pricing)
 * - Trip messaging (GET/POST /tripmsgs)
 * - Client leads (POST /leads, GET /leads/{id})
 * - Empty leg search (POST /emptyleg/search)
 * - Webhook configuration (POST /webhooks/settings)
 * - Trip cancellation (PUT /trips/{id}/cancel)
 */

import { buildAuthorizationHeader } from "@/lib/avinode-auth"

// ── Avinode Configuration ──────────────────────────────────────────

export interface AvinodeConfig {
  /** Base URL for the Avinode API (sandbox or production) */
  baseUrl: string
  /** X-Avinode-ApiToken header value - identifies the calling application */
  apiToken: string
  /** Bearer token for Authorization header - identifies the API connection */
  authToken: string
  /** X-Avinode-Product header value - app name and version */
  product: string
  /** Optional X-Avinode-ActAsAccount header */
  actAsAccount?: string
  /** API version (default: v1.0) */
  apiVersion: string
}

export const AVINODE_SANDBOX_URL = "https://sandbox.avinode.com/api"
export const AVINODE_LIVE_URL = "https://services.avinode.com/api"

export const DEFAULT_CONFIG: AvinodeConfig = {
  baseUrl: AVINODE_SANDBOX_URL,
  apiToken: "",
  authToken: "",
  product: "JetStream Portal v1.0",
  apiVersion: "v1.0",
}

// ── Avinode API Types ──────────────────────────────────────────────

// Airport
export interface AvinodeAirport {
  id: string
  href: string
  type: "airports"
  name: string
  city: string
  country: { code: string; name: string }
  icao: string
  iata: string
  latitude?: number
  longitude?: number
}

// Trip Segment / Leg
export interface AvinodeLeg {
  startAirport: AvinodeAirport
  endAirport: AvinodeAirport
  departureDateTime: {
    dateTimeUTC: string
    dateTimeLocal: string
  }
  timeTBD: boolean
  paxCount: number
  paxSegment: boolean
}

// Trip (POST /trips request body)
export interface AvinodeTripCreate {
  segments: {
    startAirportId: string
    endAirportId: string
    departureDate: string
    departureTime?: string
    timeTBD?: boolean
    paxCount: number
  }[]
  aircraftCategory?: string
  postToTripBoard?: boolean
  tripBoardPostMessage?: string
}

// Trip (response)
export interface AvinodeTrip {
  id: string
  href: string
  type: "trips"
  tripId: string // Display ID like "A1B2C3"
  actions: {
    searchInAvinode?: AvinodeDeepLink
    viewInAvinode?: AvinodeDeepLink
  }
  segments: AvinodeLeg[]
  status: string
  createdOn: string
}

// Deep Link
export interface AvinodeDeepLink {
  type: string
  description: string
  httpMethod: string
  href: string
}

// RFQ (Request for Quote)
export interface AvinodeRfq {
  id: string
  href: string
  type: "rfqs"
  tripId: string
  buyerCompany: {
    id: string
    displayName: string
  }
  sellerLift: AvinodeSellerLift[]
  segments: AvinodeLeg[]
  status: string
  createdOn: string
  actions: {
    viewInAvinode?: AvinodeDeepLink
  }
}

// Seller Lift (within an RFQ)
export interface AvinodeSellerLift {
  id: string
  sellerCompany: {
    id: string
    displayName: string
  }
  aircraft?: {
    id: string
    tailNumber?: string
    aircraftType: string
    aircraftCategory: string
    seatCapacity: number
    yearOfMake?: number
  }
  actions: {
    viewInAvinode?: AvinodeDeepLink
  }
  sourcingDisplayStatus: string
  sourcingStatus: number
  latestQuote?: AvinodeQuote
}

// Quote (seller response to RFQ)
export interface AvinodeQuote {
  id: string
  href: string
  type: "quotes"
  price: {
    amount: number
    currency: string
  }
  segments: AvinodeLeg[]
  aircraft: {
    aircraftType: string
    aircraftCategory: string
    tailNumber?: string
  }
  operator: {
    displayName: string
  }
  validUntil?: string
  createdOn: string
  quoteBreakdown?: AvinodeQuoteBreakdown
}

// Quote Breakdown
export interface AvinodeQuoteBreakdown {
  sections: {
    name: string
    lineItems: {
      description: string
      amount: number
      currency: string
    }[]
  }[]
}

// Trip Message
export interface AvinodeTripMessage {
  id: string
  href: string
  type: "tripmsgs"
  tripId: string
  message: string
  lift: {
    actions: {
      viewInAvinode?: AvinodeDeepLink
    }
    aircraftCategory: string
    aircraftType: string
    sourcingDisplayStatus: string
    sourcingStatus: number
  }[]
  createdOn: string
}

// Client Lead
export interface AvinodeClientLead {
  id: string
  href: string
  type: "leads"
  actions: {
    searchInAvinode?: AvinodeDeepLink
    viewInAvinode?: AvinodeDeepLink
  }
  leadContactInfo: {
    name: string
    emails: string[]
    phone: string
  }
  segments: AvinodeLeg[]
  createdOn: string
}

// Search Result (POST /searches)
export interface AvinodeSearchResult {
  id: string
  aircraft: {
    id: string
    aircraftType: string
    aircraftCategory: string
    seatCapacity: number
    yearOfMake?: number
  }
  operator: {
    displayName: string
  }
  price: {
    amount: number
    currency: string
  }
  segments: {
    flightTimeMinutes: number
    distanceNM: number
  }[]
  links?: {
    offshoreQuotes?: {
      href: string
    }
  }
}

// Empty Leg
export interface AvinodeEmptyLeg {
  id: string
  href: string
  type: "emptylegs"
  aircraft: {
    aircraftType: string
    aircraftCategory: string
  }
  startAirport: AvinodeAirport
  endAirport: AvinodeAirport
  departureDateTime: string
  price?: {
    amount: number
    currency: string
  }
}

// Webhook Setting
export interface AvinodeWebhookSetting {
  url: string
  eventTypes: AvinodeWebhookEventType[]
  active: boolean
}

export type AvinodeWebhookEventType =
  | "TripRequest"
  | "TripRequestSellerResponse"
  | "TripRequestMine"
  | "TripChatFromBuyer"
  | "TripChatFromSeller"
  | "TripChatMine"
  | "TripRequestSellerResponseMine"
  | "EmptyLegs"
  | "ClientLeads"

// Webhook Notification Payload
export interface AvinodeWebhookPayload {
  id: string
  href: string
  type: "rfqs" | "tripmsgs" | "emptylegs" | "leads"
  tripId?: string
}

// Trip Cancellation
export interface AvinodeTripCancel {
  id: string
  messageToSeller: string
  reason: "BY_CLIENT" | "CHANGED" | "BOOKED" | "OTHER"
}

// Aircraft categories for search filters
export const AIRCRAFT_CATEGORIES = [
  "Airliner",
  "VIP airliner",
  "Ultra long range",
  "Heavy jet",
  "Super midsize jet",
  "Midsize jet",
  "Super light jet",
  "Light jet",
  "Entry level jet (VLJ)",
  "Turbo prop",
  "Piston",
  "Helicopter twin engine",
  "Helicopter single engine",
] as const

// ── API Response Wrapper ───────────────────────────────────────────

export interface AvinodeApiResponse<T> {
  meta: {
    errors: { message: string; code?: string }[]
    warnings: { message: string }[]
    infos: { message: string }[]
  }
  data: T
}

// ── HTTP Request Headers Builder ───────────────────────────────────

export function buildHeaders(config: AvinodeConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Avinode-ApiToken": config.apiToken,
    Authorization: buildAuthorizationHeader(config.authToken),
    "X-Avinode-SentTimestamp": new Date().toISOString(),
    "X-Avinode-ApiVersion": config.apiVersion,
    "X-Avinode-Product": config.product,
    "Accept-Encoding": "gzip",
  }
  if (config.actAsAccount) {
    headers["X-Avinode-ActAsAccount"] = config.actAsAccount
  }
  return headers
}

// ── Service Functions ──────────────────────────────────────────────

/**
 * Search airports by text filter (city, name, ICAO/IATA code)
 * GET /airports/search?filter={text}
 */
export async function searchAirports(
  config: AvinodeConfig,
  filter: string
): Promise<AvinodeAirport[]> {
  const res = await fetch(
    `${config.baseUrl}/airports/search?filter=${encodeURIComponent(filter)}`,
    { headers: buildHeaders(config) }
  )
  if (!res.ok) throw new Error(`Airport search failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeAirport[]> = await res.json()
  return json.data
}

/**
 * Create a trip in Avinode and get a search deep link
 * POST /trips
 */
export async function createTrip(
  config: AvinodeConfig,
  trip: AvinodeTripCreate
): Promise<AvinodeTrip> {
  const res = await fetch(`${config.baseUrl}/trips`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(trip),
  })
  if (!res.ok) throw new Error(`Trip creation failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeTrip> = await res.json()
  return json.data
}

/**
 * Cancel a trip
 * PUT /trips/{id}/cancel
 */
export async function cancelTrip(
  config: AvinodeConfig,
  cancellation: AvinodeTripCancel
): Promise<void> {
  const res = await fetch(`${config.baseUrl}/trips/${cancellation.id}/cancel`, {
    method: "PUT",
    headers: buildHeaders(config),
    body: JSON.stringify(cancellation),
  })
  if (!res.ok) throw new Error(`Trip cancellation failed: ${res.status}`)
}

/**
 * Download an RFQ (Request for Quote) by ID
 * GET /rfqs/{id}
 */
export async function getRfq(
  config: AvinodeConfig,
  rfqId: string,
  fields?: string[]
): Promise<AvinodeRfq> {
  const params = fields ? `?fields=${fields.join(",")}` : ""
  const res = await fetch(`${config.baseUrl}/rfqs/${rfqId}${params}`, {
    headers: buildHeaders(config),
  })
  if (!res.ok) throw new Error(`RFQ fetch failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeRfq> = await res.json()
  return json.data
}

/**
 * Read a trip message (seller response, chat, etc.)
 * GET /tripmsgs/{id}
 */
export async function getTripMessage(
  config: AvinodeConfig,
  messageId: string
): Promise<AvinodeTripMessage> {
  const res = await fetch(`${config.baseUrl}/tripmsgs/${messageId}`, {
    headers: buildHeaders(config),
  })
  if (!res.ok) throw new Error(`Trip message fetch failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeTripMessage> = await res.json()
  return json.data
}

/**
 * Send a trip chat message
 * POST /tripmsgs
 */
export async function sendTripMessage(
  config: AvinodeConfig,
  tripId: string,
  liftId: string,
  message: string
): Promise<AvinodeTripMessage> {
  const res = await fetch(`${config.baseUrl}/tripmsgs`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify({ tripId, liftId, message }),
  })
  if (!res.ok) throw new Error(`Trip message send failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeTripMessage> = await res.json()
  return json.data
}

/**
 * Run an aircraft search (end-client facing)
 * POST /searches
 */
export async function searchAircraft(
  config: AvinodeConfig,
  segments: AvinodeTripCreate["segments"],
  options?: {
    aircraftCategory?: string
    fields?: string[]
  }
): Promise<AvinodeSearchResult[]> {
  const body: Record<string, unknown> = { segments }
  if (options?.aircraftCategory) body.aircraftCategory = options.aircraftCategory
  const params = options?.fields ? `?fields=${options.fields.join(",")}` : ""
  const res = await fetch(`${config.baseUrl}/searches${params}`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Aircraft search failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeSearchResult[]> = await res.json()
  return json.data
}

/**
 * Search for empty legs
 * POST /emptyleg/search
 */
export async function searchEmptyLegs(
  config: AvinodeConfig,
  params: {
    startAirportId?: string
    endAirportId?: string
    fromDate: string
    toDate: string
    paxCount?: number
  }
): Promise<AvinodeEmptyLeg[]> {
  const res = await fetch(`${config.baseUrl}/emptyleg/search`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Empty leg search failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeEmptyLeg[]> = await res.json()
  return json.data
}

/**
 * Create a client lead in Avinode
 * POST /leads
 */
export async function createLead(
  config: AvinodeConfig,
  lead: {
    leadContactInfo: { name: string; emails: string[]; phone: string }
    segments: AvinodeTripCreate["segments"]
    lift?: { aircraftCategory: string }[]
    message?: string
  }
): Promise<AvinodeClientLead> {
  const res = await fetch(`${config.baseUrl}/leads`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(lead),
  })
  if (!res.ok) throw new Error(`Lead creation failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeClientLead> = await res.json()
  return json.data
}

/**
 * Get a client lead by ID
 * GET /leads/{id}
 */
export async function getLead(
  config: AvinodeConfig,
  leadId: string
): Promise<AvinodeClientLead> {
  const res = await fetch(`${config.baseUrl}/leads/${leadId}`, {
    headers: buildHeaders(config),
  })
  if (!res.ok) throw new Error(`Lead fetch failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeClientLead> = await res.json()
  return json.data
}

/**
 * Configure webhook settings
 * POST /webhooks/settings
 */
export async function configureWebhooks(
  config: AvinodeConfig,
  settings: AvinodeWebhookSetting
): Promise<void> {
  const res = await fetch(`${config.baseUrl}/webhooks/settings`, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error(`Webhook configuration failed: ${res.status}`)
}

/**
 * Get an empty leg by ID
 * GET /emptylegs/{id}
 */
export async function getEmptyLeg(
  config: AvinodeConfig,
  emptyLegId: string
): Promise<AvinodeEmptyLeg> {
  const res = await fetch(`${config.baseUrl}/emptylegs/${emptyLegId}`, {
    headers: buildHeaders(config),
  })
  if (!res.ok) throw new Error(`Empty leg fetch failed: ${res.status}`)
  const json: AvinodeApiResponse<AvinodeEmptyLeg> = await res.json()
  return json.data
}
