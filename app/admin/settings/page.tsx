"use client";

import { useEffect, useState } from "react";
import { FulfilmentMode, type FulfilmentModeType } from "@/lib/fulfilment-providers";

export default function AdminSettingsPage() {
  const [mode, setMode] = useState<FulfilmentModeType | null>(null);
  const [starterPackEnabled, setStarterPackEnabled] = useState<boolean | null>(null);
  const [buyingEnabled, setBuyingEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [savingStarter, setSavingStarter] = useState(false);
  const [savingBuying, setSavingBuying] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [buyingError, setBuyingError] = useState<string | null>(null);
  const [modeSaved, setModeSaved] = useState(false);
  const [starterSaved, setStarterSaved] = useState(false);
  const [buyingSaved, setBuyingSaved] = useState(false);
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings/fulfilment-mode").then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load fulfilment mode");
        return data;
      }),
      fetch("/api/admin/settings/starter-pack").then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load Starter Pack setting");
        return data;
      }),
      fetch("/api/admin/settings/buying").then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load buying setting");
        return data;
      }),
    ])
      .then(([modeData, starterData, buyingData]) => {
        setMode(
          modeData.fulfilment_mode === FulfilmentMode.MANUAL ? FulfilmentMode.MANUAL : FulfilmentMode.SHIPPO
        );
        setStarterPackEnabled(starterData.free_starter_pack_enabled === true);
        setBuyingEnabled(buyingData.buying_enabled === true);
      })
      .catch((e) => {
        setModeError(e instanceof Error ? e.message : "Failed to load");
        setBuyingEnabled(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveMode = async (next: FulfilmentModeType) => {
    setSavingMode(true);
    setModeError(null);
    setModeSaved(false);
    try {
      const res = await fetch("/api/admin/settings/fulfilment-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilment_mode: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMode(data.fulfilment_mode);
      setModeSaved(true);
    } catch (e) {
      setModeError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingMode(false);
    }
  };

  const saveBuying = async (enabled: boolean) => {
    setSavingBuying(true);
    setBuyingError(null);
    setBuyingSaved(false);
    try {
      const res = await fetch("/api/admin/settings/buying", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buying_enabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "We couldn't update buying availability. Please try again.");
      setBuyingEnabled(data.buying_enabled === true);
      setBuyingSaved(true);
      setEnableConfirmOpen(false);
    } catch (e) {
      setBuyingError(
        e instanceof Error ? e.message : "We couldn't update buying availability. Please try again."
      );
    } finally {
      setSavingBuying(false);
    }
  };

  const requestBuyingChange = (enabled: boolean) => {
    if (enabled && buyingEnabled !== true) {
      setBuyingError(null);
      setEnableConfirmOpen(true);
      return;
    }
    void saveBuying(enabled);
  };

  const saveStarterPack = async (enabled: boolean) => {
    setSavingStarter(true);
    setStarterError(null);
    setStarterSaved(false);
    try {
      const res = await fetch("/api/admin/settings/starter-pack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ free_starter_pack_enabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setStarterPackEnabled(data.free_starter_pack_enabled === true);
      setStarterSaved(true);
    } catch (e) {
      setStarterError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingStarter(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Settings</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Platform configuration. Changing these settings only affects new orders.
      </p>

      <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-mowing-green">Buying & Payments</h2>
        <p className="mt-1 text-sm text-mowing-green/70">
          Control whether buyers can purchase or make offers on Teevo. When disabled, listings remain
          visible and sellers can continue listing, but purchases and transactional offers are blocked.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
        ) : (
          <fieldset className="mt-4 space-y-3" disabled={savingBuying}>
            <legend className="sr-only">Buying & Payments</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="buying_enabled"
                className="mt-1"
                checked={buyingEnabled === true}
                onChange={() => requestBuyingChange(true)}
              />
              <span>
                <span className="font-medium text-mowing-green">Buying Enabled</span>
                <span className="block text-sm text-mowing-green/70">
                  Buyers can purchase eligible verified listings and use Teevo&apos;s normal offer and
                  checkout functionality.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="buying_enabled"
                className="mt-1"
                checked={buyingEnabled === false}
                onChange={() => requestBuyingChange(false)}
              />
              <span>
                <span className="font-medium text-mowing-green">Buying Disabled</span>
                <span className="block text-sm text-mowing-green/70">
                  Buying is paused across Teevo. Listings remain visible and sellers can continue
                  listing, but buyers see Coming Soon messaging and cannot purchase or make
                  transactional offers.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {buyingError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {buyingError}
          </p>
        )}
        {buyingSaved && !buyingError && (
          <p className="mt-3 text-sm text-mowing-green/80">
            {buyingEnabled ? "Buying has been enabled." : "Buying has been disabled."}
          </p>
        )}
      </section>

      {enableConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !savingBuying && setEnableConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="enable-buying-title"
        >
          <div
            className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="enable-buying-title" className="text-xl font-bold">
              Enable buying?
            </h2>
            <p className="mt-2 text-mowing-green/80">
              Enabling buying will allow buyers to purchase eligible verified listings and access
              Teevo&apos;s payment and offer functionality.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEnableConfirmOpen(false)}
                disabled={savingBuying}
                className="flex-1 rounded-xl border border-mowing-green/30 text-mowing-green px-4 py-3 font-medium hover:bg-mowing-green/5 disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveBuying(true)}
                disabled={savingBuying}
                className="flex-1 rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-70"
              >
                {savingBuying ? "Saving…" : "Enable Buying"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-mowing-green">Shipping Fulfilment</h2>
        <p className="mt-1 text-sm text-mowing-green/70">
          How shipping labels are created after packaging is verified.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
        ) : (
          <fieldset className="mt-4 space-y-3" disabled={savingMode}>
            <legend className="sr-only">Shipping Fulfilment</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="fulfilment_mode"
                className="mt-1"
                checked={mode === FulfilmentMode.SHIPPO}
                onChange={() => saveMode(FulfilmentMode.SHIPPO)}
              />
              <span>
                <span className="font-medium text-mowing-green">Shippo (Automatic)</span>
                <span className="block text-sm text-mowing-green/70">
                  Sellers generate labels through Shippo after packaging approval.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="fulfilment_mode"
                className="mt-1"
                checked={mode === FulfilmentMode.MANUAL}
                onChange={() => saveMode(FulfilmentMode.MANUAL)}
              />
              <span>
                <span className="font-medium text-mowing-green">Manual</span>
                <span className="block text-sm text-mowing-green/70">
                  Admin provides courier tracking and label PDF; sellers receive them by email.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {modeError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {modeError}
          </p>
        )}
        {modeSaved && !modeError && (
          <p className="mt-3 text-sm text-mowing-green/80">Saved. New orders will use this mode.</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-mowing-green">Free Seller Starter Pack</h2>
        <p className="mt-1 text-sm text-mowing-green/70">
          {starterPackEnabled
            ? "When enabled, sellers receive appropriate Teevo shipping packaging free of charge. The option for sellers to purchase packaging is hidden."
            : "Sellers follow the standard packaging flow and can purchase Teevo packaging where available."}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
        ) : (
          <fieldset className="mt-4 space-y-3" disabled={savingStarter}>
            <legend className="sr-only">Free Seller Starter Pack</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="starter_pack"
                className="mt-1"
                checked={starterPackEnabled === true}
                onChange={() => saveStarterPack(true)}
              />
              <span>
                <span className="font-medium text-mowing-green">ON</span>
                <span className="block text-sm text-mowing-green/70">
                  Sellers can request a free Teevo box. Paid packaging is hidden.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="starter_pack"
                className="mt-1"
                checked={starterPackEnabled === false}
                onChange={() => saveStarterPack(false)}
              />
              <span>
                <span className="font-medium text-mowing-green">OFF</span>
                <span className="block text-sm text-mowing-green/70">
                  Restore the standard own-packaging or paid Teevo box flow.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {starterError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {starterError}
          </p>
        )}
        {starterSaved && !starterError && (
          <p className="mt-3 text-sm text-mowing-green/80">
            Saved. Existing packaging decisions are unchanged.
          </p>
        )}
      </section>

      <ReferralGrowthSettings />
    </div>
  );
}

function poundsFromPence(pence: number): string {
  return (pence / 100).toFixed(2);
}

function ReferralGrowthSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [programmeEnabled, setProgrammeEnabled] = useState(true);
  const [sellerEnabled, setSellerEnabled] = useState(true);
  const [creatorEnabled, setCreatorEnabled] = useState(true);
  const [creditEnabled, setCreditEnabled] = useState(true);
  const [discount, setDiscount] = useState("5.00");
  const [referrerReward, setReferrerReward] = useState("5.00");
  const [minPurchase, setMinPurchase] = useState("50.00");
  const [listingReward, setListingReward] = useState("5.00");
  const [saleReward, setSaleReward] = useState("5.00");
  const [creatorCommission, setCreatorCommission] = useState("7.50");
  const [expiryDays, setExpiryDays] = useState("");

  useEffect(() => {
    fetch("/api/admin/referrals/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load referral settings");
        setProgrammeEnabled(data.programmeEnabled === true);
        setSellerEnabled(data.sellerEnabled === true);
        setCreatorEnabled(data.creatorEnabled === true);
        setCreditEnabled(data.creditEnabled === true);
        setDiscount(poundsFromPence(data.discountPence ?? 500));
        setReferrerReward(poundsFromPence(data.referrerRewardPence ?? 500));
        setMinPurchase(poundsFromPence(data.minItemPence ?? 5000));
        setListingReward(poundsFromPence(data.sellerListingRewardPence ?? 500));
        setSaleReward(poundsFromPence(data.sellerSaleRewardPence ?? 500));
        setCreatorCommission(poundsFromPence(data.creatorDefaultCommissionPence ?? 750));
        setExpiryDays(data.creditExpiryDays ? String(data.creditExpiryDays) : "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const toPence = (raw: string, label: string) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative amount`);
        return Math.round(n * 100);
      };
      const expiry = expiryDays.trim() === "" ? null : parseInt(expiryDays, 10);
      const res = await fetch("/api/admin/referrals/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmeEnabled,
          sellerEnabled,
          creatorEnabled,
          creditEnabled,
          discountPence: toPence(discount, "Referred customer discount"),
          referrerRewardPence: toPence(referrerReward, "Referrer reward"),
          minItemPence: toPence(minPurchase, "Minimum purchase"),
          sellerListingRewardPence: toPence(listingReward, "First listing reward"),
          sellerSaleRewardPence: toPence(saleReward, "First sale reward"),
          creatorDefaultCommissionPence: toPence(creatorCommission, "Default creator commission"),
          creditExpiryDays: expiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-mowing-green">Referral / Growth</h2>
      <p className="mt-1 text-sm text-mowing-green/70">
        Changes apply to future rewards only. Historical credit and commissions are unchanged.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={programmeEnabled}
              onChange={(e) => setProgrammeEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium text-mowing-green">Standard referral programme</span>
              <span className="block text-sm text-mowing-green/70">
                Lets members invite friends. Referred buyers get a first-purchase discount; the referrer gets Teevo credit when that purchase completes.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={sellerEnabled}
              onChange={(e) => setSellerEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium text-mowing-green">Seller referral</span>
              <span className="block text-sm text-mowing-green/70">
                Rewards a referrer when someone they invited lists their first club, and again when that seller completes their first sale.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={creatorEnabled}
              onChange={(e) => setCreatorEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium text-mowing-green">Creator programme</span>
              <span className="block text-sm text-mowing-green/70">
                Lets creators share unique codes. A qualifying first purchase pays their commission instead of a member referrer reward.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={creditEnabled}
              onChange={(e) => setCreditEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium text-mowing-green">Teevo credit</span>
              <span className="block text-sm text-mowing-green/70">
                Lets buyers spend earned Teevo credit at checkout. Turning this off stops new redemptions; existing balances stay in place.
              </span>
            </span>
          </label>
          <label className="block text-sm text-mowing-green">
            Referred customer discount (£)
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            Referrer reward (£)
            <input value={referrerReward} onChange={(e) => setReferrerReward(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            Minimum qualifying purchase (£)
            <input value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            First listing reward (£)
            <input value={listingReward} onChange={(e) => setListingReward(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            First completed sale reward (£)
            <input value={saleReward} onChange={(e) => setSaleReward(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            Default creator commission (£)
            <input value={creatorCommission} onChange={(e) => setCreatorCommission(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <label className="block text-sm text-mowing-green">
            Credit expiry days (blank = none)
            <input value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2" />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save referral settings"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-3 text-sm text-mowing-green/80">Saved. Future rewards will use these values.</p>
      )}
    </section>
  );
}
