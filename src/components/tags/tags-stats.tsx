"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import { Tag, Chart, PaginatedResponse } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TagWithChartCount extends Tag {
  actualChartCount: number;
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
        const chartsResponse = await apiClient.get('/charts?limit=500');
        if (!chartsResponse.data) {
          throw new Error('Failed to fetch charts data');
        }
        
        const charts: PaginatedResponse<Chart> = chartsResponse.data;
        
        // Count charts per tag
        const tagCounts: Record<string, number> = {};
        
        // Initialize counts for all tags to zero
        tags.forEach(tag => {
          tagCounts[tag.id] = 0;
        });
        
        // Count charts for each tag
        charts.docs.forEach(chart => {
          if (chart.tags && Array.isArray(chart.tags)) {
            chart.tags.forEach(tag => {
              // Handle both populated and non-populated tags
              const tagId = typeof tag === 'object' ? tag.id : tag;
              if (tagId && tagCounts[tagId] !== undefined) {
                tagCounts[tagId]++;
              }
            });
          }
        });
        
        // Combine tags with their actual chart counts and sort by counts
        const tagsWithActualCounts: TagWithChartCount[] = tags
          .map(tag => ({
            ...tag,
            actualChartCount: tagCounts[tag.id] || 0
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
      value: tag.actualChartCount
    }));

  // Calculate tag statistics
  const totalTags = tagsWithCounts.length;
  const totalCharts = tagsWithCounts.reduce((sum, tag) => sum + tag.actualChartCount, 0);
  const avgChartsPerTag = totalTags ? Math.round(totalCharts / totalTags * 10) / 10 : 0;
  const maxChartsInTag = tagsWithCounts.length ? tagsWithCounts[0].actualChartCount : 0;
  const tagsWithCharts = tagsWithCounts.filter(tag => tag.actualChartCount > 0).length;
  const tagsWithoutCharts = totalTags - tagsWithCharts;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalTags}</CardTitle>
            <CardDescription>Total Tags</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalCharts}</CardTitle>
            <CardDescription>Total Tagged Charts</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{avgChartsPerTag}</CardTitle>
            <CardDescription>Avg Charts per Tag</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{maxChartsInTag}</CardTitle>
            <CardDescription>Most Used Tag Count</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Tags by Usage</CardTitle>
            <CardDescription>
              Most frequently used tags in your chart library
            </CardDescription>
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
            <CardDescription>
              Distribution of charts across different tags
            </CardDescription>
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
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => {
                        const tag = tagsWithCounts.find(t => t.name === entry.name);
                        return (
                          <Cell key={`cell-${index}`} fill={tag ? tag.color : '#999'} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, 'Charts']}
                    />
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
    </div>
  );
}