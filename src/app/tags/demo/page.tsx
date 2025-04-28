"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'

// Mock data for tags with chart counts and monthly usage
const MOCK_TAGS = [
  { 
    id: "1", 
    name: "Breakout", 
    color: "#2196F3", 
    actualChartCount: 45,
    monthlyUsage: {
      "2023-01": 2, "2023-02": 3, "2023-03": 5,
      "2023-04": 8, "2023-05": 6, "2023-06": 4,
      "2023-07": 3, "2023-08": 2, "2023-09": 1,
      "2023-10": 4, "2023-11": 5, "2023-12": 2
    },
    bestWindow: {
      startMonth: "2023-03",
      endMonth: "2023-05",
      count: 19
    }
  },
  { 
    id: "2", 
    name: "Cup & Handle", 
    color: "#4CAF50", 
    actualChartCount: 32,
    monthlyUsage: {
      "2023-01": 1, "2023-02": 2, "2023-03": 3,
      "2023-04": 2, "2023-05": 1, "2023-06": 3,
      "2023-07": 4, "2023-08": 5, "2023-09": 6,
      "2023-10": 3, "2023-11": 1, "2023-12": 1
    },
    bestWindow: {
      startMonth: "2023-07",
      endMonth: "2023-09",
      count: 15
    }
  },
  { 
    id: "3", 
    name: "Head & Shoulders", 
    color: "#FF5252", 
    actualChartCount: 28,
    monthlyUsage: {
      "2023-01": 3, "2023-02": 2, "2023-03": 1,
      "2023-04": 0, "2023-05": 1, "2023-06": 2,
      "2023-07": 3, "2023-08": 5, "2023-09": 6,
      "2023-10": 3, "2023-11": 2, "2023-12": 0
    },
    bestWindow: {
      startMonth: "2023-07",
      endMonth: "2023-09",
      count: 14
    }
  },
  { 
    id: "4", 
    name: "Double Bottom", 
    color: "#9C27B0", 
    actualChartCount: 24,
    monthlyUsage: {
      "2023-01": 4, "2023-02": 5, "2023-03": 6,
      "2023-04": 2, "2023-05": 1, "2023-06": 0,
      "2023-07": 0, "2023-08": 1, "2023-09": 2,
      "2023-10": 1, "2023-11": 1, "2023-12": 1
    },
    bestWindow: {
      startMonth: "2023-01",
      endMonth: "2023-03",
      count: 15
    }
  },
  { 
    id: "5", 
    name: "Trend Line Break", 
    color: "#FF9800", 
    actualChartCount: 20,
    monthlyUsage: {
      "2023-01": 0, "2023-02": 1, "2023-03": 2,
      "2023-04": 3, "2023-05": 4, "2023-06": 5,
      "2023-07": 1, "2023-08": 0, "2023-09": 1,
      "2023-10": 2, "2023-11": 1, "2023-12": 0
    },
    bestWindow: {
      startMonth: "2023-04",
      endMonth: "2023-06",
      count: 12
    }
  },
  { 
    id: "6", 
    name: "Flag Pattern", 
    color: "#009688", 
    actualChartCount: 18,
    monthlyUsage: {
      "2023-01": 1, "2023-02": 1, "2023-03": 2,
      "2023-04": 2, "2023-05": 2, "2023-06": 1,
      "2023-07": 1, "2023-08": 2, "2023-09": 2,
      "2023-10": 1, "2023-11": 2, "2023-12": 1
    },
    bestWindow: {
      startMonth: "2023-07",
      endMonth: "2023-09",
      count: 5
    }
  },
  { 
    id: "7", 
    name: "Gap Fill", 
    color: "#E91E63", 
    actualChartCount: 16,
    monthlyUsage: {
      "2023-01": 0, "2023-02": 0, "2023-03": 1,
      "2023-04": 2, "2023-05": 3, "2023-06": 4,
      "2023-07": 2, "2023-08": 1, "2023-09": 1,
      "2023-10": 0, "2023-11": 1, "2023-12": 1
    },
    bestWindow: {
      startMonth: "2023-04",
      endMonth: "2023-06",
      count: 9
    }
  },
  { 
    id: "8", 
    name: "Channel", 
    color: "#3F51B5", 
    actualChartCount: 15,
    monthlyUsage: {
      "2023-01": 2, "2023-02": 1, "2023-03": 0,
      "2023-04": 1, "2023-05": 2, "2023-06": 3,
      "2023-07": 3, "2023-08": 2, "2023-09": 1,
      "2023-10": 0, "2023-11": 0, "2023-12": 0
    },
    bestWindow: {
      startMonth: "2023-05",
      endMonth: "2023-07",
      count: 8
    }
  },
  { 
    id: "9", 
    name: "Support/Resistance", 
    color: "#607D8B", 
    actualChartCount: 12,
    monthlyUsage: {
      "2023-01": 1, "2023-02": 1, "2023-03": 1,
      "2023-04": 1, "2023-05": 1, "2023-06": 1,
      "2023-07": 1, "2023-08": 1, "2023-09": 1,
      "2023-10": 1, "2023-11": 1, "2023-12": 1
    },
    bestWindow: {
      startMonth: "2023-01",
      endMonth: "2023-03",
      count: 3
    }
  },
  { 
    id: "10", 
    name: "MACD Cross", 
    color: "#8BC34A", 
    actualChartCount: 10,
    monthlyUsage: {
      "2023-01": 0, "2023-02": 0, "2023-03": 0,
      "2023-04": 1, "2023-05": 2, "2023-06": 3,
      "2023-07": 2, "2023-08": 1, "2023-09": 0,
      "2023-10": 0, "2023-11": 1, "2023-12": 0
    },
    bestWindow: {
      startMonth: "2023-04",
      endMonth: "2023-06",
      count: 6
    }
  }
];

