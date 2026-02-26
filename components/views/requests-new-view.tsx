"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useStore, type FlightRequest } from "@/lib/store"
import { ArrowLeft, Calendar, CheckCircle2, Circle, Columns3, LayoutGrid, List, Plus, Users } from "lucide-react"
import { NewFlightRequestForm } from "@/components/views/flight-requests-view"

type SortKey = "clientName" | "isoName" | "departure" | "arrival" | "departureDate" | "passengers" | "status"
type RequestsViewMode = "card" | "kanban" | "list"

export function RequestsNewView() {
  const { currentUser, flightRequests, addFlightRequest } = useStore()
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "departureDate",
    direction: "asc",
  })
  const [tableFilters, setTableFilters] = useState({
    clientName: "",
    isoName: "",
    departure: "",
    arrival: "",
    departureDate: "",
    status: "",
  })
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [activeWizardStep, setActiveWizardStep] = useState<number>(1)
  const [viewMode, setViewMode] = useState<RequestsViewMode>("list")
  const [showForm, setShowForm] = useState(false)

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const requests = isManager ? flightRequests : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const tableRequests = useMemo(() => {
    const normalized = {
      clientName: tableFilters.clientName.trim().toLowerCase(),
      isoName: tableFilters.isoName.trim().toLowerCase(),
      departure: tableFilters.departure.trim().toLowerCase(),
      arrival: tableFilters.arrival.trim().toLowerCase(),
      departureDate: tableFilters.departureDate.trim(),
      status: tableFilters.status.trim().toLowerCase(),
    }

    const filtered = requests.filter((fr) => {
      if (normalized.clientName && !fr.clientName.toLowerCase().includes(normalized.clientName)) return false
      if (normalized.isoName && !fr.isoName.toLowerCase().includes(normalized.isoName)) return false
      if (normalized.departure && !fr.departure.toLowerCase().includes(normalized.departure)) return false
      if (normalized.arrival && !fr.arrival.toLowerCase().includes(normalized.arrival)) return false
      if (normalized.departureDate && !fr.departureDate.includes(normalized.departureDate)) return false
      if (normalized.status && fr.status.toLowerCase() !== normalized.status) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1
      const valueA = a[sortConfig.key]
      const valueB = b[sortConfig.key]
      if (typeof valueA === "number" && typeof valueB === "number") return (valueA - valueB) * dir
      return String(valueA).localeCompare(String(valueB)) * dir
    })
  }, [requests, sortConfig, tableFilters])

  const selectedRequest = requests.find((fr) => fr.id === selectedRequestId) || null

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => (prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }))
  }

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
        <div className="mb-3 flex items-center justify-end">
          <div className="flex items-center rounded-lg border border-border p-1">
            <ViewModeButton mode="card" activeMode={viewMode} onChange={setViewMode} icon={LayoutGrid} />
            <ViewModeButton mode="kanban" activeMode={viewMode} onChange={setViewMode} icon={Columns3} />
            <ViewModeButton mode="list" activeMode={viewMode} onChange={setViewMode} icon={List} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={tableFilters.clientName}
            onChange={(e) => setTableFilters((prev) => ({ ...prev, clientName: e.target.value }))}
            placeholder="Filter client"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isManager && (
            <input
              value={tableFilters.isoName}
              onChange={(e) => setTableFilters((prev) => ({ ...prev, isoName: e.target.value }))}
              placeholder="Filter ISO"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <input
            value={tableFilters.departure}
            onChange={(e) => setTableFilters((prev) => ({ ...prev, departure: e.target.value }))}
            placeholder="Filter departure"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={tableFilters.arrival}
            onChange={(e) => setTableFilters((prev) => ({ ...prev, arrival: e.target.value }))}
            placeholder="Filter arrival"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={tableFilters.departureDate}
            onChange={(e) => setTableFilters((prev) => ({ ...prev, departureDate: e.target.value }))}
            placeholder="Filter date (YYYY-MM-DD)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={tableFilters.status}
            onChange={(e) => setTableFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {viewMode === "list" && (
          <ListRequestsTable
            isManager={isManager}
            requests={tableRequests}
            sortConfig={sortConfig}
            onSort={handleSort}
            onOpenRequest={openRequest}
          />
        )}
        {viewMode === "card" && (
          <CardRequestsGrid
            requests={tableRequests}
            onOpenRequest={openRequest}
          />
        )}
        {viewMode === "kanban" && (
          <KanbanRequestsBoard
            requests={tableRequests}
            onOpenRequest={openRequest}
          />
        )}
      </section>
    </div>
  )
}

