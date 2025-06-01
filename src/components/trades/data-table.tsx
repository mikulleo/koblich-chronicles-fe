// src/components/trades/data-table.tsx
"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"
import * as React from "react"
import { useState, useEffect } from 'react';


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartLine } from "lucide-react"
import { useAnalytics } from '@/hooks/use-analytics'


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClickAction?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClickAction,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [rowSelection, setRowSelection] = useState({});

  // Use our analytics hook
  const analytics = useAnalytics();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  // Track filtering and sorting actions
  useEffect(() => {
    if (sorting.length > 0) {
      analytics.trackEvent('trade_table_sorted', {
        column: sorting[0].id,
        direction: sorting[0].desc ? 'descending' : 'ascending',
      });
    }
  }, [sorting, analytics]);

  useEffect(() => {
    if (columnFilters.length > 0) {
      columnFilters.forEach(filter => {
        analytics.trackEvent('trade_table_filtered', {
          column: filter.id,
          value: String(filter.value),
        });
      });
    }
  }, [columnFilters, analytics]);

  // Enhanced row click handler with analytics
  const handleRowClick = (row: TData) => {
    if (onRowClickAction) {
      // Get trade information for analytics
      const tradeInfo = row as any; // Using any for simplicity
      
      analytics.trackTradeView(
        String(tradeInfo.id || 'unknown'),
        typeof tradeInfo.ticker === 'object' ? tradeInfo.ticker.symbol : String(tradeInfo.ticker || 'unknown'),
        tradeInfo.type || 'unknown'
      );
      
      // Additional details for enhanced analytics
      analytics.trackEvent('trade_row_clicked', {
        trade_id: tradeInfo.id,
        ticker: typeof tradeInfo.ticker === 'object' ? tradeInfo.ticker.symbol : tradeInfo.ticker,
        status: tradeInfo.status,
        profit_loss: tradeInfo.profitLossAmount,
        profit_loss_percent: tradeInfo.profitLossPercent,
        r_ratio: tradeInfo.rRatio,
        days_held: tradeInfo.daysHeld,
      });
      
      onRowClickAction(row);
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
                {onRowClickAction && (
                  <TableHead className="w-14 text-right">Charts</TableHead>
                )}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  // Removed the onClick handler for the entire row
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  {onRowClickAction && (
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 py-0 flex items-center gap-1"
                        onClick={() => onRowClickAction(row.original)}
                      >
                        <ChartLine className="h-4 w-4" />
                        <span className="text-xs">View</span>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (onRowClickAction ? 1 : 0)} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        <div className="flex items-center space-x-2">
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