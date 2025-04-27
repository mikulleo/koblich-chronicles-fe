import { Metadata } from "next";
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
        Track your trading performance metrics and analyze your trading strategy effectiveness.
      </p>
      
      <TradesTabView defaultTab="statistics" />
    </div>
  );
}