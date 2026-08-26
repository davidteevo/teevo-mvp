"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPence } from "@/lib/pricing";

type Dashboard = {
  totalReferredUsers: number;
  successfulReferredBuyers: number;
  referredSellers: number;
  successfulSellerReferrals: number;
  referralGmvPence: number;
  discountsIssuedPence: number;
  creditIssuedPence: number;
  creditRedeemedPence: number;
  pendingLiabilityPence: number;
  creatorCommissionPendingPence: number;
  creatorCommissionPaidPence: number;
  topReferrers: { userId: string; name: string; referredCount: number }[];
  topCreators: { creatorId: string; name: string; signups: number; conversions: number }[];
};

type ReferralRow = {
  id: string;
  source: string;
  createdAt: string;
  referrer: { id: string; email?: string; display_name?: string | null };
  referred: { id: string; email?: string; display_name?: string | null };
  rewards: { id: string; reward_type: string; amount_pence: number; status: string }[];
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
      <p className="text-sm text-mowing-green/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-mowing-green break-words">{value}</p>
    </div>
  );
}

export default function AdminReferralsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/admin/referrals/dashboard?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDash(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    const listParams = new URLSearchParams();
    if (q) listParams.set("q", q);
    fetch(`/api/admin/referrals/list?${listParams}`)
      .then((r) => r.json())
      .then((data) => setRows(data.referrals ?? []))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (rewardId: string, action: "cancel" | "reverse" | "paid") => {
    setBusyId(rewardId);
    try {
      const res = await fetch(`/api/admin/referrals/rewards/${rewardId}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: `Admin ${action}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-mowing-green">Referrals</h1>
        <Link href="/admin/referrals/creators" className="text-sm text-par-3-punch hover:underline">
          Manage creators
        </Link>
      </div>
      <p className="mt-1 text-sm text-mowing-green/70">Performance, liability, and attribution.</p>

      <form
        className="mt-4 flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label className="text-sm text-mowing-green">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-mowing-green/30 px-3 py-2"
          />
        </label>
        <label className="text-sm text-mowing-green">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-mowing-green/30 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {dash && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="Referred users" value={String(dash.totalReferredUsers)} />
          <Stat label="Successful referred buyers" value={String(dash.successfulReferredBuyers)} />
          <Stat label="Referred sellers (first listing)" value={String(dash.referredSellers)} />
          <Stat label="Successful seller referrals" value={String(dash.successfulSellerReferrals)} />
          <Stat label="Referral GMV" value={formatPence(dash.referralGmvPence)} />
          <Stat label="Discounts issued" value={formatPence(dash.discountsIssuedPence)} />
          <Stat label="Credit issued" value={formatPence(dash.creditIssuedPence)} />
          <Stat label="Credit redeemed" value={formatPence(dash.creditRedeemedPence)} />
          <Stat label="Pending referral liability" value={formatPence(dash.pendingLiabilityPence)} />
          <Stat label="Creator cash commission pending (legacy)" value={formatPence(dash.creatorCommissionPendingPence)} />
          <Stat label="Creator cash commission paid (legacy)" value={formatPence(dash.creatorCommissionPaidPence)} />
        </div>
      )}

      {dash && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
            <h2 className="font-semibold text-mowing-green">Top referrers</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {dash.topReferrers.length === 0 && <li className="text-mowing-green/70">None yet</li>}
              {dash.topReferrers.map((r) => (
                <li key={r.userId} className="flex justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <span>{r.referredCount}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
            <h2 className="font-semibold text-mowing-green">Top creators</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {dash.topCreators.length === 0 && <li className="text-mowing-green/70">None yet</li>}
              {dash.topCreators.map((c) => (
                <li key={c.creatorId} className="flex justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  <span>
                    {c.conversions}/{c.signups}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-mowing-green">Recent attribution</h2>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email"
          className="flex-1 rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-mowing-green/30 px-3 py-2 text-sm">
          Search
        </button>
      </form>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm text-mowing-green">
          <thead>
            <tr className="text-left text-mowing-green/70">
              <th className="py-2 pr-3">Referred</th>
              <th className="py-2 pr-3">Referrer</th>
              <th className="py-2 pr-3">Source</th>
              <th className="py-2 pr-3">Rewards</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-par-3-punch/15 align-top">
                <td className="py-2 pr-3 break-all">{row.referred.email ?? row.referred.id.slice(0, 8)}</td>
                <td className="py-2 pr-3 break-all">{row.referrer.email ?? row.referrer.id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{row.source}</td>
                <td className="py-2 pr-3">
                  <ul className="space-y-1">
                    {row.rewards.map((rw) => (
                      <li key={rw.id} className="flex flex-wrap items-center gap-2">
                        <span>
                          {rw.reward_type} {formatPence(rw.amount_pence)} · {rw.status}
                        </span>
                        {rw.status === "pending" && (
                          <button
                            type="button"
                            disabled={busyId === rw.id}
                            onClick={() => void act(rw.id, "cancel")}
                            className="text-xs underline"
                          >
                            Cancel
                          </button>
                        )}
                        {(rw.status === "approved" || rw.status === "paid") &&
                          rw.reward_type !== "creator_commission" && (
                          <button
                            type="button"
                            disabled={busyId === rw.id}
                            onClick={() => void act(rw.id, "reverse")}
                            className="text-xs underline"
                          >
                            Reverse
                          </button>
                        )}
                        {rw.status === "approved" && rw.reward_type === "creator_commission" && (
                          <button
                            type="button"
                            disabled={busyId === rw.id}
                            onClick={() => void act(rw.id, "paid")}
                            className="text-xs underline"
                          >
                            Mark paid
                          </button>
                        )}
                      </li>
                    ))}
                    {row.rewards.length === 0 && <span className="text-mowing-green/60">None yet</span>}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
