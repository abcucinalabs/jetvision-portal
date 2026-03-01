"use client"

import { useMemo, useState } from "react"
import {
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Mail,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useStore, type UserRole } from "@/lib/store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const WIZARD_STEPS = [
  "Basic Details",
  "Access View",
  "Review & Save",
]

function formatDateTime(value?: string) {
  if (!value) return "Pending"
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function RoleManagementView() {
  const { currentUser, users, addUser, updateUser, deleteUser } = useStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole>("iso")
  const [savedUserName, setSavedUserName] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("iso")

  if (!currentUser || currentUser.role !== "manager") return null

  const canContinueBasics = name.trim().length > 0 && email.trim().length > 0
  const canSaveEdit = editName.trim().length > 0 && editEmail.trim().length > 0
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [users]
  )

  const resetWizard = () => {
    setWizardOpen(false)
    setStepIndex(0)
    setName("")
    setEmail("")
    setSelectedRole("iso")
  }

  const handleSave = () => {
    if (!canContinueBasics) return

    const created = addUser({
      name: name.trim(),
      email: email.trim(),
      role: selectedRole,
      invitedByUserId: currentUser.id,
    })

    setSavedUserName(created.name)
    resetWizard()
  }

  const startEditing = (userId: string, currentName: string, currentEmail: string, currentRole: UserRole) => {
    setEditingUserId(userId)
    setEditName(currentName)
    setEditEmail(currentEmail)
    setEditRole(currentRole)
  }

  const cancelEditing = () => {
    setEditingUserId(null)
    setEditName("")
    setEditEmail("")
    setEditRole("iso")
  }

  const saveEditing = () => {
    if (!editingUserId || !canSaveEdit) return

    updateUser(editingUserId, {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
    })
    cancelEditing()
  }

  const handleDelete = (userId: string, userName: string) => {
    if (!window.confirm(`Delete ${userName}? This is for illustrative purposes only.`)) return
    if (editingUserId === userId) {
      cancelEditing()
    }
    deleteUser(userId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage internal users, assign portal access, and track illustrative onboarding completion.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Internal Users</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage access view, contact details, onboarding state, and user lifecycle from one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Onboard a New ISO
          </button>
        </div>

        {savedUserName && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {savedUserName} was added successfully. They will need to complete illustrative training before dashboard access unlocks.
          </div>
        )}

        <div className="mt-5">
          <table className="w-full table-fixed">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-[18%] px-4 py-3">Name</th>
                <th className="w-[24%] px-4 py-3">Email</th>
                <th className="w-[14%] px-4 py-3">View</th>
                <th className="w-[18%] px-4 py-3">Training Status</th>
                <th className="w-[12%] px-4 py-3">Updated</th>
                <th className="w-[16%] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {sortedUsers.map((user) => {
                const isEditing = editingUserId === user.id
                const onboardingStatus = user.onboardingStatus ?? "not_started"
                const statusLabel =
                  onboardingStatus === "complete"
                    ? "Training Complete"
                    : onboardingStatus === "in_progress"
                    ? "Training In Progress"
                    : "Training Pending"

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      ) : (
                        <div className="truncate whitespace-nowrap font-semibold text-foreground">{user.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(event) => setEditEmail(event.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      ) : (
                        <div className="truncate text-muted-foreground">{user.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Select
                          value={editRole}
                          onValueChange={(value) => setEditRole(value as UserRole)}
                        >
                          <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                            <SelectValue placeholder="Select view" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="iso">ISO View</SelectItem>
                            <SelectItem value="manager">Manager View</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {user.role === "manager" ? "Manager View" : "ISO View"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          onboardingStatus === "complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : onboardingStatus === "in_progress"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {onboardingStatus === "complete"
                        ? formatDateTime(user.trainingCompletedAt)
                        : formatDateTime(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEditing}
                              disabled={!canSaveEdit}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
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
                                aria-label="Open user actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => startEditing(user.id, user.name, user.email, user.role)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(user.id, user.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                  Onboarding Wizard
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">Create a new internal user</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start by entering the user&apos;s name and email, then choose whether they should see the ISO or Manager experience.
                </p>
              </div>
              <button
                type="button"
                onClick={resetWizard}
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close onboarding wizard"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = index === stepIndex
                const isComplete = index < stepIndex
                return (
                  <div
                    key={step}
                    className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : isComplete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 font-medium">{step}</div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background p-5">
              {stepIndex === 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Manager enters the basics</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add the user&apos;s primary contact details first.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Jordan Carter"
                        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="jordan@jetvision.com"
                        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStepIndex(1)}
                      disabled={!canContinueBasics}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Choose portal access</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select whether this user should land in the ISO or Manager workflow after onboarding is complete.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("iso")}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selectedRole === "iso"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <div className="mt-3 text-sm font-semibold">ISO View</div>
                      <p className={`mt-1 text-xs ${selectedRole === "iso" ? "text-background/75" : "text-muted-foreground"}`}>
                        Client-facing workflow, requests, proposals, and decision updates.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("manager")}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selectedRole === "manager"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                      <div className="mt-3 text-sm font-semibold">Manager View</div>
                      <p className={`mt-1 text-xs ${selectedRole === "manager" ? "text-background/75" : "text-muted-foreground"}`}>
                        Internal operations, client administration, and internal workflow controls.
                      </p>
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStepIndex(0)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepIndex(2)}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
                    >
                      Review
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Review the invite</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Saving this creates the user and places them into illustrative training before dashboard access is unlocked.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        Identity
                      </div>
                      <div className="mt-3 text-sm font-semibold text-foreground">{name.trim()}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{email.trim()}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Access & Onboarding
                      </div>
                      <div className="mt-3 text-sm font-semibold text-foreground">
                        {selectedRole === "manager" ? "Manager View" : "ISO View"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Training status starts as pending until the user completes onboarding.
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStepIndex(1)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Save User
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
