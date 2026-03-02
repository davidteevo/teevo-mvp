"use client";

import { useState, useEffect, useRef } from "react";
import { ImageUpload } from "./ImageUpload";
import { SearchableSelect, type SearchableSelectHandle } from "./SearchableSelect";
import { ChevronDown, ChevronRight } from "lucide-react";

export type SubmitPhase = "creating" | "upload_urls" | "uploading" | "saving";
export type SubmitStatus = { phase: SubmitPhase; current?: number; total?: number } | null;

const GOLF_EQUIPMENT_CATEGORIES = ["Driver", "Woods", "Irons", "Wedges", "Putter"];
const IMAGE_SLOT_LABELS_GOLF = ["Front", "Back", "Sole", "Shaft", "Grip", "Other"];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Titleist: ["TSR2", "TSR3", "TSR4", "TSi2", "TSi3", "917 D2", "917 D3", "T200", "T300", "T100", "Vokey SM9", "Scotty Cameron Select"],
  Callaway: ["Paradym", "Paradym X", "Rogue ST", "Rogue ST Max", "Epic Max", "Apex Pro", "Apex 21", "Jaws Full Toe", "Odyssey White Hot"],
  TaylorMade: ["Stealth 2 Plus", "Stealth 2", "Stealth", "SIM2", "SIM2 Max", "M4", "P790", "P770", "P7MC", "Spider X", "Spider Tour"],
  Ping: ["G430 Max", "G430 LST", "G425", "G410", "i230", "i59", "G430 Irons", "PLD Anser"],
  Cobra: ["Aerojet", "Aerojet Max", "LTDx", "King Radspeed", "King MIM", "King Tour"],
  Mizuno: ["ST-Z 230", "ST-X 230", "JPX923 Tour", "JPX923 Forged", "JPX921", "T22", "Omoi"],
  Srixon: ["ZX5", "ZX7", "ZX7 MK II", "ZX5 MK II", "Z-Star", "Z-Star XV"],
  Wilson: ["Staff Model", "D9", "D7", "C300", "Infinite", "8802"],
  Other: [],
};

const CONDITION_LABELS: Record<string, string> = {
  New: "Like new",
  Excellent: "Excellent",
  Good: "Good",
  Used: "Fair",
};

interface ListingFormProps {
  categories: readonly string[];
  brands: readonly string[];
  conditions: readonly string[];
  initialCategory?: string;
  onSubmit: (payload: {
    category: string;
    brand: string;
    model: string;
    condition: string;
    description: string;
    price: string;
    shaft?: string;
    degree?: string;
    shaftFlex?: string;
    images: File[];
  }) => void;
  submitting: boolean;
  submitStatus?: SubmitStatus;
}

function getStatusLabel(status: NonNullable<SubmitStatus>): string {
  switch (status.phase) {
    case "creating":
      return "Creating listing…";
    case "upload_urls":
      return "Preparing upload…";
    case "uploading":
      return status.total != null && status.current != null
        ? `Uploading image ${status.current} of ${status.total}…`
        : "Uploading images…";
    case "saving":
      return "Saving…";
    default:
      return "Submitting…";
  }
}

