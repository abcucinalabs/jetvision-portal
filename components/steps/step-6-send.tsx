"use client"

import { Clock, CheckCircle2 } from "lucide-react"
import type { FlightRequest, User as UserType } from "@/lib/store"
import { format } from "date-fns"

interface Props {
  request: FlightRequest
  currentUser: UserType
}

export function Step6Send({ request, currentUser }: Props) {
  const isIso = currentUser.role === "iso"

  const sentAt = request.proposalSentAt
    ? format(new Date(request.proposalSentAt), "MMM d, yyyy 'at' h:mm a")
    : null

  const currency = request.avinodeBestQuoteCurrency ?? "USD"
  const total = request.totalPrice
  const fmtTotal = total
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(total)
    : null

  if (isIso) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Proposal sent to client</h2>
            {sentAt && <p className="text-sm text-gray-500">{sentAt}</p>}
          </div>
        </div>

        {fmtTotal && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-400 mb-1">Total Proposed</div>
            <div className="text-2xl font-bold text-gray-900">{fmtTotal}</div>
          </div>
        )}

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Waiting for client response. Once the client responds, come back here to record their decision.
          </p>
        </div>
      </div>
    )
  }

  // Manager view
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">Proposal sent to client</h3>
      {sentAt && <p className="text-sm text-gray-500 mt-1">{sentAt}</p>}
      <p className="text-sm text-gray-500 mt-2 max-w-xs">
        The ISO has sent the proposal to {request.clientName}. Awaiting the client&apos;s decision.
      </p>
    </div>
  )
}
