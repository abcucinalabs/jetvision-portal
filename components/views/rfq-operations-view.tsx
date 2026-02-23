"use client"

import { useMemo, useState } from "react"
import { useStore, type FlightRequest } from "@/lib/store"
import { chatTripRequest, declineTripRequest, getTripMessage, submitTripQuote } from "@/lib/avinode-client"
import { Calendar, ChevronRight, ExternalLink, Globe, MapPin, MessageSquare, PlaneTakeoff, Send, Users } from "lucide-react"

export function RFQOperationsView() {
  const { currentUser, flightRequests, avinodeConnected, addAvinodeActivity } = useStore()
  const [selectedRequest, setSelectedRequest] = useState<FlightRequest | null>(null)
  const [requestId, setRequestId] = useState("")
  const [liftId, setLiftId] = useState("")
  const [quoteAmount, setQuoteAmount] = useState("")
  const [quoteCurrency, setQuoteCurrency] = useState("USD")
  const [chatText, setChatText] = useState("")
  const [declineReason, setDeclineReason] = useState("Aircraft unavailable")
  const [apiError, setApiError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<"fetch" | "quote" | "decline" | "chat" | null>(null)
  const [responsePayload, setResponsePayload] = useState<Record<string, unknown> | null>(null)

  if (!currentUser || currentUser.role !== "manager") return null

  const avinodeRequests = useMemo(
    () => flightRequests.filter((fr) => fr.avinodeTripId),
    [flightRequests]
  )

  const handleSelectRequest = (fr: FlightRequest) => {
    setSelectedRequest(fr)
    setResponsePayload(null)
    setApiError(null)
  }

  const runAction = async (action: "fetch" | "quote" | "decline" | "chat", fn: () => Promise<unknown>) => {
    setLoadingAction(action)
    setApiError(null)
    try {
      const data = await fn()
      setResponsePayload((data as Record<string, unknown>) || null)
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      setApiError(message)
      throw error
    } finally {
      setLoadingAction(null)
    }
  }

  const handleFetchMessage = async () => {
    if (!requestId.trim()) return
    const data = await runAction("fetch", () => getTripMessage(requestId.trim()))
    addAvinodeActivity({
      type: "message_received",
      title: "RFQ Message Loaded",
      description: `Loaded trip message ${requestId.trim()} from Avinode.`,
      flightRequestId: selectedRequest?.id,
      avinodeTripId: selectedRequest?.avinodeTripId,
    })
    return data
  }

  const handleSubmitQuote = async () => {
    if (!requestId.trim() || !quoteAmount) return
    const payload: Record<string, unknown> = {
      liftId: liftId || undefined,
      quote: {
        price: {
          amount: Number(quoteAmount),
          currency: quoteCurrency,
        },
      },
    }

    await runAction("quote", () => submitTripQuote(requestId.trim(), payload))
    addAvinodeActivity({
      type: "quote_received",
      title: "Quote Submitted",
      description: `Submitted ${quoteCurrency} ${Number(quoteAmount).toLocaleString()} for request ${requestId.trim()}.`,
      flightRequestId: selectedRequest?.id,
      avinodeTripId: selectedRequest?.avinodeTripId,
    })
  }

  const handleDecline = async () => {
    if (!requestId.trim()) return
    const payload: Record<string, unknown> = {
      liftId: liftId || undefined,
      reason: declineReason,
    }

    await runAction("decline", () => declineTripRequest(requestId.trim(), payload))
    addAvinodeActivity({
      type: "trip_cancelled",
      title: "RFQ Declined",
      description: `Declined request ${requestId.trim()}: ${declineReason}`,
      flightRequestId: selectedRequest?.id,
      avinodeTripId: selectedRequest?.avinodeTripId,
    })
  }

  const handleSendChat = async () => {
    if (!requestId.trim() || !chatText.trim()) return
    const payload: Record<string, unknown> = {
      message: chatText.trim(),
      liftId: liftId || undefined,
    }

    await runAction("chat", () => chatTripRequest(requestId.trim(), payload))
    addAvinodeActivity({
      type: "message_sent",
      title: "Message Sent",
      description: `Sent chat message on request ${requestId.trim()}.`,
      flightRequestId: selectedRequest?.id,
      avinodeTripId: selectedRequest?.avinodeTripId,
    })
    setChatText("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">RFQ Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage RFQ responses directly in portal: fetch request details, submit quotes, decline, and chat.
        </p>
      </div>

      {!avinodeConnected && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Avinode credentials are not configured in environment variables.
        </div>
      )}

      {!selectedRequest ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Select an Avinode request context</h2>
          {avinodeRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12">
              <PlaneTakeoff className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No requests with Avinode trips yet
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {avinodeRequests.map((fr) => (
                <button
                  key={fr.id}
                  onClick={() => handleSelectRequest(fr)}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-accent/40 hover:shadow-sm"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-card-foreground">{fr.clientName}</span>
                      <span className="text-xs text-muted-foreground">via {fr.isoName}</span>
                      {fr.avinodeTripId && (
                        <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                          <Globe className="h-3 w-3" />
                          {fr.avinodeTripId}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {fr.departure} &rarr; {fr.arrival}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fr.departureDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {fr.passengers} pax
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-card-foreground">{selectedRequest.clientName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedRequest.departure} &rarr; {selectedRequest.arrival} &middot; {selectedRequest.departureDate}
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Change
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedRequest.avinodeSearchLink && (
                <a
                  href={selectedRequest.avinodeSearchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Open Search
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {selectedRequest.avinodeViewLink && (
                <a
                  href={selectedRequest.avinodeViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  View Trip
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Request ID (tripmsg) *</span>
                <input
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="e.g. atripmsg-12345"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Lift ID (optional)</span>
                <input
                  value={liftId}
                  onChange={(e) => setLiftId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Operator lift id"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFetchMessage}
                disabled={!requestId || loadingAction !== null}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingAction === "fetch" ? "Loading..." : "GET /tripmsgs/{id}"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Quote Amount *</span>
                <input
                  type="number"
                  min={0}
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="e.g. 45000"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Currency</span>
                <input
                  value={quoteCurrency}
                  onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="USD"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSubmitQuote}
                  disabled={!requestId || !quoteAmount || loadingAction !== null}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loadingAction === "quote" ? "Submitting..." : "POST submitQuote"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Decline Reason</span>
                <input
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={!requestId || loadingAction !== null}
                  className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {loadingAction === "decline" ? "Declining..." : "POST decline"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground">Chat Message</span>
                <textarea
                  rows={3}
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
                  placeholder="Send update to operator/buyer..."
                />
              </label>
              <button
                type="button"
                onClick={handleSendChat}
                disabled={!requestId || !chatText.trim() || loadingAction !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {loadingAction === "chat" ? "Sending..." : "POST chat"}
              </button>
            </div>

            {apiError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {apiError}
              </div>
            )}

            {responsePayload && (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">API response</div>
                <pre className="max-h-64 overflow-auto text-[11px] text-foreground">{JSON.stringify(responsePayload, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
