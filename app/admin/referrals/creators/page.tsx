"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPence } from "@/lib/pricing";

type Creator = {
  id: string;
  userId: string | null;
  name: string;
  socialHandle: string | null;
  socialUrl: string | null;
  code: string | null;
  commissionPence: number;
  status: string;
  visits: number;
  signups: number;
  conversions: number;
  pendingPence: number;
  approvedPence: number;
  paidPence: number;
  cancelledCount: number;
};

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [commission, setCommission] = useState("7.50");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/referrals/creators")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCreators(data.creators ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pounds = Number(commission);
      const commissionPence = Math.round(pounds * 100);
      const res = await fetch("/api/admin/referrals/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || name,
          commissionPence,
          userId: userId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setName("");
      setCode("");
      setUserId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: "active" | "paused" | "disabled") => {
    const res = await fetch(`/api/admin/referrals/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update");
      return;
    }
    load();
  };

  return (
    <div>
      <Link href="/admin/referrals" className="text-sm text-par-3-punch hover:underline">
        ← Referrals
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-mowing-green">Creators</h1>
      <p className="mt-1 text-sm text-mowing-green/70">Creator codes, commission, and conversion tracking.</p>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void create(e)} className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-4 space-y-3 max-w-lg">
        <h2 className="font-semibold text-mowing-green">Add creator</h2>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (e.g. GOLFGUY)"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm uppercase"
        />
        <input
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          placeholder="Commission £"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Teevo user UUID (optional)"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium disabled:opacity-70"
        >
          {saving ? "Saving…" : "Create"}
        </button>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full text-sm text-mowing-green">
          <thead>
            <tr className="text-left text-mowing-green/70">
              <th className="py-2 pr-3">Creator</th>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Commission</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Visits</th>
              <th className="py-2 pr-3">Signups</th>
              <th className="py-2 pr-3">Conversions</th>
              <th className="py-2 pr-3">Pending / paid</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.id} className="border-t border-par-3-punch/15">
                <td className="py-2 pr-3">{c.name}</td>
                <td className="py-2 pr-3 font-mono">{c.code}</td>
                <td className="py-2 pr-3">{formatPence(c.commissionPence)}</td>
                <td className="py-2 pr-3">{c.status}</td>
                <td className="py-2 pr-3">{c.visits}</td>
                <td className="py-2 pr-3">{c.signups}</td>
                <td className="py-2 pr-3">{c.conversions}</td>
                <td className="py-2 pr-3">
                  {formatPence(c.pendingPence + c.approvedPence)} / {formatPence(c.paidPence)}
                </td>
                <td className="py-2 pr-3 space-x-2 whitespace-nowrap">
                  {c.status !== "active" && (
                    <button type="button" className="underline text-xs" onClick={() => void setStatus(c.id, "active")}>
                      Activate
                    </button>
                  )}
                  {c.status === "active" && (
                    <button type="button" className="underline text-xs" onClick={() => void setStatus(c.id, "paused")}>
                      Pause
                    </button>
                  )}
                  {c.status !== "disabled" && (
                    <button type="button" className="underline text-xs" onClick={() => void setStatus(c.id, "disabled")}>
                      Disable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
