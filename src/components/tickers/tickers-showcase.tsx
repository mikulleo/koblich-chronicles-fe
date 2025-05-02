"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Ticker } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  SlidersHorizontal, 
  BarChart, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from '@/components/trades/data-table';
import { columns, Trade as ColumnsTrade } from '@/components/trades/columns';
import TickerCard from './ticker-card';

interface TickerWithData extends Ticker {
  tradesCount: number;
  chartsCount: number;
  trades?: ColumnsTrade[];
}

interface GroupedTickers {
  [key: string]: TickerWithData[];
}

type GroupingMethod = 'alphabetical' | 'sector';

export function TickersShowcase() {
  const router = useRouter();
  const [tickers, setTickers] = useState<TickerWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupingMethod, setGroupingMethod] = useState<GroupingMethod>('alphabetical');
  const [groupedTickers, setGroupedTickers] = useState<GroupedTickers>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedTicker, setSelectedTicker] = useState<TickerWithData | null>(null);
  const [showTradesDialog, setShowTradesDialog] = useState(false);
  const [tickerTrades, setTickerTrades] = useState<ColumnsTrade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/tickers');
        
        if (response.data && response.data.docs) {
          setTickers(response.data.docs);
        }
        setError(null);
      } catch (error) {
        console.error('Error fetching tickers:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch tickers'));
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
  }, []);
  
  // Group tickers when ticker data or grouping method changes
  useEffect(() => {
    const groupTickers = () => {
      const grouped: GroupedTickers = {};
      
      tickers.forEach(ticker => {
        let groupKey = '';
        
        if (groupingMethod === 'alphabetical') {
          // Group by first letter of symbol
          groupKey = ticker.symbol.charAt(0).toUpperCase();
        } else if (groupingMethod === 'sector') {
          // Group by sector, or "Unknown" if no sector
          groupKey = ticker.sector || 'Unknown';
        }
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        
        grouped[groupKey].push(ticker);
      });
      
      // Sort each group
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => a.symbol.localeCompare(b.symbol));
      });
      
      setGroupedTickers(grouped);
      
      // Expand all groups by default if there are few groups
      if (Object.keys(grouped).length <= 5) {
        setExpandedGroups(new Set(Object.keys(grouped)));
      } else {
        // Otherwise just expand the first group
        const firstGroup = Object.keys(grouped).sort()[0];
        if (firstGroup) {
          setExpandedGroups(new Set([firstGroup]));
        }
      }
    };
    
    if (tickers.length > 0) {
      groupTickers();
    }
  }, [tickers, groupingMethod]);
  
  // Filter tickers based on search term
  const filterTickers = () => {
    if (!searchTerm) return groupedTickers;
    
    const filtered: GroupedTickers = {};
    
    Object.keys(groupedTickers).forEach(key => {
      filtered[key] = groupedTickers[key].filter(ticker => 
        ticker.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticker.sector && ticker.sector.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    
    // Only keep groups with matching tickers
    return Object.fromEntries(
      Object.entries(filtered).filter(([_, tickers]) => tickers.length > 0)
    );
  };
  
  const filteredGroupedTickers = filterTickers();
  
  // Toggle group expansion
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };
  
  // Navigate to charts filtered by ticker
  const handleShowCharts = (tickerId: string) => {
    router.push(`/charts?tickers=${tickerId}`);
  };
  
  // Show trades dialog for selected ticker
  const handleShowTrades = async (ticker: TickerWithData) => {
    setSelectedTicker(ticker);
    setShowTradesDialog(true);
    
    try {
      setLoadingTrades(true);
      
      // Fetch trades for this ticker
      const endpoint = `/trades?where[ticker][equals]=${ticker.id}`;
      
      const response = await apiClient.get(endpoint);
      
      if (response.data && response.data.docs) {
        // Transform the data to match the columns Trade type
        const transformedTrades = response.data.docs.map((trade: any) => ({
          ...trade,
          // Ensure ticker is an object with expected properties
          ticker: {
            id: ticker.id,
            symbol: ticker.symbol,
            name: ticker.name,
            ...(typeof trade.ticker === 'object' ? trade.ticker : {})
          }
        }));
        
        setTickerTrades(transformedTrades);
      } else {
        setTickerTrades([]);
      }
    } catch (error) {
      console.error(`Error fetching trades for ticker ${ticker.symbol}:`, error);
      setTickerTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 p-6 rounded-lg text-center">
        <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Tickers</h3>
        <p>{error.message}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  if (tickers.length === 0) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <BarChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Tickers Found</h3>
        <p className="text-muted-foreground mb-6">
          You haven&apos;t added any tickers yet. Add tickers to organize your charts and trades.
        </p>
        <Button 
          onClick={() => router.push('/admin/collections/tickers/create')}
        >
          Create Your First Ticker
        </Button>
      </div>
    );
  }
  
  // Check if any groups have data after filtering
  const hasFilteredData = Object.values(filteredGroupedTickers).some(group => group.length > 0);
  
  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select
            value={groupingMethod}
            onValueChange={(value) => setGroupingMethod(value as GroupingMethod)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Group alphabetically</SelectItem>
              <SelectItem value="sector">Group by sector</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Tickers display */}
      {hasFilteredData ? (
        <div className="space-y-6">
          {Object.keys(filteredGroupedTickers)
            .sort()
            .map(group => {
              const tickers = filteredGroupedTickers[group];
              if (tickers.length === 0) return null;
              
              const isExpanded = expandedGroups.has(group);
              
              return (
                <div key={group} className="border rounded-lg overflow-hidden">
                  {/* Group header */}
                  <button
                    className="w-full bg-muted/50 p-3 text-left font-medium flex items-center justify-between"
                    onClick={() => toggleGroup(group)}
                  >
                    <span>{group} ({tickers.length})</span>
                    {isExpanded ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </button>
                  
                  {/* Group content */}
                  {isExpanded && (
                    <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {tickers.map(ticker => (
                        <TickerCard 
                          key={ticker.id} 
                          ticker={ticker}
                          onShowCharts={handleShowCharts}
                          onShowTrades={handleShowTrades}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="bg-muted p-8 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">No matching tickers</h3>
          <p className="text-muted-foreground">
            No tickers match your search criteria.
          </p>
        </div>
      )}
      
      {/* Trades modal */}
      <Dialog open={showTradesDialog} onOpenChange={setShowTradesDialog}>
        {/* Inside your Dialog in ticker-showcase.tsx, replace the DialogContent section with this: */}
        <DialogContent className="max-w-[90vw] md:max-w-[80vw] max-h-[90vh]">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-2">
      <span>Trades for {selectedTicker?.symbol}</span>
      <Badge variant="outline" className="ml-2">
        {selectedTicker?.name}
      </Badge>
    </DialogTitle>
    <DialogDescription>
      Viewing all trades for {selectedTicker?.symbol}. Click on any trade to see related charts.
    </DialogDescription>
  </DialogHeader>
  
  <div className="w-full overflow-x-auto">
    {loadingTrades ? (
      <div className="p-8 text-center">
        <p>Loading trades...</p>
      </div>
    ) : tickerTrades.length === 0 ? (
      <div className="p-8 text-center">
        <p>No trades found for this ticker.</p>
      </div>
    ) : (
      <div className="min-w-full">
        <DataTable 
          columns={columns} 
          data={tickerTrades}
          onRowClickAction={(row) => {
              setShowTradesDialog(false);
              
              // Navigate to charts page with date filter for this trade
              const tradeDate = new Date(row.entryDate);
              
              // Calculate a date range around the trade date (3 days before and after)
              const fromDate = new Date(tradeDate);
              fromDate.setDate(fromDate.getDate() - 3);
              
              const toDate = new Date(tradeDate);
              toDate.setDate(toDate.getDate() + 3);
              
              const formatDate = (date: Date) => {
                return date.toISOString().split('T')[0];
              };
              
              // Create URL with query parameters
              const url = `/charts?tickers=${row.ticker.id}&from=${formatDate(fromDate)}&to=${formatDate(toDate)}`;
              
              router.push(url);
            }}
          />
        </div>
      )}
  </div>
</DialogContent>
      </Dialog>
    </div>
  );
}