import { TickersShowcase } from "@/components/tickers/tickers-showcase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Tickers | Koblich Chronicles",
  description: "Browse all stock tickers and their associated charts and trades",
};

export default function TickersPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Stock Tickers</h1>
      <p className="text-muted-foreground mb-8">
        Browse all tickers in the library. View associated charts and trades for any ticker.
      </p>
      
      <TickersShowcase />
    </div>
  );
}