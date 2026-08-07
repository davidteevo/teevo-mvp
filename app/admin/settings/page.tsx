"use client";

import { useEffect, useState } from "react";
import { FulfilmentMode, type FulfilmentModeType } from "@/lib/fulfilment-providers";

export default function AdminSettingsPage() {
  const [mode, setMode] = useState<FulfilmentModeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/fulfilment-mode")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load");
        setMode(data.fulfilment_mode === FulfilmentMode.MANUAL ? FulfilmentMode.MANUAL : FulfilmentMode.SHIPPO);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: FulfilmentModeType) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/fulfilment-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilment_mode: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMode(data.fulfilment_mode);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Settings</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Platform configuration. Changing fulfilment mode only affects new orders.
      </p>

      <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-mowing-green">Shipping Fulfilment</h2>
        <p className="mt-1 text-sm text-mowing-green/70">
          How shipping labels are created after packaging is verified.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
        ) : (
          <fieldset className="mt-4 space-y-3" disabled={saving}>
            <legend className="sr-only">Shipping Fulfilment</legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="fulfilment_mode"
                className="mt-1"
                checked={mode === FulfilmentMode.SHIPPO}
                onChange={() => save(FulfilmentMode.SHIPPO)}
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
                onChange={() => save(FulfilmentMode.MANUAL)}
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

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-3 text-sm text-mowing-green/80">Saved. New orders will use this mode.</p>
        )}
      </section>
    </div>
  );
}
