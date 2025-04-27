"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, AlertTriangle, PackageOpen, XCircle, CheckCircle } from "lucide-react"
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
import { TradeExitDetails, TradeExit } from "./trade-exit-details"

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
  exits?: TradeExit[];
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
              <div className="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 rounded-full p-1">
                <XCircle className="h-5 w-5" />
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
              className="h-8 rounded-full bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900" 
              onClick={handleClick}
            >
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
              <span className="text-green-700 dark:text-green-300 text-xs font-medium">
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

// Cell renderer for the exits column
const ExitsCell = ({ row }: { row: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const trade = row.original;
  const hasExits = trade.exits && trade.exits.length > 0;
  
  // Handler to prevent event propagation to the row
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };
  
  if (!hasExits) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // Prevent row click
            >
              <div className="bg-muted text-muted-foreground rounded-full p-1">
                <PackageOpen className="h-5 w-5" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No exits recorded</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Calculate total shares exited
  const totalExitedShares = trade.exits.reduce((sum: number, exit: any) => sum + exit.shares, 0);
  const percentClosed = (totalExitedShares / trade.shares) * 100;
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 rounded-full bg-blue-100 border-blue-300 hover:bg-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:hover:bg-blue-900" 
              onClick={handleClick}
            >
              <PackageOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-1" />
              <span className="text-blue-700 dark:text-blue-300 text-xs font-medium">
                {trade.exits.length}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{percentClosed.toFixed(0)}% closed ({trade.exits.length} exit{trade.exits.length > 1 ? 's' : ''})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TradeExitDetails
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        exits={trade.exits}
        totalShares={trade.shares}
        tickerId={trade.ticker.id}
        entryPrice={trade.entryPrice}
        profitLossPercent={trade.profitLossPercent}
        tradeType={trade.type}
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
  // Modified Stops column
  {
    id: "modifiedStops",
    header: "Mod-Stops",
    cell: ModifiedStopsCell
  },
  // Exits column
  {
    id: "exits",
    header: "Exits",
    cell: ExitsCell
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
    accessorKey: "rRatio",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        R-Ratio
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const trade = row.original
      const rRatio = trade.rRatio
      
      // Only show for closed or partially closed trades
      if (trade.status === 'open' || rRatio === undefined) {
        return "—"
      }
      
      // Format to 2 decimal places and add a + sign for positive values
      const formattedRRatio = rRatio >= 0 
        ? `+${rRatio.toFixed(2)}R` 
        : `${rRatio.toFixed(2)}R`
      
      return (
        <span className={rRatio >= 0 ? "text-green-600" : "text-red-600"}>
          {formattedRRatio}
        </span>
      )
    },
  },
  // Profit/Loss Percentage column (commented out for now, but kept for future use)
  /*
  {
    accessorKey: "profitLossPercent",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        P/L %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const trade = row.original
      const plPercent = trade.profitLossPercent
      
      // Only show for closed or partially closed trades
      if (trade.status === 'open' || plPercent === undefined) {
        return "—"
      }
      
      // Format with + sign for positive values
      const formattedPL = plPercent >= 0 
        ? `+${plPercent.toFixed(2)}%` 
        : `${plPercent.toFixed(2)}%`
      
      return (
        <span className={plPercent >= 0 ? "text-green-600" : "text-red-600"}>
          {formattedPL}
        </span>
      )
    },
  },
  */
  {
    id: "daysHeld",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Days Held
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const trade = row.original
      
      // For closed trades: entry date to last exit
      // For partial/open trades: entry date to today
      const entryDate = new Date(trade.entryDate)
      let endDate: Date
      
      if (trade.status === 'closed' && trade.exits && trade.exits.length > 0) {
        // Find the date of the last exit for closed trades
        endDate = trade.exits.reduce((latest, exit) => {
          const exitDate = new Date(exit.date)
          return exitDate > latest ? exitDate : latest
        }, new Date(0))
      } else {
        // Use today's date for open or partially closed trades
        endDate = new Date()
      }
      
      // Calculate days held
      const diffTime = Math.abs(endDate.getTime() - entryDate.getTime())
      const daysHeld = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return daysHeld || 0
    },
    sortingFn: (rowA, rowB) => {
      // Custom sorting function for days held
      const getEndDate = (trade: Trade) => {
        if (trade.status === 'closed' && trade.exits && trade.exits.length > 0) {
          return trade.exits.reduce((latest, exit) => {
            const exitDate = new Date(exit.date)
            return exitDate > latest ? exitDate : latest
          }, new Date(0))
        }
        return new Date()
      }
      
      const entryDateA = new Date(rowA.original.entryDate)
      const entryDateB = new Date(rowB.original.entryDate)
      const endDateA = getEndDate(rowA.original)
      const endDateB = getEndDate(rowB.original)
      
      const daysHeldA = Math.ceil(Math.abs(endDateA.getTime() - entryDateA.getTime()) / (1000 * 60 * 60 * 24))
      const daysHeldB = Math.ceil(Math.abs(endDateB.getTime() - entryDateB.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysHeldA - daysHeldB
    }
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