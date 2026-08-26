"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPence } from "@/lib/pricing";

type Creator = {
  id: string;
  userId: string | null;
  email: string | null;
  accountStatus: string | null;
  teevoAccountRequired: boolean;
  name: string;
  socialHandle: string | null;
  socialUrl: string | null;
  code: string | null;
  status: string;
  signups: number;
  listingRewards: number;
  transactionRewards: number;
  creditEarnedPence: number;
};

type CreateSuccess = {
  id: string;
  name: string;
  code: string;
  userId: string;
  accountStatus: string | null;
  message?: string;
};

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<CreateSuccess | null>(null);

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
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/referrals/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          code: code || name,
          socialHandle: socialHandle || null,
          socialPlatform: socialPlatform || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setSuccess({
        id: data.id,
        name: data.name,
        code: data.code,
        userId: data.userId,
        accountStatus: data.accountStatus,
        message: data.message,
      });
      setName("");
      setEmail("");
      setCode("");
      setSocialHandle("");
      setSocialPlatform("");
      setNotes("");
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
      <p className="mt-1 text-sm text-mowing-green/70">
        Creator codes, Teevo credit milestones, and conversion tracking.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-mowing-green/30 bg-white p-4 max-w-lg">
          <p className="font-semibold text-mowing-green">
            {success.message ?? "Creator created successfully"}
          </p>
          <ul className="mt-2 text-sm text-mowing-green/80 space-y-1">
            <li>Creator/brand name: {success.name}</li>
            <li>
              Referral code: <span className="font-mono">{success.code}</span>
            </li>
            <li>
              Teevo User UUID:{" "}
              <Link href={`/admin/users/${success.userId}`} className="underline font-mono text-xs">
                {success.userId}
              </Link>
            </li>
            <li>Account status: {success.accountStatus ?? "active"}</li>
          </ul>
          <Link
            href={`/admin/referrals/creators/${success.id}`}
            className="mt-3 inline-block text-sm text-par-3-punch underline"
          >
            View creator
          </Link>
        </div>
      )}

      <form onSubmit={(e) => void create(e)} className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-4 space-y-3 max-w-lg">
        <h2 className="font-semibold text-mowing-green">Add creator</h2>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Creator/brand name"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (e.g. GOLFGUY)"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm uppercase"
        />
        <input
          value={socialPlatform}
          onChange={(e) => setSocialPlatform(e.target.value)}
          placeholder="Social platform (e.g. Instagram)"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <input
          value={socialHandle}
          onChange={(e) => setSocialHandle(e.target.value)}
          placeholder="Social handle"
          className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={2}
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
              <th className="py-2 pr-3">Social</th>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Referred</th>
              <th className="py-2 pr-3">Listings</th>
              <th className="py-2 pr-3">Transactions</th>
              <th className="py-2 pr-3">Credit earned</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Teevo account</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.id} className="border-t border-par-3-punch/15">
                <td className="py-2 pr-3">
                  <Link href={`/admin/referrals/creators/${c.id}`} className="underline font-medium">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 pr-3">{c.socialHandle ?? "—"}</td>
                <td className="py-2 pr-3 font-mono">{c.code}</td>
                <td className="py-2 pr-3">{c.signups}</td>
                <td className="py-2 pr-3">{c.listingRewards}</td>
                <td className="py-2 pr-3">{c.transactionRewards}</td>
                <td className="py-2 pr-3">{formatPence(c.creditEarnedPence)}</td>
                <td className="py-2 pr-3">{c.status}</td>
                <td className="py-2 pr-3">
                  {c.teevoAccountRequired ? (
                    <span className="text-amber-700 text-xs font-medium">Required</span>
                  ) : (
                    <Link href={`/admin/users/${c.userId}`} className="underline text-xs font-mono">
                      Linked
                    </Link>
                  )}
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
