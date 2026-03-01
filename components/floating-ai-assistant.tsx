"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Loader2, Send, User, X } from "lucide-react"
import { useStore } from "@/lib/store"
import type { FormData } from "@/components/views/flight-requests-view"
import type { PortalView } from "@/components/sidebar-nav"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = {
  iso: [
    "Start a new flight request",
    "Add a new client",
    "What are my top follow-ups today?",
  ],
  manager: [
    "Which clients have pending flight requests?",
    "Show me flight requests for next week.",
    "Which requests have more than 6 passengers?",
  ],
} as const

type ClientDraft = {
  name?: string
  email?: string
  phone?: string
}

type AssistantAction =
  | {
    type: "draft_flight_request"
    draft: Partial<FormData>
    missingFields: string[]
    ready: boolean
  }
  | {
    type: "draft_client"
    draft: ClientDraft
    missingFields: string[]
    ready: boolean
  }

export function FloatingAiAssistant({
  onNavigate,
  onDraftFlightRequest,
  onDraftClient,
}: {
  onNavigate: (view: PortalView) => void
  onDraftFlightRequest: (draft: Partial<FormData>) => void
  onDraftClient: (draft: ClientDraft) => void
}) {
  const { currentUser } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasStartedConversation, setHasStartedConversation] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])
  const suggestedPrompts = useMemo(
    () => SUGGESTED_PROMPTS[currentUser?.role || "manager"],
    [currentUser?.role]
  )
  const initialMessage = useMemo(() => (
    currentUser?.role === "iso"
      ? "Ask me to start a new flight request, add a new client, or help prioritize your follow-ups. I only use portal data."
      : "Ask about requests, clients, follow-ups, or updates. I answer from portal data only."
  ), [currentUser?.role])
  const inputPlaceholder = currentUser?.role === "iso"
    ? "Ask to start a request, add a client, or help with follow-ups..."
    : "Ask anything about requests or clients..."
  const showSuggestedPrompts = currentUser?.role === "manager" || !hasStartedConversation

  useEffect(() => {
    if (!currentUser) return
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: initialMessage,
      },
    ])
    setHasStartedConversation(false)
    setInput("")
    setError(null)
  }, [currentUser, initialMessage])

  if (!currentUser) return null

  const scrollToBottom = () => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }

  const sendMessage = async (question: string) => {
    const text = question.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    if (currentUser.role === "iso") {
      setHasStartedConversation(true)
    }
    setInput("")
    setLoading(true)
    setError(null)
    setOpen(true)

    window.setTimeout(scrollToBottom, 0)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId: currentUser.id,
          userRole: currentUser.role,
          history: nextMessages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || `Request failed: HTTP ${res.status}`)
      }

      const answer = (json as { data?: { answer?: string } })?.data?.answer
      const action = (json as { data?: { action?: AssistantAction } })?.data?.action
      if (!answer) {
        throw new Error("AI response is empty.")
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: answer,
        },
      ])

      if (action?.type === "draft_flight_request" && action.ready) {
        onDraftFlightRequest(action.draft)
        onNavigate("requests-new")
      }

      if (action?.type === "draft_client" && action.ready) {
        onDraftClient(action.draft)
        onNavigate("my-clients")
      }

      window.setTimeout(scrollToBottom, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-border bg-card shadow-2xl md:right-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bot className="h-4 w-4" />
              AI Assistant
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close AI Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="h-[360px] space-y-3 overflow-y-auto p-3">
            {messages.map((message) => {
              const isUser = message.role === "user"
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] opacity-80">
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      {isUser ? "You" : "AI"}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {showSuggestedPrompts && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={loading}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={inputPlaceholder}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </form>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 md:right-6"
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
      >
        <Bot className="h-4 w-4" />
        AI Chat
      </button>
    </>
  )
}
