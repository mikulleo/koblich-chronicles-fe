// src/components/trade-story/TradeStoryTest.tsx
// Use this component to test if the API is working correctly

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api/client'

interface TradeStoryTestProps {
  tradeId: string
}

export default function TradeStoryTest({ tradeId }: TradeStoryTestProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testApi = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Test 1: Get the trade itself
      const tradeResponse = await apiClient.get(`/trades/${tradeId}`)
      console.log('Trade data:', tradeResponse.data)
      
      // Test 2: Get the story endpoint
      const storyResponse = await apiClient.get(`/trades/${tradeId}/story`)
      console.log('Story response:', storyResponse.data)
      
      setData({
        trade: tradeResponse.data,
        story: storyResponse.data
      })
    } catch (err: any) {
      console.error('API Test Error:', err)
      setError(err.message || 'Unknown error')
      
      if (err.response) {
        console.error('Error response:', err.response.data)
        console.error('Error status:', err.response.status)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testApi()
  }, [tradeId])

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="font-bold">Trade Story API Test</h3>
      
      <div>
        <p className="text-sm text-muted-foreground">Trade ID: {tradeId}</p>
        <p className="text-sm text-muted-foreground">Status: {loading ? 'Loading...' : error ? 'Error' : 'Success'}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded">
          Error: {error}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <div className="p-3 bg-green-100 rounded">
            <p className="font-medium">Trade Found:</p>
            <p className="text-sm">
              Ticker: {typeof data.trade?.ticker === 'object' ? data.trade.ticker.symbol : data.trade?.ticker}
            </p>
            <p className="text-sm">
              Related Charts: {data.trade?.relatedCharts?.length || 0}
            </p>
          </div>

          <div className="p-3 bg-blue-100 rounded">
            <p className="font-medium">Story Response:</p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(data.story, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <Button onClick={testApi} disabled={loading}>
        Retest API
      </Button>
    </div>
  )
}