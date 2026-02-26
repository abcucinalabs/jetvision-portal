"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Ban, Loader2 } from "lucide-react"
import type { FlightRequest, FlightRequestStatus, User as UserType } from "@/lib/store"
import { useStore } from "@/lib/store"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
}

const DECISION_OPTIONS: { label: string; status: FlightRequestStatus; icon: typeof CheckCircle2; color: string; bg: string; border: string }[] = [
  {
    label: "Client Accepted",
    status: "accepted",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50 hover:bg-emerald-100",
    border: "border-emerald-200",
  },
  {
    label: "Client Declined",
    status: "declined",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 hover:bg-red-100",
    border: "border-red-200",
  },
  {
    label: "Cancelled",
    status: "cancelled",
    icon: Ban,
    color: "text-gray-600",
    bg: "bg-gray-50 hover:bg-gray-100",
    border: "border-gray-200",
  },
]

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string; border: string }> = {
  accepted: { label: "Client Accepted", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  declined: { label: "Client Declined", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  cancelled: { label: "Cancelled", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
}

export function Step7Decision({ request, currentUser, onUpdate }: Props) {
  const isIso = currentUser.role === "iso"
  const { addNotification } = useStore()
  const [loading, setLoading] = useState<FlightRequestStatus | null>(null)

  const isFinal = ["accepted", "declined", "cancelled"].includes(request.status)
  const finalDisplay = isFinal ? STATUS_DISPLAY[request.status] : null

  const handleDecision = async (status: FlightRequestStatus) => {
    setLoading(status)
    try {
      await onUpdate({
        status,
        clientDecisionAt: new Date().toISOString(),
      })
      addNotification({
        title: `Client ${status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Request Cancelled"}`,
        body: `${currentUser.name} reported that ${request.clientName} has ${status === "accepted" ? "accepted" : status === "declined" ? "declined" : "cancelled"} the proposal for ${request.departure} → ${request.arrival}.`,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toRole: "manager",
      })
    } finally {
      setLoading(null)
    }
  }

  // Show final state for both roles
  if (isFinal && finalDisplay) {
    const status = request.status
    const Icon = status === "accepted" ? CheckCircle2 : status === "declined" ? XCircle : Ban

    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${finalDisplay.bg} mb-4`}>
          <Icon className={`h-6 w-6 ${finalDisplay.color}`} />
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${finalDisplay.bg} ${finalDisplay.border} ${finalDisplay.color}`}>
          {finalDisplay.label}
        </div>
        <p className="text-sm text-gray-500 mt-3 max-w-xs">
          {status === "accepted"
            ? `${request.clientName} has accepted the proposal. Proceed with booking.`
            : status === "declined"
            ? `${request.clientName} has declined the proposal.`
            : "This request has been cancelled."}
        </p>
      </div>
    )
  }

  // ISO action view — waiting for decision input
  if (isIso) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Client Decision</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Select the outcome based on your client&apos;s response.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DECISION_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isLoading = loading === opt.status
            return (
              <button
                key={opt.status}
                onClick={() => handleDecision(opt.status)}
                disabled={loading !== null}
                className={`flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 text-sm font-medium transition-colors disabled:opacity-50 ${opt.bg} ${opt.border} ${opt.color}`}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Manager waiting view
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
        <CheckCircle2 className="h-6 w-6 text-amber-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">Awaiting client decision</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
        The ISO is waiting to hear back from {request.clientName}. They will update the status once the client responds.
      </p>
    </div>
  )
}
