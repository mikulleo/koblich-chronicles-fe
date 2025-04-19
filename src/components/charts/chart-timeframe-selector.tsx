"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'intraday' | 'other'

const timeframes: {
  value: Timeframe
  label: string
}[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'intraday', label: 'Intraday' },
  { value: 'other', label: 'Other' },
]

interface ChartTimeframeSelectorProps {
  selectedTimeframes: Timeframe[]
  onTimeframeChangeAction: (timeframes: Timeframe[]) => void
}

export function ChartTimeframeSelector({
  selectedTimeframes,
  onTimeframeChangeAction,
}: ChartTimeframeSelectorProps) {
  const toggleTimeframe = (timeframe: Timeframe) => {
    if (selectedTimeframes.includes(timeframe)) {
      onTimeframeChangeAction(selectedTimeframes.filter(t => t !== timeframe))
    } else {
      onTimeframeChangeAction([...selectedTimeframes, timeframe])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Timeframes</label>
      <div className="flex flex-wrap gap-2">
        {timeframes.map((timeframe) => (
          <Button
            key={timeframe.value}
            variant={selectedTimeframes.includes(timeframe.value) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTimeframe(timeframe.value)}
            className={cn(
              selectedTimeframes.includes(timeframe.value) 
                ? "bg-primary text-primary-foreground" 
                : "bg-background text-foreground"
            )}
          >
            {timeframe.label}
          </Button>
        ))}
      </div>
    </div>
  )
}