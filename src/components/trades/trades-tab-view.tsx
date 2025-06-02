// src/components/trades/trades-tab-view.tsx
"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListFilter, BarChart3, Target } from "lucide-react";
import { TradesTable } from "@/components/trades/trades-table";
import { TradeStatistics } from "@/components/trades/trade-statistics";
import { ExposureBuckets } from "@/components/trades/exposure-buckets";

interface TradesTabViewProps {
  defaultTab?: "log" | "statistics" | "exposure";
}

export function TradesTabView({ defaultTab = "log" }: TradesTabViewProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="log" className="flex items-center gap-2">
          <ListFilter className="h-4 w-4" />
          Trades Log
        </TabsTrigger>
        <TabsTrigger value="exposure" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Exposure Buckets
        </TabsTrigger>
        <TabsTrigger value="statistics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Statistics
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="log" className="mt-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Trade Log</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Complete history of all trades with detailed metrics and performance data.
            </p>
          </div>
          <TradesTable />
        </div>
      </TabsContent>
      
      <TabsContent value="exposure" className="mt-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Position Exposure Management</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Visual representation of current position exposure across organized buckets. 
              Standard target: 400% total exposure = 100% of equity, distributed across 4 buckets (100% each).
            </p>
          </div>
          <ExposureBuckets />
        </div>
      </TabsContent>
      
      <TabsContent value="statistics" className="mt-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Trading Performance Analysis</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Comprehensive statistics and performance metrics for all completed and partial trades.
            </p>
          </div>
          <TradeStatistics />
        </div>
      </TabsContent>
    </Tabs>
  );
}