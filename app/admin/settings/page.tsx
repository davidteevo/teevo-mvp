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

      <FeesSettings />

      <ReferralGrowthSettings />
    </div>
  );
}

function poundsFromPence(pence: number): string {
  return (pence / 100).toFixed(2);
}

function FeesSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [percentage, setPercentage] = useState("8.00");
  const [fixedPounds, setFixedPounds] = useState("0.50");

  useEffect(() => {
    fetch("/api/admin/settings/fees")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load fee settings");
        return data as { percentage: number; fixedPence: number };
      })
      .then((data) => {
        setPercentage(data.percentage.toFixed(2));
        setFixedPounds(poundsFromPence(data.fixedPence));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load fee settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const exampleFeePence = (() => {
    const pct = Number(percentage);
    const pounds = Number(fixedPounds);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
    if (!Number.isFinite(pounds) || pounds < 0) return null;
    const hundredths = Math.round(pct * 100);
    const fixedPence = Math.round(pounds * 100);
    return Math.round((10000 * hundredths) / 10000) + fixedPence;
  })();

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const pct = Number(percentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error("Percentage fee must be between 0 and 100");
      }
      if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(percentage.trim()) || pct > 100) {
        throw new Error("Percentage fee must have at most two decimal places");
      }
      const pounds = Number(fixedPounds);
      if (!Number.isFinite(pounds) || pounds < 0) {
        throw new Error("Fixed fee must be a non-negative amount");
      }
      if (!/^\d+(?:\.\d{1,2})?$/.test(fixedPounds.trim())) {
        throw new Error("Fixed fee must have at most two decimal places");
      }
      const res = await fetch("/api/admin/settings/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentage: pct,
          fixedPence: Math.round(pounds * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setPercentage(Number(data.percentage).toFixed(2));
      setFixedPounds(poundsFromPence(data.fixedPence));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-mowing-green">Fees</h2>
      <p className="mt-1 text-sm text-mowing-green/70">
        Buyer Protection Fee (Authenticity &amp; Protection). Changes apply to new purchases only.
        Existing orders keep the fee that was charged at checkout.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          <h3 className="font-medium text-mowing-green">Buyer Protection Fee</h3>
          <label className="block text-sm text-mowing-green">
            Percentage fee (%)
            <div className="mt-1 flex items-center gap-2">
              <input
                value={percentage}
                onChange={(e) => {
                  setPercentage(e.target.value);
                  setSaved(false);
                }}
                inputMode="decimal"
                className="w-full rounded-lg border border-mowing-green/30 px-3 py-2"
              />
              <span className="text-mowing-green/70">%</span>
            </div>
          </label>
          <label className="block text-sm text-mowing-green">
            Fixed fee (£)
            <div className="mt-1 flex items-center gap-2">
              <span className="text-mowing-green/70">£</span>
              <input
                value={fixedPounds}
                onChange={(e) => {
                  setFixedPounds(e.target.value);
                  setSaved(false);
                }}
                inputMode="decimal"
                className="w-full rounded-lg border border-mowing-green/30 px-3 py-2"
              />
            </div>
          </label>
          {exampleFeePence != null && (
            <div className="rounded-lg bg-mowing-green/5 px-3 py-2 text-sm text-mowing-green/80">
              <p className="font-medium text-mowing-green">Example calculation</p>
              <p className="mt-1">
                Example: On a £100 item, the buyer would pay a £{(exampleFeePence / 100).toFixed(2)} Buyer
                Protection Fee.
              </p>
              <p className="mt-1">
                £100 item
                <br />
                + £{(exampleFeePence / 100).toFixed(2)} Buyer Protection Fee
                <br />= £{((10000 + exampleFeePence) / 100).toFixed(2)} before any other applicable costs
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save Fee Settings"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-3 text-sm text-mowing-green/80">
          Buyer Protection Fee settings updated successfully.
        </p>
      )}
    </section>
  );
}

function ReferralGrowthSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [referralPriority, setReferralPriority] = useState<"supply" | "demand">("supply");
  const [programmeEnabled, setProgrammeEnabled] = useState(true);
  const [sellerEnabled, setSellerEnabled] = useState(true);
  const [creatorEnabled, setCreatorEnabled] = useState(true);
  const [creditEnabled, setCreditEnabled] = useState(true);
  const [discount, setDiscount] = useState("5.00");
  const [referrerReward, setReferrerReward] = useState("5.00");
  const [minPurchase, setMinPurchase] = useState("50.00");
  const [listingReward, setListingReward] = useState("5.00");
  const [saleReward, setSaleReward] = useState("5.00");
  const [expiryDays, setExpiryDays] = useState("");

  useEffect(() => {
    fetch("/api/admin/referrals/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load referral settings");
        setReferralPriority(data.referralPriority === "demand" ? "demand" : "supply");
        setProgrammeEnabled(data.programmeEnabled === true);
        setSellerEnabled(data.sellerEnabled === true);
        setCreatorEnabled(data.creatorEnabled === true);
        setCreditEnabled(data.creditEnabled === true);
        setDiscount(poundsFromPence(data.discountPence ?? 500));
        setReferrerReward(poundsFromPence(data.referrerRewardPence ?? 500));
        setMinPurchase(poundsFromPence(data.minItemPence ?? 5000));
        setListingReward(poundsFromPence(data.sellerListingRewardPence ?? 500));
        setSaleReward(poundsFromPence(data.sellerSaleRewardPence ?? 500));
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
          referralPriority,
          programmeEnabled,
          sellerEnabled,
          creatorEnabled,
          creditEnabled,
          discountPence: toPence(discount, "Referred customer discount"),
          referrerRewardPence: toPence(referrerReward, "Referrer reward"),
          minItemPence: toPence(minPurchase, "Minimum purchase"),
          sellerListingRewardPence: toPence(listingReward, "Supply listing reward"),
          sellerSaleRewardPence: toPence(saleReward, "First sale reward"),
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
        Priority is locked onto each referral at signup so existing invites keep their offer.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          <fieldset className="space-y-2">
            <legend className="font-medium text-mowing-green">What do we want to grow?</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                className="mt-1"
                name="referralPriority"
                checked={referralPriority === "supply"}
                onChange={() => setReferralPriority("supply")}
              />
              <span>
                <span className="font-medium text-mowing-green">Grow Supply</span>
                <span className="block text-sm text-mowing-green/70">
                  Encourage people to invite friends to list clubs. Both earn the Supply listing reward when the
                  friend&apos;s first listing is verified.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                className="mt-1"
                name="referralPriority"
                checked={referralPriority === "demand"}
                onChange={() => setReferralPriority("demand")}
              />
              <span>
                <span className="font-medium text-mowing-green">Grow Demand</span>
                <span className="block text-sm text-mowing-green/70">
                  Encourage people to invite friends to buy. Referred buyers get a first-purchase discount; the
                  referrer earns credit when that purchase completes.
                </span>
              </span>
            </label>
          </fieldset>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={programmeEnabled}
              onChange={(e) => setProgrammeEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium text-mowing-green">Member referral attribution (Demand)</span>
              <span className="block text-sm text-mowing-green/70">
                Allows member invite codes to attribute new users when Demand is active (or with Seller referral
                on for Supply). Turn off with Seller referral to stop new member attributions.
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
              <span className="font-medium text-mowing-green">Seller referral (sale bonus + legacy)</span>
              <span className="block text-sm text-mowing-green/70">
                Pays the first completed sale bonus. Also used for legacy listing rewards and to keep attribution
                available when the Demand programme toggle is off.
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
                Turns creator referral codes and milestone credit on or off. Configure reward amounts on{" "}
                <a href="/admin/referrals/creators" className="underline text-par-3-punch">
                  Admin → Creators
                </a>
                .
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
                Lets buyers spend earned Teevo credit at checkout. Turning this off stops new redemptions; existing
                balances stay in place.
              </span>
            </span>
          </label>
          <label className="block text-sm text-mowing-green">
            Supply listing reward (£) — both parties when first listing is verified
            <input
              value={listingReward}
              onChange={(e) => setListingReward(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-mowing-green">
            Referred customer discount (£) — Demand
            <input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-mowing-green">
            Referrer reward (£) — Demand
            <input
              value={referrerReward}
              onChange={(e) => setReferrerReward(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-mowing-green">
            Minimum qualifying purchase (£) — Demand
            <input
              value={minPurchase}
              onChange={(e) => setMinPurchase(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-mowing-green">
            First completed sale reward (£)
            <input
              value={saleReward}
              onChange={(e) => setSaleReward(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-mowing-green">
            Credit expiry days (blank = none)
            <input
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mowing-green/30 px-3 py-2"
            />
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
