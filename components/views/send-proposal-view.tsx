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
} from "lucide-react"

export function SendProposalView() {
  const {
    currentUser,
    flightRequests,
    marketplaceJets,
    addProposal,
    updateFlightRequestStatus,
  } = useStore()
  const [selectedRequest, setSelectedRequest] = useState<FlightRequest | null>(null)
  const [selectedJetId, setSelectedJetId] = useState("")
  const [price, setPrice] = useState("")
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
      notes: notes || undefined,
    })

    updateFlightRequestStatus(selectedRequest.id, "proposal_sent")

    setSelectedRequest(null)
    setSelectedJetId("")
    setPrice("")
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
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
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
