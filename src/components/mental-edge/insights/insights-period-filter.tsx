"use client";

import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INSIGHT_PERIOD_OPTIONS,
  type CustomRange,
  type InsightPeriodId,
} from "@/lib/mental-edge/insight-period";

interface InsightsPeriodFilterProps {
  period: InsightPeriodId;
  customRange: CustomRange;
  onPeriodChange: (period: InsightPeriodId) => void;
  onCustomRangeChange: (range: CustomRange) => void;
  /** Dims the control while the dashboard refetches for the new window. */
  busy?: boolean;
}

export function InsightsPeriodFilter({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
  busy = false,
}: InsightsPeriodFilterProps) {
  const handleSelect = (range: DateRange | undefined) => {
    onCustomRangeChange({ from: range?.from, to: range?.to });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={period}
        onValueChange={(value) => onPeriodChange(value as InsightPeriodId)}
      >
        <SelectTrigger
          id="insights-period"
          aria-label="Analysis period"
          className="w-full sm:w-[190px]"
        >
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {INSIGHT_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal sm:w-auto"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange.from ? (
                customRange.to ? (
                  <>
                    {format(customRange.from, "LLL dd, y")} -{" "}
                    {format(customRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(customRange.from, "LLL dd, y")
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
              defaultMonth={customRange.from}
              selected={{ from: customRange.from, to: customRange.to }}
              onSelect={handleSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      {busy && (
        <span className="text-xs text-muted-foreground">Updating…</span>
      )}
    </div>
  );
}
