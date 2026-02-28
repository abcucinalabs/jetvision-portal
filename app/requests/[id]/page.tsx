"use client"

import { use, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, XCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { StoreProvider, useStore, type FlightRequest } from "@/lib/store"
import { SidebarNav } from "@/components/sidebar-nav"
import { LoginScreen } from "@/components/login-screen"
import { SupabaseSignInScreen } from "@/components/supabase-sign-in-screen"
import { RequestStepper, getStepIndex } from "@/components/request-stepper"
import { Step1Submitted } from "@/components/steps/step-1-submitted"
import { Step2Review } from "@/components/steps/step-2-review"
import { Step3Rfq } from "@/components/steps/step-3-rfq"
import { Step5Proposal } from "@/components/steps/step-5-proposal"
import { Step6Send } from "@/components/steps/step-6-send"
import { Step7Decision } from "@/components/steps/step-7-decision"

// ── Outer page: provides StoreProvider ──────────────────────────────────────

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <StoreProvider>
      <RequestDetailShell requestId={id} />
    </StoreProvider>
  )
}

// ── Inner shell: handles auth + view ────────────────────────────────────────

type AuthStatus = "loading" | "signed_out" | "signed_in"

function RequestDetailShell({ requestId }: { requestId: string }) {
  const { currentUser } = useStore()
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const router = useRouter()

  useEffect(() => {
    let active = true
    let supabase: ReturnType<typeof getSupabaseBrowserClient>

    try {
      supabase = getSupabaseBrowserClient()
    } catch {
      if (active) setAuthStatus("signed_out")
      return () => { active = false }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthStatus(data.session ? "signed_in" : "signed_out")
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthStatus(session ? "signed_in" : "signed_out")
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (authStatus === "loading") return <div className="min-h-screen bg-slate-50" />
  if (authStatus === "signed_out") return <SupabaseSignInScreen />
  if (!currentUser) return <LoginScreen />

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav
        activeView="flight-requests"
        onNavigate={() => router.push("/")}
      />
      <main className="flex-1 overflow-y-auto">
        <RequestDetailContent requestId={requestId} />
      </main>
    </div>
  )
}

// ── Main content: loads request, renders stepper + steps ────────────────────

function RequestDetailContent({ requestId }: { requestId: string }) {
  const {
    flightRequests,
    updateFlightRequest,
    updateFlightRequestStatus,
    updateFlightRequestAvinode,
    syncFlightRequestPipeline,
    addNotification,
    currentUser,
  } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<FlightRequest | null>(null)
  const [selectedStepIndex, setSelectedStepIndex] = useState(0)
  const activeStepIndex = request ? getStepIndex(request.status) : 0

  // Try to get from store first; fall back to direct API fetch
  useEffect(() => {
    const fromStore = flightRequests.find((fr) => fr.id === requestId)
    if (fromStore) {
      setRequest(fromStore)
      setLoading(false)
      return
    }

    // Fetch directly if store hasn't loaded yet
    void fetch(`/api/flight-requests/${requestId}`)
      .then(async (res) => {
        if (!res.ok) return
        const json = await res.json()
        if (json?.data) setRequest(json.data)
      })
      .finally(() => setLoading(false))
  }, [requestId, flightRequests])

  // Keep local request in sync with store updates
  useEffect(() => {
    const updated = flightRequests.find((fr) => fr.id === requestId)
    if (updated) setRequest(updated)
  }, [flightRequests, requestId])

  const handleUpdate = useCallback(async (data: Partial<FlightRequest>) => {
    await updateFlightRequest(requestId, data)
  }, [requestId, updateFlightRequest])

  const handleSync = useCallback(async () => {
    await syncFlightRequestPipeline(requestId)
  }, [requestId, syncFlightRequestPipeline])

  const handleCancel = useCallback(() => {
    if (!request || !currentUser) return
    if (!window.confirm(`Cancel this request for ${request.clientName}? This will notify managers.`)) return
    updateFlightRequestStatus(request.id, "cancelled")
    if (request.avinodeTripId) {
      updateFlightRequestAvinode(request.id, { avinodeStatus: "cancelled" })
    }
    addNotification({
      title: "Flight Request Cancelled",
      body: `${currentUser.name} cancelled the flight request for ${request.clientName} (${request.departure} → ${request.arrival} on ${request.departureDate}).`,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      toRole: "manager",
    })
  }, [request, currentUser, updateFlightRequestStatus, updateFlightRequestAvinode, addNotification])

  useEffect(() => {
    setSelectedStepIndex(activeStepIndex)
  }, [activeStepIndex])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!request || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-gray-500">
        Request not found.
      </div>
    )
  }

  const stepIndex = selectedStepIndex
  const canOpenDecisionStep =
    request.status === "proposal_sent" && currentUser.role === "iso"
  // Manager can navigate to Proposal step (3) once a quote is confirmed
  const canBuildProposal =
    request.status === "quote_received" && currentUser.role === "manager"
  const maxSelectableStepIndex = canOpenDecisionStep
    ? Math.min(activeStepIndex + 1, 5)
    : canBuildProposal
    ? 3
    : activeStepIndex
  const canInteractWithViewedStep =
    stepIndex === activeStepIndex ||
    (canOpenDecisionStep && stepIndex === 5) ||
    (canBuildProposal && stepIndex === 3)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div>
          <span className="text-sm font-semibold text-gray-900">{request.clientName}</span>
          <span className="text-sm text-gray-400 ml-2">{request.departure} → {request.arrival}</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-6 py-5">
        <RequestStepper
          currentStatus={request.status}
          userRole={currentUser.role}
          selectedStepIndex={selectedStepIndex}
          onStepSelect={setSelectedStepIndex}
          maxSelectableStepIndex={maxSelectableStepIndex}
        />
      </div>

      {/* Step content card */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-6 py-6 md:px-8 md:py-8">
        {!canInteractWithViewedStep && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Viewing a completed step. Switch to the current step to make updates.
          </div>
        )}
        <div className={canInteractWithViewedStep ? "" : "pointer-events-none opacity-75"}>
          {stepIndex === 0 && (
            <Step1Submitted request={request} currentUser={currentUser} onUpdate={handleUpdate} />
          )}
          {stepIndex === 1 && (
            <Step2Review request={request} currentUser={currentUser} onUpdate={handleUpdate} />
          )}
          {stepIndex === 2 && (
            <Step3Rfq
              request={request}
              currentUser={currentUser}
              onUpdate={handleUpdate}
              onSync={handleSync}
              onNavigateToProposal={() => setSelectedStepIndex(3)}
            />
          )}
          {stepIndex === 3 && (
            <Step5Proposal request={request} currentUser={currentUser} onUpdate={handleUpdate} />
          )}
          {stepIndex === 4 && (
            <Step6Send request={request} currentUser={currentUser} />
          )}
          {stepIndex === 5 && (
            <Step7Decision request={request} currentUser={currentUser} onUpdate={handleUpdate} />
          )}
        </div>
      </div>

      {/* Cancel action — ISO only, available while request is not finalised */}
      {currentUser.role !== "manager" && !["accepted", "declined", "cancelled"].includes(request.status) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel Request
          </button>
        </div>
      )}
    </div>
  )
}
