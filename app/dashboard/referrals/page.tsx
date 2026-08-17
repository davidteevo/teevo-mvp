"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ReferralOfferPanel } from "@/components/referral/ReferralOfferPanel";
import { formatPence } from "@/lib/pricing";

type Reward = { id: string; amountPence: number; status: string; createdAt: string };

type Me = {
  programmeEnabled: boolean;
  discountPence: number;
  referrerRewardPence: number;
  code: string | null;
  url: string | null;
  creditPence: number;
  friendsJoined: number;
  successfulReferrals: number;
  pendingPence: number;
  earnedPence: number;
  rewards: Reward[];
};

function statusLabel(status: string): string {
  if (status === "pending") return "Pending";
  if (status === "approved" || status === "paid") return "Available";
  if (status === "cancelled" || status === "reversed") return "Cancelled";
  return status;
}

export default function ReferralsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/referrals")}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/referral/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load referrals");
        setMe(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load referrals"));
  }, [user]);

  if (loading || !user) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-mowing-green/80">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="text-sm text-par-3-punch hover:underline">
        ← Dashboard
      </Link>

      {error && (
        <p className="mt-4 text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      {!me ? (
        <div className="mt-6 rounded-2xl border border-par-3-punch/20 bg-par-3-punch/10 p-6 h-72 animate-pulse" />
      ) : (
        <>
          <div className="mt-6">
            <ReferralOfferPanel
              url={me.url}
              discountPence={me.discountPence}
              referrerRewardPence={me.referrerRewardPence}
              code={me.code}
              headingAs="h1"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
              <p className="text-sm text-mowing-green/70">Friends joined</p>
              <p className="mt-1 text-2xl font-bold text-mowing-green">{me.friendsJoined}</p>
            </div>
            <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
              <p className="text-sm text-mowing-green/70">Successful referrals</p>
              <p className="mt-1 text-2xl font-bold text-mowing-green">{me.successfulReferrals}</p>
            </div>
            <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
              <p className="text-sm text-mowing-green/70">Teevo credit</p>
              <p className="mt-1 text-2xl font-bold text-mowing-green">{formatPence(me.creditPence)}</p>
              {me.pendingPence > 0 && (
                <p className="mt-1 text-xs text-mowing-green/70">{formatPence(me.pendingPence)} pending</p>
              )}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-mowing-green">Your referrals</h2>
            <p className="mt-1 text-sm text-mowing-green/70">
              {me.friendsJoined} friend{me.friendsJoined === 1 ? "" : "s"} joined · {me.successfulReferrals}{" "}
              successful · {formatPence(me.earnedPence)} earned
            </p>
            {me.rewards.length === 0 ? (
              <p className="mt-4 text-sm text-mowing-green/70">No rewards yet. Share your link to get started.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {me.rewards.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-par-3-punch/20 bg-white px-4 py-3"
                  >
                    <span className="font-medium text-mowing-green">{formatPence(r.amountPence)}</span>
                    <span className="text-sm text-mowing-green/70">{statusLabel(r.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
