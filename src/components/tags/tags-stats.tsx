"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import { Tag, Chart, PaginatedResponse } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { parseISO, format, startOfWeek, addWeeks, eachWeekOfInterval, endOfWeek, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, startOfQuarter, endOfQuarter, eachQuarterOfInterval } from 'date-fns';

interface TagWithChartCount extends Tag {
  actualChartCount: number;
  // Track counts per month
  monthlyUsage: {
    [key: string]: number; // Format: "YYYY-MM"
  };
  // Track counts per week
  weeklyUsage: {
    [key: string]: number; // Format: "YYYY-WW" (ISO week)
  };
  // Track best 3-week window
  bestWindow?: {
    startWeek: string;
    endWeek: string;
    count: number;
    period: string; // Human readable period
  };
}

// Extended color palette for more variety
const EXTENDED_COLORS = [
  '#FF5252', '#4CAF50', '#2196F3', '#FFEB3B', '#9C27B0', 
  '#FF9800', '#009688', '#E91E63', '#9E9E9E', '#F44336',
  '#4CAF50', '#03A9F4', '#FFCC02', '#673AB7', '#FF5722',
  '#00BCD4', '#8BC34A', '#FFC107', '#795548', '#607D8B',
  '#E91E63', '#3F51B5', '#00E676', '#FF6F00', '#7B1FA2',
  '#D32F2F', '#388E3C', '#1976D2', '#F57C00', '#512DA8',
  '#C2185B', '#7B1FA2', '#303F9F', '#388E3C', '#F57C00',
  '#5D4037', '#455A64', '#E64A19', '#00796B', '#AFB42B'
];

// Function to get a unique color for each tag
const getTagColor = (tag: Tag, index: number): string => {
  // First try to use the tag's assigned color
  if (tag.color && tag.color !== '#9E9E9E') {
    return tag.color;
  }
  
  // If no specific color or it's the default gray, use extended palette
  return EXTENDED_COLORS[index % EXTENDED_COLORS.length];
};

// Custom label component for better control
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Always show the tag name
  const label = name;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="600"
      style={{
        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
        filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
      }}
    >
      {label}
    </text>
  );
};

