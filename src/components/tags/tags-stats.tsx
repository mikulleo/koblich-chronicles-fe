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
  Cell,
  Legend
} from 'recharts';
import { parseISO, format } from 'date-fns';
import { Construction } from 'lucide-react';

interface TagWithChartCount extends Tag {
  actualChartCount: number;
  // Track counts per month
  monthlyUsage: {
    [key: string]: number; // Format: "YYYY-MM"
  };
  // Track best 3-month window
  bestWindow?: {
    startMonth: string;
    endMonth: string;
    count: number;
  };
}

export function TagsStats() {
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithChartCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
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
        
        // Count charts per tag and track usage by month
        const tagCounts: Record<string, number> = {};
        const tagMonthlyUsage: Record<string, Record<string, number>> = {};
        
        // Initialize counts and monthly usage for all tags to zero
        tags.forEach(tag => {
          tagCounts[tag.id] = 0;
          tagMonthlyUsage[tag.id] = {};
        });
        
        // Count charts for each tag by month
        charts.docs.forEach(chart => {
          if (chart.tags && Array.isArray(chart.tags)) {
            const chartMonth = format(parseISO(chart.timestamp), 'yyyy-MM');
            
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
              }
            });
          }
        });
        
        // Calculate best 3-month window for each tag
        const tagBestWindows: Record<string, { startMonth: string, endMonth: string, count: number }> = {};
        
        Object.entries(tagMonthlyUsage).forEach(([tagId, monthlyData]) => {
          // Get all months with usage, sorted chronologically
          const months = Object.keys(monthlyData).sort();
          
          if (months.length < 3) {
            // Not enough data for a 3-month window
            return;
          }
          
          let bestWindow = {
            startMonth: months[0],
            endMonth: months[0],
            count: 0
          };
          
          // Check each possible 3-month window
          for (let i = 0; i < months.length - 2; i++) {
            const startMonth = months[i];
            const endMonth = months[i + 2]; // 3-month window
            
            // Calculate total count in this window
            let windowCount = 0;
            for (let j = i; j <= i + 2; j++) {
              windowCount += monthlyData[months[j]] || 0;
            }
            
            if (windowCount > bestWindow.count) {
              bestWindow = {
                startMonth,
                endMonth,
                count: windowCount
              };
            }
          }
          
          tagBestWindows[tagId] = bestWindow;
        });
        
        // Combine tags with their actual chart counts, monthly usage, and best windows
        const tagsWithActualCounts: TagWithChartCount[] = tags
          .map(tag => ({
            ...tag,
            actualChartCount: tagCounts[tag.id] || 0,
            monthlyUsage: tagMonthlyUsage[tag.id] || {},
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
  const barChartData = tagsWithCounts.slice(0, 10).map(tag => ({
    name: tag.name,
    value: tag.actualChartCount,
    fill: tag.color
  }));

  // Prepare data for pie chart - distribution of tags
  // Only include tags with charts for the pie chart
  const pieChartData = tagsWithCounts
    .filter(tag => tag.actualChartCount > 0)
    .map(tag => ({
      name: tag.name,
      value: tag.actualChartCount,
      fill: tag.color
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
            <div className="h-[300px] flex items-center justify-center">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, 'Charts']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center">
                  No charts associated with any tags
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Modified "Best 3-Month Windows" section with "In Construction" message */}
      <Card>
        <CardHeader>
          <CardTitle>Best 3-Month Windows for Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Under Construction</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This advanced tag analytics feature is currently being developed. 
              Check back soon for insights on tag patterns from the past.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}