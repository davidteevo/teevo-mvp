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

function poundsFromPence(pence: number): string {
  return (pence / 100).toFixed(2);
}

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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [creatorEnabled, setCreatorEnabled] = useState(true);
  const [creatorNewUserEnabled, setCreatorNewUserEnabled] = useState(true);
  const [creatorNewUserReward, setCreatorNewUserReward] = useState("2.00");
  const [creatorListingEnabled, setCreatorListingEnabled] = useState(true);
  const [creatorListingReward, setCreatorListingReward] = useState("10.00");
  const [creatorTxEnabled, setCreatorTxEnabled] = useState(true);
  const [creatorTxReward, setCreatorTxReward] = useState("5.00");

  const load = () => {
    fetch("/api/admin/referrals/creators")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCreators(data.creators ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  };

  const loadSettings = () => {
    setSettingsLoading(true);
    setSettingsError(null);
    fetch("/api/admin/referrals/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load reward settings");
        setCreatorEnabled(data.creatorEnabled === true);
        setCreatorNewUserEnabled(data.creatorNewUserRewardEnabled !== false);
        setCreatorNewUserReward(poundsFromPence(data.creatorNewUserRewardPence ?? 200));
        setCreatorListingEnabled(data.creatorListingRewardEnabled !== false);
        setCreatorListingReward(poundsFromPence(data.creatorListingRewardPence ?? 1000));
        setCreatorTxEnabled(data.creatorTransactionRewardEnabled !== false);
        setCreatorTxReward(poundsFromPence(data.creatorTransactionRewardPence ?? 500));
      })
      .catch((e) => setSettingsError(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    load();
    loadSettings();
  }, []);

  const openRewardSettings = () => {
    setSettingsSaved(false);
    setSettingsError(null);
    setSettingsOpen(true);
    loadSettings();
  };

  const closeRewardSettings = () => {
    if (settingsSaving) return;
    setSettingsOpen(false);
    setSettingsSaved(false);
    setSettingsError(null);
  };

  const saveRewardSettings = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      const toPence = (raw: string, label: string) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative amount`);
        return Math.round(n * 100);
      };
      const res = await fetch("/api/admin/referrals/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorNewUserRewardEnabled: creatorNewUserEnabled,
          creatorNewUserRewardPence: toPence(creatorNewUserReward, "Creator new user reward"),
          creatorListingRewardEnabled: creatorListingEnabled,
          creatorListingRewardPence: toPence(creatorListingReward, "Creator listing reward"),
          creatorTransactionRewardEnabled: creatorTxEnabled,
          creatorTransactionRewardPence: toPence(creatorTxReward, "Creator transaction reward"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSettingsSaved(true);
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSettingsSaving(false);
    }
  };

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
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-mowing-green">Creators</h1>
          <p className="mt-1 text-sm text-mowing-green/70">
            Creator codes, Teevo credit milestones, and conversion tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={openRewardSettings}
          className="rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-sm font-medium text-mowing-green hover:bg-off-white-pique"
        >
          Reward settings
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-reward-settings-title"
          onClick={closeRewardSettings}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="creator-reward-settings-title" className="text-lg font-semibold text-mowing-green">
              Reward settings
            </h2>
            <p className="mt-1 text-sm text-mowing-green/70">
              Choose which milestones pay Teevo credit, and the amount for each. Changes apply to future rewards
              only.
            </p>
            {!creatorEnabled && !settingsLoading && (
              <p className="mt-2 text-sm text-amber-700">
                The creator programme is currently off — enable it in{" "}
                <Link href="/admin/settings" className="underline">
                  Admin → Settings
                </Link>
                .
              </p>
            )}

            {settingsLoading ? (
              <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={creatorNewUserEnabled}
                    onChange={(e) => setCreatorNewUserEnabled(e.target.checked)}
                    disabled={!creatorEnabled}
                  />
                  <span>
                    <span className="font-medium text-mowing-green">Reward creators for new users</span>
                    <span className="block text-sm text-mowing-green/70">
                      Teevo credit when a referred user successfully creates an account (once per user).
                    </span>
                  </span>
                </label>
                <label className="block text-sm text-mowing-green">
                  New user reward (£)
                  <input
                    value={creatorNewUserReward}
                    onChange={(e) => setCreatorNewUserReward(e.target.value)}
                    disabled={!creatorEnabled || !creatorNewUserEnabled}
                    className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2 disabled:opacity-60"
                  />
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={creatorListingEnabled}
                    onChange={(e) => setCreatorListingEnabled(e.target.checked)}
                    disabled={!creatorEnabled}
                  />
                  <span>
                    <span className="font-medium text-mowing-green">Reward creators for successful listings</span>
                    <span className="block text-sm text-mowing-green/70">
                      Paid once when a referred user&apos;s first eligible listing is approved.
                    </span>
                  </span>
                </label>
                <label className="block text-sm text-mowing-green">
                  Listing reward (£)
                  <input
                    value={creatorListingReward}
                    onChange={(e) => setCreatorListingReward(e.target.value)}
                    disabled={!creatorEnabled || !creatorListingEnabled}
                    className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2 disabled:opacity-60"
                  />
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={creatorTxEnabled}
                    onChange={(e) => setCreatorTxEnabled(e.target.checked)}
                    disabled={!creatorEnabled}
                  />
                  <span>
                    <span className="font-medium text-mowing-green">
                      Reward creators for successful transactions
                    </span>
                    <span className="block text-sm text-mowing-green/70">
                      Paid once when a referred user completes their first eligible transaction (as buyer or
                      seller).
                    </span>
                  </span>
                </label>
                <label className="block text-sm text-mowing-green">
                  Transaction reward (£)
                  <input
                    value={creatorTxReward}
                    onChange={(e) => setCreatorTxReward(e.target.value)}
                    disabled={!creatorEnabled || !creatorTxEnabled}
                    className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2 disabled:opacity-60"
                  />
                </label>

                {settingsError && (
                  <p className="text-sm text-red-600" role="alert">
                    {settingsError}
                  </p>
                )}
                {settingsSaved && !settingsError && (
                  <p className="text-sm text-mowing-green/80">
                    Saved. Future creator rewards will use these values.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void saveRewardSettings()}
                    disabled={settingsSaving || !creatorEnabled}
                    className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium disabled:opacity-70"
                  >
                    {settingsSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={closeRewardSettings}
                    disabled={settingsSaving}
                    className="rounded-lg border border-mowing-green/30 px-4 py-2 text-sm font-medium text-mowing-green disabled:opacity-70"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
