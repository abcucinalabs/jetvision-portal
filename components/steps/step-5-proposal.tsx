"use client"

import { useState } from "react"
import { FileText, Loader2, Send, DollarSign } from "lucide-react"
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
  const currency = request.avinodeBestQuoteCurrency ?? "USD"

  // Proposal builder state (manager builds proposal when status = quote_received)
  const [proposalBase, setProposalBase] = useState<string>(
    request.selectedQuoteAmount ? String(request.selectedQuoteAmount) :
    request.avinodeBestQuoteAmount ? String(request.avinodeBestQuoteAmount) : ""
  )
  const [isoCommission, setIsoCommission] = useState<string>(
    request.isoCommission !== undefined ? String(request.isoCommission) : ""
  )
  const [jetvisionCost, setJetvisionCost] = useState<string>(
    request.jetvisionCost !== undefined ? String(request.jetvisionCost) : ""
  )
  const [proposalNotes, setProposalNotes] = useState(request.proposalNotes ?? "")
  const [savingProposal, setSavingProposal] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(false)
  const [sending, setSending] = useState(false)

  const base = parseFloat(proposalBase) || 0
  const commission = parseFloat(isoCommission) || 0
  const cost = parseFloat(jetvisionCost) || 0
  const total = base + commission + cost

  const handleSendToIso = async () => {
    if (!base || total <= 0) return
    setSavingProposal(true)
    try {
      await onUpdate({
        status: "proposal_ready",
        selectedQuoteAmount: base,
        isoCommission: commission || undefined,
        jetvisionCost: cost || undefined,
        totalPrice: total,
        proposalNotes: proposalNotes || undefined,
      })
      addNotification({
        title: "Proposal Ready for Review",
        body: `A proposal of ${fmt(total, currency)} has been prepared for ${request.clientName} (${request.departure} → ${request.arrival}).`,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toRole: "iso",
        toUserId: request.isoId,
      })
    } finally {
      setSavingProposal(false)
    }
  }

  const handleSendToClient = async () => {
    setSending(true)
    try {
      await fetch(`/api/proposals/${request.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      })
      await onUpdate({
        status: "proposal_sent",
        proposalSentAt: new Date().toISOString(),
      })
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

  // ── Manager view ──────────────────────────────────────────────────────────

  if (!isIso) {
    // Build proposal (status = quote_received)
    if (request.status === "quote_received") {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Build Proposal</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Set the pricing and notes, then send the proposal to the ISO for review.
            </p>
          </div>

          {/* Price fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Base Price (from quote)", value: proposalBase, setter: setProposalBase },
              { label: "ISO Commission ($)", value: isoCommission, setter: setIsoCommission },
              { label: "Jetvision Cost ($)", value: jetvisionCost, setter: setJetvisionCost },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total display */}
          <div className="rounded-2xl border border-gray-100 bg-white py-7 text-center shadow-sm">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Total Price</div>
            <div className="text-4xl font-bold text-gray-900 tracking-tight">
              {total > 0 ? fmt(total, currency) : "$0"}
            </div>
            {total > 0 && (
              <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400 flex-wrap">
                {base > 0 && <span>Base: {fmt(base, currency)}</span>}
                {commission > 0 && <span>+ ISO: {fmt(commission, currency)}</span>}
                {cost > 0 && <span>+ Jetvision: {fmt(cost, currency)}</span>}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes to ISO</label>
            <textarea
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes or context for the ISO agent..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none resize-none"
            />
          </div>

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
                  <p className="text-sm font-semibold text-gray-600">Proposal PDF Template</p>
                  <p className="text-xs text-gray-400">Full branded template coming soon</p>
                  {total > 0 && (
                    <div className="mt-4 text-center space-y-1">
                      <div className="text-xs text-gray-500">{request.clientName} · {request.departure} → {request.arrival}</div>
                      <div className="text-3xl font-bold text-gray-900">{fmt(total, currency)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPdfPreview(true)}
              disabled={total <= 0}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Preview Proposal
            </button>
            <button
              onClick={() => void handleSendToIso()}
              disabled={!base || total <= 0 || savingProposal}
              className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingProposal && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Proposal to ISO
            </button>
          </div>
        </div>
      )
    }

    // Proposal sent to ISO — manager waiting view
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mb-4">
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Proposal ready</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
          The proposal has been sent to the ISO. Waiting for them to forward it to the client.
        </p>
        {request.totalPrice && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-8 py-4">
            <div className="text-xs text-gray-400 mb-1">Proposal Total</div>
            <div className="text-2xl font-bold text-gray-900">{fmt(request.totalPrice, currency)}</div>
          </div>
        )}
      </div>
    )
  }

  // ── ISO view ──────────────────────────────────────────────────────────────
  const total2 = request.totalPrice
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
        {total2 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-400 mb-1">Total</div>
            <div className="text-3xl font-bold text-gray-900">{fmt(total2, currency)}</div>
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
              {total2 && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-500">{request.clientName}</div>
                  <div className="text-3xl font-bold text-gray-900">{fmt(total2, currency)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send to Client */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => void handleSendToClient()}
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
