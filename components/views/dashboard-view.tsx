"use client"

import { useStore } from "@/lib/store"
import {
  PlaneTakeoff,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import type { PortalView } from "@/components/sidebar-nav"
import { isNotificationVisibleToUser } from "@/lib/store"

interface DashboardViewProps {
  onNavigate: (view: PortalView) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const {
    currentUser,
    flightRequests,
    notifications,
    unreadCount,
  } = useStore()

  if (!currentUser) return null

  const isManager = currentUser.role === "manager"
  const requestsView: PortalView = "flight-requests"

  const pendingRequests = flightRequests.filter((fr) => fr.status === "pending")
  const myRequests = isManager
    ? flightRequests
    : flightRequests.filter((fr) => fr.isoId === currentUser.id)

  const stats = [
    {
      label: isManager ? "Pending Requests" : "My Requests",
      value: isManager ? pendingRequests.length : myRequests.length,
      icon: PlaneTakeoff,
      color: "bg-primary/10 text-primary",
      onClick: () => onNavigate(requestsView),
      formatted: false,
    },
    {
      label: "Unread Notifications",
      value: unreadCount,
      icon: Bell,
      color: "bg-destructive/10 text-destructive",
      onClick: () => onNavigate("notifications"),
      formatted: false,
    },
  ]

  const recentRequests = (isManager ? flightRequests : myRequests).slice(0, 5)
  const recentNotifications = notifications
    .filter(
      (n) => isNotificationVisibleToUser(n, currentUser)
    )
    .slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager
            ? "Here is your operations overview."
            : "Here is a summary of your activity."}
        </p>
      </div>

      {/* Stats */}
      <div className={`grid gap-4 ${isManager ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:shadow-md"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-card-foreground">
                {stat.formatted
                  ? `$${stat.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent flight requests */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-card-foreground">
              {isManager ? "All Flight Requests" : "My Requests"}
            </h2>
            <button
              onClick={() => onNavigate(requestsView)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>
          {recentRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No flight requests yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentRequests.map((fr) => (
                <div key={fr.id} className="flex items-center gap-4 px-5 py-3.5">
                  <StatusIcon status={fr.status} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-card-foreground">
                      {fr.clientName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fr.departure} &rarr; {fr.arrival}
                    </div>
                  </div>
                  <StatusBadge status={fr.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-card-foreground">
              Recent Notifications
            </h2>
            <button
              onClick={() => onNavigate("notifications")}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentNotifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read ? "pl-5" : ""}`}>
                    <div className="truncate text-sm font-medium text-card-foreground">
                      {n.title}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Clock className="h-4 w-4 text-accent" />
        </div>
      )
    case "proposal_sent":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <PlaneTakeoff className="h-4 w-4 text-primary" />
        </div>
      )
    case "accepted":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
        </div>
      )
    case "cancelled":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
      )
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
      )
  }
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
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
