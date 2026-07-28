// lib/charts/chart-image-url.ts

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://koblich-chronicles-be-production.up.railway.app/api'

/** Hosts we are willing to render inside the chart viewer. */
function allowedHosts(): string[] {
  const hosts = new Set<string>([
    'koblich-chronicles-be-production.up.railway.app',
    'localhost:3000',
  ])

  try {
    hosts.add(new URL(API_URL).host)
  } catch {
    // Malformed env value — fall back to the defaults above.
  }

  return [...hosts]
}

/**
 * Validate an image URL before handing it to the chart viewer, so the viewer
 * can't be used to frame arbitrary third-party content.
 *
 * Returns the absolute URL when it points at our media API, otherwise null.
 */
export function resolveChartImageUrl(src: string | null | undefined): string | null {
  if (!src) return null

  // Relative media paths always belong to the API host.
  const absolute = src.startsWith('http')
    ? src
    : `${API_URL.split('/api')[0]}${src.startsWith('/') ? src : `/${src}`}`

  let url: URL
  try {
    url = new URL(absolute)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!allowedHosts().includes(url.host)) return null

  return url.toString()
}

/**
 * Internal viewer URL for a chart image. Use this instead of linking straight
 * to the API file, so the MarketSurge attribution overlay travels with the
 * enlarged chart.
 */
export function chartViewerUrl(src: string, title?: string): string {
  const params = new URLSearchParams({ src })
  if (title) params.set('title', title)
  return `/chart-view?${params.toString()}`
}
