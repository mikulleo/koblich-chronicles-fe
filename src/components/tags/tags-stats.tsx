"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Tag, Chart, Trade } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  InfoIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { parseISO, isWithinInterval, addDays } from 'date-fns';

// Types for tag performance metrics
interface TagPerformance {
  tag: Tag;
  // Trade metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  // P/L metrics
  avgProfitLossPercent: number;
  totalProfitLossPercent: number;
  avgRRatio: number;
  // Best/Worst
  bestTrade: { ticker: string; profitLossPercent: number } | null;
  worstTrade: { ticker: string; profitLossPercent: number } | null;
  // Chart count
  chartCount: number;
}

// Color utilities
const getWinRateColor = (winRate: number): string => {
  if (winRate >= 60) return '#22c55e'; // green-500
  if (winRate >= 50) return '#84cc16'; // lime-500
  if (winRate >= 40) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
};


// Helper to get trade's end date (last exit or today if open)
const getTradeEndDate = (trade: Trade): Date => {
  if (trade.status === 'open') {
    return new Date();
  }
  if (trade.exits && trade.exits.length > 0) {
    const exitDates = trade.exits.map(e => parseISO(e.date));
    return new Date(Math.max(...exitDates.map(d => d.getTime())));
  }
  return new Date();
};

// Helper to check if chart is related to a trade
const isChartRelatedToTrade = (chart: Chart, trade: Trade): boolean => {
  // Get ticker IDs
  const chartTickerId = typeof chart.ticker === 'object' ? chart.ticker.id : chart.ticker;
  const tradeTickerId = typeof trade.ticker === 'object' ? trade.ticker.id : trade.ticker;

  if (chartTickerId !== tradeTickerId) return false;

  const chartDate = parseISO(chart.timestamp);
  const tradeStart = parseISO(trade.entryDate);
  const tradeEnd = addDays(getTradeEndDate(trade), 7); // Add buffer for post-trade analysis charts

  return isWithinInterval(chartDate, { start: addDays(tradeStart, -7), end: tradeEnd });
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'green' | 'red' | 'yellow' | 'default';
  tooltip?: string;
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'default',
  tooltip
}: StatsCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-500',
    yellow: 'text-yellow-600',
    default: 'text-foreground'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <Icon className={`h-8 w-8 ${colorClasses[color]} opacity-20`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Badge
function PerformanceBadge({ value, type }: { value: number; type: 'winRate' | 'rRatio' | 'pl' }) {
  let color: string;
  let icon: React.ReactNode;

  if (type === 'winRate') {
    color = value >= 50 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20';
    icon = value >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  } else if (type === 'rRatio') {
    color = value >= 1 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20';
    icon = <Target className="h-3 w-3" />;
  } else {
    color = value > 0 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
            value < 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            'bg-gray-500/10 text-gray-500 border-gray-500/20';
    icon = value > 0 ? <ArrowUpRight className="h-3 w-3" /> :
           value < 0 ? <ArrowDownRight className="h-3 w-3" /> :
           <Minus className="h-3 w-3" />;
  }

  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1`}>
      {icon}
      {type === 'winRate' ? `${value.toFixed(0)}%` :
       type === 'rRatio' ? `${value.toFixed(2)}R` :
       `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
    </Badge>
  );
}

