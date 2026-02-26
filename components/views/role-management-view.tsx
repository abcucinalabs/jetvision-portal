"use client"

import { UserCog } from "lucide-react"

export function RoleManagementView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage user roles and permissions for internal users.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <UserCog className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Role Management coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This is a placeholder for role and permission administration.
        </p>
      </div>
    </div>
  )
}
