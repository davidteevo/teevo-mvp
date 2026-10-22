"use client";

import { useEffect, useState } from "react";

export function TeevoFitSetting() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/fit")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load Teevo Fit setting");
        return data;
      })
      .then((data) => setEnabled(data.fit_enabled === true))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setEnabled(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: boolean) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/settings/fit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit_enabled: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save");
      setEnabled(data.fit_enabled === true);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-par-3-punch/20 bg-white p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-mowing-green">Teevo Fit</h2>
      <p className="mt-1 text-sm text-mowing-green/70">
        Controls the Coming Soon label in the hamburger menu and on the dashboard.
        Authorised accounts can still open the questionnaire. This does not make
        Teevo Fit public.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-mowing-green/70">Loading…</p>
      ) : (
        <fieldset className="mt-4 space-y-3" disabled={saving}>
          <legend className="sr-only">Teevo Fit</legend>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="fit_enabled"
              className="mt-1"
              checked={enabled === true}
              onChange={() => void save(true)}
            />
            <span>
              <span className="font-medium text-mowing-green">Teevo Fit enabled</span>
              <span className="block text-sm text-mowing-green/70">
                Hide Coming Soon for authorised accounts. Other visitors still see it.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="fit_enabled"
              className="mt-1"
              checked={enabled === false}
              onChange={() => void save(false)}
            />
            <span>
              <span className="font-medium text-mowing-green">Teevo Fit disabled</span>
              <span className="block text-sm text-mowing-green/70">
                Show Coming Soon on the hamburger menu and dashboard for everyone.
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
        <p className="mt-3 text-sm text-mowing-green/80">
          {enabled ? "Teevo Fit has been enabled." : "Teevo Fit has been disabled."}
        </p>
      )}
    </section>
  );
}