// Custom tooltip for bar chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>Win Rate: <span className="font-medium">{data.winRate.toFixed(1)}%</span></p>
          <p>Trades: <span className="font-medium">{data.totalTrades}</span></p>
          <p>Avg P/L: <span className={`font-medium ${data.avgPL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {data.avgPL >= 0 ? '+' : ''}{data.avgPL.toFixed(2)}%
          </span></p>
          <p>Avg R: <span className="font-medium">{data.avgR.toFixed(2)}R</span></p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip for scatter chart
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>Charts: <span className="font-medium">{data.x}</span></p>
          <p>Win Rate: <span className="font-medium">{data.y.toFixed(1)}%</span></p>
          <p>Trades: <span className="font-medium">{data.trades}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export function TagsStats() {
  const [tagPerformance, setTagPerformance] = useState<TagPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [tagsResponse, chartsResponse, tradesResponse] = await Promise.all([
          apiClient.get('/tags'),
          apiClient.get('/charts'),
          apiClient.get('/trades')
        ]);

        const tags: Tag[] = tagsResponse.data?.docs || [];
        const charts: Chart[] = chartsResponse.data?.docs || [];
        const trades: Trade[] = tradesResponse.data?.docs || [];

        // Only consider closed or partial trades for performance metrics
        const completedTrades = trades.filter(t => t.status === 'closed' || t.status === 'partial');

        // Calculate performance for each tag
        const performance: TagPerformance[] = tags.map(tag => {
          // Find charts with this tag
          const chartsWithTag = charts.filter(chart => {
            if (!chart.tags) return false;
            return chart.tags.some(t => {
              const tagId = typeof t === 'object' ? t.id : t;
              return tagId === tag.id;
            });
          });

          // Find trades related to these charts
          const relatedTradeIds = new Set<string>();
          const relatedTrades: Trade[] = [];

          chartsWithTag.forEach(chart => {
            completedTrades.forEach(trade => {
              if (!relatedTradeIds.has(trade.id) && isChartRelatedToTrade(chart, trade)) {
                relatedTradeIds.add(trade.id);
                relatedTrades.push(trade);
              }
            });
          });

          // Calculate metrics
          const winningTrades = relatedTrades.filter(t => (t.profitLossPercent ?? 0) > 0).length;
          const losingTrades = relatedTrades.filter(t => (t.profitLossPercent ?? 0) < 0).length;
          const breakEvenTrades = relatedTrades.filter(t => (t.profitLossPercent ?? 0) === 0).length;
          const totalTrades = relatedTrades.length;

          const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

          const avgProfitLossPercent = totalTrades > 0
            ? relatedTrades.reduce((sum, t) => sum + (t.profitLossPercent ?? 0), 0) / totalTrades
            : 0;

          const totalProfitLossPercent = relatedTrades.reduce((sum, t) => sum + (t.profitLossPercent ?? 0), 0);

          const tradesWithR = relatedTrades.filter(t => t.rRatio !== undefined && t.rRatio !== null);
          const avgRRatio = tradesWithR.length > 0
            ? tradesWithR.reduce((sum, t) => sum + (t.rRatio ?? 0), 0) / tradesWithR.length
            : 0;

          // Find best and worst trades
          let bestTrade: TagPerformance['bestTrade'] = null;
          let worstTrade: TagPerformance['worstTrade'] = null;

          if (relatedTrades.length > 0) {
            const sorted = [...relatedTrades].sort((a, b) => (b.profitLossPercent ?? 0) - (a.profitLossPercent ?? 0));
            const best = sorted[0];
            const worst = sorted[sorted.length - 1];

            if (best) {
              const ticker = typeof best.ticker === 'object' ? best.ticker.symbol : 'Unknown';
              bestTrade = { ticker, profitLossPercent: best.profitLossPercent ?? 0 };
            }
            if (worst && worst !== best) {
              const ticker = typeof worst.ticker === 'object' ? worst.ticker.symbol : 'Unknown';
              worstTrade = { ticker, profitLossPercent: worst.profitLossPercent ?? 0 };
            }
          }

          return {
            tag,
            totalTrades,
            winningTrades,
            losingTrades,
            breakEvenTrades,
            winRate,
            avgProfitLossPercent,
            totalProfitLossPercent,
            avgRRatio,
            bestTrade,
            worstTrade,
            chartCount: chartsWithTag.length
          };
        });

        // Sort by total trades (most data first), then by win rate
        performance.sort((a, b) => {
          if (b.totalTrades !== a.totalTrades) return b.totalTrades - a.totalTrades;
          return b.winRate - a.winRate;
        });

        setTagPerformance(performance);
        setError(null);
      } catch (err) {
        console.error('Error fetching tag performance data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Computed values
  const tagsWithTrades = useMemo(() =>
    tagPerformance.filter(tp => tp.totalTrades > 0),
    [tagPerformance]
  );

  const bestPerformingTag = useMemo(() => {
    const withEnoughTrades = tagsWithTrades.filter(tp => tp.totalTrades >= 3);
    if (withEnoughTrades.length === 0) return null;
    return withEnoughTrades.reduce((best, current) =>
      current.winRate > best.winRate ? current : best
    );
  }, [tagsWithTrades]);

  const worstPerformingTag = useMemo(() => {
    const withEnoughTrades = tagsWithTrades.filter(tp => tp.totalTrades >= 3);
    if (withEnoughTrades.length === 0) return null;
    return withEnoughTrades.reduce((worst, current) =>
      current.winRate < worst.winRate ? current : worst
    );
  }, [tagsWithTrades]);

  const mostProfitableTag = useMemo(() => {
    const withTrades = tagsWithTrades.filter(tp => tp.totalTrades >= 2);
    if (withTrades.length === 0) return null;
    return withTrades.reduce((best, current) =>
      current.totalProfitLossPercent > best.totalProfitLossPercent ? current : best
    );
  }, [tagsWithTrades]);

  const totalTradesAnalyzed = useMemo(() =>
    tagsWithTrades.reduce((sum, tp) => sum + tp.totalTrades, 0),
    [tagsWithTrades]
  );

  // Chart data
  const barChartData = useMemo(() =>
    tagsWithTrades
      .filter(tp => tp.totalTrades >= 2)
      .slice(0, 12)
      .map(tp => ({
        name: tp.tag.name.length > 12 ? tp.tag.name.substring(0, 12) + '...' : tp.tag.name,
        fullName: tp.tag.name,
        winRate: tp.winRate,
        totalTrades: tp.totalTrades,
        avgPL: tp.avgProfitLossPercent,
        avgR: tp.avgRRatio,
        fill: getWinRateColor(tp.winRate)
      })),
    [tagsWithTrades]
  );

  const scatterData = useMemo(() =>
    tagsWithTrades
      .filter(tp => tp.totalTrades >= 1)
      .map(tp => ({
        name: tp.tag.name,
        x: tp.chartCount,
        y: tp.winRate,
        z: tp.totalTrades,
        trades: tp.totalTrades,
        fill: getWinRateColor(tp.winRate)
      })),
    [tagsWithTrades]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Tag Performance</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (tagsWithTrades.length === 0) {
    return (
      <div className="bg-muted p-6 rounded-lg text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Tag Performance Data</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tag performance is calculated by linking charts (with tags) to trades (with P/L).
          Add tags to your charts that correspond to trade setups to see performance metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tags with Trades"
          value={tagsWithTrades.length}
          subtitle={`of ${tagPerformance.length} total tags`}
          icon={Target}
          tooltip="Number of tags that are linked to at least one completed trade"
        />

        {bestPerformingTag && (
          <StatsCard
            title="Best Win Rate"
            value={`${bestPerformingTag.winRate.toFixed(0)}%`}
            subtitle={`${bestPerformingTag.tag.name} (${bestPerformingTag.totalTrades} trades)`}
            icon={Award}
            color="green"
            tooltip="Tag with highest win rate (minimum 3 trades)"
          />
        )}

        {mostProfitableTag && (
          <StatsCard
            title="Most Profitable"
            value={`+${mostProfitableTag.totalProfitLossPercent.toFixed(1)}%`}
            subtitle={`${mostProfitableTag.tag.name} (${mostProfitableTag.totalTrades} trades)`}
            icon={TrendingUp}
            color="green"
            tooltip="Tag with highest total P/L percentage"
          />
        )}

        {worstPerformingTag && (
          <StatsCard
            title="Needs Improvement"
            value={`${worstPerformingTag.winRate.toFixed(0)}%`}
            subtitle={`${worstPerformingTag.tag.name} (${worstPerformingTag.totalTrades} trades)`}
            icon={AlertTriangle}
            color="yellow"
            tooltip="Tag with lowest win rate (minimum 3 trades)"
          />
        )}
      </div>

      {/* Win Rate by Tag Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Win Rate by Tag</CardTitle>
          <CardDescription>
            Tags sorted by number of trades (minimum 2 trades to display)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {barChartData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="5 5" label={{ value: '50%', position: 'right', fontSize: 10 }} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Need at least 2 trades per tag to display chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scatter Plot: Frequency vs Win Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Frequency vs Win Rate</CardTitle>
          <CardDescription>
            Bubble size indicates number of trades. Look for tags with high frequency AND high win rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scatterData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Charts"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Number of Charts', position: 'bottom', offset: 0, fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Win Rate"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    label={{ value: 'Win Rate', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} name="Trades" />
                  <RechartsTooltip content={<CustomScatterTooltip />} />
                  <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="5 5" />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Performance Details</CardTitle>
          <CardDescription>
            Complete breakdown of trading performance by tag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Tag</th>
                  <th className="text-center py-3 px-2 font-medium">Trades</th>
                  <th className="text-center py-3 px-2 font-medium">Win Rate</th>
                  <th className="text-center py-3 px-2 font-medium">Avg P/L</th>
                  <th className="text-center py-3 px-2 font-medium">Avg R</th>
                  <th className="text-center py-3 px-2 font-medium hidden md:table-cell">W/L/BE</th>
                  <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Best Trade</th>
                  <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Worst Trade</th>
                </tr>
              </thead>
              <tbody>
                {tagsWithTrades.map((tp, index) => (
                  <tr
                    key={tp.tag.id}
                    className={`border-b last:border-0 ${index % 2 === 0 ? 'bg-muted/30' : ''}`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tp.tag.color || '#6b7280' }}
                        />
                        <span className="font-medium truncate max-w-[150px]" title={tp.tag.name}>
                          {tp.tag.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({tp.chartCount} charts)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-medium">
                      {tp.totalTrades}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <PerformanceBadge value={tp.winRate} type="winRate" />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <PerformanceBadge value={tp.avgProfitLossPercent} type="pl" />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <PerformanceBadge value={tp.avgRRatio} type="rRatio" />
                    </td>
                    <td className="py-3 px-2 text-center hidden md:table-cell">
                      <span className="text-green-600">{tp.winningTrades}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-red-500">{tp.losingTrades}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-gray-500">{tp.breakEvenTrades}</span>
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      {tp.bestTrade ? (
                        <span className="text-green-600">
                          {tp.bestTrade.ticker}: +{tp.bestTrade.profitLossPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell">
                      {tp.worstTrade ? (
                        <span className="text-red-500">
                          {tp.worstTrade.ticker}: {tp.worstTrade.profitLossPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tagsWithTrades.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No tags with associated trades found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags without trades */}
      {tagPerformance.filter(tp => tp.totalTrades === 0 && tp.chartCount > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags Without Trade Data</CardTitle>
            <CardDescription>
              These tags have charts but couldn&apos;t be linked to any completed trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tagPerformance
                .filter(tp => tp.totalTrades === 0 && tp.chartCount > 0)
                .map(tp => (
                  <Badge
                    key={tp.tag.id}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tp.tag.color || '#6b7280' }}
                    />
                    {tp.tag.name}
                    <span className="text-muted-foreground ml-1">({tp.chartCount} charts)</span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
