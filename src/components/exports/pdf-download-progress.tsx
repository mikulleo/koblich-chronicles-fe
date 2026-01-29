"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/utils/format-bytes"
import { formatTimeRemaining } from "@/lib/utils/format-time"
import type { DownloadProgress } from "@/hooks/use-file-download"

const TRADING_FACTS = [
  "Jesse Livermore made $100 million in a single day during the 1929 crash.",
  "The first stock exchange was established in Amsterdam in 1602.",
  "The term \"bull market\" comes from the way a bull attacks — thrusting its horns upward.",
  "Nicolas Darvas turned $25,000 into $2.45 million in 18 months while touring as a dancer.",
  "William O'Neil founded IBD after studying every top stock from 1880 to present.",
  "Mark Minervini turned $128,000 into $35 million over a 5-year period.",
  "The average bull market lasts about 5.5 years.",
  "Richard Dennis turned $400 into $200 million — and then taught his method to the \"Turtle Traders\".",
  "The S&P 500 has returned roughly 10% annually on average since 1926.",
  "Paul Tudor Jones predicted the 1987 crash and tripled his money during it.",
  "Stan Weinstein's Stage Analysis divides a stock's lifecycle into 4 distinct stages.",
  "Ed Seykota turned $5,000 into $15,000,000 over a 12-year period.",
  "CANSLIM stands for Current earnings, Annual earnings, New, Supply/demand, Leader/laggard, Institutional sponsorship, Market direction.",
  "The biggest single-day gain in the Dow was March 15, 1933 — up 15.34%.",
  "Gerald Loeb said: \"The most important single factor in shaping security markets is public psychology.\"",
]

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

interface PdfDownloadProgressProps {
  progress: DownloadProgress
  onCancel: () => void
  onClose: () => void
  onRetry: () => void
}

export function PdfDownloadProgress({
  progress,
  onCancel,
  onClose,
  onRetry,
}: PdfDownloadProgressProps) {
  const { status, bytesDownloaded, totalBytes, percentage, error, startTime } = progress
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * TRADING_FACTS.length))
  const [fadeIn, setFadeIn] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  const isActive = status === "preparing" || status === "downloading"
  const isComplete = status === "complete"
  const isError = status === "error"
  const isCancelled = status === "cancelled"

  // Live elapsed timer
  useEffect(() => {
    if (!isActive || !startTime) return
    const tick = () => setElapsed(Date.now() - startTime)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, startTime])

  // Rotate facts every 8 seconds while active
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % TRADING_FACTS.length)
        setFadeIn(true)
      }, 400)
    }, 8000)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* ── Generating on server (preparing) ── */}
      {status === "preparing" && (
        <>
          {/* Animated bars */}
          <div className="flex items-end gap-1 h-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-blue-500 rounded-full"
                style={{
                  animation: `downloadBar 1.2s ease-in-out ${i * 0.1}s infinite`,
                  height: "8px",
                }}
              />
            ))}
            <style>{`
              @keyframes downloadBar {
                0%, 100% { height: 8px; opacity: 0.4; }
                50% { height: 32px; opacity: 1; }
              }
            `}</style>
          </div>

          <p className="text-center font-semibold text-gray-700">
            Generating your PDF on the server...
          </p>

          <p className="text-sm text-gray-500 text-center leading-relaxed">
            The server is building a ~500 MB file with all the charts.
            This usually takes a few minutes — please keep this window open.
          </p>

          {/* Elapsed timer */}
          <p className="text-xs text-gray-400 tabular-nums">
            Time elapsed: {formatElapsed(elapsed)}
          </p>

          {/* Failure note */}
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Note:</strong> The generation may occasionally fail due to server
              timeouts. If it does, simply try again. If the issue persists, reach out
              to me on{" "}
              <a
                href="https://x.com/mikulkal"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                @mikulkal
              </a>
              .
            </p>
          </div>

          {/* Fun fact card */}
          <div className="w-full rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Did you know?
            </p>
            <p
              className="text-sm text-gray-600 leading-relaxed transition-opacity duration-400"
              style={{ opacity: fadeIn ? 1 : 0 }}
            >
              {TRADING_FACTS[factIndex]}
            </p>
          </div>

          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </>
      )}

      {/* ── Downloading (body streaming) ── */}
      {status === "downloading" && (
        <>
          <div className="flex items-end gap-1 h-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-green-500 rounded-full"
                style={{
                  animation: `downloadBar 1.2s ease-in-out ${i * 0.1}s infinite`,
                  height: "8px",
                }}
              />
            ))}
            <style>{`
              @keyframes downloadBar {
                0%, 100% { height: 8px; opacity: 0.4; }
                50% { height: 32px; opacity: 1; }
              }
            `}</style>
          </div>

          <p className="text-center font-semibold text-gray-700">
            Downloading your PDF...
          </p>

          <div className="w-full space-y-2">
            <Progress value={totalBytes > 0 ? percentage : undefined} className="h-3" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{totalBytes > 0 ? `${percentage}%` : "Receiving..."}</span>
              <span>
                {formatBytes(bytesDownloaded)}
                {totalBytes > 0 ? ` / ${formatBytes(totalBytes)}` : " downloaded"}
              </span>
            </div>
          </div>

          {totalBytes > 0 && bytesDownloaded > 0 && (
            <p className="text-xs text-gray-400">
              ~{formatTimeRemaining(bytesDownloaded, totalBytes, elapsed)} remaining
            </p>
          )}

          {/* Fun fact card */}
          <div className="w-full rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Did you know?
            </p>
            <p
              className="text-sm text-gray-600 leading-relaxed transition-opacity duration-400"
              style={{ opacity: fadeIn ? 1 : 0 }}
            >
              {TRADING_FACTS[factIndex]}
            </p>
          </div>

          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancel Download
          </Button>
        </>
      )}

      {/* ── Complete ── */}
      {isComplete && (
        <>
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-center font-medium text-gray-700">Download complete!</p>
          <p className="text-sm text-gray-500">Your PDF has been saved. Check your downloads folder.</p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      )}

      {/* ── Error ── */}
      {isError && (
        <>
          <XCircle className="h-10 w-10 text-red-500" />
          <p className="text-center font-medium text-gray-700">
            {error || "Download failed"}
          </p>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            This can happen due to server timeouts on large files.
            Please try again — if the problem continues, reach out on{" "}
            <a
              href="https://x.com/mikulkal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              @mikulkal
            </a>
            .
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </>
      )}

      {/* ── Cancelled ── */}
      {isCancelled && (
        <>
          <AlertCircle className="h-10 w-10 text-yellow-500" />
          <p className="text-center font-medium text-gray-700">Download cancelled</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
