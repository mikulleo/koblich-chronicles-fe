// src/components/trade-story/StoryModeViewer.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// Adjusted ChartData interface to allow for Media (image/annotatedImage)
interface ChartData {
  id: string
  image: {
    url: string
    filename: string
  }
  timestamp: string
  tradeStory?: {
    chartRole: string
    storySequence?: number
    decisionNotes?: string
    emotionalState?: string
    marketContext?: string
  }
  notes?: {
    setupEntry?: string
    trend?: string
    fundamentals?: string
    other?: string
    tradeStory?: any; // To filter out this object from notes rendering
  }
  annotatedImage?: { // Assuming structure based on previous context, adjust if needed
    url: string;
    filename?: string;
  };
}

interface TimelineEvent {
  date: string
  type: 'entry' | 'stopModified' | 'exit'
  title: string
  description: string
  details: {
    price?: number
    shares?: number
    normalizationFactor?: number;
    riskAmount?: number
    previousStop?: number
    newStop?: number
    notes?: string
    profitLossPercent?: number // Normal % for exit
    normalizedProfitLossPercent?: number // Normalized % for exit
  }
}

interface StoryMetadata {
  ticker: {
    symbol: string
  }
  tradeType: string
  setupType?: string
  status: string
  duration: number
  // totalReturn: number; // Removed from metadata to avoid dollar display
  totalReturnPercent: number
  normalizedTotalReturnPercent: number // Added normalized
  rRatio: number
  normalizedRRatio: number // Added normalized
  chartCount: number
  eventCount: number
}

// Define slide types - updated IntroSlide content
type IntroSlide = {
  type: 'intro'
  title: string
  subtitle: string
  content: {
    duration: number
    returnPercent: number // Now directly from StoryMetadata
    normalizedReturnPercent: number // Added normalized
    rRatio: number
    normalizedRRatio: number // Added normalized
    chartCount: number // Added chartCount for display
  }
}

type ChartSlide = {
  type: 'chart'
  chart: ChartData
  index: number
  total: number
  relevantEvents: TimelineEvent[]
}

type SummarySlide = {
  type: 'summary'
  title: string
  metadata: StoryMetadata
  notes?: string
}

type StorySlide = IntroSlide | ChartSlide | SummarySlide

interface StoryModeViewerProps {
  storyData: {
    metadata: StoryMetadata
    timeline: TimelineEvent[]
    charts: ChartData[]
    notes?: string
  }
  onClose: () => void
}

