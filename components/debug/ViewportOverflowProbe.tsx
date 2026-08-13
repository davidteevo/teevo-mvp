"use client";

import { useEffect, useState } from "react";

const ENDPOINT = "http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40";

type Hud = {
  overflowPx: number;
  clientWidth: number;
  scrollWidth: number;
  innerWidth: number;
  vvWidth: number | null;
  topOffender: string | null;
  path: string;
  uaShort: string;
  reportText: string;
};

function rectInfo(el: Element | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || undefined,
    className: typeof (el as HTMLElement).className === "string" ? (el as HTMLElement).className.slice(0, 180) : undefined,
    width: Math.round(r.width * 10) / 10,
    height: Math.round(r.height * 10) / 10,
    left: Math.round(r.left * 10) / 10,
    right: Math.round(r.right * 10) / 10,
    scrollWidth: (el as HTMLElement).scrollWidth,
    clientWidth: (el as HTMLElement).clientWidth,
    minWidth: cs.minWidth,
    maxWidth: cs.maxWidth,
    widthCss: cs.width,
    display: cs.display,
    flexShrink: cs.flexShrink,
    overflowX: cs.overflowX,
    boxSizing: cs.boxSizing,
  };
}

function overflowingElements(viewportW: number) {
  const out: Array<{
    tag: string;
    className?: string;
    right: number;
    width: number;
    overflowBy: number;
  }> = [];
  const all = Array.from(document.querySelectorAll("body *"));
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const overflowBy = Math.round((r.right - viewportW) * 10) / 10;
    if (overflowBy <= 1 && r.left >= -1) continue;
    if (r.left >= viewportW || r.right <= 0) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      className:
        typeof (el as HTMLElement).className === "string"
          ? (el as HTMLElement).className.slice(0, 160)
          : undefined,
      right: Math.round(r.right * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      overflowBy,
    });
  }
  out.sort((a, b) => b.overflowBy - a.overflowBy);
  return out.slice(0, 12);
}

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