export function ListingForm({
  categories,
  brands,
  conditions,
  initialCategory = "",
  onSubmit,
  submitting,
  submitStatus = null,
}: ListingFormProps) {
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("");
  const [shaft, setShaft] = useState("");
  const [degree, setDegree] = useState("");
  const [shaftFlex, setShaftFlex] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const mainCtaRef = useRef<HTMLButtonElement>(null);
  const modelSelectRef = useRef<SearchableSelectHandle>(null);

  useEffect(() => {
    setCategory((c) => (initialCategory && c === "" ? initialCategory : c));
  }, [initialCategory]);

  useEffect(() => {
    if (brand) modelSelectRef.current?.focus();
  }, [brand]);

  const isDriverOrWoods = category === "Driver" || category === "Woods";
  const isGolfEquipment = GOLF_EQUIPMENT_CATEGORIES.includes(category);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    const el = mainCtaRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < 5 || images.length > 6) {
      alert("Please upload 5 or 6 images (Front, Back, Sole, Shaft, Grip).");
      return;
    }
    if (!category || !brand || !model?.trim()) {
      alert("Please fill in Category, Brand and Model.");
      return;
    }
    if (!condition) {
      alert("Please select a condition.");
      return;
    }
    onSubmit({
      category,
      brand,
      model,
      condition,
      description,
      price,
      ...(isDriverOrWoods && {
        shaft: shaft.trim() || undefined,
        degree: degree.trim() || undefined,
        shaftFlex: shaftFlex.trim() || undefined,
      }),
      images,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      {/* 1. Photos (hero) */}
      <section>
        <h2 className="text-lg font-semibold text-mowing-green mb-1">Add photos</h2>
        <p className="text-sm text-mowing-green/70 mb-3">
          Listings with 5+ photos sell faster.
        </p>
        <ImageUpload
          min={5}
          max={6}
          value={images}
          onChange={setImages}
          variant="hero"
          slotLabels={isGolfEquipment ? IMAGE_SLOT_LABELS_GOLF : ["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5", "Photo 6"]}
        />
        <p className="mt-2 text-xs text-mowing-green/60">
          Recommended: Front, Back, Sole, Shaft, Grip.
        </p>
      </section>

      {/* 2. Price */}
      <section>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          What price do you want?
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-mowing-green/30 bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-mowing-green/30">
          <span className="text-mowing-green font-medium">£</span>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="flex-1 min-w-0 bg-transparent border-none p-0 text-mowing-green placeholder:text-mowing-green/50 outline-none"
          />
        </div>
      </section>

      {/* 3. Item details */}
      <section>
        <h2 className="text-lg font-semibold text-mowing-green mb-4">Item details</h2>
        <div className="space-y-4">
          <SearchableSelect
            options={categories}
            value={category}
            onChange={setCategory}
            placeholder="Select category"
            label="Category"
            required
          />
          <SearchableSelect
            options={brands}
            value={brand}
            onChange={setBrand}
            placeholder="Select brand"
            label="Brand"
            required
          />
          <SearchableSelect
            ref={modelSelectRef}
            options={brand ? MODELS_BY_BRAND[brand] ?? [] : []}
            value={model}
            onChange={setModel}
            placeholder="e.g. Stealth 2 Plus"
            label="Model"
            required
            allowCustom
          />
        </div>
      </section>

      {/* 4. Specs (optional, collapsible for Driver/Woods) */}
      {isDriverOrWoods && (
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
                <label className="block text-sm font-medium text-mowing-green mb-1">Degree</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. 9.5, 10.5, 15"
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Shaft model</label>
                <input
                  type="text"
                  value={shaft}
                  onChange={(e) => setShaft(e.target.value)}
                  placeholder="e.g. Project X, Ventus Blue"
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
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
            </div>
          )}
        </section>
      )}

      {/* 5. Condition */}
      <section>
        <label className="block text-sm font-medium text-mowing-green mb-2">
          Condition *
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Condition">
          {conditions.map((c) => {
            const label = CONDITION_LABELS[c] ?? c;
            const selected = condition === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-mowing-green text-off-white-pique"
                    : "bg-mowing-green/10 text-mowing-green hover:bg-mowing-green/20"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Description */}
      <section>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Any details that help buyers..."
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50 resize-y"
        />
      </section>

      {submitting && submitStatus && (
        <div
          className="rounded-xl border border-mowing-green/30 bg-mowing-green/5 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-mowing-green/30 border-t-mowing-green"
              aria-hidden
            />
            <span className="text-sm font-medium text-mowing-green">
              {getStatusLabel(submitStatus)}
            </span>
          </div>
          {submitStatus.phase === "uploading" &&
            submitStatus.total != null &&
            submitStatus.current != null &&
            submitStatus.total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-mowing-green/20">
                  <div
                    className="h-full rounded-full bg-mowing-green transition-all duration-300"
                    style={{
                      width: `${(100 * submitStatus.current) / submitStatus.total}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      )}

      <div className="pt-2">
        <button
          ref={mainCtaRef}
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "List my item"}
        </button>
        <p className="mt-2 text-center text-xs text-mowing-green/60">
          We review within 24 hours
        </p>
      </div>

      {stickyVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-mowing-green/20 bg-off-white-pique/95 backdrop-blur py-3 px-4">
          <div className="max-w-xl mx-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "List my item"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
