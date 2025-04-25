"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

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

interface ChartTickerSelectorProps {
  tickers: Ticker[]
  selectedTickers: string[]
  onSelectTickerAction: (selectedTickers: string[]) => void
}

export function ChartTickerSelector({ 
  tickers, 
  selectedTickers, 
  onSelectTickerAction 
}: ChartTickerSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const toggleTicker = (tickerId: string) => {
    if (selectedTickers.includes(tickerId)) {
      onSelectTickerAction(selectedTickers.filter(id => id !== tickerId))
    } else {
      onSelectTickerAction([...selectedTickers, tickerId])
    }
  }

  const clearAll = () => {
    onSelectTickerAction([])
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Tickers</label>
      <div className="flex flex-col gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              {selectedTickers.length > 0
                ? `${selectedTickers.length} ticker${selectedTickers.length > 1 ? 's' : ''} selected`
                : "Select tickers..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search tickers..." />
              <CommandEmpty>No ticker found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {tickers.map((ticker) => (
                  <CommandItem
                    key={ticker.id}
                    value={ticker.symbol}
                    onSelect={() => toggleTicker(ticker.id.toString())}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTickers.includes(ticker.id.toString()) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-bold">{ticker.symbol}</span>
                    <span className="ml-2 text-muted-foreground">{ticker.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedTickers.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            {selectedTickers.map((tickerId) => {
              const ticker = tickers.find(t => t.id.toString() === tickerId)
              return ticker ? (
                <Badge 
                  key={ticker.id}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {ticker.symbol}
                  <button 
                    className="ml-1 rounded-full hover:bg-accent h-3 w-3 inline-flex items-center justify-center"
                    onClick={() => toggleTicker(ticker.id.toString())}
                  >
                    <span className="sr-only">Remove</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </Badge>
              ) : null
            })}
            <button 
              className="text-xs text-muted-foreground underline"
              onClick={clearAll}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}