export function ViewportOverflowProbe() {
  const [hud, setHud] = useState<Hud | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const run = (runId: string) => {
      const docEl = document.documentElement;
      const body = document.body;
      const vv = window.visualViewport;
      const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null;
      const vwProbe = document.createElement("div");
      vwProbe.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:0;visibility:hidden;pointer-events:none";
      document.body.appendChild(vwProbe);
      const vwPx = vwProbe.getBoundingClientRect().width;
      vwProbe.remove();

      const dummy = document.createElement("div");
      dummy.style.paddingLeft = "env(safe-area-inset-left)";
      dummy.style.paddingRight = "env(safe-area-inset-right)";
      dummy.style.paddingTop = "env(safe-area-inset-top)";
      dummy.style.paddingBottom = "env(safe-area-inset-bottom)";
      dummy.style.position = "fixed";
      dummy.style.visibility = "hidden";
      document.body.appendChild(dummy);
      const dummyCs = getComputedStyle(dummy);
      const safeInsets = {
        left: dummyCs.paddingLeft,
        right: dummyCs.paddingRight,
        top: dummyCs.paddingTop,
        bottom: dummyCs.paddingBottom,
      };
      dummy.remove();

      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const main = document.querySelector("main");
      const trust =
        Array.from(document.querySelectorAll("body div")).find((el) => {
          const c = el.className?.toString?.() ?? "";
          return c.includes("bg-mowing-green") && c.includes("text-off-white-pique") && c.includes("py-1.5");
        }) ?? null;

      const headerChildren = header
        ? Array.from(header.querySelectorAll(":scope > div > *")).map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase(),
              className: typeof (el as HTMLElement).className === "string" ? (el as HTMLElement).className.slice(0, 80) : undefined,
              width: Math.round(r.width * 10) / 10,
              left: Math.round(r.left * 10) / 10,
              right: Math.round(r.right * 10) / 10,
            };
          })
        : [];

      const overflowing = overflowingElements(docEl.clientWidth);
      const overflowPx = docEl.scrollWidth - docEl.clientWidth;
      const metrics = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: docEl.clientWidth,
        clientHeight: docEl.clientHeight,
        scrollWidth: docEl.scrollWidth,
        scrollHeight: docEl.scrollHeight,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        visualViewportWidth: vv?.width ?? null,
        visualViewportHeight: vv?.height ?? null,
        visualViewportOffsetLeft: vv?.offsetLeft ?? null,
        visualViewportScale: vv?.scale ?? null,
        vwPx,
        overflowPx,
        viewportMeta,
        ua: navigator.userAgent,
        dpr: window.devicePixelRatio,
        orientation: screen.orientation?.type ?? (window as Window & { orientation?: number }).orientation,
        safeInsets,
        headerFont: header ? getComputedStyle(header).fontSize : null,
        trustFont: trust ? getComputedStyle(trust).fontSize : null,
        htmlBoxSizing: getComputedStyle(docEl).boxSizing,
        bodyDisplay: getComputedStyle(body).display,
        bodyMinWidth: getComputedStyle(body).minWidth,
        bodyOverflowX: getComputedStyle(body).overflowX,
        path: location.pathname,
        href: location.href,
      };

      const report = {
        overflowPx,
        clientWidth: docEl.clientWidth,
        scrollWidth: docEl.scrollWidth,
        innerWidth: window.innerWidth,
        visualViewportWidth: vv?.width ?? null,
        dpr: window.devicePixelRatio,
        path: location.pathname,
        href: location.href,
        viewportMeta,
        ua: navigator.userAgent,
        safeInsets,
        topOverflowing: overflowing.slice(0, 5),
      };

      setHud({
        overflowPx,
        clientWidth: docEl.clientWidth,
        scrollWidth: docEl.scrollWidth,
        innerWidth: window.innerWidth,
        vvWidth: vv?.width ?? null,
        topOffender: overflowing[0]
          ? `${overflowing[0].tag}.${(overflowing[0].className || "").split(" ")[0]} +${overflowing[0].overflowBy}`
          : null,
        path: location.pathname,
        uaShort: /iPhone/.test(navigator.userAgent)
          ? `iPhone ${docEl.clientWidth}px`
          : `${docEl.clientWidth}px`,
        reportText: JSON.stringify(report, null, 2),
      });

      // #region agent log
      log({
        runId,
        hypothesisId: "H1",
        location: "ViewportOverflowProbe.tsx:viewport",
        message: "viewport meta + width metrics",
        data: metrics,
      });
      log({
        runId,
        hypothesisId: "H2",
        location: "ViewportOverflowProbe.tsx:vw",
        message: "100vw vs clientWidth",
        data: {
          vwPx,
          clientWidth: docEl.clientWidth,
          innerWidth: window.innerWidth,
          visualViewportWidth: vv?.width ?? null,
          vwMinusClient: vwPx - docEl.clientWidth,
        },
      });
      log({
        runId,
        hypothesisId: "H3",
        location: "ViewportOverflowProbe.tsx:chrome",
        message: "shared chrome rects",
        data: {
          body: rectInfo(body),
          header: rectInfo(header),
          headerChildren,
          trustRect: rectInfo(trust),
          main: rectInfo(main),
          footer: rectInfo(footer),
        },
      });
      log({
        runId,
        hypothesisId: "H4",
        location: "ViewportOverflowProbe.tsx:overflowing",
        message: "overflowing DOM elements",
        data: {
          overflowPx,
          overflowing,
          path: location.pathname,
        },
      });
      log({
        runId,
        hypothesisId: "H5",
        location: "ViewportOverflowProbe.tsx:safearea",
        message: "safe-area + visual viewport",
        data: {
          safeInsets,
          visualViewportWidth: vv?.width ?? null,
          visualViewportHeight: vv?.height ?? null,
          visualViewportScale: vv?.scale ?? null,
          screenWidth: window.screen?.width ?? null,
          screenAvailWidth: window.screen?.availWidth ?? null,
        },
      });
      // #endregion
    };

    run("initial");
    const t = window.setTimeout(() => run("after-layout"), 800);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  if (!hud) return null;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(hud.reportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select via prompt for older iOS
      window.prompt("Copy overflow report:", hud.reportText);
    }
  };

  return (
    <button
      type="button"
      onClick={copyReport}
      style={{
        position: "fixed",
        zIndex: 2147483647,
        left: 8,
        bottom: 8,
        maxWidth: "92vw",
        padding: "8px 10px",
        borderRadius: 8,
        border: "none",
        background: hud.overflowPx > 0 ? "rgba(180,0,0,0.94)" : "rgba(0,80,40,0.9)",
        color: "#fff",
        fontSize: 11,
        lineHeight: 1.35,
        fontFamily: "ui-monospace, monospace",
        textAlign: "left",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>
        Overflow probe · tap to copy {copied ? "✓" : ""}
      </div>
      <div>
        overflowPx={hud.overflowPx} cw={hud.clientWidth} sw={hud.scrollWidth}
      </div>
      <div>
        iw={hud.innerWidth} vv={hud.vvWidth ?? "n/a"} · {hud.uaShort} · {hud.path}
      </div>
      {hud.topOffender ? <div>top: {hud.topOffender}</div> : <div>top: none</div>}
      <div style={{ opacity: 0.85, marginTop: 2 }}>
        Red = page wider than screen. Send screenshot or copied text.
      </div>
    </button>
  );
}
