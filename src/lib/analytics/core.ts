// src/lib/analytics/core.ts
'use client'

/**
 * Consent-aware GA4 transport.
 *
 * Two problems this solves that a bare `window.gtag?.('event', ...)` does not:
 *
 * 1. gtag.js loads with `afterInteractive`, so it executes *after* React has
 *    hydrated. Anything tracked during hydration — most importantly the first
 *    `page_view` of the session — is lost. We install a synchronous `gtag()`
 *    shim that pushes to `dataLayer`; gtag.js replays that queue on load.
 *
 * 2. The GA script is only mounted once the visitor grants analytics consent,
 *    which happens several renders after the app boots. Events fired before
 *    that are buffered here and flushed on grant, or discarded on denial.
 */

export type ConsentStatus = 'unknown' | 'granted' | 'denied'

/** Cap on pre-consent buffering, so a visitor who never answers the banner
 *  cannot grow the queue without bound. */
const MAX_BUFFERED_EVENTS = 100
/** GA4 truncates event parameter values at 100 characters. */
const MAX_PARAM_LENGTH = 100
/** GA4 accepts at most 25 parameters per event. */
const MAX_PARAMS_PER_EVENT = 25

export type AnalyticsParams = Record<string, unknown>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let consentStatus: ConsentStatus = 'unknown'
let configured = false
let defaultsSet = false
let debugEnabled = false
let buffer: Array<{ name: string; params: AnalyticsParams }> = []

const isBrowser = () => typeof window !== 'undefined'

/**
 * Install the synchronous gtag() shim and seed Consent Mode defaults.
 * Idempotent — safe to call from any render or effect. Returns null during SSR.
 *
 * The `consent default` command is pushed here, at the moment the dataLayer is
 * created, rather than from a provider effect. Google requires it to precede
 * every other consent command, and React makes effect ordering the wrong tool
 * for that guarantee: child effects run before their parent's, so a returning
 * visitor's `consent update: granted` (replayed by the cookie banner) was
 * reaching the queue *before* the provider's `consent default: denied` — which
 * then reset their consent straight back to denied. Seeding it at stub creation
 * makes the ordering unconditional.
 */
function ensureStub(): NonNullable<Window['gtag']> | null {
  if (!isBrowser()) return null

  if (!window.dataLayer) window.dataLayer = []

  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag.js expects the raw `arguments` object, not a spread array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
  }

  if (!defaultsSet) {
    defaultsSet = true
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  }

  return window.gtag
}

/**
 * GA4 silently drops events carrying nested objects and truncates long
 * strings. Flatten and clamp up front so what we see locally is what lands.
 */
export function sanitizeParams(params?: AnalyticsParams): AnalyticsParams {
  if (!params) return {}

  const out: AnalyticsParams = {}
  let count = 0

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (count >= MAX_PARAMS_PER_EVENT) break

    if (typeof value === 'string') {
      out[key] = value.length > MAX_PARAM_LENGTH ? value.slice(0, MAX_PARAM_LENGTH) : value
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue
      out[key] = value
    } else if (typeof value === 'boolean') {
      out[key] = value
    } else if (Array.isArray(value)) {
      // `items` is the one array GA4 understands natively (ecommerce).
      out[key] = value
    } else {
      continue
    }

    count += 1
  }

  return out
}

/**
 * Seed the dataLayer with Consent Mode defaults (every storage type denied)
 * as early as possible in the app's lifecycle.
 *
 * The ordering guarantee lives in `ensureStub()`, so this is belt-and-braces:
 * it simply makes sure *something* has touched gtag before `afterInteractive`
 * scripts execute, even on a page that tracks nothing.
 */
export function setConsentDefaults(): void {
  ensureStub()
}

/** Wire up the measurement ID. Called once GA is allowed to load. */
export function configure(measurementId: string, opts?: { debug?: boolean }): void {
  const gtag = ensureStub()
  if (!gtag || configured) return

  debugEnabled = opts?.debug ?? false

  gtag('js', new Date())
  gtag('config', measurementId, {
    // page_view is dispatched explicitly by PageViewTracker so it can carry
    // our normalized route params and survive client-side navigation.
    send_page_view: false,
    ...(debugEnabled ? { debug_mode: true } : {}),
  })

  configured = true
  flush()
}

