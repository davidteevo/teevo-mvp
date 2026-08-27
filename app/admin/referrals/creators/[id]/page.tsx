"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatPence } from "@/lib/pricing";

type Detail = {
  creator: {
    id: string;
    name: string;
    socialHandle: string | null;
    socialUrl: string | null;
    code: string | null;
    status: string;
    notes: string | null;
    teevoAccountRequired: boolean;
    user: {
      id: string;
      email: string | null;
      accountStatus: string;
    } | null;
  };
  performance: {
    referredUsers: number;
    successfulListings: number;
    successfulTransactions: number;
    totalRewardsEarnedPence: number;
    availableCreditPence: number;
    breakdown: { rewardType: string; qualifyingEvents: number; earningsPence: number }[];
  };
  referredUsers: {
    userId: string;
    label: string;
    joinedAt: string;
    signedUp: boolean;
    firstListing: boolean;
    firstTransaction: boolean;
    rewardsGeneratedPence: number;
  }[];
  rewardHistory: {
    id: string;
    date: string;
    referredUserLabel: string;
    referredUserId: string | null;
    rewardType: string;
    amountPence: number;
    status: string;
    reference: string;
  }[];
};

const EVENT_LABELS: Record<string, string> = {
  creator_new_user_reward: "New User",
  creator_listing_reward: "Successful Listing",
  creator_transaction_reward: "Successful Transaction",
  creator_commission: "Legacy commission",
  new_user: "New Users",
  listing: "Listings",
  transaction: "Transactions",
  legacy_commission: "Legacy commission",
};

