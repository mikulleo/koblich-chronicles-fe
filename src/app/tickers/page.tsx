import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { TickersShowcase } from "@/components/tickers/tickers-showcase";

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

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading tickers...</span>
        </div>
      }>
        <TickersShowcase />
      </Suspense>
    </div>
  );
}
