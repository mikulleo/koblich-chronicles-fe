import React from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Image as ImageIcon,
  Plus,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Media } from '@/lib/types'; // Import Media type

// Shared ChartData interface using Media for images
interface ChartData {
  id: string
  image: Media
  timestamp: string
  notes?: {
    setupEntry?: string
    trend?: string
    fundamentals?: string
    other?: string
    tradeStory?: {
      chartRole: string
      storySequence?: number
      decisionNotes?: string
      emotionalState?: string
      marketContext?: string
    }
  }
  annotatedImage?: Media
}

interface ChartCardProps {
  chart: ChartData
  isSelected: boolean
  onClick: () => void
  onCompare?: (chart: ChartData) => void
  isCompared?: boolean
}

export default function ChartCard({ chart, isSelected, onClick, onCompare, isCompared }: ChartCardProps) {
  const getChartRoleColor = (role?: string) => {
    switch (role) {
      case 'entry': return 'bg-green-100 text-green-800'
      case 'management': return 'bg-blue-100 text-blue-800'
      case 'stopAdjustment': return 'bg-yellow-100 text-yellow-800'
      case 'exit': return 'bg-red-100 text-red-800'
      case 'analysis': return 'bg-purple-100 text-purple-800'
      case 'context': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEmotionEmoji = (emotion?: string) => {
    switch (emotion) {
      case 'confident': return '😎'
      case 'cautious': return '🤔'
      case 'uncertain': return '😕'
      case 'fearful': return '😨'
      case 'greedy': return '🤑'
      case 'neutral': return '😐'
      default: return ''
    }
  }

  return (
    <Card 
      className={cn(
        "p-4 min-w-[250px] cursor-pointer hover:shadow-md transition-all",
        isSelected && "ring-2 ring-primary",
        isCompared && "ring-2 ring-blue-500"
      )}
      onClick={onClick}
    >
      <div className="relative mb-3">
        <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden relative">
          <Image 
            src={chart.annotatedImage?.url || chart.image.url}
            alt="Chart thumbnail"
            fill
            className="object-cover"
            sizes="250px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        
        {/* Quick Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              window.open(chart.annotatedImage?.url || chart.image.url, '_blank')
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          {onCompare && (
            <Button
              size="sm"
              variant="secondary"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onCompare(chart)
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {format(new Date(chart.timestamp), 'MMM dd, yyyy')}
          </span>
        </div>
        
        <Badge className={cn("text-xs", getChartRoleColor(chart.notes?.tradeStory?.chartRole))}>
          {chart.notes?.tradeStory?.chartRole || 'reference'}
        </Badge>
        
        {chart.notes?.tradeStory?.decisionNotes && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {chart.notes.tradeStory.decisionNotes}
          </p>
        )}
        
        {(chart.notes?.setupEntry || chart.notes?.trend || chart.notes?.fundamentals || chart.notes?.other) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            <span>Has notes</span>
          </div>
        )}
      </div>
    </Card>
  )
}