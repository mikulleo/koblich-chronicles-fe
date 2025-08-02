// src/components/trade-story/TradeStoryTimeline.tsx
'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  ArrowRight,
  Maximize2,
  Grid3x3,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import apiClient from '@/lib/api/client'
import TimelineEvent from './TimelineEvent' // This component will be rendered inside 3D
import ChartCard from './ChartCard'
import StoryModeViewer from './StoryModeViewer'
import Image from 'next/image'
import { Media, Ticker } from '@/lib/types'

/* animation + gesture libs (Updated for R3F) */
import { useSprings, animated, config } from '@react-spring/web' // Still needed for dot indicators or other non-3D elements
import { useSpring as useSpring3d, animated as animated3d } from '@react-spring/three' // For 3D animations
import { useGesture } from '@use-gesture/react'

/* React-Three-Fiber Imports */
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei' // To embed HTML/React components in 3D
import * as THREE from 'three' // The core Three.js library


/* ------------------------------------------------------------------ */
/* types that do NOT shadow ChartCard's own ChartData ---------------- */
interface TimelineEventData {
  date: string
  type: 'entry' | 'stopModified' | 'exit'
  title: string
  description: string
  details: {
    price?: number
    shares?: number
    riskAmount?: number
    positionSize?: number // API provides this as dollar amount
    positionSizePercent?: number
    positionSizeDescription?: string // We calculate and add this
    initialRiskPercent?: number // We map from riskPercent
    riskPercent?: number // API provides this
    initialStop?: number // API field name
    previousStop?: number
    newStop?: number
    notes?: string
    reason?: string
    profitLoss?: number // API provides this as dollar amount
    profitLossPercent?: number // We calculate this
    normalizedProfitLossPercent?: number // We calculate this
  }
}

interface ModifiedStop {
  date: string
  price: number
  notes?: string
}
interface TradeExit {
  date: string
  price: number
  shares: number
  reason?: string
  notes?: string
}

// Placeholder types, ensure these match your actual types from '@/lib/types'
interface StoryMetadata {
  ticker: Ticker;
  tradeType: string;
  setupType?: string;
  status: string;
  duration: number;
  totalReturnPercent: number;
  normalizedTotalReturnPercent?: number; // Make optional since story might not have it initially
  rRatio: number;
  normalizedRRatio?: number; // Make optional since story might not have it initially
  chartCount: number;
  eventCount: number;
}

interface ChartData {
  id: string; // Assuming charts have an ID
  timestamp: string;
  image: Media;
  annotatedImage?: Media;
  tradeStory?: {
    chartRole?: string;
    emotionalState?: string;
    decisionNotes?: string;
    marketContext?: string;
  };
  notes?: Record<string, string>;
}


interface TradeStoryData {
  metadata: StoryMetadata
  timeline: TimelineEventData[]
  charts: ChartData[]
  chartsByRole: Record<string, any[]>
  notes?: string
  _tradeData?: any // Temporary field for calculations
}

interface TimelineGroup {
  date: string
  dateFormatted: string
  charts: any[]
  events: TimelineEventData[]
}

interface TradeStoryTimelineProps {
  tradeId: string
  onClose?: () => void
}

/* ------------------------------------------------------------------ */
const getChartRoleColor = (role?: string) =>
  (
    {
      entry: 'bg-green-100 text-green-800',
      management: 'bg-blue-100 text-blue-800',
      stopAdjustment: 'bg-yellow-100 text-yellow-800',
      exit: 'bg-red-100 text-red-800',
      analysis: 'bg-purple-100 text-purple-800',
      context: 'bg-gray-100 text-gray-800',
    } as const
  )[role ?? ''] ?? 'bg-gray-100 text-gray-800'

const getEmotionEmoji = (e?: string) =>
  (
    {
      confident: '😎',
      cautious: '🤔',
      uncertain: '😕',
      fearful: '😨',
      greedy: '🤑',
      neutral: '😐',
    } as const
  )[e ?? ''] ?? ''

/* ═══════════════════ RE-DESIGNED Stacked-card loop (3D with R3F) ════════════════════════════ */

// Larger dimensions to better accommodate HTML content
const CARD_WIDTH = 2.8; // Increased for better content visibility
const CARD_HEIGHT = 3.5; // Increased for better content visibility

