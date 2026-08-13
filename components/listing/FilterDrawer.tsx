"use client";

import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useEffect } from "react";

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function logDrawer(payload: Record<string, unknown>) {
  // #region agent log
  const body = JSON.stringify({ sessionId: "f84ace", timestamp: Date.now(), ...payload });
  fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f84ace" },
    body,
  }).catch(() => {});
  fetch("/api/debug-overflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
  // #endregion
}

function snapshot(label: string) {
  const docEl = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;
  const active = document.activeElement as HTMLElement | null;
  return {
    label,
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: docEl.clientWidth,
    clientHeight: docEl.clientHeight,
    scrollWidth: docEl.scrollWidth,
    scrollHeight: docEl.scrollHeight,
    bodyScrollHeight: body.scrollHeight,
    bodyHeight: body.getBoundingClientRect().height,
    overflowPxX: docEl.scrollWidth - docEl.clientWidth,
    overflowPxY: docEl.scrollHeight - docEl.clientHeight,
    vvWidth: vv?.width ?? null,
    vvHeight: vv?.height ?? null,
    vvScale: vv?.scale ?? null,
    bodyPosition: getComputedStyle(body).position,
    bodyTop: getComputedStyle(body).top,
    bodyOverflow: getComputedStyle(body).overflow,
    htmlOverflow: getComputedStyle(docEl).overflow,
    activeTag: active?.tagName ?? null,
    activeType: active?.getAttribute?.("type") ?? null,
    activeClass: typeof active?.className === "string" ? active.className.slice(0, 80) : null,
  };
}

export function FilterDrawer({ open, onOpenChange, title, children, footer }: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    // #region agent log
    logDrawer({
      runId: "drawer-open",
      hypothesisId: "H1",
      location: "FilterDrawer.tsx:open",
      message: "drawer opened metrics",
      data: { title, ...snapshot("open-0") },
    });
    const t1 = window.setTimeout(() => {
      logDrawer({
        runId: "drawer-open",
        hypothesisId: "H1",
        location: "FilterDrawer.tsx:open+100",
        message: "drawer metrics after 100ms",
        data: { title, ...snapshot("open-100") },
      });
    }, 100);
    const t2 = window.setTimeout(() => {
      logDrawer({
        runId: "drawer-open",
        hypothesisId: "H2",
        location: "FilterDrawer.tsx:open+400",
        message: "drawer metrics after 400ms (keyboard/focus settle)",
        data: { title, ...snapshot("open-400") },
      });
    }, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // #endregion
  }, [open, title]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[101] flex max-h-[85vh] flex-col rounded-t-2xl bg-white outline-none"
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">Filter listings</Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-mowing-green/20" aria-hidden />
          <div className="flex items-center justify-between border-b border-mowing-green/10 px-4 py-3 shrink-0">
            <h2 className="text-lg font-semibold text-mowing-green">{title}</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-mowing-green/70 hover:bg-mowing-green/10 hover:text-mowing-green"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-mowing-green/10 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
