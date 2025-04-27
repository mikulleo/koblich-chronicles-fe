"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListFilter, BarChart3 } from "lucide-react";
import { TradesTable } from "@/components/trades/trades-table";
import { TradeStatistics } from "@/components/trades/trade-statistics";

interface TradesTabViewProps {
  defaultTab?: "log" | "statistics";
}

export function TradesTabView({ defaultTab = "log" }: TradesTabViewProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        <TabsTrigger value="log" className="flex items-center gap-2">
          <ListFilter className="h-4 w-4" />
          Trades Log
        </TabsTrigger>
        <TabsTrigger value="statistics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Trade Statistics
        </TabsTrigger>
      </TabsList>
      <TabsContent value="log" className="mt-6">
        <TradesTable />
      </TabsContent>
      <TabsContent value="statistics" className="mt-6">
        <TradeStatistics />
      </TabsContent>
    </Tabs>
  );
}