// Much more pronounced stacking positions for distant camera
const STACK_POS_STYLES_3D = {
  active: {
    position: [0.5, 0, 0] as [number, number, number], // Slightly forward
    rotation: [-0.1, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
    opacity: 1,
  },
  behind1: { // First card behind - much more visible separation
    position: [-2, -0.3, -1.5] as [number, number, number], // Much larger offsets for distant camera
    rotation: [-0.2, 0, 0] as [number, number, number], // More pronounced tilt
    scale: [0.95, 0.95, 0.95] as [number, number, number],
    opacity: 0.9,
  },
  behind2: { // Second card behind
    position: [0, -2.4, -3.0] as [number, number, number], // Even larger offsets
    rotation: [-0.8, 0, 0] as [number, number, number], // More rotation
    scale: [0.9, 0.9, 0.9] as [number, number, number],
    opacity: 0.8,
  },
  behind3: { // Third card behind
    position: [0, -3.6, -4.5] as [number, number, number], // Much larger offsets
    rotation: [-1.2, 0, 0] as [number, number, number], // Even more rotation
    scale: [0.85, 0.85, 0.85] as [number, number, number],
    opacity: 0.7,
  },
  hiddenBottom: { // Cards that are out of view
    position: [0, -4.8, -6.0] as [number, number, number],
    rotation: [-1.6, 0, 0] as [number, number, number],
    scale: [0.8, 0.8, 0.8] as [number, number, number],
    opacity: 0,
  },
};

const VISIBLE_STACK_COUNT_3D = 3; // How many cards we visually show behind the active one

// Helper component for a single 3D card
interface Card3DProps {
  event: TimelineEventData;
  index: number; // Original index of the event in the full list
  currentActiveIdx: number; // The currently active card's index
  dragOffset: number; // Current drag amount for active card interaction
  totalEvents: number;
  onCardClick: (index: number) => void;
  isActive: boolean;
  isTransitioning: boolean; // NEW: Track if we're in a transition
  spinDirection: number; // NEW: Spin direction (1 for forward, -1 for backward, 0 for no spin)
}

function Card3D({ event, index, currentActiveIdx, dragOffset, totalEvents, onCardClick, isActive, isTransitioning }: Card3DProps) {
  // DEBUG LOGGING: Log event data when card is created or becomes active
  useEffect(() => {
    if (isActive) {
      console.log('🎯 ACTIVE CARD DEBUG:', {
        index,
        currentActiveIdx,
        isActive,
        event: {
          ...event,
          details: JSON.stringify(event.details, null, 2)
        }
      });
      
      console.log('📝 EVENT DETAILS BREAKDOWN:', {
        date: event.date,
        type: event.type,
        title: event.title,
        description: event.description,
        detailsKeys: Object.keys(event.details || {}),
        detailsValues: event.details
      });
      
      // Check for any shares-related text in the event data
      const eventString = JSON.stringify(event);
      if (eventString.includes('shares') || eventString.includes('Exited')) {
        console.log('🚨 FOUND SHARES TEXT IN EVENT:', eventString);
      }
    }
  }, [isActive, event, index, currentActiveIdx]);

  let targetStyle = STACK_POS_STYLES_3D.hiddenBottom;

  const distance = (index - currentActiveIdx + totalEvents) % totalEvents;
  const normalizedDistance = distance > totalEvents / 2 ? distance - totalEvents : distance;

  if (normalizedDistance === 0) { // Active card
    targetStyle = {
      ...STACK_POS_STYLES_3D.active,
      position: [
        STACK_POS_STYLES_3D.active.position[0],
        STACK_POS_STYLES_3D.active.position[1] + dragOffset * 0.002, // Reduced drag effect
        STACK_POS_STYLES_3D.active.position[2]
      ],
      rotation: [
        STACK_POS_STYLES_3D.active.rotation[0] + dragOffset * 0.0002, // Reduced rotation on drag
        STACK_POS_STYLES_3D.active.rotation[1] + (isTransitioning ? Math.PI * 2 : 0), // Add full spin during transition
        STACK_POS_STYLES_3D.active.rotation[2]
      ],
      scale: [
        STACK_POS_STYLES_3D.active.scale[0] + Math.abs(dragOffset) * 0.00005,
        STACK_POS_STYLES_3D.active.scale[1] + Math.abs(dragOffset) * 0.00005,
        STACK_POS_STYLES_3D.active.scale[2] + Math.abs(dragOffset) * 0.00005,
      ],
    };
  } else if (normalizedDistance === 1 || (normalizedDistance === -(totalEvents - 1) && totalEvents > 1)) {
    targetStyle = {
      ...STACK_POS_STYLES_3D.behind1,
      rotation: [
        STACK_POS_STYLES_3D.behind1.rotation[0],
        STACK_POS_STYLES_3D.behind1.rotation[1] + (isTransitioning ? Math.PI * 1.5 : 0), // Spin behind cards too, but less
        STACK_POS_STYLES_3D.behind1.rotation[2]
      ]
    };
  } else if (normalizedDistance === 2 || (normalizedDistance === -(totalEvents - 2) && totalEvents > 2)) {
    targetStyle = {
      ...STACK_POS_STYLES_3D.behind2,
      rotation: [
        STACK_POS_STYLES_3D.behind2.rotation[0],
        STACK_POS_STYLES_3D.behind2.rotation[1] + (isTransitioning ? Math.PI : 0), // Less spin for cards further back
        STACK_POS_STYLES_3D.behind2.rotation[2]
      ]
    };
  } else if (normalizedDistance === 3 || (normalizedDistance === -(totalEvents - 3) && totalEvents > 3)) {
    targetStyle = {
      ...STACK_POS_STYLES_3D.behind3,
      rotation: [
        STACK_POS_STYLES_3D.behind3.rotation[0],
        STACK_POS_STYLES_3D.behind3.rotation[1] + (isTransitioning ? Math.PI * 0.5 : 0), // Even less spin
        STACK_POS_STYLES_3D.behind3.rotation[2]
      ]
    };
  }
  // All other cards remain hiddenBottom

  // Determine the 'from' state for the spring to ensure initial visibility
  const getInitialStyle = (idx: number, active: number, total: number) => {
    const dist = (idx - active + total) % total;
    const normDist = dist > total / 2 ? dist - total : dist;

    if (normDist === 0) return STACK_POS_STYLES_3D.active;
    if (normDist === 1 || (normDist === -(total - 1) && total > 1)) return STACK_POS_STYLES_3D.behind1;
    if (normDist === 2 || (normDist === -(total - 2) && total > 2)) return STACK_POS_STYLES_3D.behind2;
    if (normDist === 3 || (normDist === -(total - 3) && total > 3)) return STACK_POS_STYLES_3D.behind3;
    return STACK_POS_STYLES_3D.hiddenBottom;
  };

  const initialStyle = getInitialStyle(index, currentActiveIdx, totalEvents);

  const springProps = useSpring3d({
    from: {
      position: initialStyle.position as [number, number, number],
      rotation: initialStyle.rotation as [number, number, number],
      scale: initialStyle.scale as [number, number, number],
      opacity: initialStyle.opacity,
    },
    to: {
      position: targetStyle.position,
      rotation: targetStyle.rotation,
      scale: targetStyle.scale,
      opacity: targetStyle.opacity,
    },
    config: isTransitioning 
      ? { ...config.wobbly, tension: 200, friction: 25 } // Smoother animation during transition
      : { ...config.stiff, tension: 280, friction: 40 },
    immediate: (key) => isActive && (key === 'position' || key === 'scale') && dragOffset !== 0, // Don't make rotation immediate
  });

  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Optional: Add a subtle tilt to the active card on hover
  useFrame(() => {
    if (meshRef.current && isActive && springProps.opacity.get() > 0.9 && !isTransitioning) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        hovered ? 0.05 : 0,
        0.1
      );
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        hovered ? STACK_POS_STYLES_3D.active.position[2] + 0.05 : STACK_POS_STYLES_3D.active.position[2],
        0.1
      );
    }
  });


  return (
    <animated3d.mesh
      ref={meshRef}
      position={springProps.position as any}
      rotation={springProps.rotation as any}
      scale={springProps.scale as any}
      onClick={() => onCardClick(index)}
    >
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <animated3d.meshStandardMaterial transparent opacity={springProps.opacity} />
      
      {/* Fixed HTML wrapper with proper width constraints */}
      <Html
        transform
        center
        distanceFactor={15} // Increased for better scaling control
        className="card-html-content"
        style={{
          // Set both min and max width to constrain the card size
          width: `${CARD_WIDTH * 110}px`,
          maxWidth: `${CARD_WIDTH * 110}px`, // FIXED: Add maxWidth constraint
          minWidth: `${CARD_WIDTH * 110}px`, 
          minHeight: `${CARD_HEIGHT * 110}px`,
          pointerEvents: isActive ? 'auto' : 'none',
          overflow: 'hidden', // FIXED: Re-enable overflow hidden to prevent text spillover
          // Add word wrapping styles
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          hyphens: 'auto',
        }}
      >
        {/* Wrap TimelineEvent in a div with explicit sizing and text wrapping */}
        <div 
          style={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            hyphens: 'auto',
            fontSize: '12px', // Ensure consistent font size
            lineHeight: '1.3', // Compact line height
          }}
        >
          <TimelineEvent event={event} />
        </div>
      </Html>
    </animated3d.mesh>
  );
}


