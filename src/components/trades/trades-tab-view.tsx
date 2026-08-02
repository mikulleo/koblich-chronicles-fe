// src/components/trades/trades-tab-view.tsx
"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListFilter, BarChart3, Target } from "lucide-react";
import { TradesTable } from "@/components/trades/trades-table";
import { TradeStatistics } from "@/components/trades/trade-statistics";
import { ExposureBuckets } from "@/components/trades/exposure-buckets";
import { useAnalytics } from "@/hooks/use-analytics";

interface TradesTabViewProps {
  defaultTab?: "log" | "statistics" | "exposure";
}

export function TradesTabView({ defaultTab = "log" }: TradesTabViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { trackTabView } = useAnalytics();

  // These tabs are three distinct products behind one URL, so without this the
  // exposure and statistics views are invisible in page reports.
  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);
    trackTabView({ area: "trades", tab: value });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
          {activeTab === "log" && <TradesTable />}
        </div>
      </TabsContent>

      <TabsContent value="exposure" className="mt-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Position Exposure Management</h2>
            <p className="text-muted-foreground text-sm mb-4">
              How much of your equity is deployed across open positions. Bucket 1 represents
              100% of your equity; the remaining buckets only start filling when trading on margin.
            </p>
          </div>
          {activeTab === "exposure" && <ExposureBuckets />}
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
          {activeTab === "statistics" && <TradeStatistics />}
        </div>
      </TabsContent>
    </Tabs>
  );
}
