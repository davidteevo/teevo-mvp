"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Scroll/highlight a list row when `?id=` is present. */
export function useHighlightId(prefix: string, ready = true): string | null {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  useEffect(() => {
    if (!highlightId || !ready) return;
    const el = document.getElementById(`${prefix}-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, prefix, ready]);

  return highlightId;
}

export function highlightClass(isHighlighted: boolean): string {
  return isHighlighted ? " ring-2 ring-par-3-punch bg-par-3-punch/5" : "";
}
