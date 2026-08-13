"use client";

import { useEffect } from "react";

const ENDPOINT = "http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40";

function log(payload: Record<string, unknown>) {
  const body = JSON.stringify({ sessionId: "f84ace", timestamp: Date.now(), ...payload });
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f84ace" },
    body,
  }).catch(() => {});
  fetch("/api/debug-overflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

/**
 * iOS Safari can restore a pinch-zoom scale independently of aA Page Zoom.
 * When visualViewport.scale !== 1, the layout (device-width) stays wide while
 * the visible area shrinks — which feels like horizontal page overflow.
 * Briefly locking maximum-scale forces Safari to re-apply scale 1.
 */
export function IosViewportScaleReset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const before = {
      scale: vv.scale,
      width: vv.width,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
    };

    // #region agent log
    log({
      runId: "pre-fix",
      hypothesisId: "H8",
      location: "IosViewportScaleReset.tsx:before",
      message: "scale before viewport reset",
      data: before,
    });
    // #endregion

    if (Math.abs(vv.scale - 1) < 0.02) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const restore =
      "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5";
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    );

    const done = () => {
      meta.setAttribute("content", restore);
      const after = {
        scale: window.visualViewport?.scale ?? null,
        width: window.visualViewport?.width ?? null,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
      };
      // #region agent log
      log({
        runId: "post-fix",
        hypothesisId: "H8",
        location: "IosViewportScaleReset.tsx:after",
        message: "scale after viewport reset",
        data: { before, after },
      });
      // #endregion
    };

    // Allow Safari to apply the lock, then restore pinch-zoom for a11y.
    window.setTimeout(done, 50);
    window.setTimeout(() => {
      // Second pass if scale snaps back (remembered site zoom).
      if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) >= 0.02) {
        meta.setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        );
        // #region agent log
        log({
          runId: "post-fix",
          hypothesisId: "H8",
          location: "IosViewportScaleReset.tsx:persist-lock",
          message: "scale persisted; keeping maximum-scale=1",
          data: {
            scale: window.visualViewport.scale,
            width: window.visualViewport.width,
          },
        });
        // #endregion
      }
    }, 400);
  }, []);

  return null;
}
