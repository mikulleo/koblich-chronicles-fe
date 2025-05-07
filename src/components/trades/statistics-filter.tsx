"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { CalendarIcon, InfoIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatsFilters } from "./trade-statistics";
import apiClient from "@/lib/api/client";
import { Ticker } from "@/lib/types";

interface StatisticsFiltersProps {
  filters: StatsFilters;
  onFilterChange: (filters: Partial<StatsFilters>) => void;
}

export function StatisticsFilters({ filters, onFilterChange }: StatisticsFiltersProps) {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.startDate ? new Date(filters.startDate) : undefined,
    to: filters.endDate ? new Date(filters.endDate) : undefined,
  });

  // Fetch tickers for dropdown
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/tickers");
        if (response.data && response.data.docs) {
          setTickers(response.data.docs);
        }
      } catch (error) {
        console.error("Error fetching tickers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
  }, []);

  // Initialize dateRange when filters change (only if coming from external source)
  useEffect(() => {
    // Only update local state if the date values actually changed and are not undefined
    const newFromDate = filters.startDate ? new Date(filters.startDate) : undefined;
    const newToDate = filters.endDate ? new Date(filters.endDate) : undefined;
    
    const currentFromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
    const currentToStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
    
    // Check if we need to update our local state based on props
    if (
      (filters.startDate !== currentFromStr || filters.endDate !== currentToStr) &&
      (filters.startDate || filters.endDate)
    ) {
      setDateRange({
        from: newFromDate,
        to: newToDate,
      });
    }
  }, [filters.startDate, filters.endDate]);

  // Handle time period change
  const handleTimePeriodChange = (value: string) => {
    onFilterChange({ 
      timePeriod: value as StatsFilters["timePeriod"],
      // Clear custom date range if not in custom mode
      ...(value !== "custom" && { startDate: undefined, endDate: undefined })
    });
  };

  // Handle date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    setDateRange({ from: range.from, to: range.to });
    
    // Only update parent if we have both dates
    if (range.from && range.to) {
      onFilterChange({
        startDate: format(range.from, "yyyy-MM-dd"),
        endDate: format(range.to, "yyyy-MM-dd"),
      });
    }
  };

  return (
    <Card className="bg-card/60">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Time Period Filter */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <label htmlFor="time-period" className="text-sm font-medium">
                Time Period
              </label>
            </div>
            <Select
              value={filters.timePeriod}
              onValueChange={handleTimePeriodChange}
            >
              <SelectTrigger id="time-period">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.timePeriod === "custom" && (
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
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
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Ticker Filter */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <label htmlFor="ticker-filter" className="text-sm font-medium">
                Ticker
              </label>
            </div>
            <Select
              value={filters.tickerId || ""}
              onValueChange={(value) =>
                onFilterChange({ tickerId: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger id="ticker-filter">
                <SelectValue placeholder="All Tickers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickers</SelectItem>
                {tickers
                    .sort((a, b) => a.symbol.localeCompare(b.symbol))
                    .map((ticker) => (
                    <SelectItem key={ticker.id} value={ticker.id.toString()}>
                        {ticker.symbol}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Trade Status
              </label>
            </div>
            <Select
              value={filters.statusFilter}
              onValueChange={(value) =>
                onFilterChange({
                  statusFilter: value as StatsFilters["statusFilter"],
                })
              }
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Closed & Partial</SelectItem>
                <SelectItem value="closed-only">Closed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1">
              <label htmlFor="view-mode" className="text-sm font-medium">
                View Mode
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      <strong>Normalized view</strong> adjusts metrics to what they would be if all trades were taken with a full position size. Half-sized positions count as half the impact on overall metrics, while double-sized positions count double.
                    </p>
                    <p className="mt-1">
                      Example: A half position (50%) with 10% profit becomes 5% in normalized view. A double position (200%) with 3% loss becomes 6% loss normalized.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      "Full position" is defined as 25% of equity.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={filters.viewMode}
              onValueChange={(value) =>
                onFilterChange({
                  viewMode: value as StatsFilters["viewMode"],
                })
              }
            >
              <SelectTrigger id="view-mode">
                <SelectValue placeholder="Select view mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="normalized">Normalized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // Re-apply current filters to trigger data refresh
              onFilterChange({ ...filters });
            }}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}