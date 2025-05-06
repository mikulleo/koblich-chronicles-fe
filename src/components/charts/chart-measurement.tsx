// src/components/charts/chart-measurement.tsx
import React, { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ruler, X } from 'lucide-react'

export interface Measurement {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  startPrice: number
  endPrice: number
  percentageChange: number
  name?: string
}

interface ChartMeasurementProps {
  isActive: boolean
  onToggle: () => void
  containerRef: React.RefObject<HTMLDivElement>
  imageContainerRef: React.RefObject<HTMLDivElement>
  zoomLevel: number
  panPosition: { x: number, y: number }
  onMeasurementComplete?: (measurement: Measurement) => void
  onMeasurementsCleared?: () => void  // New callback for when measurements are cleared
  onMeasurementRemoved?: (id: string) => void  // New callback for when a measurement is removed
  savedMeasurements?: Measurement[]
}

export function ChartMeasurement({ 
  isActive, 
  onToggle, 
  containerRef,
  imageContainerRef,
  zoomLevel,
  panPosition,
  onMeasurementComplete,
  onMeasurementsCleared,
  onMeasurementRemoved,
  savedMeasurements = []
}: ChartMeasurementProps) {
  // Store whether we've initialized from props yet
  const initializedRef = useRef(false);
  
  // Initialize measurements from props, but only once
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<Partial<Measurement> | null>(null)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [inputPrice, setInputPrice] = useState('')
  const [measurementName, setMeasurementName] = useState('')
  const [isStartPoint, setIsStartPoint] = useState(true)
  
  // Use a unique ID for SVG markers to prevent conflicts
  const markerId = useRef(`marker-${Math.random().toString(36).substring(2, 9)}`)
  
  // Reference to the control panel to detect clicks on it
  const controlPanelRef = useRef<HTMLDivElement>(null)
  
  // Update measurements from props, but only on initial mount or when chart changes
  useEffect(() => {
    if (savedMeasurements && Array.isArray(savedMeasurements) && !initializedRef.current) {
      setMeasurements(savedMeasurements);
      initializedRef.current = true;
    }
  }, []);
  
  // Reset initialization flag when chart changes
  useEffect(() => {
    // Reset the initialization flag when measurements array changes size dramatically
    // This indicates a new chart is being shown
    if (measurements.length === 0 && savedMeasurements.length > 0) {
      initializedRef.current = false;
    }
  }, [savedMeasurements.length]);
  
  // Reset all state when measurement mode is toggled off
  useEffect(() => {
    if (!isActive) {
      // Reset all measurement-related state when exiting measurement mode
      setCurrentMeasurement(null)
      setShowPriceDialog(false)
      setInputPrice('')
      setMeasurementName('')
      setIsStartPoint(true)
    }
  }, [isActive])

  // Handle click on the chart when in measurement mode
  const handleChartClick = (e: MouseEvent) => {
    if (!isActive || !imageContainerRef.current) return

    // Don't process the click if it's on the control panel
    if (controlPanelRef.current && controlPanelRef.current.contains(e.target as Node)) {
      return;
    }
    
    // Check if the click is on a button or other UI element that should handle its own click
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    // Get click coordinates relative to the image container
    const rect = imageContainerRef.current.getBoundingClientRect()
    
    // Calculate coordinates, accounting for zoom and pan
    const x = (e.clientX - rect.left) / zoomLevel - (panPosition.x / zoomLevel)
    const y = (e.clientY - rect.top) / zoomLevel - (panPosition.y / zoomLevel)

    if (isStartPoint) {
      // First point
      setCurrentMeasurement({
        id: Math.random().toString(36).substring(2, 9),
        startX: x,
        startY: y,
      })
      setShowPriceDialog(true)
    } else {
      // Second point
      setCurrentMeasurement(prev => prev ? ({
        ...prev,
        endX: x,
        endY: y,
      }) : null)
      setShowPriceDialog(true)
    }
  }

  // Confirm price input
  const handleConfirmPrice = () => {
    const price = parseFloat(inputPrice)
    if (isNaN(price)) return

    if (isStartPoint) {
      // First point price
      setCurrentMeasurement(prev => prev ? {
        ...prev,
        startPrice: price
      } : null)
      setIsStartPoint(false)
      setShowPriceDialog(false)
      setInputPrice('')
    } else {
      // Second point price and complete the measurement
      const startPrice = currentMeasurement?.startPrice || 0
      const endPrice = price
      const percentageChange = ((endPrice - startPrice) / startPrice) * 100

      // Only proceed if we have all required properties
      if (
        currentMeasurement && 
        'startX' in currentMeasurement && 
        'startY' in currentMeasurement && 
        'endX' in currentMeasurement && 
        'endY' in currentMeasurement && 
        'startPrice' in currentMeasurement
      ) {
        const completeMeasurement: Measurement = {
          id: currentMeasurement.id || Math.random().toString(36).substring(2, 9),
          startX: currentMeasurement.startX!,
          startY: currentMeasurement.startY!,
          endX: currentMeasurement.endX!,
          endY: currentMeasurement.endY!,
          startPrice: currentMeasurement.startPrice!,
          endPrice: price,
          percentageChange,
          name: measurementName || `Measurement ${measurements.length + 1}`
        }

        // Add to measurements
        setMeasurements(prev => [...prev, completeMeasurement])
        
        // Callback to parent
        if (onMeasurementComplete) {
          onMeasurementComplete(completeMeasurement)
        }
      }

      // Reset for next measurement
      setCurrentMeasurement(null)
      setShowPriceDialog(false)
      setInputPrice('')
      setMeasurementName('')
      setIsStartPoint(true)
    }
  }

  // Cancel current measurement
  const handleCancelMeasurement = () => {
    setCurrentMeasurement(null)
    setShowPriceDialog(false)
    setInputPrice('')
    setMeasurementName('')
    setIsStartPoint(true)
  }

  // Remove a specific measurement
  const handleRemoveMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    
    // Notify parent component that a measurement was removed
    if (onMeasurementRemoved) {
      onMeasurementRemoved(id);
    }
  }

  // Clear all measurements
  const handleClearAll = () => {
    setMeasurements([]);
    
    // Notify parent that all measurements were cleared
    if (onMeasurementsCleared) {
      onMeasurementsCleared();
    }
  }

  // Attach/detach click listener
  useEffect(() => {
    const container = imageContainerRef.current
    if (!container) return

    // Clean up previous listener to avoid duplicates
    container.removeEventListener('click', handleChartClick)
    
    if (isActive) {
      container.addEventListener('click', handleChartClick)
    }

    return () => {
      if (container) {
        container.removeEventListener('click', handleChartClick)
      }
    }
  }, [isActive, zoomLevel, panPosition, isStartPoint]) 

  // When dialog closes via the "X" in the corner, ensure state is reset properly
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCancelMeasurement();
    }
  };

  return (
    <>
      {/* Render existing measurements */}
      <svg 
        className="absolute inset-0 pointer-events-none z-20" 
        style={{ 
          transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        <defs>
          <marker
            id={`${markerId.current}-start`}
            markerWidth={10}
            markerHeight={7}
            refX={0}
            refY={3.5}
            orient="auto"
          >
            <polygon points="10 0, 0 3.5, 10 7" fill="#ffcc00" />
          </marker>
          <marker
            id={`${markerId.current}-end`}
            markerWidth={10}
            markerHeight={7}
            refX={10}
            refY={3.5}
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffcc00" />
          </marker>
        </defs>

        {/* All completed measurements */}
        {measurements.map((m) => (
          <g key={m.id}>
            {/* Debugging point indicators */}
            <circle cx={m.startX} cy={m.startY} r={3 / zoomLevel} fill="red" />
            <circle cx={m.endX} cy={m.endY} r={3 / zoomLevel} fill="blue" />
            
            {/* Line with arrows */}
            <line
              x1={m.startX}
              y1={m.startY}
              x2={m.endX}
              y2={m.endY}
              stroke="#ffcc00"
              strokeWidth={2 / zoomLevel}
              strokeDasharray={`${4 / zoomLevel}, ${4 / zoomLevel}`}
              markerEnd={`url(#${markerId.current}-end)`}
              markerStart={`url(#${markerId.current}-start)`}
            />

            {/* Percentage label */}
            <g transform={`translate(${(m.startX + m.endX) / 2}, ${(m.startY + m.endY) / 2})`}>
              <rect
                x={-40 / zoomLevel}
                y={-15 / zoomLevel}
                width={80 / zoomLevel}
                height={30 / zoomLevel}
                rx={5 / zoomLevel}
                fill="#ffcc00"
                fillOpacity={0.9}
              />
              <text
                x={0}
                y={5 / zoomLevel}
                textAnchor="middle"
                fontSize={14 / zoomLevel}
                fontWeight="bold"
                fill="#000"
              >
                {m.percentageChange >= 0 ? '+' : ''}{m.percentageChange.toFixed(2)}%
              </text>
            </g>

            {/* Start price */}
            <g transform={`translate(${m.startX}, ${m.startY + 20 / zoomLevel})`}>
              <rect
                x={-30 / zoomLevel}
                y={-15 / zoomLevel}
                width={60 / zoomLevel}
                height={20 / zoomLevel}
                rx={5 / zoomLevel}
                fill="white"
                fillOpacity={0.8}
              />
              <text
                x={0}
                y={2 / zoomLevel}
                textAnchor="middle"
                fontSize={10 / zoomLevel}
                fill="#000"
              >
                ${m.startPrice.toFixed(2)}
              </text>
            </g>

            {/* End price */}
            <g transform={`translate(${m.endX}, ${m.endY - 20 / zoomLevel})`}>
              <rect
                x={-30 / zoomLevel}
                y={-15 / zoomLevel}
                width={60 / zoomLevel}
                height={20 / zoomLevel}
                rx={5 / zoomLevel}
                fill="white"
                fillOpacity={0.8}
              />
              <text
                x={0}
                y={2 / zoomLevel}
                textAnchor="middle"
                fontSize={10 / zoomLevel}
                fill="#000"
              >
                ${m.endPrice.toFixed(2)}
              </text>
            </g>
          </g>
        ))}

        {/* Current measurement in progress */}
        {isActive && currentMeasurement && !isStartPoint && 
         currentMeasurement.startX !== undefined && 
         currentMeasurement.startY !== undefined && (
          <circle 
            cx={currentMeasurement.startX} 
            cy={currentMeasurement.startY} 
            r={5 / zoomLevel} 
            fill="#ffcc00" 
          />
        )}
      </svg>

      {/* Current measurement in progress (DOM element) */}
      {isActive && currentMeasurement && !isStartPoint && 
       currentMeasurement.startX !== undefined && 
       currentMeasurement.startY !== undefined && (
        <div 
          className="absolute w-4 h-4 rounded-full bg-yellow-400 border-2 border-white z-20 -translate-x-2 -translate-y-2"
          style={{
            left: (currentMeasurement.startX * zoomLevel) + panPosition.x,
            top: (currentMeasurement.startY * zoomLevel) + panPosition.y,
          }}
        />
      )}

      {/* Price input dialog - Using standard Dialog component */}
      <Dialog 
        open={showPriceDialog} 
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isStartPoint ? 'Enter Starting Price' : 'Enter Ending Price'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={inputPrice}
                onChange={(e) => setInputPrice(e.target.value)}
                className="col-span-3"
                placeholder="Enter price value"
                autoFocus
              />
            </div>
            {!isStartPoint && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name (optional)
                </Label>
                <Input
                  id="name"
                  value={measurementName}
                  onChange={(e) => setMeasurementName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Support level"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelMeasurement}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPrice}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Measurement control panel */}
      {isActive && measurements.length > 0 && (
        <div 
          ref={controlPanelRef}
          className="absolute bottom-16 right-2 z-30 bg-background/70 backdrop-blur-sm p-2 rounded-md border border-border max-w-xs"
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">Measurements</h4>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClearAll}
              type="button"
            >
              Clear All
            </Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {measurements.map((measurement) => (
              <div key={measurement.id} className="flex justify-between items-center text-xs p-1 hover:bg-muted rounded">
                <div>
                  <span className="font-medium">{measurement.name || `Measurement ${measurement.id.substring(0, 4)}`}</span>
                  <span className="text-muted-foreground ml-2">
                    {measurement.percentageChange >= 0 ? '+' : ''}{measurement.percentageChange.toFixed(2)}%
                  </span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6" 
                  onClick={() => handleRemoveMeasurement(measurement.id)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}