# Analytics

GA4 via `gtag.js`, loaded and gated in the app itself. No Google Tag Manager.

## Why not GTM

Everything worth measuring here is product-internal — trade IDs, gym sections,
replay depth, donation steps. Those have to be defined in code next to the thing
they measure, and versioned with it. GTM earns its place when marketing needs to
change tags without a deploy; that is not this project, and the container that
was previously mounted (`GTM-WRSDGRC8`, dev-only) held nothing. Keeping both also
meant a GA4 config tag inside GTM could double-count every page view, and the
GTM script loaded before the consent banner was answered.

If ad remarketing is ever needed, add the tag in code alongside the existing
`setMarketingConsent()` wiring rather than reintroducing a second tag manager.

## Architecture

```
src/lib/analytics/
  core.ts        consent, transport, buffering, gtag shim
  events.ts      the event catalogue — one function per tracked interaction
  paths.ts       route → page_template / page_section
  milestones.ts  fire-once-per-threshold progress helper
src/components/analytics/
  GoogleAnalytics.tsx   loads gtag.js, configures the property
  PageViewTracker.tsx   one page_view per URL, including the first
  CookieConsentBanner.tsx
src/providers/AnalyticsProvider.tsx   consent state → transport
src/hooks/use-analytics.ts            stable component-facing API
```

Add new events by adding a function to `events.ts` and exposing it in
`use-analytics.ts`. Do not call `window.gtag` from components.

### Two things the transport exists to prevent

**Lost first page view.** `gtag.js` loads `afterInteractive`, i.e. after React
hydrates. A naive `window.gtag?.('event', 'page_view')` in a mount effect
therefore no-ops on the entry page of every session, so only client-side
navigations get recorded. `core.ts` installs a synchronous `gtag()` shim that
pushes into `dataLayer`; `gtag.js` replays that queue when it executes. Events
fired before consent resolves are held in a capped buffer and flushed on grant,
or discarded on denial.

**Lost purchases.** The donation form sets `window.location.href` immediately
after PayPal capture, which routinely kills an in-flight beacon. `stagePurchase()`
parks the payload in `sessionStorage` and the thank-you page calls
`flushStagedPurchase()` on mount, deduplicated by transaction ID.

### Why `page_template` was missing entirely (fixed)

If you registered the custom dimensions below and saw nothing arrive, this was
why. `PageViewTracker` deferred every hit into `requestAnimationFrame`, and
browsers do not run animation frames in a tab that is not visible. Any session
that began in a background tab — cmd-click, "open link in new tab", a restored
window, a prerender — sent **no `page_view` at all**, and with it no
`page_template`, `page_section` or `is_entrance`. The same callback was also
cancelled by the effect's cleanup while the URL was already marked as tracked,
so React's StrictMode remount in development dropped the entry hit of every
local session — which is exactly where DebugView is used to check the setup.

It is now a `setTimeout(…, 0)`, which still fires when hidden (throttled), and
nothing is recorded as sent until the hit has actually gone out.

Two related distortions were fixed at the same time:

- **Duplicate page views on `/charts`.** `chart-gallery` writes its filter state
  into the query string with `history.replaceState`, including the default
  timeframes on every mount, and Next's router reports that as a route change. A
  URL rewritten in place adds no history entry while a real navigation does, so
  the tracker compares `history.length` and skips the rewrite. Query-only
  navigations that *are* real (e.g. `/chart-view?src=…`) still count.
- **`page_referrer` was the external referrer on every hit.**
  `document.referrer` is fixed for the lifetime of a document, so every
  client-side navigation kept re-asserting the referral that started the session
  and GA4 never saw a previous-page link between in-app views. Subsequent
  `page_view`s now carry the previous in-app URL.

`is_entrance` is now stored as a timestamp rather than a flag, expiring after 30
minutes to match GA4's own session window. `sessionStorage` lives as long as the
tab does, so a visitor who left a tab open used to come back into a fresh GA4
session whose landing page was never marked at all.

### Consent ordering is structural, not incidental

