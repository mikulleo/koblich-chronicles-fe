"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChartDateRangeProps {
  dateRange: DateRange | undefined
  onDateRangeChangeAction: (range: DateRange | undefined) => void
}

export function ChartDateRange({ dateRange, onDateRangeChangeAction }: ChartDateRangeProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Date Range</label>
      <div className="grid gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "justify-start text-left font-normal",
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
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChangeAction}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        {dateRange && (
          <button 
            className="text-xs text-muted-foreground underline"
            onClick={() => onDateRangeChangeAction(undefined)}
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  )
}