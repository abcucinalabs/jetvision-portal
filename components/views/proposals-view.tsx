"use client"

import { useStore } from "@/lib/store"
import { FileText, DollarSign, Calendar, MapPin, Plane, Percent } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function ProposalsView() {
  const { currentUser, proposals, updateProposalStatus } = useStore()

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const filtered = isManager
    ? proposals
    : proposals.filter((p) => p.isoId === currentUser.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager
            ? "All proposals sent to ISOs for their clients."
            : "Flight proposals from management for your clients."}
        </p>
      </div>

      {/* Manager Commission & Cost Summary */}
      {isManager && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(() => {
            const totalRevenue = filtered.reduce((sum, p) => sum + p.price, 0)
            const totalIsoCommission = filtered.reduce(
              (sum, p) => sum + (p.price * (p.isoCommissionPct ?? 0)) / 100,
              0
            )
            const totalJetstreamCost = filtered.reduce(
              (sum, p) => sum + (p.price * (p.jetstreamCostPct ?? 0)) / 100,
              0
            )
            return (
              <>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    Total Proposal Value
                  </div>
                  <div className="mt-1 text-xl font-bold text-card-foreground">
                    ${totalRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Percent className="h-3.5 w-3.5" />
                    ISO Commissions
                  </div>
                  <div className="mt-1 text-xl font-bold text-accent">
                    ${totalIsoCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Percent className="h-3.5 w-3.5" />
                    JetStream Costs
                  </div>
                  <div className="mt-1 text-xl font-bold text-primary">
                    ${totalJetstreamCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No proposals yet
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-card-foreground">
                      Proposal for {p.clientName}
                    </h3>
                    <ProposalBadge status={p.status} />
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5" />
                      {p.aircraft} &middot; {p.operator}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {p.departure} &rarr; {p.arrival}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {p.departureDate}
                      {p.returnDate && ` - ${p.returnDate}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${p.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Commission breakdown for manager */}
                  {isManager && (p.isoCommissionPct > 0 || p.jetstreamCostPct > 0) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="text-accent">
                        ISO Commission: {p.isoCommissionPct}% (${((p.price * p.isoCommissionPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </span>
                      <span className="text-primary">
                        JetStream Costs: {p.jetstreamCostPct}% (${((p.price * p.jetstreamCostPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </span>
                    </div>
                  )}

                  {p.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{p.notes}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>ISO: {p.isoName}</span>
                    <span>&middot;</span>
                    <span>
                      {formatDistanceToNow(new Date(p.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* ISO can forward to client */}
                {!isManager && p.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateProposalStatus(p.id, "sent_to_client")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Send to Client
                    </button>
                    <button
                      onClick={() => updateProposalStatus(p.id, "declined")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Decline
                    </button>
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

function ProposalBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-accent/10", text: "text-accent", label: "Pending Review" },
    sent_to_client: { bg: "bg-primary/10", text: "text-primary", label: "Sent to Client" },
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
