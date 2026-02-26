"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { SidebarNav, type PortalView } from "@/components/sidebar-nav"
import { LoginScreen } from "@/components/login-screen"
import { SupabaseSignInScreen } from "@/components/supabase-sign-in-screen"
import { DashboardView } from "@/components/views/dashboard-view"
import { FlightRequestsView } from "@/components/views/flight-requests-view"
import { NotificationsView } from "@/components/views/notifications-view"
import { MarketplaceView } from "@/components/views/marketplace-view"
import { SendNotificationView } from "@/components/views/send-notification-view"
import { RequestsNewView } from "@/components/views/requests-new-view"
import { MyClientsView } from "@/components/views/my-clients-view"
import { ClientsView } from "@/components/views/clients-view"
import { FinancesView } from "@/components/views/finances-view"
import { RoleManagementView } from "@/components/views/role-management-view"
import { SystemAdminView } from "@/components/views/system-admin-view"

type AuthStatus = "loading" | "signed_out" | "signed_in"

export function PortalShell() {
  const { currentUser } = useStore()
  const [activeView, setActiveView] = useState<PortalView>("dashboard")
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")

  useEffect(() => {
    let active = true
    let supabase: ReturnType<typeof getSupabaseBrowserClient>

    try {
      supabase = getSupabaseBrowserClient()
    } catch {
      if (active) {
        setAuthStatus("signed_out")
      }
      return () => {
        active = false
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthStatus(data.session ? "signed_in" : "signed_out")
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthStatus(session ? "signed_in" : "signed_out")
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (authStatus === "loading") {
    return <div className="min-h-screen bg-background" />
  }

  if (authStatus === "signed_out") {
    return <SupabaseSignInScreen />
  }

  if (!currentUser) return <LoginScreen />

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {activeView === "dashboard" && (
            <DashboardView onNavigate={setActiveView} />
          )}
          {activeView === "requests-new" && <RequestsNewView />}
          {activeView === "flight-requests" && <FlightRequestsView />}
          {activeView === "my-clients" && currentUser.role === "iso" && <MyClientsView />}
          {activeView === "clients" && currentUser.role === "manager" && <ClientsView />}
          {activeView === "finances" && currentUser.role === "manager" && <FinancesView />}
          {activeView === "role-management" && currentUser.role === "manager" && <RoleManagementView />}
          {activeView === "system-admin" && currentUser.role === "manager" && <SystemAdminView />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "marketplace" && <MarketplaceView />}
          {activeView === "send-notification" && <SendNotificationView />}
        </div>
      </main>
    </div>
  )
}
