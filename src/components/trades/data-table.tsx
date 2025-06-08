// src/components/trades/data-table.tsx

"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trade } from "./columns"
import { FilterState } from "./trades-table-filters"
import { isWithinInterval, parseISO } from "date-fns"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClickAction?: (row: TData) => void
  filters?: FilterState
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  activeFiltersCount?: number
}

export function DataTable<TData extends Trade, TValue>({
  columns,
  data,
  onRowClickAction,
  filters,
  showFilters,
  setShowFilters,
  activeFiltersCount,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  

  // Apply custom filters to data
  const filteredData = React.useMemo(() => {
    if (!filters) return data

    return data.filter((trade) => {
      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(trade.type)) {
        return false
      }

      // Ticker filter
      if (filters.tickers.length > 0 && !filters.tickers.includes(trade.ticker?.symbol || '')) {
        return false
      }

      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const tradeDate = parseISO(trade.entryDate)
        if (filters.dateRange.from && filters.dateRange.to) {
          if (!isWithinInterval(tradeDate, { 
            start: filters.dateRange.from, 
            end: filters.dateRange.to 
          })) {
            return false
          }
        } else if (filters.dateRange.from) {
          if (tradeDate < filters.dateRange.from) {
            return false
          }
        } else if (filters.dateRange.to) {
          if (tradeDate > filters.dateRange.to) {
            return false
          }
        }
      }

      // Entry price range filter
      if (trade.entryPrice < filters.entryPriceRange[0] || 
          trade.entryPrice > filters.entryPriceRange[1]) {
        return false
      }

      // Size range filter (convert normalization factor to percentage)
      const sizePercent = (trade.normalizationFactor || 0) * 100
      if (sizePercent < filters.sizeRange[0] || sizePercent > filters.sizeRange[1]) {
        return false
      }

      // Stop loss range filter
      if (trade.initialStopLoss < filters.stopLossRange[0] || 
          trade.initialStopLoss > filters.stopLossRange[1]) {
        return false
      }

      // Modified stops filter
      if (filters.hasModifiedStops !== null) {
        const hasModifiedStops = trade.modifiedStops && trade.modifiedStops.length > 0
        if (filters.hasModifiedStops !== hasModifiedStops) {
          return false
        }
      }

      // Exits filter
      if (filters.hasExits !== null) {
        const hasExits = trade.exits && trade.exits.length > 0
        if (filters.hasExits !== hasExits) {
          return false
        }
      }

      // R-Ratio filter (only for trades with R-Ratio values)
      if (trade.rRatio !== undefined && trade.rRatio !== null) {
        if (trade.rRatio < filters.rRatioRange[0] || trade.rRatio > filters.rRatioRange[1]) {
          return false
        }
      }

      // Days held filter
      const calculateDaysHeld = (trade: Trade): number => {
        const entryDate = new Date(trade.entryDate)
        let endDate: Date
        
        if (trade.status === 'closed' && trade.exits && trade.exits.length > 0) {
          endDate = trade.exits.reduce((latest, exit) => {
            const exitDate = new Date(exit.date)
            return exitDate > latest ? exitDate : latest
          }, new Date(0))
        } else {
          endDate = new Date()
        }
        
        const diffTime = Math.abs(endDate.getTime() - entryDate.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      const daysHeld = calculateDaysHeld(trade)
      if (daysHeld < filters.daysHeldRange[0] || daysHeld > filters.daysHeldRange[1]) {
        return false
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(trade.status)) {
        return false
      }

      return true
    })
  }, [data, filters])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  const handleRowClick = (row: TData) => {
    if (onRowClickAction) {
      onRowClickAction(row)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all trades..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        
        {/* Filter Toggle */}
        <div className="flex items-center gap-3">
          {(activeFiltersCount || 0) > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </Badge>
          )}
          
          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950"
            }
          >
            {showFilters ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Hide Filters
              </>
            ) : (
              <>
                <Filter className="mr-2 h-4 w-4" />
                Column Filters
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} trade{data.length !== 1 ? 's' : ''}
          {filteredData.length !== data.length && ' (filtered)'}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClickAction ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {filteredData.length === 0 && data.length > 0 
                    ? "No trades match your filters."
                    : "No trades found."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}