"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RefreshCw, DollarSign, TrendingUp, Loader2 } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { formatDistanceToNow } from "date-fns"
import { getRfq } from "@/lib/avinode-client"

const POLL_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

interface Props {
  request: FlightRequest
  currentUser: UserType
  onUpdate: (data: Partial<FlightRequest>) => Promise<void>
  onSync: () => Promise<void>
}

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
}

export function Step4Quote({ request, currentUser, onUpdate, onSync }: Props) {
  const isManager = currentUser.role === "manager"
  const [syncing, setSyncing] = useState(false)
  const [proposalBase, setProposalBase] = useState<string>(
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
  const [submittedRfqCount, setSubmittedRfqCount] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const base = parseFloat(proposalBase) || 0
  const commission = parseFloat(isoCommission) || 0
  const cost = parseFloat(jetvisionCost) || 0
  const total = base + commission + cost
  const currency = request.avinodeBestQuoteCurrency ?? "USD"

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await onSync()
    } finally {
      setSyncing(false)
    }
  }, [onSync])

  // Auto-poll every 15 min while on this step
  useEffect(() => {
    intervalRef.current = setInterval(handleSync, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [handleSync])

  // Sync best quote into base field when Avinode data arrives
  useEffect(() => {
    if (request.avinodeBestQuoteAmount && !proposalBase) {
      setProposalBase(String(request.avinodeBestQuoteAmount))
    }
  }, [request.avinodeBestQuoteAmount, proposalBase])

  // Count submitted RFQs by seller-lift entries across RFQ threads
  useEffect(() => {
    if (!request.avinodeRfqIds || request.avinodeRfqIds.length === 0) {
      setSubmittedRfqCount(null)
      return
    }
    let cancelled = false
    const loadRfqCount = async () => {
      try {
        const responses = await Promise.all(
          request.avinodeRfqIds!.map(async (rfqId) => {
            const res = await getRfq(rfqId)
            return res.data as unknown as Record<string, unknown>
          })
        )
        const sellerLiftCount = responses.reduce((sum, rfq) => {
          const sellerLift = Array.isArray((rfq as { sellerLift?: unknown[] }).sellerLift)
            ? ((rfq as { sellerLift?: unknown[] }).sellerLift as unknown[])
            : []
          return sum + sellerLift.length
        }, 0)
        if (!cancelled) {
          setSubmittedRfqCount(Math.max(request.avinodeRfqIds!.length, sellerLiftCount))
        }
      } catch {
        if (!cancelled) {
          setSubmittedRfqCount(null)
        }
      }
    }
    void loadRfqCount()
    return () => {
      cancelled = true
    }
  }, [request.avinodeRfqIds])

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
    } finally {
      setSavingProposal(false)
    }
  }

  const rfqCount = submittedRfqCount ?? (request.avinodeRfqIds?.length ?? 0)
  const quoteCount = request.avinodeQuoteCount ?? 0
  const lastSync = request.avinodeLastSyncAt
    ? formatDistanceToNow(new Date(request.avinodeLastSyncAt), { addSuffix: true })
    : null

  // ISO view
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
          <TrendingUp className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">
          {quoteCount > 0 ? `${quoteCount} of ${rfqCount || quoteCount} quotes received` : "Awaiting quotes from operators"}
        </h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
          Our team is reviewing the quotes and building your proposal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quotes & Proposal Builder</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review received quotes and build the ISO proposal below.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Quote count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{quoteCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Quotes Received</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{rfqCount || "—"}</div>
          <div className="text-xs text-gray-500 mt-0.5">RFQs Sent</div>
        </div>
        {request.avinodeBestQuoteAmount ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-emerald-700">{fmt(request.avinodeBestQuoteAmount, currency)}</div>
            <div className="text-xs text-emerald-600 mt-0.5">Best Quote</div>
          </div>
        ) : null}
      </div>

      {lastSync && (
        <p className="text-xs text-gray-400">Last synced {lastSync}</p>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Proposal builder */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Build Proposal</h3>

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

        {/* Total price — big display like the screenshot */}
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
          onClick={handleSendToIso}
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
