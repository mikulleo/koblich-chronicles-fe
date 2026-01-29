"use client"

import { useState, useRef, useCallback } from "react"

export type DownloadStatus =
  | "idle"
  | "preparing"
  | "downloading"
  | "complete"
  | "error"
  | "cancelled"

export interface DownloadProgress {
  status: DownloadStatus
  bytesDownloaded: number
  totalBytes: number
  percentage: number
  error?: string
  startTime?: number
}

export interface UseFileDownloadReturn {
  progress: DownloadProgress
  startDownload: (url: string, filename: string) => Promise<void>
  cancelDownload: () => void
  reset: () => void
}

const initialProgress: DownloadProgress = {
  status: "idle",
  bytesDownloaded: 0,
  totalBytes: 0,
  percentage: 0,
}

export function useFileDownload(): UseFileDownloadReturn {
  const [progress, setProgress] = useState<DownloadProgress>(initialProgress)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startDownload = useCallback(async (url: string, filename: string) => {
    // Create new abort controller for this download
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    const startTime = Date.now()

    setProgress({
      status: "preparing",
      bytesDownloaded: 0,
      totalBytes: 0,
      percentage: 0,
      startTime,
    })

    try {
      const response = await fetch(url, { signal })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentLength = response.headers.get("content-length")
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        throw new Error("Response body is not available")
      }

      setProgress({
        status: "downloading",
        bytesDownloaded: 0,
        totalBytes,
        percentage: 0,
        startTime,
      })

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let bytesDownloaded = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        bytesDownloaded += value.length

        const percentage = totalBytes > 0
          ? Math.round((bytesDownloaded / totalBytes) * 100)
          : 0

        setProgress({
          status: "downloading",
          bytesDownloaded,
          totalBytes,
          percentage,
          startTime,
        })
      }

      // Assemble chunks into a single Blob
      const blob = new Blob(chunks, { type: "application/pdf" })

      // Create download link and trigger download
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      setProgress({
        status: "complete",
        bytesDownloaded,
        totalBytes,
        percentage: 100,
        startTime,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setProgress((prev) => ({
          ...prev,
          status: "cancelled",
        }))
      } else {
        setProgress((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : "Download failed",
        }))
      }
    }
  }, [])

  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    cancelDownload()
    setProgress(initialProgress)
  }, [cancelDownload])

  return {
    progress,
    startDownload,
    cancelDownload,
    reset,
  }
}
