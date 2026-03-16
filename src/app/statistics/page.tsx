import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { TradesTabView } from "@/components/trades/trades-tab-view";

export const metadata: Metadata = {
  title: "Trading Statistics | Koblich Chronicles",
  description: "Track and analyze your trading performance with detailed statistics",
};

export default function StatisticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Trading Statistics</h1>
      <p className="text-muted-foreground mb-8">
        View the trading performance metrics and trading strategy effectiveness analytics.
      </p>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading statistics...</span>
        </div>
      }>
        <TradesTabView defaultTab="statistics" />
      </Suspense>
    </div>
  );
}
