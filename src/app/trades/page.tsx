import { Metadata } from "next";
import { TradesTabView } from "@/components/trades/trades-tab-view";

export const metadata: Metadata = {
  title: "Trades | Koblich Chronicles",
  description: "View and analyze your stock trades",
};

export default function TradesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Trades</h1>
      <p className="text-muted-foreground mb-8">
        View the trading history with basic performance metrics.
      </p>
      
      <TradesTabView defaultTab="log" />
    </div>
  );
}