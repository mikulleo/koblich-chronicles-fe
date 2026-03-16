// src/components/prefetch-initializer.tsx
"use client";

import { useEffect } from "react";
import { prefetchAll } from "@/lib/prefetch-cache";

let prefetched = false;

/**
 * Invisible component that triggers data prefetch once on app boot.
 * Place in the root layout so it runs on first page load.
 */
export function PrefetchInitializer() {
  useEffect(() => {
    if (prefetched) return;
    prefetched = true;
    prefetchAll();
  }, []);

  return null;
}