export function TagsStats() {
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithChartCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // State for calendar expansions
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  // Helper functions for expansion
  const toggleQuarter = (quarterId: string) => {
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(quarterId)) {
      newExpanded.delete(quarterId);
      // Also collapse all months in this quarter
      const newExpandedMonths = new Set(expandedMonths);
      newExpandedMonths.forEach(monthId => {
        if (monthId.startsWith(quarterId.substring(0, 4))) {
          newExpandedMonths.delete(monthId);
        }
      });
      setExpandedMonths(newExpandedMonths);
    } else {
      newExpanded.add(quarterId);
    }
    setExpandedQuarters(newExpanded);
  };
  
  const toggleMonth = (monthId: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthId)) {
      newExpanded.delete(monthId);
    } else {
      newExpanded.add(monthId);
    }
    setExpandedMonths(newExpanded);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tags
        const tagsResponse = await apiClient.get('/tags');
        if (!tagsResponse.data || !tagsResponse.data.docs) {
          throw new Error('Failed to fetch tags data');
        }
        
        const tags: Tag[] = tagsResponse.data.docs;
        
        // Fetch all charts (with a high limit to get as many as possible)
        const chartsResponse = await apiClient.get('/charts');
        if (!chartsResponse.data) {
          throw new Error('Failed to fetch charts data');
        }
        
        const charts: PaginatedResponse<Chart> = chartsResponse.data;
        
        // Count charts per tag and track usage by month and week
        const tagCounts: Record<string, number> = {};
        const tagMonthlyUsage: Record<string, Record<string, number>> = {};
        const tagWeeklyUsage: Record<string, Record<string, number>> = {};
        
        // Initialize counts and usage tracking for all tags to zero
        tags.forEach(tag => {
          tagCounts[tag.id] = 0;
          tagMonthlyUsage[tag.id] = {};
          tagWeeklyUsage[tag.id] = {};
        });
        
        // Count charts for each tag by month and week
        charts.docs.forEach(chart => {
          if (chart.tags && Array.isArray(chart.tags)) {
            const chartDate = parseISO(chart.timestamp);
            const chartMonth = format(chartDate, 'yyyy-MM');
            const chartWeek = format(startOfWeek(chartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday start
            
            chart.tags.forEach(tag => {
              // Handle both populated and non-populated tags
              const tagId = typeof tag === 'object' ? tag.id : tag;
              if (tagId && tagCounts[tagId] !== undefined) {
                // Increment total count
                tagCounts[tagId]++;
                
                // Increment monthly count
                if (!tagMonthlyUsage[tagId][chartMonth]) {
                  tagMonthlyUsage[tagId][chartMonth] = 0;
                }
                tagMonthlyUsage[tagId][chartMonth]++;
                
                // Increment weekly count
                if (!tagWeeklyUsage[tagId][chartWeek]) {
                  tagWeeklyUsage[tagId][chartWeek] = 0;
                }
                tagWeeklyUsage[tagId][chartWeek]++;
              }
            });
          }
        });
        
        // Calculate best 3-week window for each tag
        const tagBestWindows: Record<string, { startWeek: string, endWeek: string, count: number, period: string }> = {};
        
        Object.entries(tagWeeklyUsage).forEach(([tagId, weeklyData]) => {
          // Get all weeks with usage, sorted chronologically
          const weeks = Object.keys(weeklyData).sort();
          
          if (weeks.length < 3) {
            // Not enough data for a 3-week window
            return;
          }
          
          let bestWindow = {
            startWeek: weeks[0],
            endWeek: weeks[0],
            count: 0,
            period: ''
          };
          
          // Check each possible 3-week window
          for (let i = 0; i < weeks.length - 2; i++) {
            const startWeek = weeks[i];
            const endWeek = weeks[i + 2]; // 3-week window
            
            // Calculate total count in this window
            let windowCount = 0;
            for (let j = i; j <= i + 2; j++) {
              windowCount += weeklyData[weeks[j]] || 0;
            }
            
            if (windowCount > bestWindow.count) {
              const startDate = parseISO(startWeek);
              const endDate = parseISO(endWeek);
              const endDatePlusWeek = addWeeks(endDate, 1);
              
              bestWindow = {
                startWeek,
                endWeek,
                count: windowCount,
                period: `${format(startDate, 'MMM d')} - ${format(endDatePlusWeek, 'MMM d, yyyy')}`
              };
            }
          }
          
          if (bestWindow.count > 0) {
            tagBestWindows[tagId] = bestWindow;
          }
        });
        
        // Combine tags with their actual chart counts, monthly usage, weekly usage, and best windows
        const tagsWithActualCounts: TagWithChartCount[] = tags
          .map(tag => ({
            ...tag,
            actualChartCount: tagCounts[tag.id] || 0,
            monthlyUsage: tagMonthlyUsage[tag.id] || {},
            weeklyUsage: tagWeeklyUsage[tag.id] || {},
            bestWindow: tagBestWindows[tag.id]
          }))
          .sort((a, b) => b.actualChartCount - a.actualChartCount);
        
        setTagsWithCounts(tagsWithActualCounts);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Prepare data for bar chart - top 10 tags by chart count
  const barChartData = tagsWithCounts.slice(0, 10).map((tag, index) => ({
    name: tag.name,
    value: tag.actualChartCount,
    fill: getTagColor(tag, index)
  }));

  // Prepare data for pie chart - distribution of tags
  // Only include tags with charts for the pie chart
  const pieChartData = tagsWithCounts
    .filter(tag => tag.actualChartCount > 0)
    .map((tag, index) => ({
      name: tag.name,
      value: tag.actualChartCount,
      fill: getTagColor(tag, index)
    }));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Tag Statistics</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (tagsWithCounts.length === 0) {
    return (
      <div className="bg-muted p-6 rounded-lg text-center">
        <h3 className="text-lg font-medium mb-2">No Tags Available</h3>
        <p className="text-muted-foreground">
          Create tags to see statistics on their usage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Tags by Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {barChartData.length > 0 && barChartData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.length > 8 ? `${value.substring(0, 8)}...` : value}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [value, 'Charts']}
                      labelFormatter={(label) => `Tag: ${label}`}
                    />
                    <Bar dataKey="value">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No chart data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tag Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomPieLabel}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, 'Charts']}
                      labelFormatter={(label) => `Tag: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-center">
                    No charts associated with any tags
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Best 3-Week Windows for Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Best 3-Week Performance Windows</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // Get top 3 tags with best windows, sorted by their best window count
            const topTagsByWindow = tagsWithCounts
              .filter(tag => tag.bestWindow && tag.bestWindow.count > 0)
              .sort((a, b) => (b.bestWindow?.count || 0) - (a.bestWindow?.count || 0))
              .slice(0, 3);

            if (topTagsByWindow.length === 0) {
              return (
                <div className="h-[200px] flex flex-col items-center justify-center bg-muted/20 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Need at least 3 weeks of data to calculate best performance windows.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topTagsByWindow.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="relative p-4 rounded-lg border"
                    style={{ backgroundColor: `${getTagColor(tag, index)}15` }}
                  >
                    {/* Ranking badge */}
                    <div 
                      className="absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: getTagColor(tag, index) }}
                    >
                      {index + 1}
                    </div>
                    
                    {/* Tag info */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTagColor(tag, index) }}
                        />
                        <h3 className="font-medium text-lg">{tag.name}</h3>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Best Period:</span>
                          <br />
                          {tag.bestWindow?.period}
                        </div>
                        
                        <div>
                          <span className="font-medium">Charts in window:</span>
                          <span className="ml-1 font-bold text-foreground">
                            {tag.bestWindow?.count}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">Total charts:</span>
                          <span className="ml-1">{tag.actualChartCount}</span>
                        </div>
                        
                        {tag.bestWindow && (
                          <div>
                            <span className="font-medium">Window intensity:</span>
                            <span className="ml-1">
                              {Math.round((tag.bestWindow.count / tag.actualChartCount) * 100)}% of all usage
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Hierarchical Tag Usage Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Usage Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // Get all weeks that have any tag usage
            const allWeeksWithUsage = new Set<string>();
            tagsWithCounts.forEach(tag => {
              Object.keys(tag.weeklyUsage).forEach(week => {
                if (tag.weeklyUsage[week] > 0) {
                  allWeeksWithUsage.add(week);
                }
              });
            });

            if (allWeeksWithUsage.size === 0) {
              return (
                <div className="h-[200px] flex flex-col items-center justify-center bg-muted/20 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Upload some charts to see tag usage patterns.
                  </p>
                </div>
              );
            }

            // Sort weeks chronologically and group by quarters and months
            const sortedWeeks = Array.from(allWeeksWithUsage).sort().reverse();
            
            // Group data by quarters
            const quarterData = new Map<string, {
              quarterId: string;
              quarterStart: Date;
              quarterEnd: Date;
              displayPeriod: string;
              totalCharts: number;
              topTags: any[];
              months: Map<string, {
                monthId: string;
                monthStart: Date;
                monthEnd: Date;
                displayPeriod: string;
                totalCharts: number;
                topTags: any[];
                weeks: any[];
              }>;
            }>();

            sortedWeeks.forEach(week => {
              const weekStart = parseISO(week);
              const quarterStart = startOfQuarter(weekStart);
              const quarterId = format(quarterStart, 'yyyy-QQ');
              const monthStart = startOfMonth(weekStart);
              const monthId = format(monthStart, 'yyyy-MM');
              
              // Initialize quarter if not exists
              if (!quarterData.has(quarterId)) {
                quarterData.set(quarterId, {
                  quarterId,
                  quarterStart,
                  quarterEnd: endOfQuarter(quarterStart),
                  displayPeriod: `Q${format(quarterStart, 'Q yyyy')} (${format(quarterStart, 'MMM')} - ${format(endOfQuarter(quarterStart), 'MMM yyyy')})`,
                  totalCharts: 0,
                  topTags: [],
                  months: new Map()
                });
              }

              const quarter = quarterData.get(quarterId)!;

              // Initialize month if not exists
              if (!quarter.months.has(monthId)) {
                quarter.months.set(monthId, {
                  monthId,
                  monthStart,
                  monthEnd: endOfMonth(monthStart),
                  displayPeriod: format(monthStart, 'MMMM yyyy'),
                  totalCharts: 0,
                  topTags: [],
                  weeks: []
                });
              }

              const month = quarter.months.get(monthId)!;

              // Add week data
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const tagsInWeek = tagsWithCounts
                .map(tag => ({
                  ...tag,
                  weekCount: tag.weeklyUsage[week] || 0
                }))
                .filter(tag => tag.weekCount > 0)
                .sort((a, b) => b.weekCount - a.weekCount)
                .slice(0, 3);

              const weekTotalCharts = tagsInWeek.reduce((sum, tag) => sum + tag.weekCount, 0);

              month.weeks.push({
                week,
                weekStart,
                weekEnd,
                displayPeriod: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
                topTags: tagsInWeek,
                totalCharts: weekTotalCharts
              });

              month.totalCharts += weekTotalCharts;
              quarter.totalCharts += weekTotalCharts;
            });

            // Calculate top tags for quarters and months
            quarterData.forEach(quarter => {
              const quarterTagCounts = new Map<string, number>();
              quarter.months.forEach(month => {
                const monthTagCounts = new Map<string, number>();
                month.weeks.forEach(week => {
                  week.topTags.forEach(tag => {
                    quarterTagCounts.set(tag.id, (quarterTagCounts.get(tag.id) || 0) + tag.weekCount);
                    monthTagCounts.set(tag.id, (monthTagCounts.get(tag.id) || 0) + tag.weekCount);
                  });
                });
                
                // Set top tags for month
                month.topTags = Array.from(monthTagCounts.entries())
                  .map(([tagId, count]) => {
                    const tag = tagsWithCounts.find(t => t.id === tagId);
                    return { ...tag, weekCount: count };
                  })
                  .filter(tag => tag.id)
                  .sort((a, b) => b.weekCount - a.weekCount)
                  .slice(0, 3);
              });
              
              // Set top tags for quarter
              quarter.topTags = Array.from(quarterTagCounts.entries())
                .map(([tagId, count]) => {
                  const tag = tagsWithCounts.find(t => t.id === tagId);
                  return { ...tag, weekCount: count };
                })
                .filter(tag => tag.id)
                .sort((a, b) => b.weekCount - a.weekCount)
                .slice(0, 3);
            });

            const sortedQuarters = Array.from(quarterData.values()).sort((a, b) => 
              b.quarterStart.getTime() - a.quarterStart.getTime()
            );

            return (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {sortedQuarters.map((quarter) => (
                  <div key={quarter.quarterId} className="border rounded-lg">
                    {/* Quarter Header */}
                    <div 
                      className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => toggleQuarter(quarter.quarterId)}
                    >
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-md text-sm font-medium transition-colors">
                          <span className="text-xs">
                            {expandedQuarters.has(quarter.quarterId) ? '▼' : '▶'}
                          </span>
                          {expandedQuarters.has(quarter.quarterId) ? 'Hide Months' : 'Show Months'}
                        </button>
                        <div>
                          <h3 className="font-medium">{quarter.displayPeriod}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {quarter.topTags.map((tag, tagIndex) => (
                              <div
                                key={tag.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs border"
                                style={{ 
                                  backgroundColor: `${getTagColor(tag, tagsWithCounts.indexOf(tag))}15`,
                                  borderColor: `${getTagColor(tag, tagsWithCounts.indexOf(tag))}40`
                                }}
                              >
                                <div 
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getTagColor(tag, tagsWithCounts.indexOf(tag)) }}
                                />
                                <span>{tag.name}</span>
                                <span 
                                  className="text-xs px-1 rounded text-white font-medium"
                                  style={{ backgroundColor: getTagColor(tag, tagsWithCounts.indexOf(tag)) }}
                                >
                                  {tag.weekCount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                        {quarter.totalCharts} charts
                      </span>
                    </div>

                    {/* Expanded Quarter Content */}
                    {expandedQuarters.has(quarter.quarterId) && (
                      <div className="border-t">
                        {Array.from(quarter.months.values())
                          .sort((a, b) => b.monthStart.getTime() - a.monthStart.getTime())
                          .map((month) => (
                          <div key={month.monthId} className="border-b last:border-b-0">
                            {/* Month Header */}
                            <div 
                              className="p-3 pl-8 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-between"
                              onClick={() => toggleMonth(month.monthId)}
                            >
                              <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-2 py-1 bg-secondary/10 hover:bg-secondary/20 rounded text-xs font-medium transition-colors">
                                  <span className="text-xs">
                                    {expandedMonths.has(month.monthId) ? '▼' : '▶'}
                                  </span>
                                  {expandedMonths.has(month.monthId) ? 'Hide Weeks' : 'Show Weeks'}
                                </button>
                                <div>
                                  <h4 className="font-medium text-sm">{month.displayPeriod}</h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {month.topTags.map((tag) => (
                                      <div
                                        key={tag.id}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                                        style={{ 
                                          backgroundColor: `${getTagColor(tag, tagsWithCounts.indexOf(tag))}20`
                                        }}
                                      >
                                        <span className="text-xs">{tag.name}</span>
                                        <span 
                                          className="text-xs px-1 rounded text-white"
                                          style={{ backgroundColor: getTagColor(tag, tagsWithCounts.indexOf(tag)) }}
                                        >
                                          {tag.weekCount}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {month.totalCharts} charts
                              </span>
                            </div>

                            {/* Expanded Month Content - Weeks */}
                            {expandedMonths.has(month.monthId) && (
                              <div className="p-2 pl-12 space-y-2 bg-background">
                                {month.weeks
                                  .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
                                  .map((week) => (
                                  <div key={week.week} className="p-2 border rounded bg-card/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium">{week.displayPeriod}</span>
                                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {week.totalCharts} charts
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {week.topTags.map((tag, tagIndex) => (
                                        <div
                                          key={tag.id}
                                          className="flex items-center gap-1 px-2 py-1 rounded text-xs border"
                                          style={{ 
                                            backgroundColor: `${getTagColor(tag, tagsWithCounts.indexOf(tag))}15`,
                                            borderColor: `${getTagColor(tag, tagsWithCounts.indexOf(tag))}30`
                                          }}
                                        >
                                          <div 
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: getTagColor(tag, tagsWithCounts.indexOf(tag)) }}
                                          />
                                          <span>{tag.name}</span>
                                          <span 
                                            className="text-xs px-1 rounded text-white"
                                            style={{ backgroundColor: getTagColor(tag, tagsWithCounts.indexOf(tag)) }}
                                          >
                                            {tag.weekCount}
                                          </span>
                                          {tagIndex === 0 && (
                                            <span className="text-xs">👑</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}