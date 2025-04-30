"use client"

import React from 'react';
import { Ticker } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart, ListFilter } from "lucide-react";
import { useAnalytics } from '@/hooks/use-analytics'


interface TickerWithData extends Ticker {
  tradesCount: number;
  chartsCount: number;
}

interface TickerCardProps {
  ticker: TickerWithData;
  onShowCharts: (tickerId: string) => void;
  onShowTrades: (ticker: TickerWithData) => void;
}

const TickerCard: React.FC<TickerCardProps> = ({ ticker, onShowCharts, onShowTrades }) => {
  // Use our analytics hook
  const analytics = useAnalytics();

  // Enhanced handler for showing charts with analytics
  const handleShowCharts = () => {
    // Track ticker selection for charts view
    analytics.trackTickerSelect(ticker.symbol);
    analytics.trackEvent('ticker_charts_view', {
      ticker_id: ticker.id,
      ticker_symbol: ticker.symbol,
      charts_count: ticker.chartsCount,
      sector: ticker.sector || 'unknown',
      has_tags: (ticker.tags && ticker.tags.length > 0) ? true : false
    });
    
    onShowCharts(ticker.id.toString());
  };

  // Enhanced handler for showing trades with analytics
  const handleShowTrades = () => {
    // Track ticker selection for trades view
    analytics.trackEvent('ticker_trades_view', {
      ticker_id: ticker.id,
      ticker_symbol: ticker.symbol,
      trades_count: ticker.tradesCount,
      sector: ticker.sector || 'unknown',
      profit_loss: ticker.profitLoss || 0
    });
    
    onShowTrades(ticker);
  };

  /*
  // Track ticker card impression (you could use this with Intersection Observer for more accurate data)
  React.useEffect(() => {
    analytics.trackEvent('ticker_card_impression', {
      ticker_id: ticker.id,
      ticker_symbol: ticker.symbol
    });
  }, [ticker, analytics]);*/

  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col h-full transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{ticker.symbol}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1" title={ticker.name}>
            {ticker.name}
          </p>
        </div>
        {ticker.sector && (
          <Badge variant="outline" className="ml-2 text-xs">
            {ticker.sector}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="flex items-center gap-1">
          <LineChart className="h-3 w-3 text-muted-foreground" /> 
          <span>{ticker.chartsCount} chart{ticker.chartsCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart className="h-3 w-3 text-muted-foreground" /> 
          <span>{ticker.tradesCount} trade{ticker.tradesCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      <div className="mt-auto flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 min-w-[110px]"
          onClick={() => onShowCharts(ticker.id.toString())}
        >
          Show Charts
        </Button>
        
        {ticker.tradesCount > 0 ? (
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1 min-w-[110px]"
            onClick={() => onShowTrades(ticker)}
          >
            <ListFilter className="h-3 w-3 mr-1" />
            Show Trades
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 min-w-[110px]"
            disabled
          >
            No Trades
          </Button>
        )}
      </div>
    </div>
  );
};

export default TickerCard;