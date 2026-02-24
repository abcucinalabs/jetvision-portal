"use client"

import { useState } from "react"
import { useStore, type FlightRequest } from "@/lib/store"
import {
  Send,
  CheckCircle2,
  PlaneTakeoff,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Globe,
  ExternalLink,
  MessageSquare,
} from "lucide-react"

export function SendProposalView() {
  const {
    currentUser,
    flightRequests,
    marketplaceJets,
    addProposal,
    updateFlightRequestStatus,
    avinodeConnected,
    addAvinodeActivity,
  } = useStore()
  const [selectedRequest, setSelectedRequest] = useState<FlightRequest | null>(null)
  const [selectedJetId, setSelectedJetId] = useState("")
  const [price, setPrice] = useState("")
  const [isoCommissionPct, setIsoCommissionPct] = useState(10)
  const [jetstreamCostPct, setJetstreamCostPct] = useState(15)
  const [notes, setNotes] = useState("")
  const [sent, setSent] = useState(false)

  if (!currentUser || currentUser.role !== "manager") return null

  const pendingRequests = flightRequests.filter((fr) => fr.status === "pending")
  const availableJets = marketplaceJets.filter((j) => j.available)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest) return

    const jet = marketplaceJets.find((j) => j.id === selectedJetId)
    if (!jet) return

    addProposal({
      flightRequestId: selectedRequest.id,
      isoId: selectedRequest.isoId,
      isoName: selectedRequest.isoName,
      clientName: selectedRequest.clientName,
      aircraft: jet.aircraft,
      operator: jet.operator,
      departure: selectedRequest.departure,
      arrival: selectedRequest.arrival,
      departureDate: selectedRequest.departureDate,
      returnDate: selectedRequest.returnDate,
      price: parseFloat(price),
      isoCommissionPct,
      jetstreamCostPct,
      notes: notes || undefined,
    })

    updateFlightRequestStatus(selectedRequest.id, "proposal_sent")

    setSelectedRequest(null)
    setSelectedJetId("")
    setPrice("")
    setIsoCommissionPct(10)
    setJetstreamCostPct(15)
    setNotes("")
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Send Proposal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and send flight proposals to ISOs for their clients.
        </p>
      </div>

      {sent && (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Proposal sent successfully to the ISO!
        </div>
      )}

      {/* Step 1: Select a pending request */}
      {!selectedRequest ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Select a pending flight request
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12">
              <PlaneTakeoff className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No pending requests to create proposals for
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingRequests.map((fr) => (
                <button
                  key={fr.id}
                  onClick={() => setSelectedRequest(fr)}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-accent/40 hover:shadow-sm"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-card-foreground">
                        {fr.clientName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        via {fr.isoName}
                      </span>
                      {fr.avinodeTripId && (
                        <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                          <Globe className="h-3 w-3" />
                          {fr.avinodeTripId}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {fr.departure} &rarr; {fr.arrival}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fr.departureDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {fr.passengers} pax
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Build the proposal */
        <div className="max-w-2xl space-y-5">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-card-foreground">
                  {selectedRequest.clientName}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedRequest.departure} &rarr; {selectedRequest.arrival} &middot;{" "}
                  {selectedRequest.departureDate} &middot; {selectedRequest.passengers} pax
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Change
              </button>
            </div>

            {/* Avinode Integration Panel */}
            {selectedRequest.avinodeTripId ? (
              <div className="rounded-lg border border-primary/20 bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-card-foreground">
                    Avinode Trip: {selectedRequest.avinodeTripId}
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">
                    {selectedRequest.avinodeStatus?.replace(/_/g, " ") || "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Source flights via the Avinode Marketplace. Send RFQs to operators, then use their quote data to populate the proposal below.
                </p>
                <div className="flex items-center gap-2">
                  {selectedRequest.avinodeSearchLink && (
                    <a
                      href={selectedRequest.avinodeSearchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      Search Aircraft
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedRequest.avinodeViewLink && (
                    <a
                      href={selectedRequest.avinodeViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      View Trip
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  <span>
                    {avinodeConnected
                      ? "This request has not been sent to Avinode yet. Go to Flight Requests to send it."
                      : "Avinode credentials are not configured in environment variables."}
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Select Aircraft *
              </span>
              <select
                required
                value={selectedJetId}
                onChange={(e) => setSelectedJetId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose an aircraft...</option>
                {availableJets.map((jet) => (
                  <option key={jet.id} value={jet.id}>
                    {jet.aircraft} ({jet.operator}) - ${jet.basePrice.toLocaleString()}/hr - {jet.seats} seats
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Total Price (USD) *
              </span>
              <input
                required
                type="number"
                min={0}
                step={100}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 45000"
              />
            </label>

            {/* Commission & Cost Section */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Commission & Cost Breakdown
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    ISO Commission (%)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={20}
                      step={1}
                      value={isoCommissionPct}
                      onChange={(e) => setIsoCommissionPct(parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-12 rounded-md border border-input bg-background px-2 py-1 text-center text-sm font-semibold text-foreground">
                      {isoCommissionPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>5%</span>
                    <span>Default: 10%</span>
                    <span>20%</span>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Jetvision Costs (%)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={25}
                      step={1}
                      value={jetstreamCostPct}
                      onChange={(e) => setJetstreamCostPct(parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-12 rounded-md border border-input bg-background px-2 py-1 text-center text-sm font-semibold text-foreground">
                      {jetstreamCostPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>5%</span>
                    <span>Default: 15%</span>
                    <span>25%</span>
                  </div>
                </label>
              </div>

              {/* Live Preview */}
              {price && parseFloat(price) > 0 && (
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        ISO Commission
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-accent">
                        ${(parseFloat(price) * isoCommissionPct / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Jetvision Costs
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-primary">
                        ${(parseFloat(price) * jetstreamCostPct / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Combined
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-foreground">
                        ${(parseFloat(price) * (isoCommissionPct + jetstreamCostPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Notes for ISO
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Include any details about pricing, amenities, or terms..."
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                Send Proposal to ISO
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
