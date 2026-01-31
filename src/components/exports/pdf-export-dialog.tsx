"use client"

import { useState, useEffect, useCallback } from "react"
import { FileDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useFileDownload } from "@/hooks/use-file-download"
import { PdfDownloadProgress } from "./pdf-download-progress"
import { useAnalytics } from "@/hooks/use-analytics"

const PDF_URL = "https://koblich-chronicles-be-production.up.railway.app/api/charts/export"
const PDF_FILENAME = "stock-charts-2025-analysis.pdf"

export function PdfExportDialog() {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const { progress, startDownload, cancelDownload, reset } = useFileDownload()
  const analytics = useAnalytics()

  const isDownloading = progress.status === "preparing" || progress.status === "downloading"

  const handleStartDownload = useCallback(() => {
    setConfirmed(true)
    analytics.trackEvent('pdf_download_started', { filename: PDF_FILENAME })
    startDownload(PDF_URL, PDF_FILENAME)
  }, [startDownload, analytics])

  // Show toast notifications on completion/error and track analytics
  useEffect(() => {
    if (progress.status === "complete") {
      toast.success("PDF downloaded successfully!")
      analytics.trackEvent('pdf_download_completed', {
        filename: PDF_FILENAME,
        bytes: progress.totalBytes,
      })
    } else if (progress.status === "error") {
      toast.error(progress.error || "Download failed")
      analytics.trackEvent('pdf_download_error', {
        filename: PDF_FILENAME,
        error: progress.error,
      })
    } else if (progress.status === "cancelled") {
      analytics.trackEvent('pdf_download_cancelled', { filename: PDF_FILENAME })
    }
  }, [progress.status, progress.error, progress.totalBytes, analytics])

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing during active download
    if (!newOpen && isDownloading) {
      return
    }

    if (newOpen) {
      analytics.trackEvent('pdf_button_click', { filename: PDF_FILENAME })
    }

    if (!newOpen) {
      reset()
      setConfirmed(false)
    }

    setOpen(newOpen)
  }

  const handleCancel = () => {
    cancelDownload()
  }

  const handleClose = () => {
    reset()
    setConfirmed(false)
    setOpen(false)
  }

  const handleRetry = () => {
    reset()
    startDownload(PDF_URL, PDF_FILENAME)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Stock Charts 2025 PDF
        </Button>
      </DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => {
          if (isDownloading) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isDownloading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Download Stock Charts 2025 Analysis</DialogTitle>
          {!confirmed && (
            <DialogDescription>
              A comprehensive PDF with all annotated stock charts from 2025.
            </DialogDescription>
          )}
        </DialogHeader>

        {!confirmed ? (
          <div className="flex flex-col gap-5 py-2">
            {/* File info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">File</span>
                <span className="text-sm font-medium">stock-charts-2025-analysis.pdf</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Size</span>
                <span className="text-sm font-medium">~500 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Est. download time</span>
                <span className="text-sm font-medium">5 – 10 min (depending on connection)</span>
              </div>
            </div>

            {/* Warning */}
            <p className="text-sm text-gray-500 text-center">
              This is a large file. Make sure you have a stable internet connection before starting.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartDownload}>
                <FileDown className="mr-2 h-4 w-4" />
                Start Download
              </Button>
            </div>
          </div>
        ) : (
          <PdfDownloadProgress
            progress={progress}
            onCancel={handleCancel}
            onClose={handleClose}
            onRetry={handleRetry}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
