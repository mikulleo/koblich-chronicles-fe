"use client"

import { ColumnDef } from "@tanstack/react-table"
//import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

export interface Tag {
    name: string;
    color: string;
    description?: string | null;
    chartsCount?: number | null;
}

export interface Ticker {
    id: number;
    symbol: string;
    name: string;
    description?: string | null;
    sector?: string | null;
    profitLoss?: number | null;
    chartsCount?: number | null;
    tradesCount?: number | null;
    tags: Tag[];
    createdAt: string; // ISO date string
    updatedAt?: string; // ISO date string
  }

// Define the Trade interface
export interface Trade {
  id: string
  type: "long" | "short"
  ticker: Ticker
  entryDate: string
  entryPrice: number
  shares: number
  normalizationFactor?: number
  initialStopLoss: number
  currentPrice?: number
  status: "open" | "closed" | "partial"
  riskAmount?: number
  riskPercent?: number
  profitLossAmount?: number
  profitLossPercent?: number
  rRatio?: number
}

export const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: "type",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Type
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      const isLong = type === "long"
      
      return (
        <Badge 
          variant={isLong ? "default" : "destructive"}
          className={isLong ? "bg-green-600" : ""}
        >
          {type.toUpperCase()}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "ticker.symbol",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ticker
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "entryDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Buy Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("entryDate"))
      return format(date, "MMM d, yyyy")
    },
  },
  {
    accessorKey: "entryPrice",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Entry
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("entryPrice"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      
      return formatted
    },
  },
  {
    accessorKey: "normalizationFactor",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Size
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const size = row.getValue("normalizationFactor") as number
      return size ? `${Math.round(size * 100)}%` : "";
    },
  },
  {
    accessorKey: "initialStopLoss",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Init Stop Loss
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("initialStopLoss"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      
      return formatted
    },
  },
  {
    accessorKey: "riskPercent",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Position Risk
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const riskPercent = parseFloat(row.getValue("riskPercent") || "0")
      return `${riskPercent.toFixed(2)}%`
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          variant={status === 'open' ? 'outline' : status === 'closed' ? 'default' : 'secondary'}
        >
          {status.toUpperCase()}
        </Badge>
      )
    },
  },
]