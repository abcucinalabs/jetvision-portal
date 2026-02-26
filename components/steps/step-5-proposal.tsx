"use client"

import { useState } from "react"
import { FileText, Loader2, Send } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { useStore } from "@/lib/store"

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
}

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
}

export function Step5Proposal({ request, currentUser, onUpdate }: Props) {
  const isIso = currentUser.role === "iso"
  const { addNotification } = useStore()
  const [pdfPreview, setPdfPreview] = useState(false)
  const [sending, setSending] = useState(false)

  const total = request.totalPrice
  const currency = request.avinodeBestQuoteCurrency ?? "USD"

  const handleSendToClient = async () => {
    setSending(true)
    try {
      // Fire email to client
      await fetch(`/api/proposals/${request.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      })
      await onUpdate({
        status: "proposal_sent",
        proposalSentAt: new Date().toISOString(),
      })
      // Notify manager
      addNotification({
        title: "Proposal Sent to Client",
        body: `${currentUser.name} has sent the proposal to ${request.clientName}. Awaiting client decision.`,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toRole: "manager",
      })
    } finally {
      setSending(false)
    }
  }

  // Manager view
  if (!isIso) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mb-4">
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Proposal ready</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
          The proposal has been sent to the ISO. Waiting for them to forward it to the client.
        </p>
        {total && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-8 py-4">
            <div className="text-xs text-gray-400 mb-1">Proposal Total</div>
            <div className="text-2xl font-bold text-gray-900">{fmt(total, currency)}</div>
          </div>
        )}
      </div>
    )
  }

  // ISO view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Proposal is Ready</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Review the proposal details and send it to your client when ready.
        </p>
      </div>

      {/* Proposal summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Proposal Summary</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-400">Client</div>
            <div className="font-medium text-gray-900">{request.clientName}</div>
          </div>
          <div>
            <div className="text-gray-400">Route</div>
            <div className="font-medium text-gray-900">{request.departure} → {request.arrival}</div>
          </div>
          <div>
            <div className="text-gray-400">Date</div>
            <div className="font-medium text-gray-900">{request.departureDate}</div>
          </div>
          <div>
            <div className="text-gray-400">Passengers</div>
            <div className="font-medium text-gray-900">{request.passengers}</div>
          </div>
        </div>
        {total && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-400 mb-1">Total</div>
            <div className="text-3xl font-bold text-gray-900">{fmt(total, currency)}</div>
          </div>
        )}
        {request.proposalNotes && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-400 mb-1">Notes from Manager</div>
            <p className="text-sm text-gray-700 leading-relaxed">{request.proposalNotes}</p>
          </div>
        )}
      </div>

      {/* PDF placeholder */}
      <button
        onClick={() => setPdfPreview(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-10 gap-2 hover:bg-gray-100 transition-colors group"
      >
        <FileText className="h-8 w-8 text-gray-300 group-hover:text-gray-400 transition-colors" />
        <span className="text-sm font-medium text-gray-500">View Proposal PDF</span>
        <span className="text-xs text-gray-400">PDF template coming soon — click to preview</span>
      </button>

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Proposal Preview</h3>
              <button onClick={() => setPdfPreview(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">📄</div>
              <p className="text-sm font-semibold text-gray-600">Proposal PDF</p>
              <p className="text-xs text-gray-400">Full branded template coming soon</p>
              {total && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-500">{request.clientName}</div>
                  <div className="text-3xl font-bold text-gray-900">{fmt(total, currency)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send to Client */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSendToClient}
          disabled={sending}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Proposal to Client
        </button>
      </div>
    </div>
  )
}