function StackedCardLoop({ events }: { events: TimelineEventData[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // Track transition state
  const [spinDirection, setSpinDirection] = useState(0); // Track spin direction (1 for forward, -1 for backward, 0 for no spin)
  const dragOffset = useRef(0); // Current drag amount for active card interaction

  // DEBUG LOGGING: Log events when StackedCardLoop is created
  useEffect(() => {
    console.log('🔄 STACKED CARD LOOP EVENTS:', {
      eventsCount: events.length,
      events: events.map((event, index) => ({
        index,
        date: event.date,
        type: event.type,
        title: event.title,
        description: event.description,
        detailsKeys: Object.keys(event.details || {}),
        hasShares: JSON.stringify(event).includes('shares'),
        hasExited: JSON.stringify(event).includes('Exited'),
        fullEvent: event
      }))
    });
  }, [events]);

  // Memoize the order of cards (original indices)
  const order = useMemo(() => {
    if (!events.length) return [];
    return Array.from({ length: events.length }, (_, i) => i);
  }, [events.length]);

  // Handle pointer events for the Canvas to drive navigation
  const bind = useGesture(
    {
      onDragStart: () => {
        setIsDragging(true);
      },
      onDrag: ({ movement: [, my], last, velocity: [, vy] }) => {
        dragOffset.current = my; // Update drag offset in ref
        if (last) {
          setIsDragging(false);
          dragOffset.current = 0; // Reset offset after drag ends

          if (Math.abs(vy) > 0.5 || Math.abs(my) > 50) {
            if (my > 0) navigatePrev();
            else navigateNext();
          }
        }
      },
      onWheel: ({ direction: [, dy] }) => {
        if (Math.abs(dy) > 0) {
          dy > 0 ? navigateNext() : navigatePrev();
        }
      },
    },
    {
      drag: { filterTaps: true, threshold: 10, rubberband: 0.5 },
      wheel: { preventDefault: true, threshold: 5 },
    }
  );

  // Navigation functions with animation trigger and direction tracking
  const navigateNext = useCallback(() => {
    if (events.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setSpinDirection(1); // Forward direction
    const newIdx = (activeIdx + 1) % events.length;
    console.log('➡️ NAVIGATE NEXT:', { from: activeIdx, to: newIdx, event: events[newIdx] });
    setActiveIdx(newIdx);
    // Reset transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setSpinDirection(0);
    }, 800);
  }, [events.length, isTransitioning, activeIdx, events]);

  const navigatePrev = useCallback(() => {
    if (events.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setSpinDirection(-1); // Backward direction
    const newIdx = (activeIdx - 1 + events.length) % events.length;
    console.log('⬅️ NAVIGATE PREV:', { from: activeIdx, to: newIdx, event: events[newIdx] });
    setActiveIdx(newIdx);
    // Reset transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setSpinDirection(0);
    }, 800);
  }, [events.length, isTransitioning, activeIdx, events]);

  // Handle direct click navigation with smart direction detection
  const handleCardClick = useCallback((idx: number) => {
    if (idx !== activeIdx && !isTransitioning) {
      setIsTransitioning(true);
      
      // Calculate shortest direction to target
      const forward = (idx - activeIdx + events.length) % events.length;
      const backward = (activeIdx - idx + events.length) % events.length;
      setSpinDirection(forward <= backward ? 1 : -1);
      
      console.log('🎯 CARD CLICK:', { from: activeIdx, to: idx, event: events[idx] });
      setActiveIdx(idx);
      setTimeout(() => {
        setIsTransitioning(false);
        setSpinDirection(0);
      }, 800);
    }
  }, [activeIdx, isTransitioning, events.length, events]);

  // Handle dot indicator clicks with smart direction detection
  const handleDotClick = useCallback((idx: number) => {
    if (idx !== activeIdx && !isTransitioning) {
      setIsTransitioning(true);
      
      // Calculate shortest direction to target
      const forward = (idx - activeIdx + events.length) % events.length;
      const backward = (activeIdx - idx + events.length) % events.length;
      setSpinDirection(forward <= backward ? 1 : -1);
      
      console.log('🔵 DOT CLICK:', { from: activeIdx, to: idx, event: events[idx] });
      setActiveIdx(idx);
      setTimeout(() => {
        setIsTransitioning(false);
        setSpinDirection(0);
      }, 800);
    }
  }, [activeIdx, isTransitioning, events.length, events]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') navigateNext();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') navigatePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev]);

  if (!events.length) return null;

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden" // Added overflow-hidden to contain the 3D content
        style={{ 
          height: '370px', // Reduced from 420px to 370px
          zIndex: 1, // Ensure it stays within normal document flow
          isolation: 'isolate' // Create new stacking context
        }}
        {...bind()} // Bind gestures to the div containing the Canvas
      >
        <Canvas
          camera={{ position: [0, 0.4, 22.5], fov: 40 }} // Fixed camera position
          className="rounded-lg"
          dpr={[1, 2]}
          style={{ 
            position: 'absolute', // Ensure Canvas is contained within its parent
            top: 0,
            left: 0,
            width: '105%',
            height: '100%',
            zIndex: 1 // Keep within normal stacking context
          }}
        >
          <ambientLight intensity={1.2} /> {/* Slightly brighter ambient light */}
          <pointLight position={[5, 5, 5]} intensity={0.8} /> {/* Point light for shadows/highlights */}

          {order.map((originalIndex) => (
            <Card3D
              key={originalIndex} // Use original index for stable keys
              event={events[originalIndex]}
              index={originalIndex}
              currentActiveIdx={activeIdx}
              dragOffset={isDragging ? dragOffset.current : 0}
              totalEvents={events.length}
              onCardClick={handleCardClick}
              isActive={originalIndex === activeIdx}
              isTransitioning={isTransitioning} // Pass transition state
              spinDirection={spinDirection} // Pass spin direction
            />
          ))}
        </Canvas>
      </div>

      {/* Navigation controls */}
      {events.length > 1 && (
        <div className="absolute bottom-22 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-background/80 backdrop-blur-sm z-10 rounded-b-lg">
          {/* Dot indicators */}
          <div className="flex space-x-1.5">
            {events.map((_, i) => (
              <button
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                  i === activeIdx
                    ? 'bg-primary w-4'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                  isTransitioning && 'opacity-50 cursor-not-allowed' // Disable during transition
                )}
                onClick={() => handleDotClick(i)}
                disabled={isTransitioning}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-full",
                isTransitioning && "opacity-50 cursor-not-allowed"
              )}
              onClick={navigatePrev}
              disabled={isTransitioning}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {activeIdx + 1} / {events.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-full",
                isTransitioning && "opacity-50 cursor-not-allowed"
              )}
              onClick={navigateNext}
              disabled={isTransitioning}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════ Grouped-timeline item ══════════════════════════ */
