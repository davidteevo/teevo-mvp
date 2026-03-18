"use client";

import { useState, useEffect, useRef } from "react";
import { ImageUpload } from "./ImageUpload";
import { SearchableSelect, type SearchableSelectHandle } from "./SearchableSelect";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  CLOTHING_TYPES,
  ACCESSORY_ITEM_TYPES,
  CLOTHING_BRANDS,
  ACCESSORY_BRANDS,
  getSizeOptionsForClothingType,
  getConditionsForCategory,
  CONDITION_LABELS,
  isClothingCategory,
  isAccessoriesCategory,
} from "@/lib/listing-categories";
import type { ClubCatalogue } from "@/lib/club-catalogue";

export type SubmitPhase = "creating" | "upload_urls" | "compressing" | "uploading" | "saving";
export type SubmitStatus = { phase: SubmitPhase; current?: number; total?: number } | null;

const GOLF_EQUIPMENT_CATEGORIES = ["Driver", "Woods", "Driving Irons", "Hybrids", "Irons", "Wedges", "Putter"];
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

interface ListingFormProps {
  categories: readonly string[];
  brands: readonly string[];
  conditions: readonly string[];
  initialCategory?: string;
  onSubmit: (payload: {
    category: string;
    brand: string;
    model?: string | null;
    condition: string;
    description: string;
    price: string;
    title?: string;
    shaft?: string;
    degree?: string;
    shaftFlex?: string;
    lieAngle?: string;
    clubLength?: string;
    shaftWeight?: string;
    shaftMaterial?: string;
    gripBrand?: string;
    gripModel?: string;
    gripSize?: string;
    gripCondition?: string;
    handed?: "left" | "right";
    item_type?: string | null;
    size?: string | null;
    colour?: string | null;
    images: File[];
  }) => void;
  submitting: boolean;
  submitStatus?: SubmitStatus;
  clubCatalogue?: ClubCatalogue;
  clothingBrands?: string[];
}

