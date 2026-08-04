// src/lib/analytics/events.ts
'use client'

/**
 * The event catalogue — the single source of truth for what Koblich Chronicles
 * reports to GA4.
 *
 * Conventions
 * -----------
 * • Where GA4 defines a recommended event (`login`, `sign_up`, `purchase`,
 *   `begin_checkout`, `select_item`, `view_item`, `search`), we use it. Those
 *   power GA4's built-in reports with no configuration.
 * • Trades and donations are also sent as ecommerce `items`, so GA4's Item
 *   reports answer "which trades get opened most" natively — no custom
 *   dimension setup needed.
 * • Domain events additionally carry flat `trade_id` / `ticker` / `section`
 *   params, which are worth registering as custom dimensions (see
 *   docs/analytics.md) for Explorations.
 *
 * Every helper here is module-scoped and therefore referentially stable, which
 * matters: these end up in React effect dependency arrays.
 */

import { isTrackingDenied, track, type AnalyticsParams } from './core'
import { pageSection, pageTemplate } from './paths'

/** Where a trade was opened from — keeps surfaces comparable in one report. */
export type TradeSurface =
  | 'gym_replay_list'
  | 'gym_submissions'
  | 'trade_log'
  | 'trade_story'
  | 'ticker_card'

/** Sections of the Trading Gym hub. */
export type GymSection = 'replay' | 'mindset' | 'submissions'

/** Steps of the donation funnel, in order. Used to attribute abandonment. */
export const DONATION_STEPS = [
  'cta_view',
  'cta_click',
  'amount_selected',
  'checkout_started',
  'payment_shown',
  'purchased',
] as const

export type DonationStep = (typeof DONATION_STEPS)[number]

/* ------------------------------------------------------------------ */
/* Page views & journey                                                */
/* ------------------------------------------------------------------ */

const SESSION_ENTRY_KEY = 'kc:analytics:entry-recorded'

/** GA4 closes a session after 30 minutes without an event. `is_entrance` has to
 *  use the same window or it does not mean the same thing as a GA4 landing page. */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

/** The last URL we reported, which is the referrer of the next one. */
let lastPageLocation: string | null = null

/**
 * Dispatch a `page_view`.
 *
 * `is_entrance` marks the first page_view of a session, which makes "exact pages
 * entered" a direct report rather than relying on GA4 inferring a landing page
 * from session ordering.
 */
export function trackPageView(input: {
  pathname: string
  search?: string
  title?: string
}): void {
  // Both `claimSessionEntry()` and `lastPageLocation` have side effects, and
  // they are evaluated before `track()` gets a chance to drop the hit. A page
  // view discarded for lack of consent would otherwise burn the session's one
  // entrance marker, so the visitor's real landing page — the next one, once
  // they accept — would report `is_entrance: false`.
  if (isTrackingDenied()) return

  const { pathname, search, title } = input
  const path = search ? `${pathname}?${search}` : pathname
  const location = typeof window !== 'undefined' ? window.location.href : path

  track('page_view', {
    page_location: location,
    page_title: title ?? (typeof document !== 'undefined' ? document.title : undefined),
    page_referrer: pageReferrer(),
    page_template: pageTemplate(pathname),
    page_section: pageSection(pathname),
    is_entrance: claimSessionEntry(),
  })

  lastPageLocation = location
}

/**
 * `document.referrer` is fixed for the lifetime of the document, so on a
 * client-side navigation it still points at whatever brought the visitor to the
 * *first* page of the session. Repeating it on every page_view re-asserts an
 * external referral that did not happen and leaves GA4 with no previous-page
 * link between in-app views. Once we have sent one page_view, the URL of that
 * view is the real referrer.
 */
function pageReferrer(): string | undefined {
  if (lastPageLocation) return lastPageLocation
  if (typeof document === 'undefined') return undefined
  return document.referrer || undefined
}

/**
 * True on the first page_view of a session.
 *
 * Stored as a timestamp, not a flag: `sessionStorage` survives for as long as
 * the tab is open, which is unbounded, while a GA4 session ends after 30 idle
 * minutes. A visitor who left the tab open over lunch used to come back into a
 * fresh GA4 session whose landing page was never marked at all.
 */
