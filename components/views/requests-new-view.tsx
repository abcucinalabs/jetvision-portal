"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useStore, type FlightRequest } from "@/lib/store"
import { ArrowLeft, Calendar, Plus, Users } from "lucide-react"
import { NewFlightRequestForm } from "@/components/views/flight-requests-view"
import { FlightRequestDataTable } from "@/components/flight-request-data-table"

export function RequestsNewView() {
  const { currentUser, flightRequests, addFlightRequest } = useStore()
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [activeWizardStep, setActiveWizardStep] = useState<number>(1)
  const [showForm, setShowForm] = useState(false)

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const requests = isManager ? flightRequests : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const selectedRequest = requests.find((fr) => fr.id === selectedRequestId) || null

  const openRequest = (request: FlightRequest) => {
    setSelectedRequestId(request.id)
    setActiveWizardStep(Math.max(1, Math.min(4, mapDealStageToWizardStep(getCurrentStage(request)))))
  }

  const closeDetail = () => {
    setSelectedRequestId(null)
    setActiveWizardStep(1)
  }

  if (selectedRequest) {
    return (
      <RequestDetailPage
        request={selectedRequest}
        activeWizardStep={activeWizardStep}
        onWizardStepChange={setActiveWizardStep}
        onBack={closeDetail}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Click any row to open a full deal page with CRM workflow stages.</p>
        </div>
        {!isManager && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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

      <section className="rounded-xl border border-border bg-card p-4">
        <FlightRequestDataTable
          data={requests}
          isManager={isManager}
          onRowClick={openRequest}
        />
      </section>
    </div>
  )
}

function RequestDetailPage({
  request,
  activeWizardStep,
  onWizardStepChange,
  onBack,
}: {
  request: FlightRequest
  activeWizardStep: number
  onWizardStepChange: (step: number) => void
  onBack: () => void
}) {
  const dealSteps = buildDealSteps(request)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to requests
          </button>
          <h1 className="text-2xl font-bold text-foreground">{request.clientName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deal ID: {request.id}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={request.status} />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Flow</p>
        <div className="grid gap-2 lg:grid-cols-6">
          {dealSteps.map((step, idx) => (
            <button
              key={step.key}
              type="button"
              onClick={() => onWizardStepChange(Math.max(1, Math.min(4, mapDealStageToWizardStep(idx + 1))))}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                step.state === "current"
                  ? "border-primary/40 bg-primary/10"
                  : step.state === "complete"
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border bg-background"
              }`}
            >
              <div className="mb-1 flex items-center gap-1">
                {step.state === "complete" ? (
                  <span className="h-3.5 w-3.5 text-green-600">✓</span>
                ) : (
                  <span className="h-3.5 w-3.5 text-muted-foreground">○</span>
                )}
                <span className="text-[11px] font-semibold text-card-foreground">{idx + 1}. {step.title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{step.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { id: 1, label: "Overview" },
            { id: 2, label: "Sourcing" },
            { id: 3, label: "Proposal" },
            { id: 4, label: "Closeout" },
          ].map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onWizardStepChange(step.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeWizardStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {step.id}. {step.label}
            </button>
          ))}
        </div>

        {activeWizardStep === 1 && <OverviewStep request={request} />}
        {activeWizardStep === 2 && <SourcingStep request={request} />}
        {activeWizardStep === 3 && <ProposalStep request={request} />}
        {activeWizardStep === 4 && <CloseoutStep request={request} />}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onWizardStepChange(Math.max(1, activeWizardStep - 1))}
            disabled={activeWizardStep === 1}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onWizardStepChange(Math.min(4, activeWizardStep + 1))}
            disabled={activeWizardStep === 4}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}

function OverviewStep({ request }: { request: FlightRequest }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 text-xs">
      <DealRow label="Client" value={request.clientName} />
      <DealRow label="ISO" value={request.isoName} />
      <DealRow label="Route" value={`${request.departure} -> ${request.arrival}`} />
      <DealRow icon={Calendar} label="Departure" value={request.departureDate} />
      {request.returnDate && <DealRow label="Return" value={request.returnDate} />}
      <DealRow icon={Users} label="Passengers" value={`${request.passengers}`} />
      {request.specialRequests && <DealRow label="Special requests" value={request.specialRequests} />}
    </div>
  )
}

function SourcingStep({ request }: { request: FlightRequest }) {
  const displayedRfqCount = Math.max(request.avinodeRfqIds?.length || 0, request.avinodeQuoteIds?.length || 0)

  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 text-xs">
      <DealRow label="Avinode status" value={(request.avinodeStatus || "not_sent").replace(/_/g, " ")} />
      <DealRow label="Trip ID" value={request.avinodeTripId || "Not created"} />
      <DealRow label="RFQs" value={`${displayedRfqCount}`} />
      <DealRow label="Quotes" value={`${request.avinodeQuoteCount || 0}`} />
      {request.avinodeBestQuoteAmount ? (
        <DealRow label="Best quote" value={`${request.avinodeBestQuoteCurrency || "USD"} ${request.avinodeBestQuoteAmount.toLocaleString()}`} />
      ) : (
        <DealRow label="Best quote" value="Not available" />
      )}
      <DealRow
        label="Last sync"
        value={request.avinodeLastSyncAt ? formatDistanceToNow(new Date(request.avinodeLastSyncAt), { addSuffix: true }) : "Not synced"}
      />
    </div>
  )
}

function ProposalStep({ request }: { request: FlightRequest }) {
  const proposalReady = request.status === "proposal_sent" || request.avinodeStatus === "quotes_received" || request.avinodeStatus === "booked"
  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 text-xs">
      <DealRow label="Request status" value={request.status.replace(/_/g, " ")} />
      <DealRow label="Proposal state" value={proposalReady ? "Ready / in progress" : "Awaiting sourcing data"} />
      <DealRow label="Client decision" value={request.status === "accepted" ? "Accepted" : request.status === "declined" ? "Declined" : "Pending"} />
    </div>
  )
}

function CloseoutStep({ request }: { request: FlightRequest }) {
  const closedWon = request.status === "accepted" || request.avinodeStatus === "booked"
  const closedLost = request.status === "declined" || request.status === "cancelled" || request.avinodeStatus === "cancelled"
  const summary = closedWon ? "Closed Won" : closedLost ? "Closed Lost" : "Open Deal"

  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 text-xs">
      <DealRow label="Outcome" value={summary} />
      <DealRow label="Final request status" value={request.status.replace(/_/g, " ")} />
      <DealRow label="Final sourcing status" value={(request.avinodeStatus || "not_sent").replace(/_/g, " ")} />
    </div>
  )
}

function DealRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Calendar
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-right font-medium text-card-foreground">{value}</span>
    </div>
  )
}

function getCurrentStage(request: FlightRequest) {
  const closedWon = request.status === "accepted" || request.avinodeStatus === "booked"
  const closedLost = request.status === "declined" || request.status === "cancelled" || request.avinodeStatus === "cancelled"

  if (closedWon || closedLost) return 6
  if (request.status === "proposal_sent") return 5
  if (request.avinodeStatus === "quotes_received") return 4
  if (request.avinodeStatus === "sent_to_avinode" || request.avinodeStatus === "rfq_sent") return 3
  return 2
}

function mapDealStageToWizardStep(stage: number) {
  if (stage <= 2) return 1
  if (stage === 3) return 2
  if (stage === 4 || stage === 5) return 3
  return 4
}

function buildDealSteps(request: FlightRequest) {
  const closedWon = request.status === "accepted" || request.avinodeStatus === "booked"
  const closedLost = request.status === "declined" || request.status === "cancelled" || request.avinodeStatus === "cancelled"
  const currentStage = getCurrentStage(request)

  const steps = [
    { key: "intake", title: "Intake", description: "Request captured and assigned." },
    { key: "qualification", title: "Qualification", description: "Route, dates, and constraints validated." },
    { key: "sourcing", title: "Sourcing", description: "Avinode trip + RFQ cycle active." },
    { key: "proposal", title: "Proposal Build", description: "Quotes reviewed and offer prepared." },
    { key: "decision", title: "Decision", description: "Client review and decision window." },
    { key: "closed", title: "Closed", description: closedWon ? "Booked/accepted." : closedLost ? "Declined/cancelled." : "Awaiting outcome." },
  ]

  return steps.map((step, idx) => {
    const stage = idx + 1
    const state: "pending" | "current" | "complete" = stage < currentStage ? "complete" : stage === currentStage ? "current" : "pending"
    return { ...step, state }
  })
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-accent/10", text: "text-accent", label: "Pending" },
    under_review: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Under Review" },
    rfq_submitted: { bg: "bg-violet-500/10", text: "text-violet-600", label: "RFQ Submitted" },
    quote_received: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Quote Received" },
    proposal_ready: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Ready" },
    proposal_sent: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Sent" },
    accepted: { bg: "bg-green-500/10", text: "text-green-600", label: "Accepted" },
    declined: { bg: "bg-destructive/10", text: "text-destructive", label: "Declined" },
    cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
  }
  const c = config[status] || config.pending
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>{c.label}</span>
}
