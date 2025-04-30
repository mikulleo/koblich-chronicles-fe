'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Calendar, Maximize2, Minimize2, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tag as TagType } from './chart-gallery'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAnalytics } from '@/hooks/use-analytics'


// Updated ChartImage interface to properly include tags
export interface ChartImage {
  id: string
  url: string
  title: string
  ticker: string
  tickerId: number
  timestamp: string
  timeframe: string
  tags?: TagType[] // Use TagType from chart-gallery
  notes?: {
    setupEntry?: string | null;
    trend?: string | null;
    fundamentals?: string | null;
    other?: string | null;
  } | string; // Allow string for backward compatibility
  annotatedImageUrl?: string | null
}

interface ChartCarouselProps {
  charts: ChartImage[]
  onChartClick?: (chart: ChartImage) => void
}

export function ChartCarousel({ charts, onChartClick }: ChartCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showAnnotated, setShowAnnotated] = useState(false)
  // Analytics hook
  const analytics = useAnalytics()
  
  // Add zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageDivRef = useRef<HTMLDivElement>(null)
  
  const currentChart = charts[currentIndex]
  const hasAnnotatedImage = currentChart?.annotatedImageUrl !== null && 
                           currentChart?.annotatedImageUrl !== undefined

   // Track chart view on chart change
   useEffect(() => {
    if (currentChart) {
      analytics.trackChartView(currentChart.id, currentChart.ticker)
    }
  }, [currentIndex, currentChart, analytics])
  
  // Reset zoom and pan when changing images
  useEffect(() => {
    resetZoomAndPan()
  }, [currentIndex, showAnnotated])
  
  const resetZoomAndPan = () => {
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
    setIsPanning(false)
  }
  
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % charts.length)
    setShowAnnotated(false) // Reset to original image when navigating
  }, [charts.length])
  
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + charts.length) % charts.length)
    setShowAnnotated(false) // Reset to original image when navigating
  }, [charts.length])
  
  const handleToggleFullscreen = useCallback(() => {
    setFullscreen((prev) => !prev)
    // Reset zoom when toggling fullscreen
    resetZoomAndPan()

    // Track fullscreen toggle
    analytics.trackEvent('chart_fullscreen_toggle', {
      chart_id: currentChart?.id,
      ticker: currentChart?.ticker,
      state: !fullscreen ? 'entered' : 'exited'
    })
  }, [fullscreen, currentChart, analytics])
  
  const handleToggleAnnotated = useCallback(() => {
    if (hasAnnotatedImage) {
      setShowAnnotated((prev) => !prev)

      // Track annotated view toggle
      analytics.trackEvent('chart_annotated_toggle', {
        chart_id: currentChart?.id,
        ticker: currentChart?.ticker,
        state: !showAnnotated ? 'showing_annotated' : 'showing_original'
      })
    }
  }, [hasAnnotatedImage, currentChart, showAnnotated, analytics])
  
  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 5)) // Max zoom 5x
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 1) // Min zoom 1x
      // If zooming back to 1, reset pan position
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 })
      }
      return newZoom
    })
  }, [])
  
  // Calculate pan limits
  const calculatePanLimits = useCallback(() => {
    if (!imageContainerRef.current || !imageDivRef.current) return { maxX: 0, maxY: 0 };
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imageRect = imageDivRef.current.getBoundingClientRect();
    
    // When zoomed, the image is larger than its container
    // The actual size difference is what determines how far we can pan
    // We divide by 2 because we're centering the image and can pan in both directions
    const maxX = Math.max(0, (imageRect.width - containerRect.width) / 2);
    const maxY = Math.max(0, (imageRect.height - containerRect.height) / 2);
    
    return { maxX, maxY };
  }, []);
  
  // Pan functions
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only enable panning when zoomed in
    if (zoomLevel > 1) {
      setIsPanning(true)
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      })
      
      // Change cursor
      if (imageContainerRef.current) {
        imageContainerRef.current.style.cursor = 'grabbing'
      }
      
      // Prevent image drag behavior
      e.preventDefault()
    }
  }, [zoomLevel, panPosition])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      const newX = e.clientX - startPanPosition.x
      const newY = e.clientY - startPanPosition.y
      
      // Get the current pan limits based on container and image size
      const { maxX, maxY } = calculatePanLimits();
      
      // Limit pan to the calculated bounds
      const limitedX = Math.max(Math.min(newX, maxX), -maxX)
      const limitedY = Math.max(Math.min(newY, maxY), -maxY)
      
      setPanPosition({
        x: limitedX,
        y: limitedY
      })
      
      e.preventDefault()
    }
  }, [isPanning, startPanPosition, zoomLevel, calculatePanLimits])
  
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      // Reset cursor
      if (imageContainerRef.current) {
        imageContainerRef.current.style.cursor = 'grab'
      }
    }
  }, [isPanning])
  
  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only handle wheel events when fullscreen
    if (fullscreen) {
      if (e.deltaY < 0) {
        // Scroll up - zoom in
        handleZoomIn()
      } else {
        // Scroll down - zoom out
        handleZoomOut()
      }
      
      e.preventDefault() // Prevent page scroll
    }
  }, [fullscreen, handleZoomIn, handleZoomOut])
  
  const handleChartClick = () => {
    // Only trigger the click handler if we're not panning and zoom is 1
    if (!isPanning && zoomLevel === 1 && onChartClick && currentChart) {
      // Track chart click
      analytics.trackEvent('chart_clicked', {
        chart_id: currentChart.id,
        ticker: currentChart.ticker
      })

      onChartClick(currentChart)
    }
  }
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'f') {
        handleToggleFullscreen()
      } else if (e.key === 'a' && hasAnnotatedImage) {
        handleToggleAnnotated()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        resetZoomAndPan()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    // Add global mouse up to handle case where mouse is released outside the component
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    handleNext, 
    handlePrevious, 
    handleToggleFullscreen, 
    handleToggleAnnotated, 
    hasAnnotatedImage, 
    handleZoomIn, 
    handleZoomOut, 
    handleMouseUp
  ])
  
  // Format date for display
  const formatChartDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }
  
  if (!charts.length) {
    return (
      <div className="flex justify-center items-center p-12 border rounded-lg">
        <p className="text-muted-foreground">No charts available</p>
      </div>
    )
  }
  
  // Fullscreen styling classes
  const fullscreenContainerClass = fullscreen 
    ? "fixed inset-0 z-50 bg-background p-4 flex flex-col" 
    : "relative";
  
  const cardClass = fullscreen 
    ? "overflow-hidden h-full flex flex-col flex-grow" 
    : "overflow-hidden";
  
  const cardContentClass = fullscreen 
    ? "p-0 h-full flex flex-col" 
    : "p-0";
  
  const imageContainerClass = fullscreen 
    ? "flex-grow relative overflow-hidden" 
    : "relative h-[60vh] overflow-hidden";
  
  // Determine if we should show zoom controls
  const showZoomControls = fullscreen;
  
  // Calculate image transform for zoom and pan
  const imageTransform = `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`;
  
  // Determine cursor style based on zoom and panning state
  const imageCursorStyle = zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default';

  // Helper function to check if a notes section has content
  const hasNoteContent = (content: string | null | undefined): boolean => {
    return !!content && content.trim() !== '';
  }
  
  // Helper function to render notes based on the structure
  const renderNotes = () => {
    if (!currentChart) return null;
    
    // Handle string notes (backward compatibility)
    if (typeof currentChart.notes === 'string') {
      return currentChart.notes ? (
        <p className="text-sm mt-2 text-muted-foreground">{currentChart.notes}</p>
      ) : null;
    }
    
    // Handle structured notes
    if (!currentChart.notes) return null;
    
    const { setupEntry, trend, fundamentals, other } = currentChart.notes;
    const hasAnyNotes = 
      hasNoteContent(setupEntry) || 
      hasNoteContent(trend) || 
      hasNoteContent(fundamentals) || 
      hasNoteContent(other);
    
    if (!hasAnyNotes) return null;
    
    return (
      <div className="mt-2 space-y-2">
        {hasNoteContent(setupEntry) && (
          <div>
            <span className="text-sm font-medium">Setup / Entry:</span>
            <p className="text-sm text-muted-foreground">{setupEntry}</p>
          </div>
        )}
        
        {hasNoteContent(trend) && (
          <div>
            <span className="text-sm font-medium">Trend:</span>
            <p className="text-sm text-muted-foreground">{trend}</p>
          </div>
        )}
        
        {hasNoteContent(fundamentals) && (
          <div>
            <span className="text-sm font-medium">Fundamentals:</span>
            <p className="text-sm text-muted-foreground">{fundamentals}</p>
          </div>
        )}
        
        {hasNoteContent(other) && (
          <div>
            <span className="text-sm font-medium">Other:</span>
            <p className="text-sm text-muted-foreground">{other}</p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div ref={containerRef} className={fullscreenContainerClass}>
      <Card className={cardClass}>
        <CardContent className={cardContentClass}>
          <div 
            ref={imageContainerRef} 
            className={imageContainerClass}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Chart Image */}
            {currentChart && (
              <div 
                className="relative w-full h-full"
                style={{ 
                  overflow: 'hidden',
                }}
              >
                <div
                  ref={imageDivRef}
                  className="relative w-full h-full transition-transform duration-100 origin-center"
                  style={{ 
                    transform: imageTransform,
                    cursor: imageCursorStyle,
                  }}
                >
                  <Image 
                    src={showAnnotated && currentChart.annotatedImageUrl ? currentChart.annotatedImageUrl : currentChart.url}
                    alt={currentChart.title}
                    fill
                    sizes="100vw"
                    priority
                    className="object-contain"
                    onClick={handleChartClick}
                    unoptimized={fullscreen} // Disable optimization for better zoom quality when fullscreen
                    style={{
                      pointerEvents: isPanning ? 'none' : 'auto', // Prevent image click events while panning
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Navigation Controls */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 backdrop-blur z-10"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 backdrop-blur z-10"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            {/* Fullscreen Toggle */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-background/50 backdrop-blur z-10"
              onClick={handleToggleFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            
            {/* Zoom Controls - only visible in fullscreen mode */}
            {showZoomControls && (
              <div className="absolute top-2 right-12 flex space-x-2 z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-background/50 backdrop-blur"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 5}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-background/50 backdrop-blur"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                {zoomLevel > 1 && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-background/50 backdrop-blur"
                    onClick={resetZoomAndPan}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Zoom level indicator */}
                <div className="flex items-center justify-center rounded-full bg-background/50 backdrop-blur px-2 text-xs">
                  {Math.round(zoomLevel * 100)}%
                </div>
              </div>
            )}
            
            {/* Annotated Image Toggle (only show if annotated image exists) */}
            {hasAnnotatedImage && (
              <Button
                variant={showAnnotated ? "default" : "secondary"}
                size="sm"
                className="absolute top-2 left-2 rounded-full bg-background/50 backdrop-blur z-10"
                onClick={handleToggleAnnotated}
              >
                {showAnnotated ? 'Show Original' : 'Show Annotated'}
              </Button>
            )}
            
            {/* Subtle pagination indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/40 backdrop-blur text-xs text-muted-foreground/80 z-10">
              {currentIndex + 1}/{charts.length}
            </div>
          </div>
          
          {/* Chart Info Panel - Updated for structured notes */}
          <div className="p-3 bg-card border-t">
            <div className="flex items-center justify-between">
              {/* Symbol */}
              <div className="font-medium text-lg">
                {currentChart?.ticker}
              </div>
              
              {/* Badge Group */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {currentChart?.timeframe}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {currentChart ? formatChartDate(currentChart.timestamp) : ''}
                </Badge>
              </div>
            </div>
            
            {/* Tags */}
            {currentChart?.tags && currentChart.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {currentChart.tags.map((tag) => (
                  <Badge 
                    key={tag.id} 
                    variant="outline"
                    className="rounded-sm px-1 font-normal"
                    style={{ 
                      borderColor: tag.color || '#9E9E9E',
                      backgroundColor: `${tag.color}20` || '#9E9E9E20'
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Structured Notes */}
            {renderNotes()}
            
            {/* Keyboard Shortcuts - only in fullscreen */}
            {fullscreen && (
              <div className="text-xs text-muted-foreground text-center mt-2">
                <span className="inline-block mx-1">⬅️➡️: Navigate</span>
                <span className="inline-block mx-1">+/-: Zoom</span>
                <span className="inline-block mx-1">0: Reset</span>
                <span className="inline-block mx-1">F: Exit</span>
                {hasAnnotatedImage && <span className="inline-block mx-1">A: Annotated</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}