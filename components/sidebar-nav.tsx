"use client"

import { useStore } from "@/lib/store"
import Image from "next/image"
import jetvisionLogo from "@/IMG_6289.png"
import {
  LayoutDashboard,
  Bell,
  FileText,
  Send,
  ShoppingBag,
  LogOut,
  PlaneTakeoff,
  MessageSquare,
  GitBranch,
  ListChecks,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"

export type PortalView =
  | "dashboard"
  | "flight-requests"
  | "rfq-operations"
  | "requests-new"
  | "notifications"
  | "proposals"
  | "marketplace"
  | "workflow-logic"
  | "send-notification"
  | "send-proposal"

interface SidebarNavProps {
  activeView: PortalView
  onNavigate: (view: PortalView) => void
}

const ISO_NAV: { label: string; view: PortalView; icon: typeof LayoutDashboard }[] = [
  { label: "Notifications", view: "notifications", icon: Bell },
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Requests", view: "requests-new", icon: ListChecks },
  { label: "Proposals", view: "proposals", icon: FileText },
]

const MANAGER_NAV: { label: string; view: PortalView; icon: typeof LayoutDashboard }[] = [
  { label: "Notifications", view: "notifications", icon: Bell },
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Requests (New)", view: "requests-new", icon: ListChecks },
  { label: "Flight Requests", view: "flight-requests", icon: PlaneTakeoff },
  { label: "RFQ Operations", view: "rfq-operations", icon: MessageSquare },
  { label: "Workflow Logic", view: "workflow-logic", icon: GitBranch },
  { label: "Send Proposal", view: "send-proposal", icon: Send },
  { label: "Proposals", view: "proposals", icon: FileText },
  { label: "Send Notification", view: "send-notification", icon: Bell },
]

export function SidebarNav({ activeView, onNavigate }: SidebarNavProps) {
  const { currentUser, logout, unreadCount } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!currentUser) return null

  const navItems = currentUser.role === "manager" ? MANAGER_NAV : ISO_NAV

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white text-black">
      {/* Header */}
      <div className="flex items-center justify-center border-b border-gray-200 px-5 py-4">
        <Image
          src={jetvisionLogo}
          alt="Jetvision"
          className="h-auto w-[132px]"
          priority
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = activeView === item.view
          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view)
                setMobileOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-gray-100 text-black"
                  : "text-gray-700 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.view === "notifications" && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-black">
            {currentUser.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-black">
              {currentUser.name}
            </div>
            <div className="truncate text-[11px] text-gray-500">
              {currentUser.role === "manager" ? "Manager" : "ISO"}
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-primary p-2 text-primary-foreground shadow-lg md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-64">
            {sidebarContent}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1 text-gray-500 hover:text-black"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  )
}