function claimSessionEntry(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Older builds stored the literal '1'; Number('1') is far enough in the past
    // to read as expired, which is the behaviour we want for a stale marker.
    const previous = Number(window.sessionStorage.getItem(SESSION_ENTRY_KEY))
    const now = Date.now()
    const isEntrance = !Number.isFinite(previous) || now - previous > SESSION_TIMEOUT_MS

    window.sessionStorage.setItem(SESSION_ENTRY_KEY, String(now))
    return isEntrance
  } catch {
    // Private browsing / storage disabled — don't guess.
    return false
  }
}

/** Navigation intent, so path explorations show *how* people move, not just where. */
export function trackNavClick(input: { label: string; href: string; source: string }): void {
  track('nav_click', {
    link_label: input.label,
    link_url: input.href,
    nav_source: input.source,
    destination_template: pageTemplate(input.href),
  })
}

/** In-page tab / segmented-control switches (Trades log ↔ exposure ↔ stats, …). */
export function trackTabView(input: { area: string; tab: string }): void {
  track('view_tab', {
    tab_area: input.area,
    tab_name: input.tab,
  })
}

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export function trackLogin(method: string): void {
  track('login', { method })
}

export function trackSignUp(input: { method: string; country?: string }): void {
  track('sign_up', { method: input.method, signup_country: input.country })
}

export function trackLogout(): void {
  track('logout')
}

export function trackAuthError(input: { action: string; reason: string }): void {
  track('auth_error', { auth_action: input.action, error_reason: input.reason })
}

/* ------------------------------------------------------------------ */
/* Trading Gym                                                         */
/* ------------------------------------------------------------------ */

/** The locked gate shown to signed-out visitors — the top of the signup funnel. */
export function trackGymGateView(): void {
  track('gym_gate_view')
}

/** The hub reached after signing in. */
export function trackGymHubView(): void {
  track('gym_hub_view')
}

export function trackGymSectionOpen(section: GymSection): void {
  track('gym_section_open', { section })
}

/* ------------------------------------------------------------------ */
/* Trades, stories & replays                                           */
/* ------------------------------------------------------------------ */

export interface TradeRef {
  tradeId: string
  ticker?: string
  tradeType?: string
}

/** GA4 ecommerce item for a trade, so Item reports rank trades by popularity. */
function tradeItem(trade: TradeRef, surface?: TradeSurface): AnalyticsParams {
  return {
    item_id: trade.tradeId,
    item_name: trade.ticker || trade.tradeId,
    item_category: 'trade',
    item_category2: trade.tradeType,
    item_list_name: surface,
  }
}

function tradeParams(trade: TradeRef, surface?: TradeSurface): AnalyticsParams {
  return {
    trade_id: trade.tradeId,
    ticker: trade.ticker,
    trade_type: trade.tradeType,
    surface,
    items: [tradeItem(trade, surface)],
  }
}

/** A trade was clicked from a list. */
export function trackTradeOpen(trade: TradeRef, surface: TradeSurface): void {
  track('select_item', {
    item_list_name: surface,
    ...tradeParams(trade, surface),
  })
}

/** A trade's detail surface was actually reached (story page, replay, charts). */
export function trackTradeView(
  trade: TradeRef,
  detail: 'story' | 'replay' | 'charts' | 'exits',
): void {
  track('view_item', {
    detail_type: detail,
    ...tradeParams(trade),
  })
}

/** An individual event on the trade story timeline was expanded. */
export function trackStoryEventOpen(input: TradeRef & { eventType?: string }): void {
  track('story_event_open', {
    ...tradeParams(input),
    story_event_type: input.eventType,
  })
}

export function trackReplayStart(trade: TradeRef, source: 'trade' | 'submission'): void {
  track('replay_start', { ...tradeParams(trade), replay_source: source })
}

/** Quarter-way milestones — the difference between "opened" and "engaged". */
export function trackReplayProgress(trade: TradeRef, percent: number): void {
  track('replay_progress', { ...tradeParams(trade), percent_progress: percent })
}

export function trackReplayComplete(trade: TradeRef): void {
  track('replay_complete', tradeParams(trade))
}

