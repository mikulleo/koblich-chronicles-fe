// src/components/trades/statistics-advanced-ui.tsx
// Small building blocks shared by the Advanced Statistics tabs.

"use client";

import React from "react";
import { InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Stat tile in the same style as the Performance Summary cards. */
export function MetricTile({
  title,
  value,
  sub,
  info,
  valueClassName,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  info?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-5">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
          {title}
          {info && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{info}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h4>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/** Explanation box, same look as the radar chart explanation. */
export function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 p-4 rounded-md">
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

/** A chart block: title, one-line description, then the chart. */
export function ChartBlock({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h4 className="text-sm font-semibold">{title}</h4>
      {description && <p className="text-xs text-muted-foreground mt-0.5 mb-3">{description}</p>}
      {children}
    </div>
  );
}

export function SmallSample() {
  return (
    <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/50">
      small sample
    </Badge>
  );
}

/** Horizontal bar growing left (negative) or right (positive) from a center line. */
export function DivergingBar({ value, max, label }: { value: number | null; max: number; label: string }) {
  const width = value == null || max <= 0 ? 0 : Math.min(50, (Math.abs(value) / max) * 50);
  const positive = (value ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2 min-w-[150px]">
      <div className="relative h-2 flex-1 rounded-full bg-muted">
        <div className="absolute inset-y-[-2px] left-1/2 w-px bg-muted-foreground/40" />
        <div
          className={cn("absolute inset-y-0 rounded-full", positive ? "bg-green-500" : "bg-red-500")}
          style={positive ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
        />
      </div>
      <span
        className={cn(
          "w-16 text-right font-mono text-xs tabular-nums",
          value == null ? "text-muted-foreground" : positive ? "text-green-600 dark:text-green-500" : "text-red-500",
        )}
      >
        {label}
      </span>
    </div>
  );
}
