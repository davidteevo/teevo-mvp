"use client";

import { formatPoundsCompact } from "@/lib/pricing";

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const SEEN_REWARDS_KEY = "teevo_creator_hub_seen_rewards";

export function loadSeenRewardIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_REWARDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveSeenRewardIds(ids: Set<string>): void {
  try {
    localStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify(Array.from(ids).slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export { formatPoundsCompact };
