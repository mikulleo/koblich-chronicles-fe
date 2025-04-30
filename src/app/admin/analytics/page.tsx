// src/app/admin/analytics/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart,
  LineChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Users, 
  Clock, 
  MousePointerClick, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  BarChart2
} from 'lucide-react';

// Define types for metrics
interface MetricsData {
  users: number;
  newUsers: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  pageviews: number;
  screenPageViews: number;
  engagedSessions: number;
}

interface TimeSeriesData {
  date: string;
  users: number;
  newUsers: number;
  sessions: number;
  pageviews: number;
}

interface EventData {
  eventName: string;
  count: number;
  percentage: number;
}

interface PageData {
  pagePath: string;
  views: number;
  avgTimeOnPage: number;
  entrances: number;
  bounceRate: number;
}

// Mock data - in a real implementation, this would come from the Google Analytics API
const mockMetrics: MetricsData = {
  users: 1248,
  newUsers: 876,
  sessions: 1587,
  bounceRate: 42.3,
  avgSessionDuration: 124,
  pageviews: 3542,
  screenPageViews: 3245,
  engagedSessions: 1023
};

const mockTimeSeries: TimeSeriesData[] = [
  { date: '2025-04-01', users: 120, newUsers: 80, sessions: 145, pageviews: 320 },
  { date: '2025-04-02', users: 132, newUsers: 90, sessions: 156, pageviews: 350 },
  { date: '2025-04-03', users: 101, newUsers: 62, sessions: 130, pageviews: 290 },
  { date: '2025-04-04', users: 134, newUsers: 85, sessions: 170, pageviews: 390 },
  { date: '2025-04-05', users: 90, newUsers: 55, sessions: 110, pageviews: 250 },
  { date: '2025-04-06', users: 85, newUsers: 48, sessions: 100, pageviews: 220 },
  { date: '2025-04-07', users: 140, newUsers: 95, sessions: 180, pageviews: 410 },
  { date: '2025-04-08', users: 151, newUsers: 102, sessions: 195, pageviews: 430 },
  { date: '2025-04-09', users: 125, newUsers: 85, sessions: 160, pageviews: 350 },
  { date: '2025-04-10', users: 130, newUsers: 88, sessions: 168, pageviews: 370 },
  { date: '2025-04-11', users: 128, newUsers: 86, sessions: 165, pageviews: 360 },
  { date: '2025-04-12', users: 94, newUsers: 60, sessions: 120, pageviews: 260 },
  { date: '2025-04-13', users: 91, newUsers: 58, sessions: 115, pageviews: 250 },
  { date: '2025-04-14', users: 145, newUsers: 98, sessions: 185, pageviews: 420 },
];

const mockEvents: EventData[] = [
  { eventName: 'chart_view', count: 856, percentage: 26.4 },
  { eventName: 'tag_click', count: 625, percentage: 19.3 },
  { eventName: 'ticker_select', count: 540, percentage: 16.7 },
  { eventName: 'trade_view', count: 432, percentage: 13.3 },
  { eventName: 'donation_initiated', count: 187, percentage: 5.8 },
  { eventName: 'donation_completed', count: 103, percentage: 3.2 },
  { eventName: 'stats_filter_change', count: 298, percentage: 9.2 },
  { eventName: 'user_login', count: 201, percentage: 6.2 },
];

const mockPages: PageData[] = [
  { pagePath: '/', views: 1240, avgTimeOnPage: 65, entrances: 823, bounceRate: 35.2 },
  { pagePath: '/charts', views: 956, avgTimeOnPage: 112, entrances: 423, bounceRate: 28.7 },
  { pagePath: '/tickers', views: 754, avgTimeOnPage: 85, entrances: 321, bounceRate: 31.5 },
  { pagePath: '/trades', views: 689, avgTimeOnPage: 143, entrances: 267, bounceRate: 24.9 },
  { pagePath: '/statistics', views: 578, avgTimeOnPage: 156, entrances: 198, bounceRate: 22.4 },
  { pagePath: '/tags', views: 432, avgTimeOnPage: 72, entrances: 156, bounceRate: 33.8 },
  { pagePath: '/trades/demo', views: 321, avgTimeOnPage: 95, entrances: 134, bounceRate: 29.6 },
  { pagePath: '/donation/thank-you', views: 103, avgTimeOnPage: 45, entrances: 12, bounceRate: 8.3 },
];

