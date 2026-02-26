"use client"

import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Globe,
  PlaneTakeoff,
  RefreshCw,
} from "lucide-react"

export function WorkflowLogicView() {
  const requestStatusTones: Record<string, string> = {
    pending: "bg-accent/10 text-accent",
    proposal_sent: "bg-primary/10 text-primary",
    accepted: "bg-success/10 text-success",
    declined: "bg-destructive/10 text-destructive",
    cancelled: "bg-destructive/10 text-destructive",
  }

  const sourcingStatusTones: Record<string, string> = {
    not_sent: "bg-muted text-muted-foreground",
    sent_to_avinode: "bg-primary/10 text-primary",
    rfq_sent: "bg-accent/10 text-accent",
    quotes_received: "bg-green-500/10 text-green-600",
    booked: "bg-green-500/10 text-green-600",
    cancelled: "bg-destructive/10 text-destructive",
  }

  const flightRequestStatuses = [
    { status: "pending", label: "New request submitted by ISO", tone: "bg-accent/10 text-accent" },
    { status: "proposal_sent", label: "Proposal sent to client", tone: "bg-primary/10 text-primary" },
    { status: "accepted", label: "Client accepted proposal", tone: "bg-success/10 text-success" },
    { status: "declined", label: "Client declined proposal", tone: "bg-destructive/10 text-destructive" },
    { status: "cancelled", label: "Request cancelled by ISO", tone: "bg-destructive/10 text-destructive" },
  ]

  const sourcingStatuses = [
    { status: "not_sent", label: "Not in Avinode yet", tone: "bg-muted text-muted-foreground" },
    { status: "sent_to_avinode", label: "Trip created in Avinode", tone: "bg-primary/10 text-primary" },
    { status: "rfq_sent", label: "Seller RFQs issued", tone: "bg-accent/10 text-accent" },
    { status: "quotes_received", label: "Quote(s) received", tone: "bg-green-500/10 text-green-600" },
    { status: "booked", label: "Booked in marketplace", tone: "bg-green-500/10 text-green-600" },
    { status: "cancelled", label: "Sourcing cancelled", tone: "bg-destructive/10 text-destructive" },
  ]

  const workflowSteps = [
    {
      title: "Intake",
      icon: PlaneTakeoff,
      detail: "ISO request captured and assigned to manager.",
      tone: "border-accent/20 bg-accent/5",
      owners: ["iso"],
      requestStatuses: ["pending"],
      sourcingStatuses: ["not_sent"],
    },
    {
      title: "Qualification",
      icon: ClipboardCheck,
      detail: "Trip details validated (route, dates, pax, constraints).",
      tone: "border-primary/20 bg-primary/5",
      owners: ["manager"],
      requestStatuses: ["pending"],
      sourcingStatuses: ["not_sent"],
    },
    {
      title: "Sourcing",
      icon: Globe,
      detail: "Avinode trip created and RFQ cycle running.",
      tone: "border-accent/20 bg-accent/5",
      owners: ["manager"],
      requestStatuses: ["pending"],
      sourcingStatuses: ["sent_to_avinode", "rfq_sent"],
    },
    {
      title: "Proposal Build",
      icon: CircleDollarSign,
      detail: "Quotes reviewed and best options prepared.",
      tone: "border-border bg-muted/30",
      owners: ["manager"],
      requestStatuses: ["proposal_sent"],
      sourcingStatuses: ["quotes_received"],
    },
    {
      title: "Decision",
      icon: RefreshCw,
      detail: "Client review and negotiation window.",
      tone: "border-border bg-muted/30",
      owners: ["iso", "manager"],
      requestStatuses: ["proposal_sent"],
      sourcingStatuses: ["quotes_received"],
    },
    {
      title: "Closed",
      icon: CheckCircle2,
      detail: "Request ends as won, declined, or cancelled.",
      tone: "border-green-500/20 bg-green-500/5",
      owners: ["iso", "manager"],
      requestStatuses: ["accepted", "declined", "cancelled"],
      sourcingStatuses: ["booked", "cancelled"],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Workflow Logic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          End-to-end status flow for manager operations and Avinode sourcing.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-card-foreground">Request Flow</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Shared CRM-style flow used for both ISO and Manager request lifecycle tracking.
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
            ISO Responsible
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Manager Responsible
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
            Shared Responsibility
          </span>
        </div>
        <ol className="space-y-2 md:flex md:space-y-0">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon
            const isShared = step.owners.includes("iso") && step.owners.includes("manager")
            const ownerLabel = isShared ? "Shared" : step.owners.includes("iso") ? "ISO" : "Manager"
            const ownerTone = isShared
              ? "bg-slate-100 text-slate-700"
              : step.owners.includes("iso")
                ? "bg-indigo-50 text-indigo-700"
                : "bg-emerald-50 text-emerald-700"
            return (
              <li key={step.title} className="relative md:flex-1 md:pr-3">
                <div className={`rounded-lg border p-2.5 ${step.tone}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-card-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px]">
                      {index + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5" />
                    {step.title}
                  </div>
                  <div className="mt-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ownerTone}`}>
                      {ownerLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{step.detail}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {step.requestStatuses.map((status) => (
                        <span
                          key={`${step.title}-fr-${status}`}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${requestStatusTones[status]}`}
                        >
                          FR: {status.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {step.sourcingStatuses.map((status) => (
                        <span
                          key={`${step.title}-src-${status}`}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sourcingStatusTones[status]}`}
                        >
                          SRC: {status.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-foreground">Flight Request Status</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {flightRequestStatuses.map((item) => (
              <span key={item.status} className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.tone}`}>
                {item.status.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            {flightRequestStatuses.map((item) => (
              <p key={item.status}>
                <span className="font-medium text-card-foreground">{item.status.replace(/_/g, " ")}:</span> {item.label}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-foreground">Avinode Sourcing Status</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sourcingStatuses.map((item) => (
              <span key={item.status} className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.tone}`}>
                {item.status.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            {sourcingStatuses.map((item) => (
              <p key={item.status}>
                <span className="font-medium text-card-foreground">{item.status.replace(/_/g, " ")}:</span> {item.label}
              </p>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Trigger mapping: <span className="font-medium text-card-foreground">Send to Avinode</span> sets
            <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">sent_to_avinode</code>.
            <span className="ml-1 font-medium text-card-foreground">Sync Pipeline</span> updates RFQ/quote states.
          </p>
        </div>
      </section>
    </div>
  )
}
