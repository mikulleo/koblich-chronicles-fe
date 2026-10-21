// src/components/trades/statistics-advanced.tsx
// Advanced Statistics: R analytics, results by position size and return distributions.
// Built from the per-trade rows of /trades/stats, so it follows every statistics filter.
// The page is public — nothing in this section shows dollar amounts.

"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsMetadata, StatsTrade } from "./trade-statistics";
import { AdvancedAnalyticsTab } from "./statistics-advanced-analytics";
import { AdvancedSizingTab } from "./statistics-advanced-sizing";
import { AdvancedDistributionTab } from "./statistics-advanced-distribution";
import { byCloseDate, toAdvancedTrade } from "@/lib/utils/advanced-stats";

interface StatisticsAdvancedProps {
  trades: StatsTrade[];
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsAdvanced({ trades, metadata, viewMode }: StatisticsAdvancedProps) {
  const [activeTab, setActiveTab] = useState("analytics");
  const isNormalized = viewMode === "normalized";

  const rows = useMemo(() => trades.map(toAdvancedTrade).sort(byCloseDate), [trades]);

  // An API that predates these stats returns only the P/L % fields
  const hasAdvancedFields = trades.some((t) => t.rRatio !== undefined);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Advanced Statistics
          <Badge variant="outline" className="bg-muted/50">
            {metadata.dateRange}
          </Badge>
          {isNormalized && (
            <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary">
              Normalized View
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Risk-based (R) analytics, results by position size and return distributions for the{" "}
          {rows.length} {metadata.statusFilter.toLowerCase()} trades in the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAdvancedFields ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Advanced statistics are not available yet — the statistics API does not return R-multiples and holding
              periods.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="sizing">Sizing</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <AdvancedAnalyticsTab rows={rows} />
            </TabsContent>
            <TabsContent value="sizing">
              <AdvancedSizingTab rows={rows} />
            </TabsContent>
            <TabsContent value="distribution">
              <AdvancedDistributionTab rows={rows} viewMode={viewMode} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
