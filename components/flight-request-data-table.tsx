"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FlightRequest } from "@/lib/store"

// ─── Badges ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-accent/10", text: "text-accent", label: "Pending" },
  under_review: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Under Review" },
  rfq_submitted: { bg: "bg-violet-500/10", text: "text-violet-600", label: "RFQ Submitted" },
  quote_received: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Quote Received" },
  proposal_ready: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Ready" },
  proposal_sent: { bg: "bg-primary/10", text: "text-primary", label: "Proposal Sent" },
  accepted: { bg: "bg-green-500/10", text: "text-green-600", label: "Accepted" },
  declined: { bg: "bg-destructive/10", text: "text-destructive", label: "Declined" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
}


function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"]
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}


// ─── Column definitions ───────────────────────────────────────────────────────

function SortHeader({ label, column }: { label: string; column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-semibold text-card-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1.5 h-3 w-3" />
    </Button>
  )
}

const COLUMN_LABELS: Record<string, string> = {
  clientName: "Client",
  isoName: "ISO",
  route: "Route",
  departureDate: "Date",
  passengers: "Pax",
  status: "Status",
}

function buildColumns(isManager: boolean): ColumnDef<FlightRequest>[] {
  const cols: ColumnDef<FlightRequest>[] = [
    {
      accessorKey: "clientName",
      header: ({ column }) => <SortHeader label="Client" column={column} />,
      cell: ({ row }) => (
        <span className="font-medium text-card-foreground">{row.getValue("clientName")}</span>
      ),
    },
  ]

  if (isManager) {
    cols.push({
      accessorKey: "isoName",
      header: ({ column }) => <SortHeader label="ISO" column={column} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("isoName")}</span>
      ),
    })
  }

  cols.push(
    {
      id: "route",
      // accessor includes both departure and arrival so text filter searches both
      accessorFn: (row) => `${row.departure} ${row.arrival}`,
      header: ({ column }) => <SortHeader label="Route" column={column} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.departure} &rarr; {row.original.arrival}
        </span>
      ),
    },
    {
      accessorKey: "departureDate",
      header: ({ column }) => <SortHeader label="Date" column={column} />,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.getValue("departureDate")}</span>
      ),
    },
    {
      accessorKey: "passengers",
      header: ({ column }) => <SortHeader label="Pax" column={column} />,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.getValue("passengers")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortHeader label="Status" column={column} />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      filterFn: (row, id, value: string) => {
        if (!value) return true
        return row.getValue(id) === value
      },
    },
  )

  return cols
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface FlightRequestDataTableProps {
  data: FlightRequest[]
  isManager: boolean
  onRowClick: (request: FlightRequest) => void
}

export function FlightRequestDataTable({ data, isManager, onRowClick }: FlightRequestDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "departureDate", desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns = useMemo(() => buildColumns(isManager), [isManager])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize: 15 } },
  })

  const statusFilterValue = (table.getColumn("status")?.getFilterValue() as string) ?? ""
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter client..."
          value={(table.getColumn("clientName")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("clientName")?.setFilterValue(e.target.value)}
          className="h-8 w-40 text-xs"
        />
        {isManager && (
          <Input
            placeholder="Filter ISO..."
            value={(table.getColumn("isoName")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("isoName")?.setFilterValue(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        )}
        <Input
          placeholder="Filter route..."
          value={(table.getColumn("route")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("route")?.setFilterValue(e.target.value)}
          className="h-8 w-40 text-xs"
        />
        <Select
          value={statusFilterValue || "all"}
          onValueChange={(v) => table.getColumn("status")?.setFilterValue(v === "all" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="rfq_submitted">RFQ Submitted</SelectItem>
            <SelectItem value="quote_received">Quote Received</SelectItem>
            <SelectItem value="proposal_ready">Proposal Ready</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredCount} result{filteredCount !== 1 ? "s" : ""}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Columns <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="text-sm"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {COLUMN_LABELS[col.id] ?? col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-16 text-center text-sm text-muted-foreground"
                >
                  No matching requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
