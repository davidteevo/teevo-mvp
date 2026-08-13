"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";

const PREVIEW_LIMIT = 6;

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  action_url: string | null;
  action_label: string | null;
  requires_action: boolean;
  action_completed_at: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCount = useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setCount(typeof data.count === "number" ? data.count : 0))
      .catch(() => {});
  }, []);

  const loadPreview = useCallback(() => {
    setListLoading(true);
    setError(null);
    fetch("/api/notifications?filter=all")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        const all = (data.notifications ?? []) as NotificationItem[];
        setItems(all.slice(0, PREVIEW_LIMIT));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadCount();
    const onFocus = () => loadCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadCount, pathname]);

  useEffect(() => {
    if (!open) return;
    loadPreview();
    track("notification_viewed", { filter: "dropdown", user_role: role });
  }, [open, loadPreview, role]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const markRead = async (ids: string[]) => {
    const res = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return;
    const unreadInBatch = items.filter((n) => ids.includes(n.id) && !n.read_at).length;
    setCount((c) => Math.max(0, c - unreadInBatch));
    const set = new Set(ids);
    setItems((prev) =>
      prev.map((n) => (set.has(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    );
    track("notification_marked_read", { all: false, count: ids.length, user_role: role });
  };

  const openNotification = async (n: NotificationItem) => {
    if (!n.read_at) await markRead([n.id]);
    track("notification_clicked", {
      notification_type: n.type,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      user_role: role,
    });
    setOpen(false);
    router.push(n.action_url || "/notifications");
  };

  const label = count > 0 ? `${count > 9 ? "9+" : count} unread notifications` : "Notifications";
  const badge = count > 9 ? "9+" : String(count);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-mowing-green hover:text-mowing-green rounded-lg focus:outline-none focus:ring-2 focus:ring-mowing-green"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-divot-pink text-mowing-green text-[10px] font-semibold flex items-center justify-center px-1">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-1 z-[60] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-par-3-punch/20 bg-white shadow-lg max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-14 max-sm:w-auto"
        >
          <div className="flex items-center justify-between gap-2 border-b border-par-3-punch/15 px-4 py-3">
            <p className="text-sm font-semibold text-mowing-green">Notifications</p>
            {count > 0 && (
              <span className="text-xs font-medium text-mowing-green/60">
                {count > 9 ? "9+" : count} unread
              </span>
            )}
          </div>

          <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
            {listLoading ? (
              <div className="space-y-2 p-3" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-mowing-green/5 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-mowing-green">{error}</p>
                <button
                  type="button"
                  onClick={loadPreview}
                  className="mt-2 text-sm font-medium text-par-3-punch hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-mowing-green/70">
                <p className="font-medium text-mowing-green">You&apos;re all caught up</p>
                <p className="mt-1">We&apos;ll let you know when there&apos;s something new.</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const openAction = n.requires_action && !n.action_completed_at;
                  return (
                    <li key={n.id} className="border-b border-par-3-punch/10 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-mowing-green/5 transition-colors ${
                          !n.read_at ? "bg-par-3-punch/5" : ""
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              !n.read_at ? "bg-divot-pink" : "bg-transparent"
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {openAction && (
                                <span className="rounded-full bg-golden-tee/90 text-mowing-green px-1.5 py-0.5 text-[10px] font-semibold">
                                  Action
                                </span>
                              )}
                              <p className="text-sm font-semibold text-mowing-green line-clamp-1">
                                {n.title}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-mowing-green/70 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[11px] text-mowing-green/45">
                              {timeAgo(n.created_at)}
                              {n.action_label ? ` · ${n.action_label}` : ""}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-par-3-punch/15 px-4 py-3 text-center text-sm font-medium text-par-3-punch hover:bg-par-3-punch/5"
          >
            View more
          </Link>
        </div>
      )}
    </div>
  );
}