// Color scheme
const COLORS = ['#082d7d', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('last30days');
  const [metrics, setMetrics] = useState<MetricsData>(mockMetrics);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>(mockTimeSeries);
  const [eventsData, setEventsData] = useState<EventData[]>(mockEvents);
  const [pagesData, setPagesData] = useState<PageData[]>(mockPages);
  const [loading, setLoading] = useState(false);

  // In a real implementation, this would fetch data from the Google Analytics API
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, you would fetch data from Google Analytics Data API
        // For now, we'll just use the mock data with slight random variations
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Add random variations to the mock data
        const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        
        setMetrics({
          ...mockMetrics,
          users: Math.round(mockMetrics.users * randomFactor),
          newUsers: Math.round(mockMetrics.newUsers * randomFactor),
          sessions: Math.round(mockMetrics.sessions * randomFactor),
          pageviews: Math.round(mockMetrics.pageviews * randomFactor),
        });
        
        // Randomize time series data
        const newTimeSeriesData = mockTimeSeries.map(dataPoint => ({
          ...dataPoint,
          users: Math.round(dataPoint.users * (0.9 + Math.random() * 0.2)),
          newUsers: Math.round(dataPoint.newUsers * (0.9 + Math.random() * 0.2)),
          sessions: Math.round(dataPoint.sessions * (0.9 + Math.random() * 0.2)),
          pageviews: Math.round(dataPoint.pageviews * (0.9 + Math.random() * 0.2)),
        }));
        
        setTimeSeriesData(newTimeSeriesData);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => window.open('https://analytics.google.com', '_blank')}
          >
            Open Google Analytics
          </Button>
        </div>
      </div>
      
      {/* Key metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((metrics.newUsers / metrics.users) * 100)}% new users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.bounceRate.toFixed(1)}% bounce rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(metrics.avgSessionDuration)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((metrics.engagedSessions / metrics.sessions) * 100)}% engaged sessions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pageviews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {(metrics.pageviews / metrics.sessions).toFixed(1)} pages per session
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Pages
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Track user and session metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), '']}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        });
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#082d7d" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="newUsers" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 6 }} 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="#60a5fa" 
                      activeDot={{ r: 6 }} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Page Views</CardTitle>
              <CardDescription>
                Track total page views over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Page Views']}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        });
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="pageviews" 
                      fill="#082d7d" 
                      name="Page Views"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Events</CardTitle>
              <CardDescription>
                Most frequent user interactions tracked by Google Analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={eventsData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="eventName" 
                      type="category" 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Count']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Event Count" 
                      fill="#3b82f6"
                      label={{ position: 'right', formatter: (value: any) => value.toLocaleString() }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Event Distribution</CardTitle>
              <CardDescription>
                Proportion of each event type
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="h-[300px] w-full max-w-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="eventName"
                    >
                      {eventsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name, props) => [
                        value.toLocaleString(),
                        props.payload.eventName
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>
                Most viewed pages on your site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground">
                  <div className="col-span-4">Page Path</div>
                  <div className="col-span-2 text-right">Views</div>
                  <div className="col-span-2 text-right">Avg. Time</div>
                  <div className="col-span-2 text-right">Entrances</div>
                  <div className="col-span-2 text-right">Bounce Rate</div>
                </div>
                
                <Separator />
                
                {pagesData.map((page, index) => (
                  <div key={index}>
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-4 truncate font-medium">{page.pagePath}</div>
                      <div className="col-span-2 text-right">{page.views.toLocaleString()}</div>
                      <div className="col-span-2 text-right">{formatTime(page.avgTimeOnPage)}</div>
                      <div className="col-span-2 text-right">{page.entrances.toLocaleString()}</div>
                      <div className="col-span-2 text-right">{page.bounceRate.toFixed(1)}%</div>
                    </div>
                    
                    {index < pagesData.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Page Views Distribution</CardTitle>
              <CardDescription>
                How page views are distributed across your site
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="h-[300px] w-full max-w-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pagesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ pagePath, percent }) => {
                        // Truncate long page paths
                        const displayPath = pagePath.length > 15 
                          ? pagePath.substring(0, 12) + '...' 
                          : pagePath;
                        return `${displayPath}: ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="views"
                      nameKey="pagePath"
                    >
                      {pagesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name, props) => [
                        value.toLocaleString(),
                        props.payload.pagePath
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Notes about connecting to real data */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This dashboard currently displays mock data. To connect to real Google Analytics data, 
            you'll need to implement the Google Analytics Data API. See the 
            <a 
              href="https://developers.google.com/analytics/devguides/reporting/data/v1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline mx-1"
            >
              official documentation
            </a>
            for details on setting up API access and querying your analytics data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}