function GroupedTimelineItem({
  group,
  selectedChart,
  onChartSelect,
  onCompare,
  compareCharts,
}: {
  group: TimelineGroup
  selectedChart: any | null
  onChartSelect: (c: any) => void
  onCompare: (c: any) => void
  compareCharts: [any | null, any | null]
}) {
  const [idx, setIdx] = useState(0)
  const hasCharts = !!group.charts.length
  const hasEvents = !!group.events.length

  // DEBUG LOGGING: Log group data
  useEffect(() => {
    console.log('📅 GROUPED TIMELINE ITEM:', {
      date: group.date,
      dateFormatted: group.dateFormatted,
      chartsCount: group.charts.length,
      eventsCount: group.events.length,
      events: group.events
    });
  }, [group]);

  return (
    <div className="flex flex-col items-center min-w-[320px]">
      <div className="text-sm font-medium text-muted-foreground mb-3">
        {group.dateFormatted}
      </div>

      {hasCharts && (
        <div className="relative mb-3">
          {/* dot nav */}
          {group.charts.length > 1 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {group.charts.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === idx ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          )}

          {/* prev / next arrows */}
          {group.charts.length > 1 && idx > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full h-8 w-8 p-0 bg-background/80 border rounded-full"
              onClick={() => setIdx(i => i - 1)}
            >
              <ChevronUp className="h-4 w-4 -rotate-90" />
            </Button>
          )}
          {group.charts.length > 1 && idx < group.charts.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-8 w-8 p-0 bg-background/80 border rounded-full"
              onClick={() => setIdx(i => i + 1)}
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          )}

          <ChartCard
            chart={group.charts[idx]}
            isSelected={selectedChart?.id === group.charts[idx].id}
            onClick={() => onChartSelect(group.charts[idx])}
            onCompare={onCompare as any}
            isCompared={compareCharts.some(c => c?.id === group.charts[idx].id)}
          />
        </div>
      )}

      {hasEvents && (
        <div className="w-full">
          <StackedCardLoop events={group.events} />
        </div>
      )}
    </div>
  )
}