export default function TagsStatisticsDemo() {
  // Format month labels (e.g., "2023-01" to "Jan 2023")
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Prepare data for top tags bar chart
  const barChartData = MOCK_TAGS.map(tag => ({
    name: tag.name,
    value: tag.actualChartCount,
    fill: tag.color
  }));

  // Prepare data for pie chart
  const pieChartData = MOCK_TAGS.map(tag => ({
    name: tag.name,
    value: tag.actualChartCount,
    fill: tag.color
  }));

  // Prepare data for best 3-month windows chart
  const bestWindowsData = MOCK_TAGS.map(tag => ({
    name: tag.name,
    count: tag.bestWindow.count,
    window: `${formatMonthLabel(tag.bestWindow.startMonth)} - ${formatMonthLabel(tag.bestWindow.endMonth)}`,
    fill: tag.color
  }));

  // Custom tooltip formatter for percentage values
  const percentFormatter = (value: number) => `${value.toFixed(2)}%`;

  // Custom pie chart label renderer to display values inside the chart
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    // Only render label if the segment is large enough
    if (percent < 0.05) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {name.length > 10 ? `${name.substring(0, 10)}...` : name}
      </text>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Tag Statistics Demo</h1>
      <p className="text-muted-foreground mb-8">
        This page shows demo data with generated patterns to demonstrate the tag statistics features.
      </p>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Tags by Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                      height={60}
                      tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any) => [`${value} charts`, 'Count']}
                      labelFormatter={(label) => `Tag: ${label}`}
                    />
                    <Bar dataKey="value">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tag Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [`${value} charts`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Best 3-Month Windows Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Best 3-Month Windows for Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bestWindowsData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }}
                    height={80}
                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value: any) => [`${value} charts`, 'Count']}
                    labelFormatter={(label) => {
                      const dataItem = bestWindowsData.find(item => item.name === label);
                      return `${label}\nBest Window: ${dataItem?.window}`;
                    }}
                  />
                  <Bar dataKey="count" name="Charts in window">
                    {bestWindowsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 bg-muted p-4 rounded-md text-sm">
              <h3 className="font-medium mb-2">Chart Analysis</h3>
              <p className="mb-4">This chart shows the most active 3-month window for each tag pattern. Key insights:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Seasonal Patterns:</strong> Breakout patterns were most common during Spring (Mar-May 2023)</li>
                <li><strong>Correlated Tags:</strong> "Cup & Handle" and "Head & Shoulders" both peaked during Jul-Sep 2023</li>
                <li><strong>Infrequent Patterns:</strong> "Support/Resistance" shows consistent but low usage throughout the year</li>
                <li><strong>Technical Analysis Cycle:</strong> Different patterns tend to become popular in different market conditions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        {/* Monthly Trend Analysis for Selected Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Pattern Usage Timeline (2023)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { month: 'Jan', Breakout: 2, CupHandle: 1, HeadShoulders: 3, DoubleBottom: 4, TrendLineBreak: 0 },
                    { month: 'Feb', Breakout: 3, CupHandle: 2, HeadShoulders: 2, DoubleBottom: 5, TrendLineBreak: 1 },
                    { month: 'Mar', Breakout: 5, CupHandle: 3, HeadShoulders: 1, DoubleBottom: 6, TrendLineBreak: 2 },
                    { month: 'Apr', Breakout: 8, CupHandle: 2, HeadShoulders: 0, DoubleBottom: 2, TrendLineBreak: 3 },
                    { month: 'May', Breakout: 6, CupHandle: 1, HeadShoulders: 1, DoubleBottom: 1, TrendLineBreak: 4 },
                    { month: 'Jun', Breakout: 4, CupHandle: 3, HeadShoulders: 2, DoubleBottom: 0, TrendLineBreak: 5 },
                    { month: 'Jul', Breakout: 3, CupHandle: 4, HeadShoulders: 3, DoubleBottom: 0, TrendLineBreak: 1 },
                    { month: 'Aug', Breakout: 2, CupHandle: 5, HeadShoulders: 5, DoubleBottom: 1, TrendLineBreak: 0 },
                    { month: 'Sep', Breakout: 1, CupHandle: 6, HeadShoulders: 6, DoubleBottom: 2, TrendLineBreak: 1 },
                    { month: 'Oct', Breakout: 4, CupHandle: 3, HeadShoulders: 3, DoubleBottom: 1, TrendLineBreak: 2 },
                    { month: 'Nov', Breakout: 5, CupHandle: 1, HeadShoulders: 2, DoubleBottom: 1, TrendLineBreak: 1 },
                    { month: 'Dec', Breakout: 2, CupHandle: 1, HeadShoulders: 0, DoubleBottom: 1, TrendLineBreak: 0 },
                  ]}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Breakout" name="Breakout" fill="#2196F3" />
                  <Bar dataKey="CupHandle" name="Cup & Handle" fill="#4CAF50" />
                  <Bar dataKey="HeadShoulders" name="Head & Shoulders" fill="#FF5252" />
                  <Bar dataKey="DoubleBottom" name="Double Bottom" fill="#9C27B0" />
                  <Bar dataKey="TrendLineBreak" name="Trend Line Break" fill="#FF9800" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 bg-muted p-4 rounded-md text-sm">
              <h3 className="font-medium mb-2">Pattern Usage Insights</h3>
              <p>Timeline analysis reveals how chart pattern popularity shifts throughout the year:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Q1:</strong> Double Bottom patterns dominated early in the year</li>
                <li><strong>Q2:</strong> Breakout patterns peaked in April, followed by Trend Line Break patterns in June</li>
                <li><strong>Q3:</strong> Cup & Handle and Head & Shoulders patterns became dominant in August-September</li>
                <li><strong>Q4:</strong> More balanced distribution with Breakout patterns making a comeback in November</li>
              </ul>
              <p className="mt-3">These shifting patterns may correlate with changing market conditions and trader sentiment throughout the year.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}