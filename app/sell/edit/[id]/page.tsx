"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ALL_CATEGORIES, getConditionsForCategory, CONDITION_LABELS } from "@/lib/listing-categories";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SearchableSelect } from "@/components/listing/SearchableSelect";

const CATEGORIES = [...ALL_CATEGORIES];
const GOLF_EQUIPMENT_CATEGORIES = ["Driver", "Woods", "Driving Irons", "Hybrids", "Irons", "Wedges", "Putter"];

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

  // Club specs
  const [specsOpen, setSpecsOpen] = useState(false);
  const [degree, setDegree] = useState("");
  const [lieAngle, setLieAngle] = useState("");
  const [clubLength, setClubLength] = useState("");
  const [shaft, setShaft] = useState("");
  const [shaftFlex, setShaftFlex] = useState("");
  const [shaftWeight, setShaftWeight] = useState("");
  const [shaftMaterial, setShaftMaterial] = useState("");
  const [gripBrand, setGripBrand] = useState("");
  const [gripModel, setGripModel] = useState("");
  const [gripSize, setGripSize] = useState("");
  const [gripCondition, setGripCondition] = useState("");

  // Catalogues for SearchableSelect
  const [shaftOptions, setShaftOptions] = useState<string[]>([]);
  const [gripCatalogue, setGripCatalogue] = useState<{ brands: string[]; modelsByBrand: Record<string, string[]> } | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  const handleImproveWithAI = async () => {
    if (!category || !condition || !title.trim()) {
      alert("Please fill in Title, Category and Condition first.");
      return;
    }
    setEnhanceLoading(true);
    try {
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
            shaft: shaft.trim() || undefined,
            degree: degree.trim() || undefined,
            shaft_flex: shaftFlex.trim() || undefined,
            lie_angle: lieAngle.trim() || undefined,
            club_length: clubLength.trim() || undefined,
            shaft_weight: shaftWeight.trim() || undefined,
            shaft_material: shaftMaterial.trim() || undefined,
            grip_brand: gripBrand.trim() || undefined,
            grip_model: gripModel.trim() || undefined,
            grip_size: gripSize.trim() || undefined,
            grip_condition: gripCondition.trim() || undefined,
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not get suggestions");
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (isGolfEquipment) {
        if (data.shaft != null) setShaft(data.shaft ?? "");
        if (data.degree != null) setDegree(data.degree ?? "");
        if (data.shaft_flex != null) setShaftFlex(data.shaft_flex ?? "");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setEnhanceLoading(false);
    }
  };

  const isGolfEquipment = GOLF_EQUIPMENT_CATEGORIES.includes(category);

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
          setDegree(found.degree || "");
          setLieAngle(found.lie_angle || "");
          setClubLength(found.club_length || "");
          setShaft(found.shaft || "");
          setShaftFlex(found.shaft_flex || "");
          setShaftWeight(found.shaft_weight || "");
          setShaftMaterial(found.shaft_material || "");
          setGripBrand(found.grip_brand || "");
          setGripModel(found.grip_model || "");
          setGripSize(found.grip_size || "");
          setGripCondition(found.grip_condition || "");
          // Auto-open specs if any spec is already set
          const hasSpecs = !!(found.shaft || found.degree || found.shaft_flex || found.lie_angle || found.club_length);
          setSpecsOpen(hasSpecs);
        } else {
          setFetchError("Listing not found or you don't have permission to edit it.");
        }
      })
      .catch(() => setFetchError("Failed to load listing."));
  }, [user, id]);

  useEffect(() => {
    let cancelled = false;
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
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          category,
          brand: "Other",
          model: title.trim().slice(0, 500),
          condition,
          description: description.trim() || null,
          price: pricePence,
          ...(isGolfEquipment && {
            shaft: shaft.trim() || null,
            degree: degree.trim() || null,
            shaft_flex: shaftFlex || null,
            lie_angle: lieAngle || null,
            club_length: clubLength || null,
            shaft_weight: shaftWeight.trim() || null,
            shaft_material: shaftMaterial || null,
            grip_brand: gripBrand.trim() || null,
            grip_model: gripModel.trim() || null,
            grip_size: gripSize || null,
            grip_condition: gripCondition || null,
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save.");
        setSaving(false);
        return;
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
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-sm font-medium text-mowing-green">
              Description
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
            rows={4}
            placeholder="Any details that help buyers..."
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50 resize-y"
          />
        </div>

        {isGolfEquipment && (
          <section className="rounded-xl border border-mowing-green/20 bg-mowing-green/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setSpecsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-mowing-green hover:bg-mowing-green/10"
            >
              <span>Add club specs (recommended)</span>
              {specsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {specsOpen && (
              <div className="px-4 pb-4 pt-0 space-y-4 border-t border-mowing-green/10">
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Loft (degree)</label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. 9°, 10.5°, 56°"
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Lie angle</label>
                  <select
                    value={lieAngle}
                    onChange={(e) => setLieAngle(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    <option value="3° Flat">3° Flat</option>
                    <option value="2° Flat">2° Flat</option>
                    <option value="1° Flat">1° Flat</option>
                    <option value="Standard">Standard</option>
                    <option value="1° Upright">1° Upright</option>
                    <option value="2° Upright">2° Upright</option>
                    <option value="3° Upright">3° Upright</option>
                  </select>
                  {lieAngle && !["3° Flat","2° Flat","1° Flat","Standard","1° Upright","2° Upright","3° Upright",""].includes(lieAngle) && (
                    <input
                      type="text"
                      value={lieAngle}
                      onChange={(e) => setLieAngle(e.target.value)}
                      placeholder="e.g. 2.5° Upright"
                      className="mt-2 w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Club length</label>
                  <select
                    value={clubLength}
                    onChange={(e) => setClubLength(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    <option value='-1"'>-1&quot;</option>
                    <option value='-0.5"'>-0.5&quot;</option>
                    <option value="Standard">Standard</option>
                    <option value='+0.5"'>+0.5&quot;</option>
                    <option value='+1"'>+1&quot;</option>
                  </select>
                </div>
                <div>
                  <SearchableSelect
                    options={shaftOptions}
                    value={shaft}
                    onChange={setShaft}
                    placeholder="e.g. Fujikura Ventus Blue"
                    label="Shaft model"
                    allowCustom
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Shaft flex</label>
                  <select
                    value={shaftFlex}
                    onChange={(e) => setShaftFlex(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    <option value="Senior">Senior</option>
                    <option value="Regular">Regular</option>
                    <option value="Stiff">Stiff</option>
                    <option value="X-Stiff">X-Stiff</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Shaft weight</label>
                  <input
                    type="text"
                    value={shaftWeight}
                    onChange={(e) => setShaftWeight(e.target.value)}
                    placeholder="e.g. 65g, 85g"
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Shaft material</label>
                  <select
                    value={shaftMaterial}
                    onChange={(e) => setShaftMaterial(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    <option value="Graphite">Graphite</option>
                    <option value="Steel">Steel</option>
                  </select>
                </div>
                <div>
                  <SearchableSelect
                    options={gripCatalogue?.brands ?? []}
                    value={gripBrand}
                    onChange={(v) => { setGripBrand(v); setGripModel(""); }}
                    placeholder="e.g. Golf Pride"
                    label="Grip brand"
                    allowCustom
                  />
                </div>
                <div>
                  <SearchableSelect
                    options={gripCatalogue?.modelsByBrand?.[gripBrand] ?? []}
                    value={gripModel}
                    onChange={setGripModel}
                    placeholder="e.g. Tour Velvet 360"
                    label="Grip model"
                    allowCustom
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Grip size</label>
                  <select
                    value={gripSize}
                    onChange={(e) => setGripSize(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    <option value="Standard">Standard</option>
                    <option value="Midsize">Midsize</option>
                    <option value="Oversize">Oversize</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-mowing-green mb-1">Grip condition</label>
                  <select
                    value={gripCondition}
                    onChange={(e) => setGripCondition(e.target.value)}
                    className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                  >
                    <option value="">Select</option>
                    {getConditionsForCategory(category).map((c) => (
                      <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

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
