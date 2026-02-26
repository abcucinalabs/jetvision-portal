"use client"

import { Landmark } from "lucide-react"

export function FinancesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finances</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finance reporting and payout workflows will appear here.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Landmark className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Finances coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This is a placeholder for manager finance operations.
        </p>
      </div>
    </div>
  )
}
