"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

type CreatorInsightsPayload = {
  enrolled: true;
  range: { preset: string; from: string | null; to: string | null };
  creator: {
    id: string;
    name: string;
    code: string | null;
    codeStatus: string | null;
    shareUrl: string | null;
    status: "active" | "paused" | "disabled";
    createdAt: string;
  };
  programme: {
    enabled: boolean;
    focusLabel: string;
    rewardLine: string;
  };
  performance: {
    referredUsers: number;
    successfulListings: number;
    successfulTransactions: number;
    totalRewardsEarnedPence: number;
    earnedPence: number;
    paidPence: number;
    outstandingPence: number;
    gmvPence: number;
    teevoRevenuePence: number;
  };
  performanceInRange: {
    referredUsers: number;
    successfulListings: number;
    successfulTransactions: number;
    rewardsEarnedPence: number;
    visits: number;
    gmvPence: number;
    teevoRevenuePence: number;
    rewardsPaidPence: number;
    roiRatio: number | null;
  };
  funnel: {
    key: string;
    label: string;
    total: number;
    conversionFromPrevious: number | null;
  }[];
  trend: {
    date: string;
    referredUsers: number;
    successfulListings: number;
    transactions: number;
    gmvPence: number;
    rewardsPence: number;
  }[];
  referredUsers: {
    userId: string;
    label: string;
    email: string | null;
    joinedAt: string;
    attributedAt: string;
    listings: number;
    purchases: number;
    rewardsGeneratedPence: number;
    inRange: boolean;
  }[];
  attributedListings: {
    listingId: string | null;
    title: string;
    pricePence: number | null;
    status: string;
    createdAt: string;
    sellerLabel: string;
    rewardStatus: string;
    rewardAmountPence: number;
    inRange: boolean;
  }[];
  attributedTransactions: {
    transactionId: string | null;
    amountPence: number;
    buyerFeePence: number;
    completedAt: string;
    buyerLabel: string;
    buyerId: string | null;
    rewardAmountPence: number;
    rewardStatus: string;
    inRange: boolean;
  }[];
  rewardHistory: {
    id: string;
    date: string;
    referredUserId: string | null;
    referredUserLabel: string;
    rewardType: string;
    amountPence: number;
    status: string;
    inRange: boolean;
  }[];
  auditTrail: { action: string; at: string; adminId: string }[];
};

type NotEnrolled = { enrolled: false };

type Preset = "7d" | "30d" | "all" | "custom";
type TrendMetric = "referredUsers" | "successfulListings" | "transactions" | "gmvPence" | "rewardsPence";

const REWARD_TYPE_LABELS: Record<string, string> = {
  creator_new_user_reward: "New user",
  creator_listing_reward: "Successful listing",
  creator_transaction_reward: "Completed transaction",
  creator_commission: "Legacy commission",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  if (status === "active") return "Active Creator";
  if (status === "paused") return "Paused";
  if (status === "disabled") return "Former Creator";
  return status;
}

export type CreatorStatusSummary = {
  enrolled: boolean;
  status: "active" | "paused" | "disabled" | null;
  createdAt: string | null;
  creatorId: string | null;
};

