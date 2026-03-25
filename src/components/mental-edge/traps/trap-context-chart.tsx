"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CheckInTrends } from "@/lib/types";

interface TrapContextChartProps {
  trends: CheckInTrends["trends"];
}

export function TrapContextChart({ trends }: TrapContextChartProps) {
  // Cross-reference: when traps occur, what context flags are present?
  const contextTrapMap: Record<string, Record<string, number>> = {};

  for (const day of trends) {
    if (day.traps.length === 0) continue;
    for (const flag of day.contextFlags) {
      if (!contextTrapMap[flag]) contextTrapMap[flag] = {};
      for (const trap of day.traps) {
        contextTrapMap[flag][trap] = (contextTrapMap[flag][trap] || 0) + 1;
      }
    }
  }

  const contextEntries = Object.entries(contextTrapMap)
    .map(([context, traps]) => ({
      context: context.replace(/_/g, " "),
      traps: Object.entries(traps)
        .sort((a, b) => b[1] - a[1])
        .map(([trap, count]) => ({ trap: trap.replace(/_/g, " "), count })),
      totalTraps: Object.values(traps).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.totalTraps - a.totalTraps);

  if (contextEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Traps by Context</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          Not enough data to show context-trap correlations
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">When Do Traps Occur?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contextEntries.slice(0, 6).map((entry) => (
            <div key={entry.context} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{entry.context}</span>
                <Badge variant="outline">{entry.totalTraps} traps</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {entry.traps.map((trap) => (
                  <Badge key={trap.trap} variant="secondary" className="text-xs">
                    {trap.trap} ({trap.count})
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
