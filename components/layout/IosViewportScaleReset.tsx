"use client";

import { useEffect } from "react";

/**
 * iOS Safari can restore a pinch-zoom scale independently of aA Page Zoom.
 * When visualViewport.scale > 1, layout stays at device-width while the visible
 * area shrinks — which feels like horizontal page overflow even with
 * scrollWidth === clientWidth.
 *
 * Briefly locking maximum-scale forces Safari to re-apply a fit-to-width scale.
 */
export function IosViewportScaleReset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (vv.scale <= 1.02) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    );
  }, []);

  return null;
}
