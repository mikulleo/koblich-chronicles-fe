// src/lib/analytics/paths.ts

/**
 * Route classification for analytics.
 *
 * `page_location` keeps the exact URL a visitor entered, but raw URLs with
 * embedded document IDs shatter into hundreds of one-visit rows. Every
 * page_view therefore also carries two coarser dimensions:
 *
 *   page_template — the route shape, e.g. `/trades/:id/story`
 *   page_section  — the product area, e.g. `Trade Story`
 *
 * Templates make funnels and path explorations readable; sections make
 * "which part of the product do people actually use" a one-line report.
 */

/** Explicit route shapes, most specific first. */
const ROUTE_TEMPLATES: Array<[RegExp, string]> = [
  [/^\/trades\/[^/]+\/story\/?$/, '/trades/:id/story'],
  [/^\/trades\/[^/]+\/?$/, '/trades/:id'],
  [/^\/tickers\/[^/]+\/?$/, '/tickers/:id'],
  [/^\/gym\/avatar-lab\/?$/, '/gym/avatar-lab'],
]

/** Segments that look like generated identifiers rather than route names. */
const ID_LIKE = /^(?:[0-9a-f]{16,}|\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** Top-level path segment → human-readable product area. */
const SECTIONS: Record<string, string> = {
  '': 'Home',
  charts: 'Charts',
  'chart-view': 'Charts',
  tags: 'Tag Performance',
  trades: 'Trades',
  statistics: 'Statistics',
  tickers: 'Tickers',
  gym: 'Trading Gym',
  'mental-edge': 'Mental Edge',
  donation: 'Donation',
  auth: 'Auth',
  'reset-password': 'Auth',
  privacy: 'Legal',
  terms: 'Legal',
}

/**
 * Collapse a concrete pathname into its route shape.
 * `/trades/68f3a9c1b2/story` → `/trades/:id/story`
 */
export function pageTemplate(pathname: string): string {
  const path = normalizeTrailingSlash(pathname)

  for (const [pattern, template] of ROUTE_TEMPLATES) {
    if (pattern.test(path)) return template
  }

  // Fallback for routes added after this file was last touched: swap anything
  // that looks like an ID for `:id` so new dynamic routes still aggregate.
  const collapsed = path
    .split('/')
    .map((segment) => (ID_LIKE.test(segment) ? ':id' : segment))
    .join('/')

  return collapsed === '' ? '/' : collapsed
}

/** The product area a path belongs to, for section-level reporting. */
export function pageSection(pathname: string): string {
  const path = normalizeTrailingSlash(pathname)

  // `/trades/:id/story` is its own destination, not part of the trade log.
  if (/^\/trades\/[^/]+\/story/.test(path)) return 'Trade Story'

  const top = path.split('/')[1] ?? ''
  return SECTIONS[top] ?? 'Other'
}

function normalizeTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}