Google requires `consent default` to precede every other consent command. That
guarantee cannot live in a React effect: child effects run before their parent's,
so the cookie banner replaying a returning visitor's stored `consent update:
granted` reached the queue *before* the provider's `consent default: denied`,
which then reset their consent straight back to denied. The default is therefore
pushed inside `ensureStub()`, at the moment the dataLayer is created — whichever
entry point touches gtag first, the ordering holds.

There is no test suite in this project, so nothing guards this automatically.
Verify it by hand after touching consent code: reload with analytics already
accepted and confirm `dataLayer[0]` is `consent default` and that the later
`consent update` is not followed by another `denied`.

### Declining now actually stops collection

`track()` has always dropped events once consent was denied, but gtag.js stayed
mounted, and enhanced measurement (scrolls, outbound clicks, file downloads,
site search) is emitted by the library itself and never passes through
`track()`. Someone who pressed "Reject optional" therefore kept sending exactly
the category of data the button says it will not, and `setUser()` attached their
`user_id` to it. Loading is now vetoed outright on an explicit denial and the
identity is detached on withdrawal. An already-executed library cannot be
unloaded mid-session, but a returning visitor with a stored rejection never
loads it.

### Referential stability matters

`useAnalytics()` returns a frozen singleton. The previous version built a new
object every render, and `TradeReplayPlayer` had `trackEvent` in an effect
dependency array — so `replay_start` re-fired on every render. Historical replay
counts before this change are inflated and not comparable.

## Event reference

### Journey

| Event | Key params |
|---|---|
| `page_view` | `page_location`, `page_title`, `page_referrer`, `page_template`, `page_section`, `is_entrance` |
| `nav_click` | `link_label`, `link_url`, `nav_source`, `destination_template` |
| `view_tab` | `tab_area`, `tab_name` |

`page_template` collapses IDs (`/trades/:id/story`) so funnels aggregate;
`page_location` keeps the exact URL. `is_entrance` is true on the first
`page_view` of a session — that is your "exact pages entered" report, and it does
not depend on GA4 inferring a landing page.

### Auth / Trading Gym

| Event | Key params |
|---|---|
| `gym_gate_view` | — |
| `sign_up` | `method`, `signup_country` |
| `login` | `method` |
| `auth_error` | `auth_action`, `error_reason` |
| `gym_hub_view` | — |
| `gym_section_open` | `section` = `replay` \| `mindset` \| `submissions` |
| `logout` | — |

`gym_gate_view → sign_up/login → gym_hub_view → gym_section_open` is the gym
funnel. `login` fires only on an explicit sign-in; restoring a session attaches
the identity without counting a login.

### Trades, stories, replays

| Event | Key params |
|---|---|
| `select_item` | `trade_id`, `ticker`, `trade_type`, `surface`, `items[]` |
| `view_item` | `trade_id`, `detail_type` = `story` \| `replay` \| `charts` \| `exits` |
| `story_event_open` | `trade_id`, `story_event_type` |
| `replay_start` | `trade_id`, `ticker`, `replay_source` |
| `replay_progress` | `trade_id`, `percent_progress` = 25 \| 50 \| 75 |
| `replay_complete` | `trade_id`, `ticker` |
| `replay_exit` | `trade_id`, `percent_progress` (furthest reached) |

`surface` distinguishes where a trade was clicked (`gym_replay_list`,
`trade_log`, `trade_story`, …), so you can tell which entry point works.

`view_item` on the story page is emitted by `TradeStoryTimeline`, not by the
route component: the ticker is only known once the story has loaded, and without
it the ecommerce item falls back to the raw document ID — which turned the Items
report into a list of opaque numbers.

`story_event_open` fires when a visitor turns to a different card in a day's
event deck, not when the deck first renders. A day with a single event therefore
emits nothing, which is most trades in the current data.

### Charts, tickers, exports

| Event | Key params |
|---|---|
| `chart_view` | `chart_id`, `ticker` |
| `tag_click` | `tag_name` |
| `ticker_select` | `ticker` |
| `file_download` | `file_name`, `download_status`, `file_size_bytes`, `error_reason` |

`chart_view` fires once per chart brought to the front of the carousel, keyed on
the chart ID so re-renders do not re-count it.

`file_download` carries the whole lifecycle in `download_status`
(`started` → `complete` | `cancelled` | `error`). The PDF export previously used
four separate event names, none of which were documented and none of which
anything in GA4 had been set up to read.

### Catalogue entries with no call site

`events.ts` also exports `trackReplayAction`, `trackStatsFilter` and
`trackSearch`. Nothing calls them yet, so `replay_action`,
`stats_filter_change` and `search` will never appear in GA4 — do not register
`filter_type`, `filter_value`, `search_term` or `search_area` as custom
dimensions expecting data. Likewise `view_item.detail_type` only ever takes the
value `story`; the `replay`, `charts` and `exits` variants are defined but not
wired.

**Most-clicked trades needs no configuration.** Every trade event carries a GA4
ecommerce `items[]` entry with `item_id` = trade ID and `item_name` = ticker, so
*Reports → Monetization → Items* ranks trades directly. Filter
`item_category = trade` to separate them from donations.

Replay depth is measured from where playback actually starts (a few candles
before entry), not candle zero. `replay_start` vs `replay_complete` vs
`replay_exit.percent_progress` tells you whether replays are being watched or
merely opened.

### Donations

Full funnel, in order:

| Step | Event | Notes |
|---|---|---|
| 1 | `donate_cta_view` | Fires when the button is ≥50% visible, not on page load |
| 2 | `donate_cta_click` | Dialog opened |
| 3 | `donation_amount_selected` | `is_custom_amount` |
| 4 | `begin_checkout` | GA4 ecommerce; form submitted |
| 5 | `add_payment_info` | PayPal buttons actually rendered |
| 6 | `purchase` | `transaction_id`, `value`, `currency` |

Plus `donation_cancelled`, `donation_error`, and `donation_abandoned` — the last
carries `furthest_step`, so you can see exactly where people give up.

`purchase` is GA4's standard revenue event, which is what populates the
Monetization reports. The previous custom `donation_completed` meant GA4 reported
zero revenue.

---

## The build failure was a corrupted install, not framer-motion

`next build` used to fail with 10 `TS2353` errors in `TradingGym.tsx` —
framer-motion's `MotionStyle` "rejecting" `transformStyle`, `boxShadow`,
`textShadow` and `backgroundPositionX`. The types were fine. The real cause:

    node_modules/csstype/          LICENSE  README.md  index.js.flow  package.json
                                   ^ index.d.ts was missing

`@types/react` does `import * as CSS from "csstype"`, so `CSSProperties`
collapsed to an error type with **zero keys**. framer-motion derives both
`MotionStyle` and `Target` from `CSSProperties`, so every pure-CSS property was
rejected. Properties that kept working — `opacity`, `fill`, `x`, `scale` — come
from `SVGAttributes` and `TransformProperties` instead, which is exactly the
observed pattern.

Diagnosis worth repeating if this recurs: `'opacity' extends keyof CSSProperties`
evaluated to `false`. When a well-known key is missing from a built-in type, the
type isn't wrong — its dependency failed to resolve.

Repaired by deleting the damaged package directories and reinstalling from the
lockfile (npm skips packages whose directory already exists at the right
version, so removal is required first). Four packages still have broken entry
points — `@humanfs/core`, `@humanfs/node`, `glsl-noise`, `firebase`'s
`empty.d.ts` — none of which currently break the build or typecheck, but
`rm -rf node_modules && npm ci` would clear them if anything odd appears.

No source changes were needed: the 10 errors disappeared and no new ones took
their place.

---

## What you need to do in the GA4 UI

Code is done; these are one-time console settings.

### 1. Check what the two measurement IDs actually are

`.env` has `G-7FM71XSEPZ`, `.env.development` has `G-0NWWJYSXET`, but both files
carry the same `GOOGLE_ANALYTICS_PROPERTY_ID=487518823` — so these are almost
certainly two *data streams* in one property (prod and dev), not two properties.
Confirm under *Admin → Data streams* that both IDs are listed there.

If they are, nothing is split and nothing needs fixing: custom definitions, data
retention and key events are all property-scoped, so everything below is
configured once and applies to both streams. The only thing worth doing is
keeping dev traffic out of production reports, via a data filter on the stream
rather than by changing IDs.

If the two IDs turn out to belong to *different* properties, then the data really
is split — pick the real one and make production consistent before continuing.

### 2. Data retention — the highest-impact setting

*Admin → Data collection and modification → Data retention* → set event data
retention to **14 months**. The default is 2 months, after which Explorations
can no longer look back. This is not retroactive, so every day it stays at the
default is a month you will not get back.

### 3. Register custom dimensions

*Admin → Data display → Custom definitions → Create custom dimensions.* The limit
is 50 event-scoped; this list is prioritised, and the first block is the one that
answers your questions.

**Type the parameter name — do not expect to find it in the dropdown.** The
**Event parameter** field is a combobox, and its list is built from parameters
GA4 has already received and processed, which lags collection by up to 48 hours.
Before any of these events have fired, the list contains none of them; that is
expected, not a misconfiguration. Type `page_template` into the field and the
typed string appears as a selectable row (GA4 marks it as a parameter it has not
seen yet) — click that row and save. Same for the user-scoped ones: set scope to
**User** and type the property name into the **User property** field.

Registering ahead of collection is the correct order anyway, since dimensions are
not retroactive. Waiting for the dropdown to populate itself costs you every day
of data in between.

Event-scoped:

| Name | Parameter |
|---|---|
| Page template | `page_template` |
| Page section | `page_section` |
| Is entrance | `is_entrance` |
| Trade ID | `trade_id` |
| Ticker | `ticker` |
| Surface | `surface` |
| Gym section | `section` |
| Furthest donation step | `furthest_step` |
| Replay progress | `percent_progress` |
| CTA placement | `placement` |

Worth adding once the above are in place: `trade_type`, `detail_type`,
`tab_name`, `nav_source`, `replay_source`, `error_reason`, `auth_action`,
`is_custom_amount`, `story_event_type`, `link_label`, `download_status`.

Skip the parameters listed under *Catalogue entries with no call site* above —
they are defined in code but nothing emits them.

User-scoped:

| Name | Property |
|---|---|
| Logged in | `logged_in` |
| Account role | `account_role` |

Dimensions only apply to data collected **after** they are registered, so create
them before you start reading reports.

Once they are registered, confirm the parameters actually arrive under the names
you typed: run the app, accept the consent banner, and watch *Admin → DebugView*
(append `?debug_mode=1` to the URL, or use the GA Debugger extension). DebugView
is real time and shows every parameter on each event, so a typo surfaces in
seconds — the custom-definitions dropdown and the standard reports would not tell
you for another day or two.

### 4. Mark key events

*Admin → Events → Mark as key event*: `purchase` (may already be automatic),
`begin_checkout`, `sign_up`, `donate_cta_click`.

### 5. Enhanced measurement

*Admin → Data streams → your stream → Enhanced measurement*: leave **scrolls**,
**outbound clicks** and **site search** on. Page views are sent explicitly by the
app (`send_page_view: false`), so enhanced measurement's own page-view tracking
is inert — the rest still works and costs nothing.

Consider turning **file downloads** off. It fires on clicks to document URLs and
shares the `file_download` event name with the app's own PDF-export tracking,
which reports a real lifecycle in `download_status`; mixing the two makes that
parameter read `(not set)` for the automatic hits. Nothing breaks either way, but
one source per event name is easier to trust.

### 6. Reporting identity

*Admin → Reporting identity* → **Blended**. The app sets `user_id` for signed-in
users, which is what lets one person's sessions across devices stitch together.

### 7. Build the reports

- **Pages entered** — Explore → Free form; dimension `Page template`, metric
  `Event count`, filter `is_entrance = true`.
- **User journey** — Explore → **Path exploration**, node type `Page template`,
  starting point `session_start`.
- **Gym usage** — Free form; dimension `Gym section`, metric `Event count` on
  `gym_section_open`; segment by `Logged in`.
- **Most-viewed trades** — Reports → Monetization → **Items**, filter
  `item_category = trade`. Add `Surface` as a secondary dimension.
- **Donation funnel** — Explore → **Funnel exploration** with steps
  `donate_cta_view → donate_cta_click → donation_amount_selected →
  begin_checkout → add_payment_info → purchase`. Break down by `CTA placement`.
  This is your conversion-optimisation surface: the biggest drop-off between two
  adjacent steps is where to work next.

### 8. Clean up environment variables

- Remove `NEXT_PUBLIC_GTM_ID` — no longer read.
- Optionally set `NEXT_PUBLIC_ANALYTICS_CONSENT_MODE`. Unset means `advanced`;
  use `basic` to load nothing before opt-in.
- Remove `NEXT_PUBLIC_GA4_API_SECRET`. An API secret must never be in a
  `NEXT_PUBLIC_*` variable; those are inlined into the client bundle and
  publicly readable. It currently holds a placeholder, so nothing has leaked. If
  server-side Measurement Protocol is ever needed, use an unprefixed name.
- `@next/third-parties` has been removed — it was only used for GTM, and its
  peer range caps out at Next 15 while this project is on Next 16, so it also
  blocked `npm install`.

---

## Consent and measurement coverage

Two changes address what used to be a large blind spot: visitors who ignored or
declined the banner were entirely invisible, typically 30–60% of traffic.

### Consent Mode advanced (default)

`gtag.js` now loads for every visitor with **all storage denied** until they opt
in. No cookies are written and no identifiers are stored without consent; Google
receives cookieless pings it uses for aggregate modelling. On opt-in, storage is
upgraded via `consent update`.

Set `NEXT_PUBLIC_ANALYTICS_CONSENT_MODE=basic` to revert to loading nothing at
all before opt-in.

Two caveats worth knowing:

- **Behavioural modelling has a volume threshold.** Google requires roughly
  1,000 daily events with `analytics_storage: 'denied'` for at least 7 days
  before it will model unconsented traffic. Below that you still get cookieless
  event counts, but not modelled users/sessions. Expect improvement, not
  perfection, on low traffic.
- **It transmits data for people who have not opted in.** This is Google's own
  recommended configuration and stores nothing on the device, but it is a
  privacy-posture choice. The privacy policy (§7, "Analytics before you choose")
  documents it accurately — keep them in sync if you change the mode.

### Consent bar rewritten

`CookieConsentBanner` was a blocking modal. Radix closes a Dialog on Escape,
outside-click and its built-in ✕, and all three dismissed the banner **without
recording a choice** — so consent was never stored, analytics never loaded, and
because the check ran once on mount the visitor was never asked again that
session. Blocking the page before anyone has seen the content also depresses
opt-in, which is the root of the coverage problem.

It is now a non-blocking bottom bar that leaves the site usable and stays until
an explicit choice is made. Accept and reject are one click each with equal
weight (GDPR requires rejecting to be no harder than accepting), and the ✕ only
appears once a choice already exists, so it can never be used to skip the
question.

### Withdrawal now actually works

`openConsentManager()` existed but nothing in the UI called it, so consent was
one-way once stored — a GDPR gap. There is now a **Cookie settings** link in the
footer (`components/layout/cookie-settings-link.tsx`). Withdrawing consent stops
collection *and* deletes the `_ga` / `_ga_*` / `_gid` / `_gat*` cookies;
Consent Mode alone would leave them on the device.

## Checking collection without waiting for GA4

Standard reports lag collection by up to 48 hours and the custom-definitions
dropdown lags it too, so neither tells you whether a parameter is arriving.
DebugView is real time; the dataLayer is faster still and needs no console:

```js
// devtools, on any page of the app
dataLayer.filter(a => a[0] === 'event').map(a => [a[1], a[2]])
```

Every entry is one hit exactly as gtag received it. If `page_view` is absent, the
problem is in the app, not in GA4. Note that a background tab is a legitimate
test case — it is where this used to fail.

## Not addressed

- **`src/lib/api/analytics/route.ts`** is dead code — its header says
  `src/app/api/analytics/route.ts`, but no such route exists, so the GA Data API
  reader never runs. Move it to `src/app/api/analytics/route.ts` if you want an
  in-app dashboard, or delete it.
- **High-cardinality limits.** GA4 aggregates rare rows into `(other)` in
  standard reports once cardinality is high, and applies thresholding to small
  segments. For hundreds of trades this is fine. If per-trade precision ever
  matters more than convenience, log the event to your own Payload backend
  alongside GA4 — `events.ts` is the single place that would change.
