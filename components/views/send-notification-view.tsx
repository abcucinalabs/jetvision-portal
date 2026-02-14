"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Send, CheckCircle2 } from "lucide-react"

export function SendNotificationView() {
  const { currentUser, addNotification } = useStore()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<"iso" | "all">("iso")
  const [sent, setSent] = useState(false)

  if (!currentUser || currentUser.role !== "manager") return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addNotification({
      title,
      body,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      toRole: audience,
    })
    setTitle("")
    setBody("")
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Send Notification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broadcast company updates and announcements to your team.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-card p-6">
        {sent && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Notification sent successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Audience</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudience("iso")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  audience === "iso"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                ISOs Only
              </button>
              <button
                type="button"
                onClick={() => setAudience("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  audience === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Everyone
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Subject *</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Q1 Revenue Update"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Message *</span>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Write your announcement..."
            />
          </label>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Send className="h-4 w-4" />
            Send Notification
          </button>
        </form>
      </div>
    </div>
  )
}
