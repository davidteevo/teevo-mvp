"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ALL_CATEGORIES, getConditionsForCategory, CONDITION_LABELS } from "@/lib/listing-categories";
import { SearchableSelect } from "@/components/listing/SearchableSelect";
import { ImageUpload, type StoredImage } from "@/components/listing/ImageUpload";
import { ClubDetailsStep } from "@/components/listing/club-specs/ClubDetailsStep";
import {
  emptyClubSpecsFormState,
  isGolfEquipmentCategory,
  type ClubSpecsFormState,
  validateClubDetails,
} from "@/lib/club-specs/schemas";
import { buildClubSpecsSubmitPayload, hydrateClubSpecsFromListing } from "@/lib/club-specs/payload";

const CATEGORIES = [...ALL_CATEGORIES];

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  title?: string | null;
  condition: string;
  description: string | null;
  price: number;
  status: string;
  admin_feedback?: string | null;
  availability_confirmation_status?: string | null;
  shaft?: string | null;
  degree?: string | null;
  shaft_flex?: string | null;
  lie_angle?: string | null;
  club_length?: string | null;
  shaft_weight?: string | null;
  shaft_material?: string | null;
  grip_brand?: string | null;
  grip_model?: string | null;
  grip_size?: string | null;
  grip_condition?: string | null;
  handed?: "left" | "right" | null;
  listing_format?: "single" | "set" | null;
  standard_spec_status?: "standard" | "customised" | "unknown" | null;
  customised_aspects?: ("shaft" | "length" | "loft_lie" | "grip" | "other")[] | null;
  customised_other_note?: string | null;
  iron_number?: string | null;
  set_composition?: string[] | null;
  bounce?: string | null;
  grind?: string | null;
  head_number?: string | null;
  headcover_included?: boolean | null;
  listing_clubs?: {
    id: string;
    degree: string | null;
    bounce: string | null;
    grind: string | null;
  }[];
  listing_images?: StoredImage[];
};

