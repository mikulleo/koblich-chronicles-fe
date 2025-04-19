"use client"

import React, { useCallback, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

export interface ChartImage {
  id: string
  url: string
  title: string
  ticker: string
  timestamp: string
  timeframe: 'daily' | 'weekly' | 'monthly' | 'intraday' | 'other'
  tags?: string[]
}

interface ChartCarouselProps {
  charts: ChartImage[]
  onChartClick?: (chart: ChartImage) => void
}

export function ChartCarousel({ charts, onChartClick }: ChartCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        scrollPrev()
      } else if (e.key === 'ArrowRight') {
        scrollNext()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollPrev, scrollNext])

  if (charts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-md">
        <p className="text-muted-foreground">No charts found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {charts.map((chart) => (
            <div 
              key={chart.id} 
              className="flex-[0_0_100%] min-w-0 relative p-2"
              onClick={() => onChartClick?.(chart)}
            >
              <div className="relative bg-card border rounded-md p-4 h-[500px] group">
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-sm font-medium z-10">
                  {chart.ticker} - {new Date(chart.timestamp).toLocaleDateString()} ({chart.timeframe})
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-1">
                    <div className="relative w-full h-[80vh]">
                      <Image
                        src={chart.url}
                        alt={chart.title}
                        className="object-contain"
                        fill
                        unoptimized
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="relative h-full w-full">
                  <Image
                    src={chart.url}
                    alt={chart.title}
                    className="object-contain"
                    fill
                    unoptimized
                  />
                </div>
                
                {chart.tags && chart.tags.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    {chart.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={scrollNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="mt-4 flex justify-center gap-2">
        <p className="text-sm text-muted-foreground">
          Use arrow keys for navigation or click the arrows
        </p>
      </div>
    </div>
  )
}