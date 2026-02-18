"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const AVATAR_BUCKET = "avatars";

function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [handicap, setHandicap] = useState("");
  const [handed, setHanded] = useState<"left" | "right" | "">("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [addressCountry, setAddressCountry] = useState("GB");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/profile")}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setLocation(profile.location ?? "");
      setHandicap(profile.handicap != null ? String(profile.handicap) : "");
      setHanded(profile.handed ?? "");
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
          display_name: displayName.trim() || null,
          location: location.trim() || null,
          handicap: handicap === "" ? null : Math.min(54, Math.max(0, parseInt(handicap, 10) || 0)),
          handed: handed || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          address_city: addressCity.trim() || null,
          address_postcode: addressPostcode.trim() || null,
          address_country: addressCountry.trim() || null,
          date_of_birth: dateOfBirth.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
        setMessage("Profile saved.");
      } else {
        setMessage(data.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("avatar", file, file.name);
      const res = await fetch("/api/user/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
        setMessage("Photo updated.");
      } else {
        setMessage(data.error ?? "Failed to upload photo");
      }
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  const avatarSrc = avatarUrl(profile?.avatar_path ?? null);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Profile</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Add a photo and a few details so other golfers know who you are.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-2">Profile photo</label>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full bg-mowing-green/10 border-2 border-par-3-punch/30 overflow-hidden flex items-center justify-center">
                {avatarUploading ? (
                  <span className="text-mowing-green/60 text-sm">Uploading…</span>
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-mowing-green/50 text-2xl font-semibold">
                    {(displayName || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="rounded-lg border border-mowing-green/40 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/5 disabled:opacity-60"
              >
                {avatarSrc ? "Change photo" : "Upload photo"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">Email</label>
          <p className="text-mowing-green/80 text-sm">{user.email}</p>
          <p className="text-xs text-mowing-green/60 mt-0.5">Email cannot be changed here.</p>
        </div>

        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-mowing-green mb-1">
            Display name
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-mowing-green mb-1">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. London, UK"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>

        <div>
          <label htmlFor="handicap" className="block text-sm font-medium text-mowing-green mb-1">
            Golf handicap
          </label>
          <input
            id="handicap"
            type="number"
            min={0}
            max={54}
            value={handicap}
            onChange={(e) => setHandicap(e.target.value)}
            placeholder="e.g. 18 (or leave blank)"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
          <p className="text-xs text-mowing-green/60 mt-0.5">0–54, or leave blank.</p>
        </div>

        <div>
          <label htmlFor="handed" className="block text-sm font-medium text-mowing-green mb-1">
            Handed
          </label>
          <select
            id="handed"
            value={handed}
            onChange={(e) => setHanded(e.target.value as "left" | "right" | "")}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          >
            <option value="">Not set</option>
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </select>
        </div>

        <div className="border-t border-mowing-green/20 pt-6">
          <h2 className="text-sm font-semibold text-mowing-green mb-3">Address</h2>
          <p className="text-xs text-mowing-green/60 mb-3">
            Used to prefill Stripe payouts and other forms when needed.
          </p>
          <div className="space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
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
          <p className={`text-sm ${message.startsWith("Profile") || message.startsWith("Photo") ? "text-par-3-punch" : "text-divot-pink"}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