export function setAnalyticsConsent(status: ConsentStatus): void {
  consentStatus = status

  const gtag = ensureStub()
  if (!gtag) return

  if (status === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' })
    flush()
    return
  }

  if (status === 'denied') {
    gtag('consent', 'update', { analytics_storage: 'denied' })
    // Never send what the visitor explicitly declined.
    buffer = []
    // Consent Mode stops gtag *using* cookies but leaves existing ones in
    // place. Withdrawing consent should actually remove them.
    clearAnalyticsCookies()
  }
}

/**
 * Delete Google Analytics cookies (`_ga`, `_ga_<stream>`, `_gid`, `_gat*`).
 *
 * They may have been set on either the exact host or a dot-prefixed parent
 * domain, and a delete only takes effect when domain and path match, so each
 * candidate is tried.
 */
function clearAnalyticsCookies(): void {
  if (!isBrowser() || typeof document === 'undefined') return

  const names = document.cookie
    .split(';')
    .map((entry) => entry.split('=')[0]?.trim())
    .filter((name): name is string => !!name && /^_ga|^_gid$|^_gat/.test(name))

  if (names.length === 0) return

  const host = window.location.hostname
  const parts = host.split('.')
  const domains = new Set<string | null>([null, host, `.${host}`])
  // e.g. app.example.com → also try .example.com
  for (let i = 1; i < parts.length - 1; i += 1) {
    domains.add(`.${parts.slice(i).join('.')}`)
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = [
        `${name}=`,
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'path=/',
        domain ? `domain=${domain}` : '',
      ]
        .filter(Boolean)
        .join('; ')
    }
  }
}

export function setMarketingConsent(granted: boolean): void {
  const gtag = ensureStub()
  if (!gtag) return

  const value = granted ? 'granted' : 'denied'
  gtag('consent', 'update', {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  })
}

function dispatch(name: string, params: AnalyticsParams): void {
  const gtag = ensureStub()
  if (!gtag) return

  gtag('event', name, params)

  if (debugEnabled) {
    console.debug('[analytics]', name, params)
  }
}

/** Whether hits may leave the browser right now. */
function canSend(): boolean {
  // `configured` is the real gate. In the default consent model GA is not
  // configured until the visitor opts in, so this is equivalent to "granted".
  // Under Consent Mode advanced, GA is configured up front and sends cookieless
  // pings while `analytics_storage` stays denied — which is the point.
  return configured && consentStatus !== 'denied'
}

function flush(): void {
  if (!canSend() || buffer.length === 0) return

  const pending = buffer
  buffer = []
  for (const hit of pending) dispatch(hit.name, hit.params)
}

/**
 * Record an event. Safe to call at any point in the lifecycle — before
 * consent, before gtag.js loads, or during SSR (no-op).
 */
export function track(name: string, params?: AnalyticsParams): void {
  if (!isBrowser()) return
  if (consentStatus === 'denied') return

  const clean = sanitizeParams(params)

  if (!canSend()) {
    if (buffer.length < MAX_BUFFERED_EVENTS) buffer.push({ name, params: clean })
    return
  }

  dispatch(name, clean)
}

/**
 * Attach a stable pseudonymous identity so sessions across devices stitch into
 * one user, and expose `logged_in` for segmentation.
 *
 * Only the Payload document ID is sent — never name or email, which GA4's
 * terms prohibit.
 */
export function setUser(user: { id: string; roles?: string[] } | null): void {
  const gtag = ensureStub()
  if (!gtag) return

  if (user) {
    gtag('set', { user_id: user.id })
    gtag('set', 'user_properties', {
      logged_in: 'true',
      account_role: user.roles?.[0] ?? 'user',
    })
  } else {
    gtag('set', { user_id: null })
    gtag('set', 'user_properties', {
      logged_in: 'false',
      account_role: 'anonymous',
    })
  }
}

/** Test/debug helper — current transport state. */
export function getAnalyticsState() {
  return { consentStatus, configured, buffered: buffer.length, debugEnabled }
}
