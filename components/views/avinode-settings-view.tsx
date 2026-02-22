"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import {
  AVINODE_SANDBOX_URL,
  AVINODE_LIVE_URL,
  type AvinodeWebhookEventType,
} from "@/lib/avinode"
import { testConnection, configureWebhooks } from "@/lib/avinode-client"
import {
  Settings,
  Shield,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Globe,
  Key,
  Server,
  Activity,
  ExternalLink,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const ALL_WEBHOOK_EVENTS: { type: AvinodeWebhookEventType; label: string; description: string }[] = [
  {
    type: "TripRequestSellerResponse",
    label: "Seller Response",
    description: "When an operator responds to your trip request with a quote or decline",
  },
  {
    type: "TripRequestMine",
    label: "My Trip Requests",
    description: "When someone in your company sends a trip request or cancellation",
  },
  {
    type: "TripChatFromSeller",
    label: "Seller Chat",
    description: "When an operator sends a chat message on a trip",
  },
  {
    type: "TripChatMine",
    label: "My Chat Messages",
    description: "When someone in your company chats on a trip",
  },
  {
    type: "ClientLeads",
    label: "Client Leads",
    description: "When a new end-client lead is created from your web app or API",
  },
  {
    type: "TripRequest",
    label: "Incoming Trip Requests",
    description: "When a buyer sends a new trip request to your company (operator use case)",
  },
  {
    type: "TripChatFromBuyer",
    label: "Buyer Chat",
    description: "When a buyer sends a chat message (operator use case)",
  },
  {
    type: "EmptyLegs",
    label: "Empty Legs",
    description: "When empty legs matching your subscriptions are created or updated",
  },
]

export function AvinodeSettingsView() {
  const {
    currentUser,
    avinodeConfig,
    setAvinodeConfig,
    avinodeConnected,
    avinodeActivity,
    avinodeWebhookEvents,
    setAvinodeWebhookEvents,
  } = useStore()

  const [activeTab, setActiveTab] = useState<"connection" | "webhooks" | "activity">("connection")
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("https://api.jetstream.com/webhooks/avinode")
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookSaved, setWebhookSaved] = useState(false)
  const [webhookError, setWebhookError] = useState("")

  if (!currentUser || currentUser.role !== "manager") return null

  const handleTestConnection = async () => {
    setTestStatus("testing")
    setTestMessage("")
    try {
      const result = await testConnection(avinodeConfig)
      if (result.connected) {
        setTestStatus("success")
        setTestMessage(result.testResult || `Connected to ${result.environment}`)
      } else {
        setTestStatus("error")
        setTestMessage(result.error || "Connection failed")
      }
    } catch {
      setTestStatus("error")
      setTestMessage("Could not reach the Avinode API")
    }
    setTimeout(() => setTestStatus("idle"), 5000)
  }

  const handleSaveWebhooks = async () => {
    setWebhookSaving(true)
    setWebhookError("")
    try {
      await configureWebhooks(avinodeConfig, {
        url: webhookUrl,
        eventTypes: avinodeWebhookEvents,
        active: true,
      })
      setWebhookSaved(true)
      setTimeout(() => setWebhookSaved(false), 3000)
    } catch (err) {
      setWebhookError(err instanceof Error ? err.message : "Failed to save webhook settings")
    } finally {
      setWebhookSaving(false)
    }
  }

  const toggleWebhookEvent = (eventType: AvinodeWebhookEventType) => {
    if (avinodeWebhookEvents.includes(eventType)) {
      setAvinodeWebhookEvents(avinodeWebhookEvents.filter((e) => e !== eventType))
    } else {
      setAvinodeWebhookEvents([...avinodeWebhookEvents, eventType])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avinode Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your Avinode Marketplace API connection, webhook subscriptions, and view activity logs.
        </p>
      </div>

      {/* Connection Status Banner */}
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${
          avinodeConnected
            ? "border-green-500/20 bg-green-500/5"
            : "border-destructive/20 bg-destructive/5"
        }`}
      >
        {avinodeConnected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        )}
        <div className="flex-1">
          <div className={`text-sm font-semibold ${avinodeConnected ? "text-green-700" : "text-destructive"}`}>
            {avinodeConnected ? "Connected to Avinode Marketplace" : "Not Connected"}
          </div>
          <div className="text-xs text-muted-foreground">
            {avinodeConnected
              ? `Environment: ${avinodeConfig.baseUrl === AVINODE_SANDBOX_URL ? "Sandbox" : "Production"}`
              : "Enter your API credentials below to connect."}
          </div>
        </div>
        <a
          href="https://developer.avinodegroup.com/docs/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          API Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {[
          { key: "connection" as const, label: "Connection", icon: Key },
          { key: "webhooks" as const, label: "Webhooks", icon: Webhook },
          { key: "activity" as const, label: "Activity Log", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connection Tab */}
      {activeTab === "connection" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">
                API Credentials
              </h2>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Environment
                </span>
                <select
                  value={avinodeConfig.baseUrl}
                  onChange={(e) => setAvinodeConfig({ baseUrl: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={AVINODE_SANDBOX_URL}>Sandbox (Testing)</option>
                  <option value={AVINODE_LIVE_URL}>Production (Live)</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  API Token *
                </span>
                <input
                  type="password"
                  value={avinodeConfig.apiToken}
                  onChange={(e) => setAvinodeConfig({ apiToken: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="229B8C9E-B3F2-4FA6-8BAE-71DF00943C0E"
                />
                <p className="text-[10px] text-muted-foreground">
                  Found in the Avinode developer portal as "OAuth Secret" or "API Key." Sent as the <code className="font-mono bg-muted px-1 rounded">X-Avinode-ApiToken</code> header. Identifies your application.
                </p>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Authentication Token *
                </span>
                <input
                  type="password"
                  value={avinodeConfig.authToken}
                  onChange={(e) => setAvinodeConfig({ authToken: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="eyJraWQiOiIxNkVBQkQ5RS1BM0..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Found in the Avinode developer portal as "Authentication Token." This is the JWT-style Bearer token (starts with <code className="font-mono bg-muted px-1 rounded">eyJ...</code>) that authorizes your API connection. Treat like a password.
                </p>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Act As Account (Optional)
                  </span>
                  <input
                    value={avinodeConfig.actAsAccount || ""}
                    onChange={(e) => setAvinodeConfig({ actAsAccount: e.target.value || undefined })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. morganhayes"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Avinode username to attribute API actions to a specific person.
                  </p>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    API Version
                  </span>
                  <input
                    value={avinodeConfig.apiVersion}
                    onChange={(e) => setAvinodeConfig({ apiVersion: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="v1.0"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {testStatus === "testing" ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Testing...
                  </>
                ) : testStatus === "success" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Connected
                  </>
                ) : testStatus === "error" ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    {testMessage || "Failed"}
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    Test Connection
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Required Headers Reference */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">
                API Headers Reference
              </h2>
            </div>
            <div className="space-y-2">
              {[
                { header: "X-Avinode-ApiToken", status: avinodeConfig.apiToken ? "set" : "missing", required: true },
                { header: "Authorization", status: avinodeConfig.authToken ? "set" : "missing", required: true },
                { header: "X-Avinode-SentTimestamp", status: "auto", required: true },
                { header: "X-Avinode-Product", status: "auto", required: true },
                { header: "X-Avinode-ApiVersion", status: avinodeConfig.apiVersion ? "set" : "missing", required: false },
                { header: "X-Avinode-ActAsAccount", status: avinodeConfig.actAsAccount ? "set" : "optional", required: false },
                { header: "Content-Type", status: "auto", required: true },
                { header: "Accept-Encoding", status: "auto", required: false },
              ].map((h) => (
                <div
                  key={h.header}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                >
                  <span className="text-xs font-mono text-card-foreground">
                    {h.header}
                    {h.required && <span className="text-destructive ml-0.5">*</span>}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      h.status === "set"
                        ? "bg-green-500/10 text-green-600"
                        : h.status === "auto"
                          ? "bg-primary/10 text-primary"
                          : h.status === "optional"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {h.status === "auto" ? "Auto-generated" : h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">
                Webhook Endpoint
              </h2>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Receiving URL
              </span>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://your-domain.com/webhooks/avinode"
              />
              <p className="text-[10px] text-muted-foreground">
                Your server must respond with HTTP 200 to acknowledge receipt. Configured via POST /webhooks/settings.
              </p>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">
                Event Subscriptions
              </h2>
            </div>

            <div className="space-y-2">
              {ALL_WEBHOOK_EVENTS.map((event) => {
                const isActive = avinodeWebhookEvents.includes(event.type)
                return (
                  <button
                    key={event.type}
                    onClick={() => toggleWebhookEvent(event.type)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                        isActive
                          ? "border-primary bg-primary"
                          : "border-input bg-background"
                      }`}
                    >
                      {isActive && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-card-foreground">
                        {event.label}
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                          {event.type}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {event.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-card-foreground">Recommended for brokers:</span>{" "}
                TripRequestSellerResponse, TripRequestMine, TripChatFromSeller, TripChatMine, and ClientLeads.
                These cover the full sourcing workflow from sending RFQs to receiving operator quotes and messages.
              </p>
            </div>
          </div>

          {/* Save Webhooks Button */}
          <div className="flex items-center justify-between">
            {webhookError && (
              <p className="text-sm text-destructive">{webhookError}</p>
            )}
            {webhookSaved && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Webhook settings saved to Avinode
              </div>
            )}
            {!webhookError && !webhookSaved && <div />}
            <button
              onClick={handleSaveWebhooks}
              disabled={!avinodeConnected || webhookSaving || avinodeWebhookEvents.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {webhookSaving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Webhook className="h-3.5 w-3.5" />
                  Save to Avinode
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-card-foreground">
                Avinode API Activity
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Recent API calls, webhook notifications, and integration events.
              </p>
            </div>

            {avinodeActivity.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No activity yet. Connect to Avinode and create a trip to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {avinodeActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {item.title}
                        </span>
                        {item.avinodeTripId && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {item.avinodeTripId}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const configs: Record<string, { bg: string; icon: typeof Activity }> = {
    trip_created: { bg: "bg-primary/10 text-primary", icon: Globe },
    rfq_sent: { bg: "bg-accent/10 text-accent", icon: ExternalLink },
    quote_received: { bg: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
    message_sent: { bg: "bg-primary/10 text-primary", icon: Activity },
    message_received: { bg: "bg-accent/10 text-accent", icon: Activity },
    lead_created: { bg: "bg-primary/10 text-primary", icon: Globe },
    trip_cancelled: { bg: "bg-destructive/10 text-destructive", icon: AlertCircle },
    webhook_received: { bg: "bg-accent/10 text-accent", icon: Webhook },
    search_completed: { bg: "bg-primary/10 text-primary", icon: Activity },
  }
  const config = configs[type] || configs.search_completed
  const Icon = config.icon
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
      <Icon className="h-4 w-4" />
    </div>
  )
}
