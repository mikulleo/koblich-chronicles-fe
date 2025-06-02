// src/app/(frontend)/trades/page.tsx
import { Metadata } from "next";
import { ListFilter, Target, BarChart3 } from "lucide-react";
import { TradesTabView } from "@/components/trades/trades-tab-view";

export const metadata: Metadata = {
  title: "Trades | Koblich Chronicles",
  description: "View and analyze your stock trades with exposure management and performance metrics",
};

export default function TradesPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive trading management with trade logs, position exposure visualization, and performance analytics.
        </p>
      </div>
      
      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Trade Log
          </h3>
          <p className="text-sm text-muted-foreground">
            Complete history of all trades with filtering, sorting, and detailed view options.
          </p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Exposure Buckets
          </h3>
          <p className="text-sm text-muted-foreground">
            Visual position exposure management across 4 buckets.
          </p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance analytics including win rates, R-ratios, and time-based filtering.
          </p>
        </div>
      </div>
      
      <TradesTabView defaultTab="log" />
    </div>
  );
}