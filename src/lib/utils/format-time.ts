/**
 * Calculate and format estimated time remaining for a download
 * @param bytesDownloaded - Bytes downloaded so far
 * @param totalBytes - Total bytes to download
 * @param elapsedMs - Time elapsed in milliseconds
 * @returns Formatted string (e.g., "2 min 30 sec", "45 sec")
 */
export function formatTimeRemaining(
  bytesDownloaded: number,
  totalBytes: number,
  elapsedMs: number
): string {
  if (bytesDownloaded === 0 || elapsedMs === 0) {
    return "Calculating..."
  }

  const bytesPerMs = bytesDownloaded / elapsedMs
  const remainingBytes = totalBytes - bytesDownloaded
  const remainingMs = remainingBytes / bytesPerMs
  const remainingSeconds = Math.ceil(remainingMs / 1000)

  if (remainingSeconds < 60) {
    return `${remainingSeconds} sec`
  }

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  if (seconds === 0) {
    return `${minutes} min`
  }

  return `${minutes} min ${seconds} sec`
}