export default function SellEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [clubSpecs, setClubSpecs] = useState<ClubSpecsFormState>(emptyClubSpecsFormState);
  const [clubError, setClubError] = useState<{ field: string; message: string } | null>(null);

  // Catalogues for SearchableSelect
  const [shaftOptions, setShaftOptions] = useState<string[]>([]);
  const [shaftCatalogueLoading, setShaftCatalogueLoading] = useState(false);
  const [gripCatalogue, setGripCatalogue] = useState<{ brands: string[]; modelsByBrand: Record<string, string[]> } | null>(null);
  const [gripCatalogueLoading, setGripCatalogueLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  const isGolfEquipment = isGolfEquipmentCategory(category);

  const handleImproveWithAI = async () => {
    if (!category || !condition || !title.trim()) {
      alert("Please fill in Title, Category and Condition first.");
      return;
    }
    setEnhanceLoading(true);
    try {
      const clubPayload = isGolfEquipment ? buildClubSpecsSubmitPayload(category, clubSpecs) : {};
      const res = await fetch("/api/ai/enhance-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          brand: listing?.brand ?? "Other",
          model: title.trim(),
          condition,
          description: description.trim() || undefined,
          title: title.trim() || undefined,
          ...(isGolfEquipment && {
            shaft: clubPayload.shaft ?? undefined,
            degree: clubPayload.degree ?? undefined,
            shaft_flex: clubPayload.shaft_flex ?? undefined,
            lie_angle: clubPayload.lie_angle ?? undefined,
            club_length: clubPayload.club_length ?? undefined,
            shaft_weight: clubPayload.shaft_weight ?? undefined,
            shaft_material: clubPayload.shaft_material ?? undefined,
            grip_brand: clubPayload.grip_brand ?? undefined,
            grip_model: clubPayload.grip_model ?? undefined,
            grip_size: clubPayload.grip_size ?? undefined,
            grip_condition: clubPayload.grip_condition ?? undefined,
            handed: clubPayload.handed,
            standard_spec_status: clubPayload.standard_spec_status ?? undefined,
            customised_aspects: clubPayload.customised_aspects ?? undefined,
            customised_other_note: clubPayload.customised_other_note ?? undefined,
            headcover_included: clubPayload.headcover_included ?? undefined,
            bounce: clubPayload.bounce ?? undefined,
            grind: clubPayload.grind ?? undefined,
            iron_number: clubPayload.iron_number ?? undefined,
            set_composition: clubPayload.set_composition ?? undefined,
            head_number: clubPayload.head_number ?? undefined,
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not get suggestions");
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setEnhanceLoading(false);
    }
  };

  const [storedImages, setStoredImages] = useState<StoredImage[]>([]);
  const originalImageOrder = useRef<StoredImage[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    fetch("/api/listings/mine")
      .then((res) => res.json())
      .then((data) => {
        const list = data.listings as Listing[] | undefined;
        const found = list?.find((l) => l.id === id) ?? null;
        if (found) {
          setListing(found);
          setTitle(found.title?.trim() || `${found.brand} ${found.model}`.trim());
          setCategory(found.category);
          setCondition(found.condition);
          setDescription(found.description || "");
          setPrice((found.price / 100).toFixed(2));
          setClubSpecs(hydrateClubSpecsFromListing(found as Parameters<typeof hydrateClubSpecsFromListing>[0]));
          const imgs = [...(found.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
          setStoredImages(imgs);
          originalImageOrder.current = imgs;
        } else {
          setFetchError("Listing not found or you don't have permission to edit it.");
        }
      })
      .catch(() => setFetchError("Failed to load listing."));
  }, [user, id]);

  useEffect(() => {
    let cancelled = false;
    setShaftCatalogueLoading(true);
    setGripCatalogueLoading(true);
    Promise.all([
      fetch("/api/club-specs/shafts").then((r) => r.json()).catch(() => []),
      fetch("/api/club-specs/grips").then((r) => r.json()).catch(() => null),
    ]).then(([shaftData, gripData]) => {
      if (cancelled) return;
      setShaftOptions(Array.isArray(shaftData) ? shaftData.filter((s: unknown) => typeof s === "string") : []);
      if (gripData && typeof gripData === "object") {
        const g = gripData as { brands?: unknown; modelsByBrand?: unknown };
        setGripCatalogue({
          brands: Array.isArray(g.brands) ? g.brands.filter((b: unknown) => typeof b === "string") : [],
          modelsByBrand: (g.modelsByBrand && typeof g.modelsByBrand === "object" ? g.modelsByBrand : {}) as Record<string, string[]>,
        });
      }
    }).finally(() => {
      if (!cancelled) {
        setShaftCatalogueLoading(false);
        setGripCatalogueLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent(`/sell/edit/${id}`)}`);
    return null;
  }

  if (fetchError || (listing && listing.status !== "pending" && listing.availability_confirmation_status !== "required")) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-mowing-green/80">
          {fetchError || "This listing can't be edited."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/seller/dashboard")}
          className="mt-4 rounded-xl bg-mowing-green text-off-white-pique px-6 py-2 font-medium hover:opacity-90"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading listing…
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const pricePence = Math.round(parseFloat(price) * 100);
    if (Number.isNaN(pricePence) || pricePence <= 0) {
      setMessage("Please enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      if (isGolfEquipment) {
        const validation = validateClubDetails(category, clubSpecs);
        // Only enforce when seller has started filling club details (handed or standard status set)
        if (
          validation &&
          (clubSpecs.handed || clubSpecs.standardSpecStatus || clubSpecs.degree || clubSpecs.shaftFlex)
        ) {
          setClubError(validation);
          setMessage(validation.message);
          setSaving(false);
          return;
        }
      }
      const clubPayload = isGolfEquipment ? buildClubSpecsSubmitPayload(category, clubSpecs) : {};
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          category,
          brand: listing.brand || "Other",
          model: listing.model || title.trim().slice(0, 500),
          condition,
          description: description.trim() || null,
          price: pricePence,
          ...(isGolfEquipment && {
            ...clubPayload,
            clubs: clubPayload.clubs ?? [],
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save.");
        setSaving(false);
        return;
      }

      // Persist image order if it changed
      const orderChanged = storedImages.some(
        (img, i) => img.id !== originalImageOrder.current[i]?.id
      );
      if (orderChanged && storedImages.length > 0) {
        const imgRes = await fetch(`/api/listings/${id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: storedImages.map((img) => img.storage_path) }),
        });
        if (!imgRes.ok) {
          setMessage("Listing saved but image order could not be updated.");
          setSaving(false);
          return;
        }
      }

      router.push("/dashboard?edited=1");
    } catch {
      setMessage("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Edit listing</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Changes saved will be reviewed again before buyers can purchase.
      </p>

      {listing.admin_feedback && (
        <div className="mt-4 rounded-xl border border-par-3-punch/30 bg-par-3-punch/5 p-4">
          <p className="text-sm font-medium text-mowing-green">Feedback from our team</p>
          <p className="mt-1 text-sm text-mowing-green/90 whitespace-pre-wrap">
            {listing.admin_feedback}
          </p>
        </div>
      )}

      {storedImages.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-mowing-green mb-3">Photos</h2>
          <ImageUpload
            mode="stored"
            min={1}
            max={storedImages.length}
            storedImages={storedImages}
            onStoredImagesChange={setStoredImages}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {message && (
          <p className="text-sm text-divot-pink" role="alert">
            {message}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brand + Model + Loft/Size"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Category *
          </label>
          <select
            required
            value={category}
            onChange={(e) => {
              const newCategory = e.target.value;
              setCategory(newCategory);
              const allowed = getConditionsForCategory(newCategory);
              if (condition && !allowed.includes(condition)) {
                setCondition("");
              }
            }}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Condition *
          </label>
          <select
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          >
            {(() => {
              const options = getConditionsForCategory(category);
              const withCurrent = options.includes(condition) ? options : [condition, ...options];
              return withCurrent.map((c) => (
                <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
              ));
            })()}
          </select>
        </div>
        {isGolfEquipment && (
          <ClubDetailsStep
            category={category}
            state={clubSpecs}
            onChange={setClubSpecs}
            shaftOptions={shaftOptions}
            shaftLoading={shaftCatalogueLoading}
            gripCatalogue={gripCatalogue}
            gripLoading={gripCatalogueLoading}
            errorField={clubError?.field}
            errorMessage={clubError?.message}
          />
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-sm font-medium text-mowing-green">
              Anything else buyers should know?{" "}
              <span className="font-normal text-mowing-green/55">(optional)</span>
            </label>
            <button
              type="button"
              onClick={handleImproveWithAI}
              disabled={enhanceLoading || !category || !condition || !title.trim() || saving}
              className="text-xs font-medium text-mowing-green underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enhanceLoading ? "Improving…" : "Improve with AI"}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Marks, damage, reason for selling, etc. Use Improve with AI to write these into the listing."
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50 resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Price (£) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