/** Closed before finishing — `percent_progress` shows where people drop off. */
export function trackReplayExit(trade: TradeRef, percent: number): void {
  track('replay_exit', { ...tradeParams(trade), percent_progress: percent })
}

/** A decision taken inside the replay (buy / sell / hold), i.e. real practice. */
export function trackReplayAction(trade: TradeRef, action: string): void {
  track('replay_action', { ...tradeParams(trade), replay_action: action })
}

/* ------------------------------------------------------------------ */
/* Charts, tags & tickers                                              */
/* ------------------------------------------------------------------ */

export function trackChartView(input: { chartId: string; ticker?: string }): void {
  track('chart_view', { chart_id: input.chartId, ticker: input.ticker })
}

export function trackTagClick(tagName: string): void {
  track('tag_click', { tag_name: tagName })
}

export function trackTickerSelect(ticker: string): void {
  track('ticker_select', { ticker })
}

export function trackStatsFilter(input: { filterType: string; value: string }): void {
  track('stats_filter_change', {
    filter_type: input.filterType,
    filter_value: input.value,
  })
}

/* ------------------------------------------------------------------ */
/* Donations                                                           */
/* ------------------------------------------------------------------ */

const DONATION_PROGRESS_KEY = 'kc:analytics:donation-step'
const PENDING_PURCHASE_KEY = 'kc:analytics:pending-purchase'
const SENT_PURCHASES_KEY = 'kc:analytics:sent-purchases'

/** Records the furthest funnel step reached, so abandonment can be attributed. */
function recordDonationStep(step: DonationStep): void {
  if (typeof window === 'undefined') return
  try {
    const current = window.sessionStorage.getItem(DONATION_PROGRESS_KEY) as DonationStep | null
    const currentIdx = current ? DONATION_STEPS.indexOf(current) : -1
    if (DONATION_STEPS.indexOf(step) > currentIdx) {
      window.sessionStorage.setItem(DONATION_PROGRESS_KEY, step)
    }
  } catch {
    /* storage unavailable */
  }
}

function readDonationStep(): DonationStep | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(DONATION_PROGRESS_KEY) as DonationStep | null
  } catch {
    return null
  }
}

function clearDonationStep(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(DONATION_PROGRESS_KEY)
  } catch {
    /* storage unavailable */
  }
}

function donationItem(amount: number, currency: string): AnalyticsParams {
  return {
    item_id: 'donation',
    item_name: 'Donation to Koblich Chronicles',
    item_category: 'donation',
    price: amount,
    currency,
    quantity: 1,
  }
}

/** The Donate button became visible — the denominator for donation intent. */
export function trackDonateCtaView(placement: string): void {
  recordDonationStep('cta_view')
  track('donate_cta_view', { placement })
}

/** The Donate button was clicked and the dialog opened. */
export function trackDonateCtaClick(placement: string): void {
  recordDonationStep('cta_click')
  track('donate_cta_click', { placement })
  // GA4's canonical "entered a purchase flow" signal.
  track('view_promotion', { promotion_name: 'donation', creative_slot: placement })
}

/** An amount or currency was chosen — proof of real consideration. */
export function trackDonationAmountSelected(input: {
  amount: number
  currency: string
  isCustom: boolean
}): void {
  recordDonationStep('amount_selected')
  track('donation_amount_selected', {
    value: input.amount,
    currency: input.currency,
    is_custom_amount: input.isCustom,
  })
}

/** Form submitted, PayPal about to be shown. */
export function trackDonationCheckoutStarted(input: {
  amount: number
  currency: string
  hasName: boolean
  hasEmail: boolean
  hasMessage: boolean
}): void {
  recordDonationStep('checkout_started')
  track('begin_checkout', {
    value: input.amount,
    currency: input.currency,
    has_name: input.hasName,
    has_email: input.hasEmail,
    has_message: input.hasMessage,
    items: [donationItem(input.amount, input.currency)],
  })
}

/** PayPal buttons rendered and ready to click. */
export function trackDonationPaymentShown(input: { amount: number; currency: string }): void {
  recordDonationStep('payment_shown')
  track('add_payment_info', {
    value: input.amount,
    currency: input.currency,
    payment_type: 'paypal',
    items: [donationItem(input.amount, input.currency)],
  })
}

