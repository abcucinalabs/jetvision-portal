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
  const initialBase =
    request.selectedQuoteAmount ? String(request.selectedQuoteAmount) :
    request.avinodeBestQuoteAmount ? String(request.avinodeBestQuoteAmount) : ""
  const initialBaseAmount = parseFloat(initialBase) || 0

  // Proposal builder state (manager builds proposal when status = quote_received)
  const [proposalBase, setProposalBase] = useState<string>(initialBase)
  const [isoCommissionPct, setIsoCommissionPct] = useState<number>(
    request.isoCommission !== undefined && initialBaseAmount > 0
      ? Math.min(20, Math.max(0, Math.round((request.isoCommission / initialBaseAmount) * 100)))
      : 10
  )
  const [jetvisionCostPct, setJetvisionCostPct] = useState<number>(
    request.jetvisionCost !== undefined && initialBaseAmount > 0
      ? Math.min(20, Math.max(0, Math.round((request.jetvisionCost / initialBaseAmount) * 100)))
      : 0
  )
  const [proposalNotes, setProposalNotes] = useState(request.proposalNotes ?? "")
  const [hasViewedProposal, setHasViewedProposal] = useState(request.status === "proposal_sent")
  const [savingProposal, setSavingProposal] = useState(false)
  const [sending, setSending] = useState(false)

  const base = parseFloat(proposalBase) || 0
  const commission = base > 0 ? (base * isoCommissionPct) / 100 : 0
  const cost = base > 0 ? (base * jetvisionCostPct) / 100 : 0
  const total = base + commission + cost

  const openProposalPreview = (previewTotal: number, previewNotes?: string) => {
    if (isIso) setHasViewedProposal(true)
    const params = new URLSearchParams()
    if (previewTotal > 0) params.set("totalPrice", String(Math.round(previewTotal)))
    if (currency) params.set("currency", currency)
    if (previewNotes?.trim()) params.set("proposalNotes", previewNotes.trim())

    const query = params.toString()
    const url = `/api/proposals/${request.id}/preview${query ? `?${query}` : ""}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

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
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: "Base Price (from quote)", value: proposalBase, setter: setProposalBase },
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">ISO Commission</label>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{isoCommissionPct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Commission Amount</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {commission > 0 ? fmt(commission, currency) : "$0"}
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={isoCommissionPct}
                onChange={(e) => setIsoCommissionPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900"
              />
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Jetvision Cost</label>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{jetvisionCostPct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Jetvision Amount</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {cost > 0 ? fmt(cost, currency) : "$0"}
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={jetvisionCostPct}
                onChange={(e) => setJetvisionCostPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900"
              />
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>
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
                {commission > 0 && <span>+ ISO ({isoCommissionPct}%): {fmt(commission, currency)}</span>}
                {cost > 0 && <span>+ Jetvision ({jetvisionCostPct}%): {fmt(cost, currency)}</span>}
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

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => openProposalPreview(total, proposalNotes)}
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
        <button
          onClick={() => openProposalPreview(request.totalPrice || 0, request.proposalNotes)}
          disabled={!request.totalPrice}
          className="mt-4 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <FileText className="h-4 w-4" />
          View Sent Proposal
        </button>
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

      {!hasViewedProposal && (
        <p className="text-sm text-amber-700">
          View the proposal PDF before sending it to the client.
        </p>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={() => openProposalPreview(total2 || 0, request.proposalNotes)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          View Proposal PDF
        </button>
        <button
          onClick={() => void handleSendToClient()}
          disabled={sending || !hasViewedProposal}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Proposal to Client
        </button>
      </div>
    </div>
  )
}
