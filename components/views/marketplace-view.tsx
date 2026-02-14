"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Search, Users, Ruler, DollarSign, Filter } from "lucide-react"

export function MarketplaceView() {
  const { marketplaceJets } = useStore()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const categories = ["all", ...Array.from(new Set(marketplaceJets.map((j) => j.category)))]

  const filtered = marketplaceJets.filter((jet) => {
    const matchesSearch =
      jet.aircraft.toLowerCase().includes(search.toLowerCase()) ||
      jet.operator.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || jet.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aircraft Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse available charter aircraft from our network of operators.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search aircraft or operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((jet) => (
          <div
            key={jet.id}
            className={`group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md ${
              jet.available ? "border-border" : "border-border opacity-60"
            }`}
          >
            <div className="relative h-44 overflow-hidden bg-muted">
              <img
                src={jet.imageUrl}
                alt={jet.aircraft}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                crossOrigin="anonymous"
              />
              {!jet.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                  <span className="rounded-lg bg-card px-3 py-1 text-xs font-bold text-card-foreground">
                    Unavailable
                  </span>
                </div>
              )}
              <span className="absolute right-3 top-3 rounded-md bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-card-foreground backdrop-blur-sm">
                {jet.category}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  {jet.aircraft}
                </h3>
                <p className="text-xs text-muted-foreground">{jet.operator}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {jet.seats} seats
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ruler className="h-3.5 w-3.5" />
                  {jet.range}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {jet.basePrice.toLocaleString()}/hr
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <Search className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No aircraft match your search
          </p>
        </div>
      )}
    </div>
  )
}