export function trackDonationCancelled(input: { amount: number; currency: string }): void {
  track('donation_cancelled', {
    value: input.amount,
    currency: input.currency,
    furthest_step: readDonationStep() ?? 'unknown',
  })
}

export function trackDonationError(input: { amount: number; currency: string; reason: string }): void {
  track('donation_error', {
    value: input.amount,
    currency: input.currency,
    error_reason: input.reason,
    furthest_step: readDonationStep() ?? 'unknown',
  })
}

/** The donation dialog closed without a purchase. */
export function trackDonationAbandoned(): void {
  const step = readDonationStep()
  // Nothing beyond opening the dialog means there is nothing to learn.
  if (!step || step === 'cta_view' || step === 'purchased') return

  track('donation_abandoned', { furthest_step: step })
}

export interface PurchasePayload {
  transactionId: string
  amount: number
  currency: string
}

/**
 * Park a completed purchase in sessionStorage before the hard navigation to
 * the thank-you page.
 *
 * `handlePayPalSuccess` sets `window.location.href` immediately after capture;
 * a `purchase` beacon fired at that moment frequently dies with the document.
 * Storing it and firing on arrival makes delivery deterministic.
 */
export function stagePurchase(payload: PurchasePayload): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(payload))
  } catch {
    // Storage unavailable — fall back to sending it right now and hope the
    // beacon lands.
    trackPurchase(payload)
  }
}

/**
 * Send any staged `purchase`, exactly once per transaction.
 * Called on mount of the thank-you page.
 */
export function flushStagedPurchase(fallbackTransactionId?: string | null): void {
  if (typeof window === 'undefined') return

  let payload: PurchasePayload | null = null

  try {
    const raw = window.sessionStorage.getItem(PENDING_PURCHASE_KEY)
    if (raw) payload = JSON.parse(raw) as PurchasePayload
    window.sessionStorage.removeItem(PENDING_PURCHASE_KEY)
  } catch {
    /* storage unavailable */
  }

  // Direct hit on the thank-you URL (or storage wiped): we still know a
  // donation happened, just not its amount.
  if (!payload && fallbackTransactionId) {
    payload = { transactionId: fallbackTransactionId, amount: 0, currency: 'USD' }
  }

  if (payload) trackPurchase(payload)
}

/**
 * GA4's `purchase` event — this is what populates the Monetization reports.
 * Deduplicated by transaction ID so a refresh of the thank-you page cannot
 * double-count revenue.
 */
export function trackPurchase(payload: PurchasePayload): void {
  if (alreadySent(payload.transactionId)) return
  markSent(payload.transactionId)

  recordDonationStep('purchased')

  track('purchase', {
    transaction_id: payload.transactionId,
    value: payload.amount,
    currency: payload.currency,
    items: [donationItem(payload.amount, payload.currency)],
  })

  clearDonationStep()
}

function readSentPurchases(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SENT_PURCHASES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function alreadySent(transactionId: string): boolean {
  return readSentPurchases().includes(transactionId)
}

function markSent(transactionId: string): void {
  if (typeof window === 'undefined') return
  try {
    // Keep the tail only — this list exists to stop double-counting, not to
    // be an audit log.
    const next = [...readSentPurchases(), transactionId].slice(-20)
    window.localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Exports & misc                                                      */
/* ------------------------------------------------------------------ */

/**
 * One event for the whole download lifecycle, keyed by `download_status`.
 *
 * The alternative — a distinct event name per outcome — spends four of GA4's
 * event-name slots, needs four separate registrations, and cannot be read as a
 * funnel, because GA4 compares parameter values within an event far more easily
 * than it compares event names.
 */
export function trackFileDownload(input: {
  filename: string
  status: 'started' | 'complete' | 'cancelled' | 'error'
  bytes?: number
  reason?: string
}): void {
  track('file_download', {
    file_name: input.filename,
    download_status: input.status,
    file_size_bytes: input.bytes,
    error_reason: input.reason,
  })
}

export function trackSearch(input: { term: string; area: string }): void {
  track('search', { search_term: input.term, search_area: input.area })
}