function getStatusLabel(status: NonNullable<SubmitStatus>): string {
  switch (status.phase) {
    case "creating":
      return "Creating listing…";
    case "upload_urls":
      return "Preparing upload…";
    case "compressing":
      return status.total != null && status.current != null
        ? `Compressing image ${status.current} of ${status.total}…`
        : "Compressing images…";
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
  clubCatalogue,
  clothingBrands,
}: ListingFormProps) {
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState("");
  /** When brand choice is "Other", user enters the actual brand here */
  const [otherBrandName, setOtherBrandName] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("");
  const [title, setTitle] = useState("");
  const [shaft, setShaft] = useState("");
  const [degree, setDegree] = useState("");
  const [shaftFlex, setShaftFlex] = useState("");
  const [lieAnglePreset, setLieAnglePreset] = useState("");
  const [lieAngleCustom, setLieAngleCustom] = useState("");
  const [clubLengthPreset, setClubLengthPreset] = useState("");
  const [clubLengthCustom, setClubLengthCustom] = useState("");
  const [shaftWeight, setShaftWeight] = useState("");
  const [shaftMaterial, setShaftMaterial] = useState("");
  const [gripBrand, setGripBrand] = useState("");
  const [gripModel, setGripModel] = useState("");
  const [gripSize, setGripSize] = useState("");
  const [gripCondition, setGripCondition] = useState("");
  const [handed, setHanded] = useState<"" | "left" | "right">("");
  const [itemType, setItemType] = useState("");
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [priceGuidance, setPriceGuidance] = useState<{ minPence: number; maxPence: number; source: string } | null>(null);
  const [priceGuidanceLoading, setPriceGuidanceLoading] = useState(false);
  const [shaftOptions, setShaftOptions] = useState<string[]>([]);
  const [shaftCatalogueLoading, setShaftCatalogueLoading] = useState(false);
  const [gripCatalogue, setGripCatalogue] = useState<{
    brands: string[];
    modelsByBrand: Record<string, string[]>;
  } | null>(null);
  const [gripCatalogueLoading, setGripCatalogueLoading] = useState(false);
  const mainCtaRef = useRef<HTMLButtonElement>(null);
  const modelSelectRef = useRef<SearchableSelectHandle>(null);

  const isClothing = isClothingCategory(category);
  const isAccessories = isAccessoriesCategory(category);
  const isStructured = isClothing || isAccessories;
  const isClubCategory = GOLF_EQUIPMENT_CATEGORIES.includes(category);
  const catalogueBrandsForCategory =
    clubCatalogue && isClubCategory && category
      ? clubCatalogue.brandsByCategory[category]
      : undefined;
  const brandsOptions = isClothing
    ? (clothingBrands?.length ? [...clothingBrands, "Other"] : [...CLOTHING_BRANDS])
    : isAccessories
      ? [...ACCESSORY_BRANDS]
      : catalogueBrandsForCategory?.length
        ? [...catalogueBrandsForCategory, "Other"]
        : brands;
  const modelOptions =
    !isStructured && brand
      ? clubCatalogue && isClubCategory && category
        ? clubCatalogue.modelsByCategoryAndBrand[category]?.[brand] ?? MODELS_BY_BRAND[brand] ?? []
        : MODELS_BY_BRAND[brand] ?? []
      : [];
  const sizeOptions = isClothing && itemType ? getSizeOptionsForClothingType(itemType) : [];

  const effectiveBrand = brand === "Other" ? otherBrandName.trim() : brand;

  useEffect(() => {
    setCategory((c) => (initialCategory && c === "" ? initialCategory : c));
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogues = async () => {
      try {
        setShaftCatalogueLoading(true);
        setGripCatalogueLoading(true);
        const [shaftRes, gripRes] = await Promise.all([
          fetch("/api/club-specs/shafts"),
          fetch("/api/club-specs/grips"),
        ]);
        if (!shaftRes.ok) throw new Error("Failed to load shafts catalogue");
        if (!gripRes.ok) throw new Error("Failed to load grips catalogue");
        const shaftData = (await shaftRes.json().catch(() => [])) as unknown;
        const gripData = (await gripRes.json().catch(() => null)) as unknown;
        if (cancelled) return;
        setShaftOptions(Array.isArray(shaftData) ? shaftData.filter((s) => typeof s === "string") : []);
        if (gripData && typeof gripData === "object") {
          const g = gripData as { brands?: unknown; modelsByBrand?: unknown };
          const brands = Array.isArray(g.brands) ? g.brands.filter((b) => typeof b === "string") : [];
          const modelsByBrand: Record<string, string[]> =
            g.modelsByBrand && typeof g.modelsByBrand === "object" ? (g.modelsByBrand as any) : {};
          setGripCatalogue({ brands, modelsByBrand });
        } else {
          setGripCatalogue(null);
        }
      } catch {
        // Non-blocking: allow manual/custom entry even if CSV-backed options fail.
        if (!cancelled) {
          setShaftOptions([]);
          setGripCatalogue(null);
        }
      } finally {
        if (!cancelled) {
          setShaftCatalogueLoading(false);
          setGripCatalogueLoading(false);
        }
      }
    };
    loadCatalogues();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (brand && !isStructured) modelSelectRef.current?.focus();
  }, [brand, isStructured]);

  useEffect(() => {
    if (!isClothing) setSize("");
    else if (itemType) {
      const allowed = getSizeOptionsForClothingType(itemType);
      setSize((s) => (s && allowed.includes(s) ? s : ""));
    }
  }, [isClothing, itemType]);

  const isGolfEquipment = GOLF_EQUIPMENT_CATEGORIES.includes(category);

  useEffect(() => {
    if (!isGolfEquipment) {
      // Prevent stale spec values being submitted for non-golf categories.
      setShaft("");
      setDegree("");
      setShaftFlex("");
      setLieAnglePreset("");
      setLieAngleCustom("");
      setClubLengthPreset("");
      setClubLengthCustom("");
      setShaftWeight("");
      setShaftMaterial("");
      setGripBrand("");
      setGripModel("");
      setGripSize("");
      setGripCondition("");
    }
  }, [isGolfEquipment]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    const el = mainCtaRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isStructured || !category || !effectiveBrand || !model.trim() || !condition) {
      setPriceGuidance(null);
      return;
    }
    let cancelled = false;
    setPriceGuidanceLoading(true);
    const params = new URLSearchParams({ category, brand: effectiveBrand, model: model.trim(), condition });
    fetch(`/api/ai/price-guidance?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.minPence != null && data.maxPence != null) {
          setPriceGuidance({
            minPence: data.minPence,
            maxPence: data.maxPence,
            source: data.source ?? "platform",
          });
        } else {
          setPriceGuidance(null);
        }
      })
      .catch(() => {
        if (!cancelled) setPriceGuidance(null);
      })
      .finally(() => {
        if (!cancelled) setPriceGuidanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, brand, otherBrandName, model, condition, isStructured]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < 5 || images.length > 6) {
      alert("Please upload 5 or 6 images (Front, Back, Sole, Shaft, Grip).");
      return;
    }
    if (!category) {
      alert("Please select a category.");
      return;
    }
    if (brand === "Other" && !otherBrandName.trim()) {
      alert("Please enter the brand name.");
      return;
    }
    if (!effectiveBrand) {
      alert("Please select Category and Brand.");
      return;
    }
    if (!condition) {
      alert("Please select a condition.");
      return;
    }
    if (isClothing) {
      if (!itemType) {
        alert("Please select clothing type.");
        return;
      }
      if (!size) {
        alert("Please select size.");
        return;
      }
    } else if (isAccessories) {
      if (!itemType) {
        alert("Please select item type.");
        return;
      }
    } else {
      if (!model?.trim()) {
        alert("Please fill in Model.");
        return;
      }
      if (isGolfEquipment && !handed) {
        alert("Please select Right handed or Left handed.");
        return;
      }
    }
    onSubmit({
      category,
      brand: effectiveBrand,
      ...(isStructured
        ? { model: null as string | null, item_type: itemType || null, size: isClothing ? size || null : null, colour: colour.trim() || null }
        : { model: model.trim(), item_type: null, size: null, colour: null }),
      condition,
      description,
      price,
      ...(title.trim() && { title: title.trim() }),
      ...(isGolfEquipment && {
        shaft: shaft.trim() || undefined,
        degree: degree.trim() || undefined,
        shaftFlex: shaftFlex.trim() || undefined,
        lieAngle: (lieAnglePreset === "Other" ? lieAngleCustom : lieAnglePreset).trim() || undefined,
        clubLength: (clubLengthPreset === "Other" ? clubLengthCustom : clubLengthPreset).trim() || undefined,
        shaftWeight: shaftWeight.trim() || undefined,
        shaftMaterial: shaftMaterial.trim() || undefined,
        gripBrand: gripBrand.trim() || undefined,
        gripModel: gripModel.trim() || undefined,
        gripSize: gripSize.trim() || undefined,
        gripCondition: gripCondition.trim() || undefined,
      }),
      ...(isGolfEquipment && handed && { handed: handed as "left" | "right" }),
      images,
    });
  };

  const handleImproveWithAI = async () => {
    if (isStructured) {
      if (!category || !effectiveBrand || !itemType || !condition) {
        alert("Please fill in Category, Brand, item type and Condition first.");
        return;
      }
      if (brand === "Other" && !otherBrandName.trim()) {
        alert("Please enter the brand name.");
        return;
      }
    } else {
      if (!category || !effectiveBrand || !model.trim() || !condition) {
        alert("Please fill in Category, Brand, Model and Condition first.");
        return;
      }
      if (brand === "Other" && !otherBrandName.trim()) {
        alert("Please enter the brand name.");
        return;
      }
    }
    setEnhanceLoading(true);
    try {
      const body: Record<string, string | undefined> = isStructured
        ? {
            category,
            brand: effectiveBrand,
            condition,
            item_type: itemType,
            ...(isClothing ? { size: size || undefined, colour: colour.trim() || undefined } : { model: model.trim() || undefined }),
            description: description.trim() || undefined,
            title: title.trim() || undefined,
          }
        : {
            category,
            brand: effectiveBrand,
            model: model.trim(),
            condition,
            description: description.trim() || undefined,
            title: title.trim() || undefined,
            ...(isGolfEquipment
              ? {
                  shaft: shaft.trim() || undefined,
                  degree: degree.trim() || undefined,
                  shaft_flex: shaftFlex.trim() || undefined,
                  lie_angle: (lieAnglePreset === "Other" ? lieAngleCustom : lieAnglePreset).trim() || undefined,
                  club_length:
                    (clubLengthPreset === "Other" ? clubLengthCustom : clubLengthPreset).trim() || undefined,
                  shaft_weight: shaftWeight.trim() || undefined,
                  shaft_material: shaftMaterial.trim() || undefined,
                  grip_brand: gripBrand.trim() || undefined,
                  grip_model: gripModel.trim() || undefined,
                  grip_size: gripSize.trim() || undefined,
                  grip_condition: gripCondition.trim() || undefined,
                }
              : {}),
          };
      const res = await fetch("/api/ai/enhance-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not get suggestions");
      }
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (!isStructured) {
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
        {priceGuidanceLoading && (
          <p className="mt-1.5 text-xs text-mowing-green/60">Checking resale range…</p>
        )}
        {!priceGuidanceLoading && priceGuidance && (
          <p className="mt-1.5 text-xs text-mowing-green/70">
            Estimated resale range: £{(priceGuidance.minPence / 100).toFixed(0)}–£{(priceGuidance.maxPence / 100).toFixed(0)}
            {priceGuidance.source === "limited" && " (based on limited data)"}
          </p>
        )}
      </section>

      {/* 3. Item details */}
      <section>
        <h2 className="text-lg font-semibold text-mowing-green mb-4">Item details</h2>
        <div className="space-y-4">
          <SearchableSelect
            options={categories}
            value={category}
            onChange={(c) => {
              setCategory(c);
              setOtherBrandName("");
              const allowedConditions = getConditionsForCategory(c);
              if (condition && !allowedConditions.includes(condition)) {
                setCondition("");
              }
              if (!isClothingCategory(c) && !isAccessoriesCategory(c)) {
                setItemType("");
                setSize("");
                setColour("");
              } else {
                setModel("");
              }
            }}
            placeholder="Select category"
            label="Category"
            required
          />
          <SearchableSelect
            options={brandsOptions}
            value={brand}
            onChange={(b) => {
              setBrand(b);
              if (b !== "Other") setOtherBrandName("");
            }}
            placeholder="Select brand"
            label="Brand"
            required
            allowCustom={isClothing}
          />
          {brand === "Other" && (
            <div>
              <label htmlFor="listing-other-brand" className="block text-sm font-medium text-mowing-green mb-1">
                Brand name <span className="text-red-600">*</span>
              </label>
              <input
                id="listing-other-brand"
                type="text"
                value={otherBrandName}
                onChange={(e) => setOtherBrandName(e.target.value)}
                placeholder="e.g. Bettinardi, Sub 70, local brand"
                className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                required
                autoComplete="organization"
              />
            </div>
          )}
          {isClothing && (
            <>
              <SearchableSelect
                options={[...CLOTHING_TYPES]}
                value={itemType}
                onChange={setItemType}
                placeholder="e.g. Polo, Trousers"
                label="Clothing type"
                required
              />
              <SearchableSelect
                options={sizeOptions}
                value={size}
                onChange={setSize}
                placeholder={itemType === "Shoes" ? "UK size" : "Size"}
                label="Size"
                required
              />
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Colour (optional)</label>
                <input
                  type="text"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  placeholder="e.g. Navy, White"
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                />
              </div>
            </>
          )}
          {isAccessories && (
            <>
              <SearchableSelect
                options={[...ACCESSORY_ITEM_TYPES]}
                value={itemType}
                onChange={setItemType}
                placeholder="e.g. Range Finder, Golf Bag"
                label="Item type"
                required
              />
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Model (optional)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Bushnell Tour V5"
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                />
              </div>
            </>
          )}
          {!isStructured && (
            <SearchableSelect
              ref={modelSelectRef}
              options={modelOptions}
              value={model}
              onChange={setModel}
              placeholder="e.g. Stealth 2 Plus"
              label="Model"
              required
              allowCustom
            />
          )}
        </div>
      </section>

      {/* 4. Specs (optional, collapsible for golf clubs) */}
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
                  value={lieAnglePreset}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLieAnglePreset(v);
                    if (v !== "Other") setLieAngleCustom("");
                  }}
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                >
                  <option value="">Select</option>
                  <option value={'3° Flat'}>3° Flat</option>
                  <option value={'2° Flat'}>2° Flat</option>
                  <option value={'1° Flat'}>1° Flat</option>
                  <option value="Standard">Standard</option>
                  <option value={'1° Upright'}>1° Upright</option>
                  <option value={'2° Upright'}>2° Upright</option>
                  <option value={'3° Upright'}>3° Upright</option>
                  <option value="Other">Other</option>
                </select>
                {lieAnglePreset === "Other" && (
                  <input
                    type="text"
                    value={lieAngleCustom}
                    onChange={(e) => setLieAngleCustom(e.target.value)}
                    placeholder="e.g. 2.5° Upright"
                    className="mt-2 w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Club length</label>
                <select
                  value={clubLengthPreset}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClubLengthPreset(v);
                    if (v !== "Other") setClubLengthCustom("");
                  }}
                  className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                >
                  <option value="">Select</option>
                  <option value={'-1"'}>-1"</option>
                  <option value={'-0.5"'}>-0.5"</option>
                  <option value="Standard">Standard</option>
                  <option value={'+0.5"'}>+0.5"</option>
                  <option value={'+1"'}>+1"</option>
                  <option value="Other">Other</option>
                </select>
                {clubLengthPreset === "Other" && (
                  <input
                    type="text"
                    value={clubLengthCustom}
                    onChange={(e) => setClubLengthCustom(e.target.value)}
                    placeholder={'e.g. +0.25"'}
                    className="mt-2 w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
                  />
                )}
              </div>

              <div>
                <SearchableSelect
                  options={shaftOptions}
                  value={shaft}
                  onChange={setShaft}
                  placeholder={shaftCatalogueLoading ? "Loading shaft options…" : "e.g. Fujikura Ventus Blue"}
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
                  onChange={setGripBrand}
                  placeholder={gripCatalogueLoading ? "Loading grip brands…" : "e.g. Golf Pride"}
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
                  {getConditionsForCategory(category).map((c) => {
                    const label = CONDITION_LABELS[c] ?? c;
                    return (
                      <option key={c} value={c}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4b. Right/Left handed (golf clubs only) */}
      {isGolfEquipment && (
        <section>
          <label className="block text-sm font-medium text-mowing-green mb-2">
            Handed *
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Handed">
            {(["right", "left"] as const).map((h) => {
              const selected = handed === h;
              const label = h === "right" ? "Right handed" : "Left handed";
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHanded(h)}
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
      )}

      {/* 5. Condition */}
      <section>
        <label className="block text-sm font-medium text-mowing-green mb-2">
          Condition *
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Condition">
          {getConditionsForCategory(category).map((c) => {
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
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-sm font-medium text-mowing-green">
            Description
          </label>
          <button
            type="button"
            onClick={handleImproveWithAI}
            disabled={
              enhanceLoading ||
              !category ||
              !effectiveBrand ||
              !condition ||
              submitting ||
              (isStructured ? !itemType : !model.trim())
            }
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
        <label className="block text-sm font-medium text-mowing-green/80 mt-3 mb-1">
          Listing title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            isClothing
              ? "e.g. Nike Golf Polo – Medium – Navy"
              : isAccessories
                ? "e.g. Bushnell Tour V5 Range Finder"
                : "e.g. Ping G425 Max Driver – 10.5° – Excellent"
          }
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
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
