"use client";

import { useEffect, useState } from "react";
import { FulfilmentMode, type FulfilmentModeType } from "@/lib/fulfilment-providers";

export default function AdminSettingsPage() {
  const [mode, setMode] = useState<FulfilmentModeType | null>(null);
  const [starterPackEnabled, setStarterPackEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [savingStarter, setSavingStarter] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [modeSaved, setModeSaved] = useState(false);
  const [starterSaved, setStarterSaved] = useState(false);

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
    ])
      .then(([modeData, starterData]) => {
        setMode(
          modeData.fulfilment_mode === FulfilmentMode.MANUAL ? FulfilmentMode.MANUAL : FulfilmentMode.SHIPPO
        );
        setStarterPackEnabled(starterData.free_starter_pack_enabled === true);
      })
      .catch((e) => setModeError(e instanceof Error ? e.message : "Failed to load"))
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
    </div>
  );
}
