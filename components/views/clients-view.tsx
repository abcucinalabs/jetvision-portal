"use client"

import { useMemo, useState } from "react"
import { Trash2, UserPlus, Users } from "lucide-react"
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

export function ClientsView() {
  const { currentUser, users, customers, addCustomer, updateCustomer, deleteCustomer } = useStore()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  if (!currentUser || currentUser.role !== "manager") return null

  const isoUsers = useMemo(() => users.filter((u) => u.role === "iso"), [users])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    addCustomer({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      createdByUserId: currentUser.id,
      visibleToIsoIds: isoUsers.map((u) => u.id),
    })

    setName("")
    setEmail("")
    setPhone("")
  }

  const toggleIsoVisibility = (customerId: string, isoId: string, currentVisible: string[] = []) => {
    const nextVisible = currentVisible.includes(isoId)
      ? currentVisible.filter((id) => id !== isoId)
      : [...currentVisible, isoId]

    updateCustomer(customerId, { visibleToIsoIds: nextVisible })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all clients and control which ISOs can access each client.
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

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-14">
          <Users className="h-9 w-9 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No clients added yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">ISO Access</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {customers.map((customer) => {
                  const owner = users.find((u) => u.id === customer.createdByUserId)
                  return (
                    <tr key={customer.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.email}
                          {customer.phone ? ` · ${customer.phone}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{owner?.name || "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isoUsers.map((iso) => {
                            const isVisible = customer.visibleToIsoIds?.includes(iso.id) || false
                            return (
                              <label
                                key={`${customer.id}-${iso.id}`}
                                className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs ${
                                  isVisible
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() =>
                                    toggleIsoVisibility(customer.id, iso.id, customer.visibleToIsoIds || [])
                                  }
                                  className="h-3.5 w-3.5"
                                />
                                {iso.name}
                              </label>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteCustomer(customer.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