function ViewModeButton({
  mode,
  activeMode,
  onChange,
  icon: Icon,
}: {
  mode: RequestsViewMode
  activeMode: RequestsViewMode
  onChange: (mode: RequestsViewMode) => void
  icon: typeof List
}) {
  const label = mode === "card" ? "Card" : mode === "kanban" ? "Kanban" : "List"
  const active = mode === activeMode
  return (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function ListRequestsTable({
  isManager,
  requests,
  sortConfig,
  onSort,
  onOpenRequest,
}: {
  isManager: boolean
  requests: FlightRequest[]
  sortConfig: { key: SortKey; direction: "asc" | "desc" }
  onSort: (key: SortKey) => void
  onOpenRequest: (request: FlightRequest) => void
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <TableSortHead label="Client" active={sortConfig} sortKey="clientName" onSort={onSort} />
            {isManager && <TableSortHead label="ISO" active={sortConfig} sortKey="isoName" onSort={onSort} />}
            <TableSortHead label="Departure" active={sortConfig} sortKey="departure" onSort={onSort} />
            <TableSortHead label="Arrival" active={sortConfig} sortKey="arrival" onSort={onSort} />
            <TableSortHead label="Date" active={sortConfig} sortKey="departureDate" onSort={onSort} />
            <TableSortHead label="Pax" active={sortConfig} sortKey="passengers" onSort={onSort} />
            <TableSortHead label="Status" active={sortConfig} sortKey="status" onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan={isManager ? 7 : 6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matching requests for current filters.
              </td>
            </tr>
          ) : (
            requests.map((fr) => (
              <tr
                key={fr.id}
                className="cursor-pointer border-b border-border/60 transition hover:bg-muted/30"
                onClick={() => onOpenRequest(fr)}
              >
                <td className="px-3 py-2 text-card-foreground">{fr.clientName}</td>
                {isManager && <td className="px-3 py-2 text-muted-foreground">{fr.isoName}</td>}
                <td className="px-3 py-2 text-muted-foreground">{fr.departure}</td>
                <td className="px-3 py-2 text-muted-foreground">{fr.arrival}</td>
                <td className="px-3 py-2 text-muted-foreground">{fr.departureDate}</td>
                <td className="px-3 py-2 text-muted-foreground">{fr.passengers}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={fr.status} />
                    {fr.avinodeStatus && <AvinodeStatusBadge status={fr.avinodeStatus} />}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function CardRequestsGrid({
  requests,
  onOpenRequest,
}: {
  requests: FlightRequest[]
  onOpenRequest: (request: FlightRequest) => void
}) {
  if (requests.length === 0) {
    return <div className="mt-3 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No matching requests for current filters.</div>
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((fr) => (
        <button
          key={fr.id}
          type="button"
          onClick={() => onOpenRequest(fr)}
          className="rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-card-foreground">{fr.clientName}</p>
            <StatusBadge status={fr.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{fr.departure} &rarr; {fr.arrival}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{fr.departureDate}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{fr.passengers} pax</span>
            {fr.avinodeStatus && <AvinodeStatusBadge status={fr.avinodeStatus} />}
          </div>
        </button>
      ))}
    </div>
  )
}

function KanbanRequestsBoard({
  requests,
  onOpenRequest,
}: {
  requests: FlightRequest[]
  onOpenRequest: (request: FlightRequest) => void
}) {
  const columns: { id: string; label: string; requests: FlightRequest[] }[] = [
    { id: "new", label: "New / Qualified", requests: requests.filter((fr) => getCurrentStage(fr) <= 2) },
    { id: "sourcing", label: "Sourcing", requests: requests.filter((fr) => getCurrentStage(fr) === 3) },
    { id: "proposal", label: "Proposal / Decision", requests: requests.filter((fr) => getCurrentStage(fr) === 4 || getCurrentStage(fr) === 5) },
    { id: "closed", label: "Closed", requests: requests.filter((fr) => getCurrentStage(fr) === 6) },
  ]

  return (
    <div className="mt-3 overflow-x-auto">
      <div className="grid min-w-[980px] gap-3 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.id} className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.label}</p>
              <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{column.requests.length}</span>
            </div>
            <div className="space-y-2">
              {column.requests.length === 0 ? (
                <div className="rounded border border-dashed border-border bg-background p-2 text-[11px] text-muted-foreground">No deals</div>
              ) : (
                column.requests.map((fr) => (
                  <button
                    key={fr.id}
                    type="button"
                    onClick={() => onOpenRequest(fr)}
                    className="w-full rounded-md border border-border bg-background p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <p className="text-xs font-semibold text-card-foreground">{fr.clientName}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fr.departure} &rarr; {fr.arrival}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <StatusBadge status={fr.status} />
                      {fr.avinodeStatus && <AvinodeStatusBadge status={fr.avinodeStatus} />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
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
          <AvinodeStatusBadge status={request.avinodeStatus || "not_sent"} />
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
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : step.state === "current" ? (
                  <Circle className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
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

function TableSortHead({
  label,
  active,
  sortKey,
  onSort,
}: {
  label: string
  active: { key: SortKey; direction: "asc" | "desc" }
  sortKey: SortKey
  onSort: (key: SortKey) => void
}) {
  const indicator = active.key === sortKey ? (active.direction === "asc" ? "↑" : "↓") : ""
  return (
    <th className="px-3 py-2 text-left">
      <button type="button" onClick={() => onSort(sortKey)} className="font-semibold text-card-foreground hover:underline">
        {label} {indicator}
      </button>
    </th>
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
    proposal_sent: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Sent" },
    accepted: { bg: "bg-success/10", text: "text-success", label: "Accepted" },
    declined: { bg: "bg-destructive/10", text: "text-destructive", label: "Declined" },
    cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
  }
  const c = config[status] || config.pending
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>{c.label}</span>
}

function AvinodeStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    not_sent: { bg: "bg-muted", text: "text-muted-foreground", label: "Not in Avinode" },
    sent_to_avinode: { bg: "bg-primary/10", text: "text-primary", label: "In Avinode" },
    rfq_sent: { bg: "bg-accent/10", text: "text-accent", label: "RFQ Sent" },
    quotes_received: { bg: "bg-green-500/10", text: "text-green-600", label: "Quotes" },
    booked: { bg: "bg-green-500/10", text: "text-green-600", label: "Booked" },
    cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
  }
  const c = config[status] || config.not_sent
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>{c.label}</span>
}
