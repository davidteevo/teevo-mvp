"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPostagePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [addressCountry, setAddressCountry] = useState("GB");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/settings/postage")}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setAddressLine1(profile.address_line1 ?? "");
      setAddressLine2(profile.address_line2 ?? "");
      setAddressCity(profile.address_city ?? "");
      setAddressPostcode(profile.address_postcode ?? "");
      setAddressCountry(profile.address_country ?? "GB");
      setDateOfBirth(profile.date_of_birth ?? "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_postcode: addressPostcode.trim() || null,
          address_country: addressCountry.trim() || null,
          date_of_birth: dateOfBirth.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({ error: "Invalid response from server" }));
      if (res.ok) {
        await refreshProfile();
        setMessage(data.warning ?? "Postage details saved.");
      } else {
        setMessage(data.error ?? "Failed to save");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-par-3-punch/20 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-mowing-green">Postage address</h2>
      <p className="mt-1 text-sm text-mowing-green/70">
        Used for shipping labels and to prefill Stripe when required.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label htmlFor="address_line1" className="block text-sm font-medium text-mowing-green mb-1">
            Address line 1
          </label>
          <input
            id="address_line1"
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="e.g. 12 Fairway Lane"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>
        <div>
          <label htmlFor="address_line2" className="block text-sm font-medium text-mowing-green mb-1">
            Address line 2 (optional)
          </label>
          <input
            id="address_line2"
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="e.g. Flat 2"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="address_city" className="block text-sm font-medium text-mowing-green mb-1">
              Town / city
            </label>
            <input
              id="address_city"
              type="text"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="e.g. London"
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
          <div>
            <label htmlFor="address_postcode" className="block text-sm font-medium text-mowing-green mb-1">
              Postcode
            </label>
            <input
              id="address_postcode"
              type="text"
              value={addressPostcode}
              onChange={(e) => setAddressPostcode(e.target.value)}
              placeholder="e.g. SW1A 1AA"
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
        </div>
        <div>
          <label htmlFor="address_country" className="block text-sm font-medium text-mowing-green mb-1">
            Country
          </label>
          <input
            id="address_country"
            type="text"
            value={addressCountry}
            onChange={(e) => setAddressCountry(e.target.value)}
            placeholder="e.g. GB"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
          <p className="text-xs text-mowing-green/60 mt-0.5">Two-letter code (e.g. GB).</p>
        </div>
        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-mowing-green mb-1">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          />
          <p className="text-xs text-mowing-green/60 mt-0.5">
            Used to prefill Stripe when required (e.g. payouts). Optional.
          </p>
        </div>
        {message && (
          <p className={`text-sm ${message.includes("saved") ? "text-par-3-punch" : "text-divot-pink"}`}>
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save postage details"}
        </button>
      </form>
    </div>
  );
}
