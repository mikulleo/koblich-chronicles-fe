// src/components/analytics/PageViewTracker.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'

import { trackPageView } from '@/lib/analytics'

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
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return

    const url = search ? `${pathname}?${search}` : pathname
    // React 18+ mounts effects twice in dev StrictMode; a URL guard keeps
    // that from doubling every page_view.
    if (lastTracked.current === url) return
    lastTracked.current = url

    // Let Next.js commit the new document title before reading it.
    const frame = requestAnimationFrame(() => {
      trackPageView({ pathname, search })
    })

    return () => cancelAnimationFrame(frame)
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
