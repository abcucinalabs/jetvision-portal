"use client"

import type { FlightRequestStatus, UserRole } from "@/lib/store"

const STEPS: { label: string; statusIndex: number }[] = [
  { label: "Submitted",   statusIndex: 0 },
  { label: "Under Review", statusIndex: 1 },
  { label: "RFQ",         statusIndex: 2 },
  { label: "Quote",       statusIndex: 3 },
  { label: "Proposal",    statusIndex: 4 },
  { label: "Sent",        statusIndex: 5 },
  { label: "Decision",    statusIndex: 6 },
]

const STATUS_ORDER: FlightRequestStatus[] = [
  "pending",
  "under_review",
  "rfq_submitted",
  "quote_received",
  "proposal_ready",
  "proposal_sent",
  "accepted",
]

function getStepIndex(status: FlightRequestStatus): number {
  if (status === "declined" || status === "cancelled") return 6
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

interface RequestStepperProps {
  currentStatus: FlightRequestStatus
  userRole: UserRole
  selectedStepIndex?: number
  onStepSelect?: (index: number) => void
  maxSelectableStepIndex?: number
}

export function RequestStepper({
  currentStatus,
  userRole: _userRole,
  selectedStepIndex,
  onStepSelect,
  maxSelectableStepIndex,
}: RequestStepperProps) {
  const activeIndex = getStepIndex(currentStatus)
  const viewedIndex = selectedStepIndex ?? activeIndex
  const selectableIndex = maxSelectableStepIndex ?? activeIndex

  return (
    <div className="flex items-start w-full px-2">
      {STEPS.map((step, i) => {
        const isCompleted = i < activeIndex
        const isActive = i === activeIndex
        const isViewed = i === viewedIndex
        const isFinal = currentStatus === "accepted" || currentStatus === "declined" || currentStatus === "cancelled"
        const isSelectable = i <= selectableIndex

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={isSelectable && onStepSelect ? () => onStepSelect(i) : undefined}
                disabled={!isSelectable || !onStepSelect}
                aria-label={`View ${step.label} step`}
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all
                  ${isCompleted || (isActive && isFinal && i === 6)
                    ? "border-emerald-500 bg-emerald-500"
                    : isActive
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-gray-200 bg-white"
                  }
                  ${isViewed ? "ring-2 ring-offset-2 ring-gray-300" : ""}
                  ${isSelectable && onStepSelect ? "cursor-pointer" : "cursor-default"}
                `}
              >
                {isCompleted || (isActive && isFinal && i === 6) ? (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-white" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </button>
              <span
                className={`text-[11px] text-center leading-tight whitespace-nowrap ${
                  isViewed ? "font-semibold text-gray-900" : isCompleted ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line (not after last item) */}
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 mx-2 mt-[-14px] transition-colors ${
                  i < activeIndex ? "bg-emerald-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export { getStepIndex }
