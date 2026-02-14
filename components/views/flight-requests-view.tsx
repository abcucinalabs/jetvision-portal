"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { PlaneTakeoff, Plus, X, Calendar, Users, MapPin } from "lucide-react"

export function FlightRequestsView() {
  const { currentUser, flightRequests, addFlightRequest } = useStore()
  const [showForm, setShowForm] = useState(false)

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const requests = isManager
    ? flightRequests
    : flightRequests.filter((fr) => fr.isoId === currentUser.id)

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
                </div>
                {isManager && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-card-foreground">ISO:</span>{" "}
                    {fr.isoName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  )
}