/* ═════════════════════ main component ═════════════════════════════ */
export default function TradeStoryTimeline({ tradeId }: TradeStoryTimelineProps) {
  const [story, setStory] = useState<TradeStoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState<any | null>(null)
  const [storyMode, setStoryMode] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareCharts, setCompareCharts] = useState<[any | null, any | null]>([
    null,
    null,
  ])

  /* fetch data ------------------------------------------------------ */
  const fetchTradeStory = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/trades/${tradeId}/story`)
      let d: TradeStoryData | null = null

      console.log('🔍 RAW API RESPONSE:', JSON.stringify(data, null, 2));

      if (data?.success && data.story) {
        d = data.story
        if (d) {
          d.metadata.normalizedTotalReturnPercent =
            data.trade?.normalizedMetrics?.profitLossPercent
            ?? d.metadata.normalizedTotalReturnPercent
        }
      } else if (data?.metadata) {
        d = data
        if (d) {
          d.metadata.normalizedTotalReturnPercent =
            data.trade?.normalizedMetrics?.profitLossPercent
            ?? d.metadata.normalizedTotalReturnPercent
        }
      } 
      else if (data?.trade) {
        const t = data.trade
        console.log('📊 TRADE DATA:', JSON.stringify(t, null, 2));
        
        d = {
          metadata: {
            ticker: t.ticker,
            tradeType: t.type,
            setupType: t.setupType,
            status: t.status,
            duration: t.daysHeld,
            totalReturnPercent: t.profitLossPercent ?? 0,
            normalizedTotalReturnPercent: t.normalizedMetrics?.profitLossPercent ?? 0,
            rRatio: t.rRatio ?? 0,
            normalizedRRatio: t.normalizedMetrics?.rRatio ?? 0,
            chartCount: t.relatedCharts?.length ?? 0,
            eventCount: 1 + (t.modifiedStops?.length ?? 0) + (t.exits?.length ?? 0),
          },
          timeline: [],
          charts: data.charts ?? [],
          chartsByRole: data.chartsByRole ?? {},
          notes: t.notes,
        }
      }
      if (!d) throw new Error('Unexpected story payload')

      /* absolutise URLs */
      const base = apiClient.defaults.baseURL?.split('/api')[0] ?? ''
      d.charts = d.charts.map((c: any) => ({
        ...c,
        image: {
          ...c.image,
          url: c.image.url.startsWith('http') ? c.image.url : base + c.image.url,
        },
        annotatedImage: c.annotatedImage
          ? {
              ...c.annotatedImage,
              url: c.annotatedImage.url.startsWith('http')
                ? c.annotatedImage.url
                : base + c.annotatedImage.url,
            }
          : undefined,
        tradeStory: (() => {
          const ts = c.tradeStory ?? {};
          // Ensure chartRole is always a defined string
          return {
            chartRole: typeof ts.chartRole === 'string' && ts.chartRole ? ts.chartRole : 'chart',
            storySequence: ts.storySequence,
            decisionNotes: ts.decisionNotes,
            emotionalState: ts.emotionalState,
            marketContext: ts.marketContext,
          };
        })(),
      }))

      /* timeline fallback - comprehensive event construction */
      // Clean up existing timeline data and calculate missing P/L percentages
      if (d.timeline?.length) {
        console.log('🧹 CLEANING EXISTING TIMELINE DATA');
        
        // Check if we have trade data (either from _tradeData or from response.data.trade)
        const tradeData = d._tradeData || data.trade;
        
        if (tradeData) {
          console.log('📊 Using trade data for calculations:', {
            entryPrice: tradeData.entryPrice,
            type: tradeData.type,
            normalizationFactor: tradeData.normalizationFactor,
            normalizedMetrics: tradeData.normalizedMetrics
          });
          
          d.timeline = d.timeline.map(event => {
            if (event.type === 'entry') {
              // Add proper position size description using normalization factor
              const cleanedEvent = {
                ...event,
                details: {
                  ...event.details,
                  positionSizeDescription: `${((tradeData.normalizationFactor || 0) * 100)?.toFixed(0)}% of a full position`,
                  initialRiskPercent: event.details.riskPercent, // Map riskPercent to initialRiskPercent
                }
              };
              console.log('🧹 CLEANED ENTRY EVENT:', cleanedEvent);
              return cleanedEvent;
            }
            
            if (event.type === 'exit') {
              // Calculate P/L percentages for exit events
              const exitPrice = event.details.price;
              const entryPrice = tradeData.entryPrice;
              
              if (exitPrice && entryPrice) {
                const priceChange = exitPrice - entryPrice;
                let profitLossPercent = (priceChange / entryPrice) * 100;
                if (tradeData.type === 'short') {
                  profitLossPercent = -profitLossPercent;
                }
                
                // Use the normalized percentage directly from trade data if available
                const normalizedProfitLossPercent = tradeData.normalizedMetrics?.profitLossPercent || 
                  (profitLossPercent * (tradeData.normalizationFactor || 1));

                const cleanedEvent = {
                  ...event,
                  description: '', // Clear description to remove "Exited X shares"
                  details: {
                    ...event.details,
                    profitLossPercent: Number(profitLossPercent?.toFixed(2)),
                    //normalizedProfitLossPercent: Number(normalizedProfitLossPercent.toFixed(2)),
                  }
                };
                console.log('🧹 CLEANED EXIT EVENT:', {
                  exitPrice,
                  entryPrice,
                  priceChange,
                  profitLossPercent,
                  normalizedProfitLossPercent,
                  fromTradeData: tradeData.normalizedMetrics?.profitLossPercent,
                  cleanedEvent
                });
                return cleanedEvent;
              } else {
                console.log('⚠️ Missing price data for exit event:', event);
              }
            }
            
            return event;
          });
          
          // Clean up temporary trade data
          delete d._tradeData;
          
        } else {
          console.log('⚠️ No trade data available, using fallback calculations');
          // Fallback to original logic when no trade data available
          const entryEvent = d.timeline.find(event => event.type === 'entry');
          const entryPrice = entryEvent?.details?.price;
          const tradeType = d.metadata?.tradeType || 'long';
          
          if (entryPrice) {
            d.timeline = d.timeline.map(event => {
              if (event.type === 'entry') {
                const cleanedEvent = {
                  ...event,
                  details: {
                    ...event.details,
                    positionSizeDescription: 'Position size info not available',
                    initialRiskPercent: event.details.riskPercent,
                  }
                };
                return cleanedEvent;
              }
              
              if (event.type === 'exit') {
                const exitPrice = event.details.price;
                if (exitPrice && entryPrice) {
                  const priceChange = exitPrice - entryPrice;
                  let profitLossPercent = (priceChange / entryPrice) * 100;
                  if (tradeType === 'short') {
                    profitLossPercent = -profitLossPercent;
                  }
                  const normalizedProfitLossPercent = profitLossPercent; // No normalization factor available

                  const cleanedEvent = {
                    ...event,
                    description: '',
                    details: {
                      ...event.details,
                      profitLossPercent: Number(profitLossPercent?.toFixed(2)),
                      normalizedProfitLossPercent: Number(normalizedProfitLossPercent?.toFixed(2)),
                    }
                  };
                  return cleanedEvent;
                }
              }
              
              return event;
            });
          }
        }
      }
      
      // Fallback: construct timeline from trade data if no timeline exists
      if (!d.timeline?.length && data.trade) {
        const t = data.trade
        const allTimelineEvents: TimelineEventData[] = []

        console.log('🏗️ BUILDING TIMELINE FROM TRADE DATA:', {
          entryDate: t.entryDate,
          entryPrice: t.entryPrice,
          shares: t.shares,
          type: t.type,
          modifiedStops: t.modifiedStops,
          exits: t.exits
        });

        // Add entry event with full details
        const entryEvent = {
          date: t.entryDate,
          type: 'entry' as const,
          title: 'Trade Entry',
          description: '',
          details: {
            price: t.entryPrice,
            shares: t.shares, // Keep for description, not displayed
            riskAmount: t.riskAmount, // Keep for description, not displayed
            positionSizeDescription: `${((t.normalizationFactor || 1) * 100)?.toFixed(0)}% of a full position`,
            initialRiskPercent: t.riskPercent,
          },
        };
        console.log('📝 ENTRY EVENT:', entryEvent);
        allTimelineEvents.push(entryEvent);

        // Add modified stop events with full details
        ;(t.modifiedStops ?? []).forEach((s: ModifiedStop) => {
          const stopEvent = {
            date: s.date,
            type: 'stopModified' as const,
            title: 'Stop Loss Modified',
            description: `Stop moved to ${s.price}`,
            details: { 
              previousStop: t.initialStopLoss, 
              newStop: s.price, 
              notes: s.notes 
            },
          };
          console.log('🛑 STOP EVENT:', stopEvent);
          allTimelineEvents.push(stopEvent);
        })

        // Add exit events
        ;(t.exits ?? []).forEach((x: TradeExit) => {
          const priceChange = x.price - t.entryPrice;
          let profitLossPercent = (priceChange / t.entryPrice) * 100;
          if (t.type === 'short') {
            profitLossPercent = -profitLossPercent;
          }
          const normalizationFactor = t.normalizationFactor || 1;
          const normalizedProfitLossPercent = profitLossPercent * normalizationFactor;

          const exitEvent = {
            date: x.date,
            type: 'exit' as const,
            title: 'Position Exit',
            description: '', // Override any API description to avoid showing shares
            details: {
              price: x.price,
              shares: x.shares,
              reason: x.reason,
              notes: x.notes,
              profitLossPercent: Number(profitLossPercent?.toFixed(2)),
              normalizedProfitLossPercent: Number(normalizedProfitLossPercent?.toFixed(2))
            },
          };
          console.log('🚪 EXIT EVENT:', exitEvent);
          allTimelineEvents.push(exitEvent);
        })

        // Sort all events chronologically
        d.timeline = allTimelineEvents.sort((a, b) => +new Date(a.date) - +new Date(b.date))
        console.log('⏰ FINAL TIMELINE:', d.timeline);
      }

      console.log('✅ FINAL STORY DATA:', JSON.stringify(d, null, 2));
      setStory(d)
      if (d.charts.length) setSelectedChart(d.charts[0])
    } catch (e) {
      console.error('❌ FETCH ERROR:', e)
    } finally {
      setLoading(false)
    }
  }, [tradeId])

  /* call fetch once on mount */
  useEffect(() => {
    fetchTradeStory()
  }, [fetchTradeStory])

  /* compare helpers */
  const toggleCompare = (c: any) => {
    setCompareMode(true)
    setCompareCharts(([c1, c2]) => {
      if (c1?.id === c.id) return [null, c2]
      if (c2?.id === c.id) return [c1, null]
      if (!c1) return [c, c2]
      if (!c2) return [c1, c]
      return [c1, c]
    })
  }
  const clearCompare = () => {
    setCompareCharts([null, null])
    setCompareMode(false)
  }

  /* memoised groups */
  const groups = useMemo(() => {
    if (!story) return []
    const map = new Map<string, { charts: ChartData[]; events: TimelineEventData[] }>()
    story.charts.forEach((c) => {
      const k = format(new Date(c.timestamp), 'yyyy-MM-dd')
      if (!map.has(k)) map.set(k, { charts: [], events: [] })
      map.get(k)!.charts.push(c)
    })
    story.timeline.forEach((e) => {
      const k = format(new Date(e.date), 'yyyy-MM-dd')
      if (!map.has(k)) map.set(k, { charts: [], events: [] })
      map.get(k)!.events.push(e)
    })
    const result = Array.from(map.entries())
      .sort(([a], [b]) => +new Date(a) - +new Date(b))
      .map(([d, { charts, events }]): TimelineGroup => ({
        date: d,
        dateFormatted: format(new Date(d), 'MMM dd'),
        charts,
        events,
      }));
    
    console.log('📊 GROUPED TIMELINE:', result);
    return result;
  }, [story])

  /* ------------------------------------------------------------------ */
  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  if (!story) return <div>Unable to load trade story.</div>

  const { metadata } = story

  return (
    <>
      {/* header */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">{metadata.ticker.symbol} Trade Story</h2>
              <p className="text-muted-foreground">
                {metadata.tradeType.toUpperCase()} • {metadata.setupType ?? 'N/A'} •{' '}
                {metadata.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground"
                onClick={() => setStoryMode(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Story Mode
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCompareMode((v) => !v)}>
                <Grid3x3 className="h-4 w-4 mr-2" />
                Compare
              </Button>
              {storyMode && (
                <Button variant="ghost" size="icon" onClick={() => setStoryMode(false)}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Duration', `${metadata.duration + 1} days`],
              [
                'Return %',
                <>
                  <span
                    className={cn(
                      metadata.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600',
                      'font-semibold'
                    )}
                  >
                    {metadata.totalReturnPercent?.toFixed(2)}%
                  </span>
                  {metadata.normalizedTotalReturnPercent != null && metadata.normalizedTotalReturnPercent !== metadata.totalReturnPercent && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({metadata.normalizedTotalReturnPercent?.toFixed(2)}% normalized)
                    </span>
                  )}
                </>,
              ],
              [
                'R-Ratio',
                <>
                  {metadata.rRatio?.toFixed(2)}R
                </>,
              ],
              ['Charts', metadata.chartCount],
              ['Events', metadata.eventCount],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-lg">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Timeline</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Charts on top, events stacked beneath. Scroll, drag or click to browse.
          </p>

          <ScrollArea className="w-full whitespace-nowrap rounded-md border mb-6">
            <div className="flex p-6 space-x-8">
              {groups.map((g, i) => (
                <div key={g.date} className="flex items-start">
                  <GroupedTimelineItem
                    group={g}
                    selectedChart={selectedChart}
                    onChartSelect={setSelectedChart}
                    onCompare={toggleCompare}
                    compareCharts={compareCharts}
                  />
                  {i < groups.length - 1 && (
                    <ArrowRight className="h-8 w-8 mx-4 mt-16 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>

        {/* single-chart viewer */}
        {selectedChart && !compareMode && (
          <Card className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div
                className="relative aspect-[4/3] cursor-pointer"
                onClick={() => window.open(selectedChart.annotatedImage?.url || selectedChart.image.url, '_blank')}
              >
                <Image
                  src={selectedChart.annotatedImage?.url ?? selectedChart.image.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded-lg shadow-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Chart Details</h3>
                  <Badge className={getChartRoleColor(selectedChart.tradeStory?.chartRole)}>
                    {selectedChart.tradeStory?.chartRole ?? 'chart'}
                  </Badge>
                  {selectedChart.tradeStory?.emotionalState && (
                    <p className="text-sm mt-1">
                      Emotion: {getEmotionEmoji(selectedChart.tradeStory.emotionalState)}{' '}
                      {selectedChart.tradeStory.emotionalState}
                    </p>
                  )}
                </div>

                {selectedChart.tradeStory?.decisionNotes && (
                  <div>
                    <h4 className="font-medium">Decision Process</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedChart.tradeStory.decisionNotes}
                    </p>
                  </div>
                )}

                {selectedChart.tradeStory?.marketContext && (
                  <div>
                    <h4 className="font-medium">Market Context</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedChart.tradeStory.marketContext}
                    </p>
                  </div>
                )}

                {selectedChart.notes && (
                  <div>
                    <h4 className="font-medium">Notes</h4>
                    {Object.entries(selectedChart.notes).map(
                      ([k, v]) =>
                        typeof v === 'string' && v.trim() && (
                          <p key={k} className="text-sm">
                            <strong className="capitalize">{k}:</strong> {v}
                          </p>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* compare mode */}
        {compareMode && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Compare Charts</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {compareCharts.map((c, i) => (
                <div key={i}>
                  {c ? (
                    <>
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={c.annotatedImage?.url ?? c.image.url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-contain rounded-lg shadow-lg"
                        />
                      </div>
                      <p className="mt-2 text-sm">
                        Date: {format(new Date(c.timestamp), 'MMM dd,yyyy')}
                      </p>
                      <Badge className={getChartRoleColor(c.tradeStory?.chartRole)}>
                        {c.tradeStory?.chartRole}
                      </Badge>
                    </>
                  ) : (
                    <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Select a chart to compare</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-3" onClick={clearCompare}>
              Clear Comparison
            </Button>
          </Card>
        )}

        {/* overall trade notes */}
        {story.notes && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Trade Notes</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{story.notes}</p>
          </Card>
        )}
      </div>

      {/* overlay story-mode viewer */}
      {storyMode && story && (
        <StoryModeViewer
          storyData={{
            ...story,
            charts: story.charts.map((c) => ({
              ...c,
              tradeStory: c.tradeStory
                ? {
                    ...c.tradeStory,
                    chartRole: typeof c.tradeStory.chartRole === 'string' && c.tradeStory.chartRole
                      ? c.tradeStory.chartRole
                      : 'chart',
                  }
                : { chartRole: 'chart' },
            })),
          }}
          onClose={() => setStoryMode(false)}
        />
      )}
    </>
  )
}