export default function StoryModeViewer({ storyData, onClose }: StoryModeViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(3000) // milliseconds per slide

  // Create story slides from charts and major events
  const storySlides = React.useMemo((): StorySlide[] => {
    const slides: StorySlide[] = []
    
    // Introduction slide
    slides.push({
      type: 'intro',
      title: `${storyData.metadata.ticker.symbol} Trade Story`,
      subtitle: `${storyData.metadata.tradeType.toUpperCase()} • ${storyData.metadata.setupType || 'N/A'}`,
      content: {
        duration: storyData.metadata.duration,
        returnPercent: storyData.metadata.totalReturnPercent,
        normalizedReturnPercent: storyData.metadata.normalizedTotalReturnPercent,
        rRatio: storyData.metadata.rRatio,
        normalizedRRatio: storyData.metadata.normalizedRRatio,
        chartCount: storyData.metadata.chartCount, // Pass chartCount
      }
    })
    
    // Chart slides with context
    storyData.charts.forEach((chart, index) => {
      // Find relevant events around this chart's timestamp
      const chartDate = new Date(chart.timestamp)
      const relevantEvents = storyData.timeline.filter(event => {
        const eventDate = new Date(event.date)
        const daysDiff = Math.abs((chartDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff <= 2 // Events within 2 days of chart
      })
      
      slides.push({
        type: 'chart',
        chart,
        index: index + 1,
        total: storyData.charts.length,
        relevantEvents
      })
    })
    
    // Summary slide
    slides.push({
      type: 'summary',
      title: 'Trade Summary',
      metadata: storyData.metadata,
      notes: storyData.notes
    })
    
    return slides
  }, [storyData])

  const currentSlide = storySlides[currentIndex]

  const goToNext = useCallback(() => {
    if (currentIndex < storySlides.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex, storySlides.length])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case ' ':
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break
        case 'Escape':
          onClose()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, isPlaying, goToNext, goToPrevious, onClose])

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && currentIndex < storySlides.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
      }, playbackSpeed)
      
      return () => clearTimeout(timer)
    } else if (isPlaying && currentIndex === storySlides.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentIndex, playbackSpeed, storySlides.length])

  // Hide controls after inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(timer)
      timer = setTimeout(() => setShowControls(false), 3000)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timer)
    }
  }, [])

  const renderSlide = () => {
    if (currentSlide.type === 'intro') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h1 className="text-6xl font-bold mb-4">{currentSlide.title}</h1>
          <p className="text-2xl text-muted-foreground mb-12">{currentSlide.subtitle}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
            <div className="bg-card p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Duration</p>
              <p className="text-3xl font-bold">{currentSlide.content.duration} days</p>
            </div>
            {/* Display Return % (Normal & Normalized) */}
            <div className="bg-card p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Return %</p>
              <p className={cn(
                "text-3xl font-bold",
                currentSlide.content.returnPercent >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {currentSlide.content.returnPercent?.toFixed(2)}%
                {currentSlide.content.normalizedReturnPercent !== currentSlide.content.returnPercent && (
                  <span className="ml-1 text-base text-muted-foreground">
                    ({currentSlide.content.normalizedReturnPercent?.toFixed(2)}% N)
                  </span>
                )}
              </p>
            </div>
            {/* Display R-Ratio (Normal & Normalized) */}
            <div className="bg-card p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">R-Ratio</p>
              <p className="text-3xl font-bold">
                {currentSlide.content.rRatio?.toFixed(2)}R
                {currentSlide.content.normalizedRRatio !== currentSlide.content.rRatio && (
                  <span className="ml-1 text-base text-muted-foreground">
                    ({currentSlide.content.normalizedRRatio?.toFixed(2)}R N)
                  </span>
                )}
              </p>
            </div>
            {/* Display Charts count */}
            <div className="bg-card p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Charts</p>
              <p className="text-3xl font-bold">{currentSlide.content.chartCount}</p>
            </div>
          </div>
        </div>
      )
    } else if (currentSlide.type === 'chart') {
      return (
        <div className="flex h-full">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative max-h-full max-w-full">
              <Image 
                src={currentSlide.chart.annotatedImage?.url || currentSlide.chart.image.url} // Use annotated if present, fallback to normal
                alt="Chart"
                width={1200}
                height={800}
                className="object-contain rounded-lg shadow-2xl"
                priority
              />
            </div>
          </div>
          
          <div className="w-96 bg-card p-6 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Chart {currentSlide.index} of {currentSlide.total}
                </p>
                <h2 className="text-2xl font-bold mb-2">
                  {format(new Date(currentSlide.chart.timestamp), 'MMMM dd,yyyy')}
                </h2>
                {currentSlide.chart.tradeStory?.chartRole && (
                  <Badge className="mb-4">
                    {currentSlide.chart.tradeStory.chartRole}
                  </Badge>
                )}
              </div>
              
              {currentSlide.chart.tradeStory?.decisionNotes && (
                <div>
                  <h3 className="font-semibold mb-2">Decision Process</h3>
                  <p className="text-sm">{currentSlide.chart.tradeStory.decisionNotes}</p>
                </div>
              )}
              
              {currentSlide.chart.tradeStory?.marketContext && (
                <div>
                  <h3 className="font-semibold mb-2">Market Context</h3>
                  <p className="text-sm">{currentSlide.chart.tradeStory.marketContext}</p>
                </div>
              )}
              
              {currentSlide.relevantEvents.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Related Events</h3>
                  {currentSlide.relevantEvents.map((event, idx) => (
                    <div key={idx} className="bg-muted p-3 rounded mb-2">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), 'MMM dd')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {currentSlide.chart.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Chart Notes</h3>
                  {Object.entries(currentSlide.chart.notes).map(([key, value]) => 
                    // Filter out the 'tradeStory' key and ensure the value is a string and not empty
                    // Only render if value is a string and not just whitespace
                    (key !== 'tradeStory' && typeof value === 'string' && value.trim()) ? (
                      <p key={key} className="text-sm mb-2">
                        <strong className="capitalize">{key}:</strong> {value}
                      </p>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    } else if (currentSlide.type === 'summary') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8">{currentSlide.title}</h1>
          
          <div className="bg-card p-8 rounded-lg w-full mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Final Status</p>
                <p className="text-xl font-semibold">{currentSlide.metadata.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Return</p>
                <p className={cn(
                  "text-xl font-semibold",
                  currentSlide.metadata.totalReturnPercent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {currentSlide.metadata.totalReturnPercent?.toFixed(2)}%
                  {currentSlide.metadata.normalizedTotalReturnPercent !== currentSlide.metadata.totalReturnPercent && (
                    <span className="ml-1 text-base text-muted-foreground">
                      ({currentSlide.metadata.normalizedTotalReturnPercent?.toFixed(2)}% N)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">R-Ratio</p>
                <p className="text-xl font-semibold">
                  {currentSlide.metadata.rRatio?.toFixed(2)}R
                  {currentSlide.metadata.normalizedRRatio !== currentSlide.metadata.rRatio && (
                    <span className="ml-1 text-base text-muted-foreground">
                      ({currentSlide.metadata.normalizedRRatio?.toFixed(2)}R N)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {currentSlide.notes && (
            <div className="bg-card p-6 rounded-lg w-full">
              <h3 className="font-semibold mb-3">Trade Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{currentSlide.notes}</p>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Progress Bar */}
      <Progress 
        value={(currentIndex / (storySlides.length - 1)) * 100} 
        className="h-1"
      />
      
      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {renderSlide()}
      </div>
      
      {/* Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/80 to-transparent transition-opacity duration-300",
        !showControls && "opacity-0"
      )}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === storySlides.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {storySlides.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const speeds = [2000, 3000, 5000, 8000]
                const currentIdx = speeds.indexOf(playbackSpeed)
                setPlaybackSpeed(speeds[(currentIdx + 1) % speeds.length])
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              {playbackSpeed / 1000}s
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}