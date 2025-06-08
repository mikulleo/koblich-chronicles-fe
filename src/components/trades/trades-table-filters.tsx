// src/components/trades/trades-table-filters.tsx

"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trade, Ticker } from "./columns"

export interface FilterState {
  type: string[]
  tickers: string[]
  dateRange: DateRange | undefined
  entryPriceRange: [number, number]
  sizeRange: [number, number]
  stopLossRange: [number, number]
  hasModifiedStops: boolean | null
  hasExits: boolean | null
  rRatioRange: [number, number]
  daysHeldRange: [number, number]
  status: string[]
}

interface FiltersProps {
  data: Trade[]
  onFiltersChange: (filters: FilterState) => void
  className?: string
}

export function TradeFilters({ data, onFiltersChange, className }: FiltersProps) {
  // Extract unique values from data for filter options
  const uniqueTickers = Array.from(
    new Set(data.map(trade => trade.ticker?.symbol).filter(Boolean))
  ).sort()
  
  const uniqueTickerOptions = Array.from(
    new Map(data.map(trade => trade.ticker?.symbol && trade.ticker ? [trade.ticker.symbol, trade.ticker] : null).filter((item): item is [string, Ticker] => item !== null))
  ).map(([, ticker]) => ticker)

  // Calculate ranges from data
  const entryPrices = data.map(trade => trade.entryPrice).filter(Boolean)
  const entryPriceMin = Math.min(...entryPrices)
  const entryPriceMax = Math.max(...entryPrices)

  const sizes = data.map(trade => (trade.normalizationFactor || 0) * 100).filter(Boolean)
  const sizeMin = Math.min(...sizes)
  const sizeMax = Math.max(...sizes)

  const stopLosses = data.map(trade => trade.initialStopLoss).filter(Boolean)
  const stopLossMin = Math.min(...stopLosses)
  const stopLossMax = Math.max(...stopLosses)

  const rRatios = data.map(trade => trade.rRatio).filter(r => r !== undefined && r !== null) as number[]
  const rRatioMin = rRatios.length > 0 ? Math.min(...rRatios) : -10
  const rRatioMax = rRatios.length > 0 ? Math.max(...rRatios) : 10

  // Calculate days held for range
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

  const daysHeldValues = data.map(calculateDaysHeld)
  const daysHeldMin = Math.min(...daysHeldValues)
  const daysHeldMax = Math.max(...daysHeldValues)

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    type: [],
    tickers: [],
    dateRange: undefined,
    entryPriceRange: [entryPriceMin, entryPriceMax],
    sizeRange: [sizeMin, sizeMax],
    stopLossRange: [stopLossMin, stopLossMax],
    hasModifiedStops: null,
    hasExits: null,
    rRatioRange: [rRatioMin, rRatioMax],
    daysHeldRange: [daysHeldMin, daysHeldMax],
    status: [],
  })

  // Update parent when filters change
  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      type: [],
      tickers: [],
      dateRange: undefined,
      entryPriceRange: [entryPriceMin, entryPriceMax],
      sizeRange: [sizeMin, sizeMax],
      stopLossRange: [stopLossMin, stopLossMax],
      hasModifiedStops: null,
      hasExits: null,
      rRatioRange: [rRatioMin, rRatioMax],
      daysHeldRange: [daysHeldMin, daysHeldMax],
      status: [],
    })
  }

  const hasActiveFilters = 
    filters.type.length > 0 ||
    filters.tickers.length > 0 ||
    filters.dateRange ||
    filters.entryPriceRange[0] !== entryPriceMin ||
    filters.entryPriceRange[1] !== entryPriceMax ||
    filters.sizeRange[0] !== sizeMin ||
    filters.sizeRange[1] !== sizeMax ||
    filters.stopLossRange[0] !== stopLossMin ||
    filters.stopLossRange[1] !== stopLossMax ||
    filters.hasModifiedStops !== null ||
    filters.hasExits !== null ||
    filters.rRatioRange[0] !== rRatioMin ||
    filters.rRatioRange[1] !== rRatioMax ||
    filters.daysHeldRange[0] !== daysHeldMin ||
    filters.daysHeldRange[1] !== daysHeldMax ||
    filters.status.length > 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type</Label>
          <MultiSelectFilter
            options={[
              { value: "long", label: "LONG" },
              { value: "short", label: "SHORT" }
            ]}
            selected={filters.type}
            onSelectionChange={(values) => updateFilter('type', values)}
            placeholder="Select type..."
          />
        </div>

        {/* Ticker Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ticker</Label>
          <MultiSelectFilter
            options={uniqueTickerOptions.map(ticker => ({
              value: ticker.symbol,
              label: ticker.symbol
            }))}
            selected={filters.tickers}
            onSelectionChange={(values) => updateFilter('tickers', values)}
            placeholder="Select tickers..."
          />
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Entry Date</Label>
          <DateRangePicker
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => updateFilter('dateRange', range)}
          />
        </div>

        {/* Entry Price Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Entry Price Range</Label>
          <RangeFilter
            min={entryPriceMin}
            max={entryPriceMax}
            step={0.01}
            value={filters.entryPriceRange}
            onValueChange={(value) => updateFilter('entryPriceRange', value as [number, number])}
            formatValue={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        {/* Size Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Position Size %</Label>
          <RangeFilter
            min={sizeMin}
            max={sizeMax}
            step={1}
            value={filters.sizeRange}
            onValueChange={(value) => updateFilter('sizeRange', value as [number, number])}
            formatValue={(value) => `${Math.round(value)}%`}
          />
        </div>

        {/* Stop Loss Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Initial Stop Loss Range</Label>
          <RangeFilter
            min={stopLossMin}
            max={stopLossMax}
            step={0.01}
            value={filters.stopLossRange}
            onValueChange={(value) => updateFilter('stopLossRange', value as [number, number])}
            formatValue={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        <Separator />

        {/* Boolean Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Has Modified Stops</Label>
            <BooleanFilter
              value={filters.hasModifiedStops}
              onValueChange={(value) => updateFilter('hasModifiedStops', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Has Exits</Label>
            <BooleanFilter
              value={filters.hasExits}
              onValueChange={(value) => updateFilter('hasExits', value)}
            />
          </div>
        </div>

        <Separator />

        {/* R-Ratio Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">R-Ratio Range</Label>
          <RangeFilter
            min={rRatioMin}
            max={rRatioMax}
            step={0.1}
            value={filters.rRatioRange}
            onValueChange={(value) => updateFilter('rRatioRange', value as [number, number])}
            formatValue={(value) => `${value.toFixed(1)}R`}
          />
        </div>

        {/* Days Held Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Days Held Range</Label>
          <RangeFilter
            min={daysHeldMin}
            max={daysHeldMax}
            step={1}
            value={filters.daysHeldRange}
            onValueChange={(value) => updateFilter('daysHeldRange', value as [number, number])}
            formatValue={(value) => `${Math.round(value)} days`}
          />
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <MultiSelectFilter
            options={[
              { value: "open", label: "OPEN" },
              { value: "partial", label: "PARTIAL" },
              { value: "closed", label: "CLOSED" }
            ]}
            selected={filters.status}
            onSelectionChange={(values) => updateFilter('status', values)}
            placeholder="Select status..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Multi-select filter component
interface MultiSelectFilterProps {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
}

function MultiSelectFilter({ options, selected, onSelectionChange, placeholder }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleSelection = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value]
    onSelectionChange(newSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected.length === 0 ? (
            placeholder || "Select options..."
          ) : (
            <div className="flex flex-wrap gap-1">
              {selected.slice(0, 2).map(value => (
                <Badge key={value} variant="secondary" className="text-xs">
                  {options.find(opt => opt.value === value)?.label || value}
                </Badge>
              ))}
              {selected.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{selected.length - 2} more
                </Badge>
              )}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder?.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleSelection(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Date range picker component
interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Range filter component
interface RangeFilterProps {
  min: number
  max: number
  step: number
  value: [number, number]
  onValueChange: (value: number[]) => void
  formatValue: (value: number) => string
}

function RangeFilter({ min, max, step, value, onValueChange, formatValue }: RangeFilterProps) {
  return (
    <div className="space-y-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  )
}

// Boolean filter component
interface BooleanFilterProps {
  value: boolean | null
  onValueChange: (value: boolean | null) => void
}

function BooleanFilter({ value, onValueChange }: BooleanFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={value === null ? "default" : "outline"}
        size="sm"
        onClick={() => onValueChange(null)}
      >
        All
      </Button>
      <Button
        variant={value === true ? "default" : "outline"}
        size="sm"
        onClick={() => onValueChange(true)}
      >
        Yes
      </Button>
      <Button
        variant={value === false ? "default" : "outline"}
        size="sm"
        onClick={() => onValueChange(false)}
      >
        No
      </Button>
    </div>
  )
}