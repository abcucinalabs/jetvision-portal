"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { SidebarNav, type PortalView } from "@/components/sidebar-nav"
import { LoginScreen } from "@/components/login-screen"
import { DashboardView } from "@/components/views/dashboard-view"
import { FlightRequestsView } from "@/components/views/flight-requests-view"
import { NotificationsView } from "@/components/views/notifications-view"
import { ProposalsView } from "@/components/views/proposals-view"
import { MarketplaceView } from "@/components/views/marketplace-view"
import { SendNotificationView } from "@/components/views/send-notification-view"
import { SendProposalView } from "@/components/views/send-proposal-view"
import { RFQOperationsView } from "@/components/views/rfq-operations-view"

export function PortalShell() {
  const { currentUser } = useStore()
  const [activeView, setActiveView] = useState<PortalView>("dashboard")

  if (!currentUser) return <LoginScreen />

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {activeView === "dashboard" && (
            <DashboardView onNavigate={setActiveView} />
          )}
          {activeView === "flight-requests" && <FlightRequestsView />}
          {activeView === "rfq-operations" && <RFQOperationsView />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "proposals" && <ProposalsView />}
          {activeView === "marketplace" && <MarketplaceView />}
          {activeView === "send-notification" && <SendNotificationView />}
          {activeView === "send-proposal" && <SendProposalView />}
        </div>
      </main>
    </div>
  )
}
