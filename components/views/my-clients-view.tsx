"use client"

import { useMemo, useState } from "react"
import { Check, MoreHorizontal, Pencil, Trash2, UserPlus, Users, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useStore } from "@/lib/store"

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (!digits) return ""

  const hasCountryCode = digits.length > 10 && digits.startsWith("1")
  const local = hasCountryCode ? digits.slice(1) : digits.slice(0, 10)
  const prefix = hasCountryCode ? "+1 " : ""

  if (local.length <= 3) return `${prefix}(${local}`
  if (local.length <= 6) return `${prefix}(${local.slice(0, 3)}) ${local.slice(3)}`
  return `${prefix}(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

export function MyClientsView() {
  const { currentUser, customers, addCustomer, updateCustomer, deleteCustomer } = useStore()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")

  if (!currentUser || currentUser.role !== "iso") return null

  const myClients = useMemo(
    () => customers.filter((c) => c.createdByUserId === currentUser.id),
    [customers, currentUser.id]
  )

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    addCustomer({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      createdByUserId: currentUser.id,
      visibleToIsoIds: [currentUser.id],
    })
    setName("")
    setEmail("")
    setPhone("")
  }

  const startEditing = (clientId: string, currentName: string, currentEmail: string, currentPhone: string) => {
    setEditingClientId(clientId)
    setEditName(currentName)
    setEditEmail(currentEmail)
    setEditPhone(currentPhone)
  }

  const cancelEditing = () => {
    setEditingClientId(null)
    setEditName("")
    setEditEmail("")
    setEditPhone("")
  }

  const saveEditing = () => {
    if (!editingClientId || !editName.trim() || !editEmail.trim()) return

    updateCustomer(editingClientId, {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
    })

    cancelEditing()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your saved clients used for flight requests.
        </p>
      </div>

      <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Client email"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          placeholder="Client phone"
          inputMode="tel"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </button>
      </form>

      {myClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-14">
          <Users className="h-9 w-9 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No clients added yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {myClients.map((client) => {
              const isEditing = editingClientId === client.id
              return (
                <div key={client.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Client name"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Client email"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                          placeholder="Client phone"
                          inputMode="tel"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-foreground">{client.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {client.email}
                          {client.phone ? ` · ${client.phone}` : ""}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={saveEditing}
                          disabled={!editName.trim() || !editEmail.trim()}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Open client actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() =>
                              startEditing(
                                client.id,
                                client.name,
                                client.email,
                                client.phone || ""
                              )
                            }
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteCustomer(client.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