export function CreatorStatusBadge({
  summary,
  userName,
  onAdd,
  loading,
}: {
  summary: CreatorStatusSummary | null;
  userName: string;
  onAdd: () => void;
  loading?: boolean;
}) {
  if (loading || !summary) {
    return (
      <span className="mt-2 ml-2 inline-flex rounded-full bg-par-3-punch/20 px-2.5 py-0.5 text-xs font-semibold text-mowing-green/60">
        Creator…
      </span>
    );
  }
  if (!summary.enrolled) {
    return (
      <span className="mt-2 ml-2 inline-flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-par-3-punch/25 px-2.5 py-0.5 text-xs font-semibold text-mowing-green/80">
          Not a Creator
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-medium text-par-3-punch underline"
        >
          Add to Creator Programme
        </button>
      </span>
    );
  }
  const isActive = summary.status === "active";
  return (
    <span className="mt-2 ml-2 inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          isActive
            ? "bg-emerald-100 text-emerald-900"
            : "bg-par-3-punch/25 text-mowing-green/80"
        }`}
      >
        {isActive ? "Creator" : statusLabel(summary.status ?? "disabled")}
      </span>
      {summary.createdAt && (
        <span className="text-xs text-mowing-green/60">
          Member since {formatDate(summary.createdAt)}
          <span className="sr-only"> ({userName})</span>
        </span>
      )}
    </span>
  );
}

export default function AdminUserCreatorTab({
  userId,
  userName,
  onFlash,
  onStatusChange,
}: {
  userId: string;
  userName: string;
  onFlash: (msg: string) => void;
  onStatusChange?: (summary: CreatorStatusSummary) => void;
}) {
  const [data, setData] = useState<CreatorInsightsPayload | NotEnrolled | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("successfulListings");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("preset", preset);
      if (preset === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
      }
      const res = await fetch(`/api/admin/users/${userId}/creator?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
      if (json.enrolled === false) {
        onStatusChange?.({ enrolled: false, status: null, createdAt: null, creatorId: null });
      } else {
        onStatusChange?.({
          enrolled: true,
          status: json.creator.status,
          createdAt: json.creator.createdAt,
          creatorId: json.creator.id,
        });
        track("admin_creator_insights_viewed", {
          creator_id: json.creator.id,
          user_id: userId,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creator insights couldn't be loaded.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, preset, customFrom, customTo, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enrol() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/creator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add creator");
      track("admin_creator_added", { user_id: userId, creator_id: json.creatorId });
      setAddOpen(false);
      onFlash(json.reactivated ? "Creator reactivated" : "Added to Creator Programme");
      if (json.warning) onFlash(json.warning);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add creator");
    } finally {
      setBusy(false);
    }
  }

  async function removeCreator() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/creator`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove creator");
      track("admin_creator_removed", { user_id: userId });
      setRemoveOpen(false);
      onFlash("Removed from Creator Programme");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove creator");
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/creator`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reactivate");
      track("admin_creator_added", { user_id: userId, creator_id: json.creatorId, reactivated: true });
      onFlash("Re-added to Creator Programme");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reactivate");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    onFlash("Creator link copied");
    if (data && "enrolled" in data && data.enrolled) {
      track("admin_creator_link_copied", { creator_id: data.creator.id, user_id: userId });
    }
  }

  const enrolled = data && "enrolled" in data && data.enrolled === true ? data : null;

  const kpi = enrolled?.performanceInRange;
  const referredFiltered = useMemo(
    () => (enrolled?.referredUsers ?? []).filter((u) => preset === "all" || u.inRange),
    [enrolled, preset]
  );
  const listingsFiltered = useMemo(
    () => (enrolled?.attributedListings ?? []).filter((l) => preset === "all" || l.inRange),
    [enrolled, preset]
  );
  const txsFiltered = useMemo(
    () => (enrolled?.attributedTransactions ?? []).filter((t) => preset === "all" || t.inRange),
    [enrolled, preset]
  );
  const rewardsFiltered = useMemo(
    () => (enrolled?.rewardHistory ?? []).filter((r) => preset === "all" || r.inRange),
    [enrolled, preset]
  );

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-par-3-punch/15" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-par-3-punch/15" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-medium text-amber-900">Creator insights couldn&apos;t be loaded.</p>
        <p className="mt-1 text-sm text-amber-800">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg bg-mowing-green px-3 py-1.5 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data && data.enrolled === false) {
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-mowing-green">Creator Programme</h2>
        <p className="text-sm text-mowing-green/80">
          This user is not part of the Teevo Creator Programme.
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-mowing-green px-4 py-2 text-sm font-medium text-off-white-pique"
        >
          Add to Creator Programme
        </button>
        {addOpen && (
          <ConfirmDialog
            title="Add to Creator Programme"
            onClose={() => setAddOpen(false)}
            confirmLabel="Add Creator"
            busy={busy}
            onConfirm={() => void enrol()}
          >
            <p className="font-medium text-mowing-green">{userName}</p>
            <p className="mt-2 text-sm text-mowing-green/80">
              This will give this user access to the Teevo Creator Programme and Creator Hub.
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
              <li>Creator status</li>
              <li>Creator UUID/code if one does not already exist</li>
              <li>Creator referral/share link</li>
              <li>Access to Creator Hub</li>
              <li>Current active Creator Programme reward structure</li>
            </ul>
          </ConfirmDialog>
        )}
      </div>
    );
  }

  if (!enrolled) return null;

  const isActive = enrolled.creator.status === "active";

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      <div className="rounded-xl border border-par-3-punch/20 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-mowing-green">Creator Programme</h2>
            <p className="mt-1 text-sm text-mowing-green/70">
              {statusLabel(enrolled.creator.status)} · Since {formatDate(enrolled.creator.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {enrolled.creator.shareUrl && (
              <button
                type="button"
                className="rounded-lg border border-par-3-punch/30 px-3 py-1.5 text-sm"
                onClick={() => void copyLink(enrolled.creator.shareUrl!)}
              >
                Copy Creator Link
              </button>
            )}
            <button
              type="button"
              className="rounded-lg border border-par-3-punch/30 px-3 py-1.5 text-sm"
              onClick={() => {
                setInsightsOpen((o) => !o);
                if (!insightsOpen) {
                  track("admin_creator_insights_viewed", {
                    creator_id: enrolled.creator.id,
                    user_id: userId,
                    expanded: true,
                  });
                }
              }}
            >
              {insightsOpen ? "Hide Creator Insights" : "View Creator Insights"}
            </button>
            <Link
              href={`/admin/referrals/creators/${enrolled.creator.id}`}
              className="rounded-lg border border-par-3-punch/30 px-3 py-1.5 text-sm"
            >
              Open in Creators admin
            </Link>
            <div className="relative">
              <button
                type="button"
                className="rounded-lg border border-par-3-punch/30 px-2 py-1.5 text-sm"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More creator actions"
              >
                ···
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-par-3-punch/20 bg-white py-1 shadow-lg">
                  {isActive ? (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-50"
                      onClick={() => {
                        setMenuOpen(false);
                        setRemoveOpen(true);
                      }}
                    >
                      Remove from Creator Programme
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-par-3-punch/10"
                      onClick={() => {
                        setMenuOpen(false);
                        void reactivate();
                      }}
                    >
                      Re-add to Creator Programme
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-mowing-green/60">Status</dt>
            <dd className="font-medium text-mowing-green">{statusLabel(enrolled.creator.status)}</dd>
          </div>
          <div>
            <dt className="text-mowing-green/60">Creator since</dt>
            <dd className="text-mowing-green">{formatDate(enrolled.creator.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-mowing-green/60">Creator ID</dt>
            <dd className="font-mono text-xs text-mowing-green break-all flex items-center gap-2">
              {enrolled.creator.id}
              <button
                type="button"
                className="underline text-par-3-punch"
                onClick={async () => {
                  await navigator.clipboard.writeText(enrolled.creator.id);
                  onFlash("Creator ID copied");
                }}
              >
                Copy
              </button>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-mowing-green/60">Referral / Share Link</dt>
            <dd className="text-mowing-green break-all flex flex-wrap items-center gap-2">
              <span className="text-sm">{enrolled.creator.shareUrl ?? "—"}</span>
              {enrolled.creator.shareUrl && (
                <>
                  <button
                    type="button"
                    className="underline text-par-3-punch text-sm"
                    onClick={() => void copyLink(enrolled.creator.shareUrl!)}
                  >
                    Copy
                  </button>
                  <a
                    href={enrolled.creator.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-par-3-punch text-sm"
                  >
                    Open
                  </a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-mowing-green/60">Current Campaign / Focus</dt>
            <dd className="text-mowing-green">{enrolled.programme.focusLabel}</dd>
          </div>
          <div>
            <dt className="text-mowing-green/60">Current Reward</dt>
            <dd className="text-mowing-green">{enrolled.programme.rewardLine}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
            ["all", "All time"],
            ["custom", "Custom"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPreset(key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              preset === key
                ? "bg-mowing-green text-off-white-pique"
                : "border border-par-3-punch/30 text-mowing-green"
            }`}
          >
            {label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded border px-2 py-1"
            />
            <span>to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Referred Users" value={String(kpi?.referredUsers ?? 0)} />
        <KpiCard label="Successful Listings" value={String(kpi?.successfulListings ?? 0)} />
        <KpiCard label="Completed Transactions" value={String(kpi?.successfulTransactions ?? 0)} />
        <KpiCard
          label="Rewards Earned"
          value={formatPrice(kpi?.rewardsEarnedPence ?? 0)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="GMV Generated" value={formatPrice(kpi?.gmvPence ?? 0)} />
        <KpiCard label="Teevo Revenue" value={formatPrice(kpi?.teevoRevenuePence ?? 0)} />
        <KpiCard
          label="Rewards Paid"
          value={formatPrice(enrolled.performance.paidPence)}
        />
        <KpiCard
          label="Revenue / Reward"
          value={
            kpi?.roiRatio != null
              ? `${kpi.roiRatio.toFixed(1)}x`
              : "—"
          }
        />
      </div>

      {insightsOpen && (
        <div className="space-y-5">
          <section className="rounded-xl border border-par-3-punch/20 bg-white p-5 overflow-x-auto">
            <h3 className="font-semibold text-mowing-green mb-3">Creator funnel</h3>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-mowing-green/60">
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {enrolled.funnel.map((stage) => (
                  <tr key={stage.key} className="border-t border-par-3-punch/10">
                    <td className="py-2 pr-4">{stage.label}</td>
                    <td className="py-2 pr-4 text-right">{stage.total}</td>
                    <td className="py-2 text-right">
                      {stage.conversionFromPrevious == null
                        ? "—"
                        : `${stage.conversionFromPrevious}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-par-3-punch/20 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-mowing-green">Performance trend</h3>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={trendMetric}
                onChange={(e) => setTrendMetric(e.target.value as TrendMetric)}
              >
                <option value="successfulListings">Successful listings</option>
                <option value="referredUsers">Referred users</option>
                <option value="transactions">Transactions</option>
                <option value="gmvPence">GMV</option>
                <option value="rewardsPence">Rewards</option>
              </select>
            </div>
            <SimpleTrendChart data={enrolled.trend} metric={trendMetric} />
          </section>

          <DataTable
            title="Referred Users"
            empty="This creator hasn't referred any Teevo users yet."
            headers={["User", "Joined", "Attribution", "Listings", "Purchases", "Reward"]}
            rows={referredFiltered.map((u) => [
              <Link key="u" href={`/admin/users/${u.userId}`} className="underline">
                {u.label}
              </Link>,
              formatDate(u.joinedAt),
              formatDate(u.attributedAt),
              String(u.listings),
              String(u.purchases),
              formatPrice(u.rewardsGeneratedPence),
            ])}
          />

          <DataTable
            title="Creator-Generated Listings"
            empty="No listings generated by this creator currently qualify for a Creator Programme reward."
            headers={["Listing", "Seller", "Created", "Status", "Price", "Reward status"]}
            rows={listingsFiltered.map((l) => [
              l.listingId ? (
                <Link key="l" href={`/admin/listings?q=${l.listingId}`} className="underline">
                  {l.title}
                </Link>
              ) : (
                l.title
              ),
              l.sellerLabel,
              formatDate(l.createdAt),
              l.status.replace(/_/g, " "),
              l.pricePence != null ? formatPrice(l.pricePence) : "—",
              l.rewardStatus.replace(/_/g, " "),
            ])}
          />

          <DataTable
            title="Creator-Generated Transactions"
            empty="No completed marketplace transactions have been attributed to this creator."
            headers={["Order", "User", "Value", "Completed", "Creator reward", "Status"]}
            rows={txsFiltered.map((t) => [
              <span key="id" className="font-mono text-xs">
                {t.transactionId?.slice(0, 8) ?? "—"}
              </span>,
              t.buyerId ? (
                <Link href={`/admin/users/${t.buyerId}`} className="underline">
                  {t.buyerLabel}
                </Link>
              ) : (
                t.buyerLabel
              ),
              formatPrice(t.amountPence),
              formatDate(t.completedAt),
              formatPrice(t.rewardAmountPence),
              t.rewardStatus,
            ])}
          />

          <section className="rounded-xl border border-par-3-punch/20 bg-white p-5 overflow-x-auto">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
              <h3 className="font-semibold text-mowing-green">Reward History</h3>
              <div className="text-sm text-mowing-green/80 space-x-3">
                <span>Earned: {formatPrice(enrolled.performance.earnedPence)}</span>
                <span>Paid: {formatPrice(enrolled.performance.paidPence)}</span>
                <span>Outstanding: {formatPrice(enrolled.performance.outstandingPence)}</span>
              </div>
            </div>
            {rewardsFiltered.length === 0 ? (
              <p className="text-sm text-mowing-green/70">No rewards recorded for this period.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-mowing-green/60">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Trigger</th>
                    <th className="py-2 pr-3">Referred user</th>
                    <th className="py-2 pr-3">Reward</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rewardsFiltered.map((rw) => (
                    <tr key={rw.id} className="border-t border-par-3-punch/10">
                      <td className="py-2 pr-3">{formatDateTime(rw.date)}</td>
                      <td className="py-2 pr-3">
                        {REWARD_TYPE_LABELS[rw.rewardType] ?? rw.rewardType}
                      </td>
                      <td className="py-2 pr-3">
                        {rw.referredUserId ? (
                          <Link href={`/admin/users/${rw.referredUserId}`} className="underline">
                            {rw.referredUserLabel}
                          </Link>
                        ) : (
                          rw.referredUserLabel
                        )}
                      </td>
                      <td className="py-2 pr-3">{formatPrice(rw.amountPence)}</td>
                      <td className="py-2">{rw.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {enrolled.auditTrail.length > 0 && (
            <section className="rounded-xl border border-par-3-punch/20 bg-white p-5">
              <h3 className="font-semibold text-mowing-green mb-2">Admin audit</h3>
              <ul className="text-sm space-y-1 text-mowing-green/80">
                {enrolled.auditTrail.map((a, i) => (
                  <li key={`${a.at}-${i}`}>
                    {formatDateTime(a.at)} — {a.action.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {addOpen && (
        <ConfirmDialog
          title="Add to Creator Programme"
          onClose={() => setAddOpen(false)}
          confirmLabel="Add Creator"
          busy={busy}
          onConfirm={() => void enrol()}
        >
          <p className="font-medium">{userName}</p>
          <p className="mt-2 text-sm text-mowing-green/80">
            This will give this user access to the Teevo Creator Programme and Creator Hub.
          </p>
        </ConfirmDialog>
      )}

      {removeOpen && (
        <ConfirmDialog
          title="Remove creator?"
          onClose={() => setRemoveOpen(false)}
          confirmLabel="Remove Creator"
          busy={busy}
          danger
          onConfirm={() => void removeCreator()}
        >
          <p className="text-sm text-mowing-green/80">
            This will remove Creator Programme access for <strong>{userName}</strong>.
          </p>
          <p className="mt-2 text-sm text-mowing-green/80">
            Their previous referrals, performance data and reward history will remain available.
            Their creator link will no longer generate new creator attribution.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-mowing-green/60">{label}</p>
      <p className="mt-1 text-lg font-semibold text-mowing-green">{value}</p>
    </div>
  );
}

function DataTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <section className="rounded-xl border border-par-3-punch/20 bg-white p-5 overflow-x-auto">
      <h3 className="font-semibold text-mowing-green mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-mowing-green/70">{empty}</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-mowing-green/60">
              {headers.map((h) => (
                <th key={h} className="py-2 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-par-3-punch/10">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 pr-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SimpleTrendChart({
  data,
  metric,
}: {
  data: CreatorInsightsPayload["trend"];
  metric: TrendMetric;
}) {
  const values = data.map((d) => d[metric]);
  const max = Math.max(...values, 1);
  const w = Math.max(data.length * 8, 280);
  const h = 120;
  const points = data
    .map((d, i) => {
      const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * (w - 8) + 4;
      const y = h - 8 - (d[metric] / max) * (h - 16);
      return `${x},${y}`;
    })
    .join(" ");

  if (data.length === 0) {
    return <p className="text-sm text-mowing-green/70">No trend data for this period.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="text-mowing-green" role="img" aria-label="Performance trend">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
        {data.map((d, i) => {
          const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * (w - 8) + 4;
          const y = h - 8 - (d[metric] / max) * (h - 16);
          return <circle key={d.date} cx={x} cy={y} r="2.5" fill="currentColor" />;
        })}
      </svg>
      <p className="mt-1 text-xs text-mowing-green/60">
        {formatDate(data[0]?.date)} → {formatDate(data[data.length - 1]?.date)}
      </p>
    </div>
  );
}

function ConfirmDialog({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  busy,
  danger,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-mowing-green">{title}</h3>
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="text-sm px-3 py-1.5" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-70 ${
              danger ? "bg-amber-800" : "bg-mowing-green"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