export default function AdminCreatorDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const load = () => {
    if (!id) return;
    fetch(`/api/admin/referrals/creators/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  };

  useEffect(() => {
    load();
  }, [id]);

  const setStatus = async (status: "active" | "paused" | "disabled") => {
    const res = await fetch(`/api/admin/referrals/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to update");
      return;
    }
    load();
  };

  const linkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/referrals/creators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkTeevoAccount: true, email: linkEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to link");
      setLinkEmail("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link");
    } finally {
      setLinking(false);
    }
  };

  if (!data && !error) {
    return <p className="text-sm text-mowing-green/70">Loading…</p>;
  }
  if (!data) {
    return (
      <div>
        <Link href="/admin/referrals/creators" className="text-sm text-par-3-punch hover:underline">
          ← Creators
        </Link>
        <p className="mt-3 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const { creator, performance, referredUsers, rewardHistory } = data;

  return (
    <div>
      <Link href="/admin/referrals/creators" className="text-sm text-par-3-punch hover:underline">
        ← Creators
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-mowing-green">{creator.name}</h1>
          <p className="text-sm text-mowing-green/70">
            Code <span className="font-mono">{creator.code}</span> · {creator.status}
            {creator.socialHandle ? ` · ${creator.socialHandle}` : ""}
          </p>
        </div>
        <div className="space-x-2 text-sm">
          {creator.status !== "active" && (
            <button type="button" className="underline" onClick={() => void setStatus("active")}>
              Activate
            </button>
          )}
          {creator.status === "active" && (
            <button type="button" className="underline" onClick={() => void setStatus("paused")}>
              Pause
            </button>
          )}
          {creator.status !== "disabled" && (
            <button type="button" className="underline" onClick={() => void setStatus("disabled")}>
              Disable
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-4 max-w-2xl">
        <h2 className="font-semibold text-mowing-green">Teevo Account</h2>
        {creator.user ? (
          <dl className="mt-3 space-y-2 text-sm text-mowing-green">
            <div>
              <dt className="text-mowing-green/60">Teevo User UUID</dt>
              <dd className="font-mono text-xs break-all">{creator.user.id}</dd>
            </div>
            <div>
              <dt className="text-mowing-green/60">Email</dt>
              <dd>{creator.user.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-mowing-green/60">Account status</dt>
              <dd className="capitalize">{creator.user.accountStatus}</dd>
            </div>
            <Link
              href={`/admin/users/${creator.user.id}`}
              className="inline-block mt-2 text-par-3-punch underline"
            >
              View User
            </Link>
            <Link
              href="/dashboard/creator"
              className="inline-block mt-2 ml-4 text-par-3-punch underline"
            >
              Open Creator Hub
            </Link>
            <p className="mt-2 text-xs text-mowing-green/60">
              Creator Hub opens for the account you&apos;re signed in as (not impersonation).
            </p>
          </dl>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-amber-700 font-medium">Teevo Account Required</p>
            <p className="text-sm text-mowing-green/70 mt-1">
              Link or create a Teevo user so this creator can receive credit rewards.
            </p>
            <form onSubmit={(e) => void linkAccount(e)} className="mt-3 flex flex-wrap gap-2">
              <input
                required
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="creator@example.com"
                className="rounded-lg border border-mowing-green/30 px-3 py-2 text-sm min-w-[220px]"
              />
              <button
                type="submit"
                disabled={linking}
                className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-2 text-sm disabled:opacity-70"
              >
                {linking ? "Linking…" : "Create / link account"}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-4 max-w-2xl">
        <h2 className="font-semibold text-mowing-green">Performance</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Referred users" value={String(performance.referredUsers)} />
          <Stat label="Successful listings" value={String(performance.successfulListings)} />
          <Stat label="Successful transactions" value={String(performance.successfulTransactions)} />
          <Stat label="Total credit earned" value={formatPence(performance.totalRewardsEarnedPence)} />
        </div>
        <p className="mt-2 text-xs text-mowing-green/60">
          Available Teevo credit balance: {formatPence(performance.availableCreditPence)}
        </p>
        <table className="mt-4 min-w-full text-sm">
          <thead>
            <tr className="text-left text-mowing-green/70">
              <th className="py-1 pr-3">Reward type</th>
              <th className="py-1 pr-3">Qualifying events</th>
              <th className="py-1 pr-3">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {performance.breakdown.map((row) => (
              <tr key={row.rewardType} className="border-t border-par-3-punch/10">
                <td className="py-1 pr-3">{EVENT_LABELS[row.rewardType] ?? row.rewardType}</td>
                <td className="py-1 pr-3">{row.qualifyingEvents}</td>
                <td className="py-1 pr-3">{formatPence(row.earningsPence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 overflow-x-auto">
        <h2 className="font-semibold text-mowing-green">Referred Users</h2>
        <table className="mt-2 min-w-full text-sm text-mowing-green">
          <thead>
            <tr className="text-left text-mowing-green/70">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2 pr-3">Listing</th>
              <th className="py-2 pr-3">Transaction</th>
              <th className="py-2 pr-3">Creator earned</th>
            </tr>
          </thead>
          <tbody>
            {referredUsers.map((u) => (
              <tr key={u.userId} className="border-t border-par-3-punch/15">
                <td className="py-2 pr-3">
                  <Link href={`/admin/users/${u.userId}`} className="underline">
                    {u.label}
                  </Link>
                </td>
                <td className="py-2 pr-3">{u.signedUp ? "✓" : "—"}</td>
                <td className="py-2 pr-3">{u.firstListing ? "✓" : "—"}</td>
                <td className="py-2 pr-3">{u.firstTransaction ? "✓" : "—"}</td>
                <td className="py-2 pr-3">{formatPence(u.rewardsGeneratedPence)}</td>
              </tr>
            ))}
            {referredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-mowing-green/60">
                  No referred users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6 overflow-x-auto mb-10">
        <h2 className="font-semibold text-mowing-green">Reward History</h2>
        <table className="mt-2 min-w-full text-sm text-mowing-green">
          <thead>
            <tr className="text-left text-mowing-green/70">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Event</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {rewardHistory.map((rw) => (
              <tr key={rw.id} className="border-t border-par-3-punch/15">
                <td className="py-2 pr-3 whitespace-nowrap">
                  {new Date(rw.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
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
                <td className="py-2 pr-3">{EVENT_LABELS[rw.rewardType] ?? rw.rewardType}</td>
                <td className="py-2 pr-3">{formatPence(rw.amountPence)}</td>
                <td className="py-2 pr-3">{rw.status}</td>
                <td className="py-2 pr-3 font-mono text-xs break-all">{rw.reference.slice(0, 8)}</td>
              </tr>
            ))}
            {rewardHistory.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-mowing-green/60">
                  No rewards yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-off-white-pique/60 px-3 py-2">
      <div className="text-xs text-mowing-green/60">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
