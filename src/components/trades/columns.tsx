"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, AlertTriangle, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

// Define the modified stop type
export interface ModifiedStop {
  price: number;
  date: string;
  notes?: string;
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
  modifiedStops?: ModifiedStop[];
}

// Component to render the modified stops modal
const ModifiedStopsModal = ({ 
  isOpen, 
  setIsOpen, 
  modifiedStops, 
  tradeType, 
  initialStop 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void; 
  modifiedStops: ModifiedStop[]; 
  tradeType: "long" | "short";
  initialStop: number;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modified Stop Levels</DialogTitle>
          <DialogDescription>
            Stop loss modifications for this trade, from most recent to oldest.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground mb-2">
            <div>Date</div>
            <div>Price</div>
            <div>Change</div>
          </div>
          
          {/* Initial stop reference */}
          <div className="grid grid-cols-3 text-sm items-center border-b pb-2">
            <div>Initial</div>
            <div className="font-mono">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(initialStop)}
            </div>
            <div>—</div>
          </div>
          
          {/* Display all modified stops */}
          {modifiedStops.map((stop, index) => {
            // Calculate percent change from initial stop
            const percentChange = ((stop.price - initialStop) / initialStop) * 100;
            // Determine if the change is favorable (tighter stop for longs, looser for shorts)
            const isPositiveChange = (tradeType === "long" && stop.price > initialStop) || 
                                    (tradeType === "short" && stop.price < initialStop);
            
            return (
              <div key={index} className="grid grid-cols-3 text-sm items-center">
                <div>{format(parseISO(stop.date), "MMM d, yyyy")}</div>
                <div className="font-mono">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(stop.price)}
                </div>
                <div className={isPositiveChange ? "text-green-600" : "text-red-600"}>
                  {percentChange > 0 ? "+" : ""}{percentChange.toFixed(2)}%
                </div>
                {stop.notes && (
                  <div className="col-span-3 mt-1 text-xs text-muted-foreground">
                    {stop.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Cell renderer for the modified stops column
const ModifiedStopsCell = ({ row }: { row: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const trade = row.original;
  const hasModifiedStops = trade.modifiedStops && trade.modifiedStops.length > 0;
  
  // Handler to prevent event propagation to the row
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };
  
  if (!hasModifiedStops) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // Prevent row click
            >
              <div className="bg-muted text-muted-foreground rounded-full p-1">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No stop modifications</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 rounded-full bg-amber-100 border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:border-amber-800 dark:hover:bg-amber-900" 
              onClick={handleClick}
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-1" />
              <span className="text-amber-700 dark:text-amber-300 text-xs font-medium">
                {trade.modifiedStops.length}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{trade.modifiedStops.length} stop modification{trade.modifiedStops.length > 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <ModifiedStopsModal 
        isOpen={isModalOpen} 
        setIsOpen={setIsModalOpen} 
        modifiedStops={trade.modifiedStops} 
        tradeType={trade.type}
        initialStop={trade.initialStopLoss}
      />
    </>
  );
};

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
  // New column for Modified Stops
  {
    id: "modifiedStops",
    header: "Mod-Stops",
    cell: ModifiedStopsCell
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