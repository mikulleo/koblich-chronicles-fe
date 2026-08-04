// src/components/analytics/PageViewTracker.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'

import { trackPageView } from '@/lib/analytics'

/** Number of entries in this tab's session history; 0 during SSR. */
const historyLength = () => (typeof window === 'undefined' ? 0 : window.history.length)

/**
 * Emits one `page_view` per URL, including the very first one.
 *
 * This is mounted unconditionally — *not* behind the consent gate — because
 * the transport buffers events until consent resolves. Gating the component
 * instead was the reason landing pages never appeared in GA4: by the time
 * consent had been read from localStorage and the GA script had loaded, the
 * mount effect for the entry page had already come and gone.
 */
function PageViewTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  // Everything below is recorded only once a hit has actually gone out. Nothing
  // is marked as "handled" up front, which is what makes the whole effect safe
  // to run twice: React's StrictMode remounts it (setup → cleanup → setup), and
  // the previous version marked the URL at *schedule* time and cancelled the
  // pending callback on cleanup, so the second setup early-returned and the hit
  // was silently dropped.
  const sentUrl = useRef<string | null>(null)
  const sentPath = useRef<string | null>(null)
  const sentAtEntry = useRef(-1)

  useEffect(() => {
    if (!pathname) return

    const url = search ? `${pathname}?${search}` : pathname
    if (sentUrl.current === url) return

    // A URL rewritten in place is not a new page view. Components here sync
    // their filter state into the query string with `history.replaceState` —
    // chart-gallery writes the default timeframes on every mount — and Next's
    // router surfaces that as a route change. `/charts` therefore reported two
    // page views per visit, one bare and one with the defaults attached, and
    // every filter change after that added another.
    //
    // `replaceState` adds no history entry; a real navigation does. Comparing
    // the entry count separates the two without having to guess which query
    // parameters are meaningful, so a genuine query-only navigation (say
    // /chart-view?src=…) is still counted. History length saturates at 50, after
    // which query-only navigations on an unchanged path stop being counted —
    // deep enough into a session not to matter.
    const rewrittenInPlace = sentPath.current === pathname && historyLength() === sentAtEntry.current
    if (rewrittenInPlace) return

    // Deferred by one turn of the event loop so Next.js has committed the new
    // <title> before we read it. Also collapses a burst of URL changes into the
    // last one, because the cleanup cancels a superseded hit.
    //
    // This used to be requestAnimationFrame, which browsers do not run at all
    // while a tab is hidden. Any session that started in a background tab —
    // cmd-click, "open link in new tab", a restored window, a prerender — sent
    // no page_view whatsoever, and with it no page_template, page_section or
    // is_entrance. A timer still fires when hidden; it is only throttled.
    const timer = setTimeout(() => {
      sentUrl.current = url
      sentPath.current = pathname
      sentAtEntry.current = historyLength()
      trackPageView({ pathname, search })
    }, 0)

    return () => clearTimeout(timer)
  }, [pathname, search])

  return null
}

export default function PageViewTracker() {
  // useSearchParams() suspends during prerender; without this boundary the
  // whole app would be forced into dynamic rendering.
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  )
}
