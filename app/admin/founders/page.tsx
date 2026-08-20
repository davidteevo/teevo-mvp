"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Campaign = {
  status: string;
  claimed: number;
  remaining: number;
  limit: number;
  activated: number;
};

type FounderRow = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  founderNumber: number;
  joinedAt: string;
  rewardStatus: string;
  rewardEarnedAt: string | null;
  referral: { referrerName: string | null; code: string | null } | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-par-3-punch/20 bg-white p-4">
      <p className="text-sm text-mowing-green/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-mowing-green tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminFoundersPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [founders, setFounders] = useState<FounderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetch("/api/admin/founders")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setCampaign(data.campaign);
        setFounders(data.founders ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: "active" | "paused") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/founders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setCampaign(data.campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mowing-green">Founders</h1>
          <p className="mt-1 text-sm text-mowing-green/70">
            First 100 Founding Members campaign. Limit cannot be raised above 100.
          </p>
        </div>
        <Link href="/admin/referrals" className="text-sm font-medium text-par-3-punch hover:underline">
          Referrals →
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      {campaign && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mowing-green/10 px-3 py-1 text-sm font-medium capitalize text-mowing-green">
              Status: {campaign.status}
            </span>
            {campaign.status !== "complete" && (
              <>
                {campaign.status === "active" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setStatus("paused")}
                    className="rounded-lg border border-mowing-green/30 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-50"
                  >
                    Pause allocation
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setStatus("active")}
                    className="rounded-lg bg-mowing-green px-3 py-1.5 text-sm font-medium text-off-white-pique hover:opacity-95 disabled:opacity-50"
                  >
                    Resume allocation
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Founders" value={`${campaign.claimed} / ${campaign.limit}`} />
            <Stat
              label="Activated through listing"
              value={`${campaign.activated} / ${campaign.claimed || 0}`}
            />
            <Stat label="£5 rewards issued" value={String(campaign.activated)} />
          </div>
        </>
      )}

      <div className="overflow-x-auto rounded-xl border border-par-3-punch/20 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-par-3-punch/15 bg-mowing-green/5 text-mowing-green/80">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Referral</th>
              <th className="px-3 py-2 font-medium">£5 reward</th>
            </tr>
          </thead>
          <tbody>
            {founders.map((f) => (
              <tr key={f.id} className="border-b border-par-3-punch/10 last:border-0">
                <td className="px-3 py-2 font-semibold tabular-nums text-mowing-green">
                  {String(f.founderNumber).padStart(3, "0")}
                </td>
                <td className="px-3 py-2 text-mowing-green">
                  <p className="font-medium">{f.firstName || f.displayName || "—"}</p>
                  <p className="text-xs text-mowing-green/60">{f.email}</p>
                </td>
                <td className="px-3 py-2 text-mowing-green/80 whitespace-nowrap">
                  {f.joinedAt ? new Date(f.joinedAt).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-3 py-2 text-mowing-green/80">
                  {f.referral
                    ? `${f.referral.referrerName ?? "Unknown"}${f.referral.code ? ` (${f.referral.code})` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-mowing-green/80 capitalize">
                  {f.rewardStatus}
                  {f.rewardEarnedAt && (
                    <span className="block text-xs text-mowing-green/55">
                      {new Date(f.rewardEarnedAt).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {founders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-mowing-green/60">
                  No Founders allocated yet. Apply the founding members migration, then new signups will
                  fill spots.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
