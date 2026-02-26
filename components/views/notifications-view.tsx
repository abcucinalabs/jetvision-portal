"use client"

import { isNotificationVisibleToUser, useStore } from "@/lib/store"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function NotificationsView() {
  const { currentUser, notifications, markNotificationRead, deleteNotification } = useStore()

  if (!currentUser) return null

  const filtered = notifications.filter(
    (n) => isNotificationVisibleToUser(n, currentUser)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay updated with the latest company announcements and updates.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No notifications yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border bg-card p-5 transition-all ${
                n.read
                  ? "border-border"
                  : "border-accent/30 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {!n.read && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                  )}
                  <div className={!n.read ? "" : "pl-[22px]"}>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      {n.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>From: {n.fromUserName}</span>
                      <span>&middot;</span>
                      <span>
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>&middot;</span>
                      <span className="uppercase tracking-wider">
                        {n.toRole === "all" ? "Everyone" : n.toRole}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {!n.read && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
