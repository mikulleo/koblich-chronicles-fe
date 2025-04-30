// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { JWT } from 'google-auth-library';

// Type definitions
interface TimeRangeParams {
  startDate: string;
  endDate: string;
}

// Helper function to get date range for different time periods
function getDateRangeForPeriod(period: string): TimeRangeParams {
  const today = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'today':
      return {
        startDate: formatDate(today),
        endDate: formatDate(today)
      };
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(startDate)
      };
    case 'last7days':
      startDate.setDate(today.getDate() - 7);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
      };
    case 'last30days':
      startDate.setDate(today.getDate() - 30);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
      };
    case 'thisMonth':
      startDate.setDate(1);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
      };
    case 'lastMonth':
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      const firstDayLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: formatDate(firstDayLastMonth),
        endDate: formatDate(lastDayLastMonth)
      };
    default:
      // Default to last 30 days
      startDate.setDate(today.getDate() - 30);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
      };
  }
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Initialize the Analytics Data client with JWT auth
function getAnalyticsClient() {
  try {
    // Parse the credentials from environment variable
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_ANALYTICS_CREDENTIALS || '', 'base64').toString()
    );
    
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });
    
    return client;
  } catch (error) {
    console.error('Error initializing Google Analytics client:', error);
    throw new Error('Failed to initialize Google Analytics client');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'last30days';
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Google Analytics property ID not configured' },
        { status: 500 }
      );
    }

    // Calculate date range
    const { startDate, endDate } = getDateRangeForPeriod(timeRange);
    
    // Initialize analytics client
    const analyticsClient = getAnalyticsClient();
    
    // Fetch overall metrics
    const metricsResponse = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagedSessions' },
      ],
    });

    // Fetch time series data
    const timeSeriesResponse = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: 'date' },
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          dimension: {
            dimensionName: 'date',
          },
          desc: false,
        },
      ],
    });

    // Fetch top events
    const eventsResponse = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: 'eventName' },
      ],
      metrics: [
        { name: 'eventCount' },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'eventCount',
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    // Fetch top pages
    const pagesResponse = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'entrances' },
        { name: 'bounceRate' },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'screenPageViews',
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    // Process metrics data
    const metrics = {
      users: parseInt(metricsResponse[0].rows?.[0].metricValues?.[0].value || '0'),
      newUsers: parseInt(metricsResponse[0].rows?.[0].metricValues?.[1].value || '0'),
      sessions: parseInt(metricsResponse[0].rows?.[0].metricValues?.[2].value || '0'),
      pageviews: parseInt(metricsResponse[0].rows?.[0].metricValues?.[3].value || '0'),
      bounceRate: parseFloat(metricsResponse[0].rows?.[0].metricValues?.[4].value || '0'),
      avgSessionDuration: parseFloat(metricsResponse[0].rows?.[0].metricValues?.[5].value || '0'),
      engagedSessions: parseInt(metricsResponse[0].rows?.[0].metricValues?.[6].value || '0'),
      screenPageViews: parseInt(metricsResponse[0].rows?.[0].metricValues?.[3].value || '0'),
    };

    // Process time series data
    const timeSeriesData = timeSeriesResponse[0].rows?.map(row => ({
      date: row.dimensionValues?.[0].value || '',
      users: parseInt(row.metricValues?.[0].value || '0'),
      newUsers: parseInt(row.metricValues?.[1].value || '0'),
      sessions: parseInt(row.metricValues?.[2].value || '0'),
      pageviews: parseInt(row.metricValues?.[3].value || '0'),
    })) || [];

    // Process events data
    const totalEvents = eventsResponse[0].rows?.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0].value || '0'), 
      0
    ) || 0;

    const eventsData = eventsResponse[0].rows?.map(row => {
      const count = parseInt(row.metricValues?.[0].value || '0');
      return {
        eventName: row.dimensionValues?.[0].value || '',
        count,
        percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
      };
    }) || [];

    // Process pages data
    const pagesData = pagesResponse[0].rows?.map(row => ({
      pagePath: row.dimensionValues?.[0].value || '',
      views: parseInt(row.metricValues?.[0].value || '0'),
      avgTimeOnPage: parseFloat(row.metricValues?.[1].value || '0'),
      entrances: parseInt(row.metricValues?.[2].value || '0'),
      bounceRate: parseFloat(row.metricValues?.[3].value || '0'),
    })) || [];

    // Return all data
    return NextResponse.json({
      metrics,
      timeSeriesData,
      eventsData,
      pagesData,
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}