"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { navigateNotificationAction } from "@/lib/notification-action";

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

type Filter = "all" | "action" | "unread";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function NotificationsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/notifications")}`);
  }, [user, loading, router]);

  const load = useCallback(() => {
    if (!user) return;
    setListLoading(true);
    setError(null);
    fetch(`/api/notifications?filter=${filter}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setItems(data.notifications ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setListLoading(false));
  }, [user, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || listLoading) return;
    track("notification_viewed", { filter, user_role: role });
  }, [user, listLoading, filter, role]);

  const markRead = async (ids?: string[], all = false) => {
    const res = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { ids }),
    });
    if (!res.ok) return;
    track("notification_marked_read", { all, count: ids?.length ?? 0, user_role: role });
    if (all) {
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } else if (ids?.length) {
      const set = new Set(ids);
      setItems((prev) =>
        prev.map((n) => (set.has(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
      );
    }
  };

  const openNotification = async (n: NotificationItem, viaCta: boolean) => {
    if (!n.read_at) await markRead([n.id]);
    track(viaCta ? "notification_action_clicked" : "notification_clicked", {
      notification_type: n.type,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      user_role: role,
    });
    if (n.type === "leave_seller_feedback") {
      track("feedback_notification_opened", { transaction_id: n.entity_id });
    }
    if (n.action_url) navigateNotificationAction(n.action_url, (href) => router.push(href));
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    );
  }

  const emptyTitle =
    filter === "action" ? "Nothing needs your attention" : "You're all caught up";
  const emptyBody =
    filter === "action"
      ? "You're all caught up."
      : "We'll let you know when there's something new.";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-mowing-green">Notifications</h1>
          <p className="mt-1 text-mowing-green/80">Updates, actions and activity from your Teevo account.</p>
        </div>
        {items.some((n) => !n.read_at) && (
          <button
            type="button"
            onClick={() => markRead(undefined, true)}
            className="text-sm font-medium text-par-3-punch hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <nav
        className="mt-6 flex gap-1 rounded-xl border border-mowing-green/20 bg-mowing-green/5 p-1"
        aria-label="Notification filters"
      >
        {(
          [
            { id: "all", label: "All" },
            { id: "action", label: "Action required" },
            { id: "unread", label: "Unread" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === tab.id
                ? "bg-white text-mowing-green shadow-sm"
                : "text-mowing-green/80 hover:text-mowing-green hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {listLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-par-3-punch/20 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-divot-pink/40 bg-white p-8 text-center">
            <p className="text-mowing-green">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/80">
            <p className="font-medium text-mowing-green">{emptyTitle}</p>
            <p className="mt-1 text-sm">{emptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const openAction = n.requires_action && !n.action_completed_at;
              const completed = n.requires_action && !!n.action_completed_at;
              return (
                <li key={n.id}>
                  <article
                    className={`rounded-xl border bg-white p-4 sm:p-5 transition-colors ${
                      openAction
                        ? "border-par-3-punch/50 shadow-sm"
                        : n.read_at
                          ? "border-par-3-punch/15"
                          : "border-par-3-punch/30 bg-par-3-punch/5"
                    } ${completed ? "opacity-80" : ""}`}
                  >
                    <div className="flex gap-3">
                      {!n.read_at && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-divot-pink"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {openAction && (
                            <span className="rounded-full bg-golden-tee/90 text-mowing-green px-2 py-0.5 text-xs font-semibold">
                              Action required
                            </span>
                          )}
                          {completed && (
                            <span className="rounded-full bg-mowing-green/15 text-mowing-green px-2 py-0.5 text-xs font-medium">
                              ✓ {n.action_label ? `${n.action_label} complete` : "Done"}
                            </span>
                          )}
                          <h2 className="font-semibold text-mowing-green">{n.title}</h2>
                        </div>
                        <p className="mt-1 text-sm text-mowing-green/80 whitespace-pre-wrap">{n.message}</p>
                        <p className="mt-2 text-xs text-mowing-green/50">{timeAgo(n.created_at)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {n.action_url && (
                            <button
                              type="button"
                              onClick={() => openNotification(n, true)}
                              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                                openAction
                                  ? "bg-mowing-green text-off-white-pique hover:opacity-90"
                                  : "border border-par-3-punch/30 text-par-3-punch hover:bg-par-3-punch/10"
                              }`}
                            >
                              {n.action_label ?? "View"} →
                            </button>
                          )}
                          {!n.read_at && (
                            <button
                              type="button"
                              onClick={() => markRead([n.id])}
                              className="text-sm text-mowing-green/70 hover:underline"
                            >
                              Mark as read
                            </button>
                          )}
                          {!n.action_url && (
                            <button
                              type="button"
                              onClick={() => openNotification(n, false)}
                              className="text-sm text-par-3-punch hover:underline"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
