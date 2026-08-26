"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ImageUpload } from "./ImageUpload";
import { SearchableSelect, type SearchableSelectHandle } from "./SearchableSelect";
import { FilterChip } from "./FilterChip";
import { ClubDetailsStep } from "./club-specs/ClubDetailsStep";
import { RadioCards } from "./club-specs/RadioCards";
import { ChipGroup } from "./club-specs/ChipGroup";
import { GuidedPhotoStep, flattenGuidedPhotos, guidedPhotosComplete, type GuidedPhotoValue } from "./photo-guide/GuidedPhotoStep";
import { ListingWizardTimeline } from "./ListingWizardTimeline";
import {
  CLOTHING_TYPES,
  CLOTHING_GENDERS,
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
import { ListingSubmitLoading, type ListingSubmitProgress } from "./ListingSubmitLoading";
import {
  emptyClubSpecsFormState,
  isGolfEquipmentCategory,
  WEDGE_LOFT_OPTIONS,
  WEDGE_SET_MAX,
  type ClubSpecsFormState,
  validateClubDetails,
} from "@/lib/club-specs/schemas";
import {
  buildClubSpecsSubmitPayload,
  buildListingSummaryLines,
  buildListingTitleFromSpecs,
  newWedgeClubDraft,
  type ClubSpecsSubmitPayload,
} from "@/lib/club-specs/payload";
import { track } from "@/lib/analytics";
import { getPhotoSlots } from "@/lib/listing-photos/requirements";
import type { UploadableListingPhoto } from "@/lib/listing-photos/upload-client";
import {
  MIN_GENERIC_LISTING_IMAGES,
  MAX_GENERIC_LISTING_IMAGES,
} from "@/lib/listing-photos/types";

export type { ListingSubmitProgress };

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

export type ListingFormSubmitPayload = {
  category: string;
  brand: string;
  model?: string | null;
  condition: string;
  description: string;
  price: string;
  title?: string;
  shaft?: string | null;
  degree?: string | null;
  shaftFlex?: string | null;
  lieAngle?: string | null;
  clubLength?: string | null;
  shaftWeight?: string | null;
  shaftMaterial?: string | null;
  gripBrand?: string | null;
  gripModel?: string | null;
  gripSize?: string | null;
  gripCondition?: string | null;
  handed?: "left" | "right";
  item_type?: string | null;
  size?: string | null;
  colour?: string | null;
  gender?: string | null;
  images: File[];
  guidedPhotos?: UploadableListingPhoto[];
  hosel_serial_status?: "uploaded" | "not_found" | "not_applicable" | null;
} & ClubSpecsSubmitPayload;

interface ListingFormProps {
  categories: readonly string[];
  brands: readonly string[];
  conditions: readonly string[];
  initialCategory?: string;
  onSubmit: (payload: ListingFormSubmitPayload) => void;
  submitting: boolean;
  submitProgress?: ListingSubmitProgress | null;
  clubCatalogue?: ClubCatalogue;
  clothingBrands?: string[];
  onStepChange?: (step: 1 | 2 | 3 | 4) => void;
}

type StepId = 1 | 2 | 3 | 4;

export function ListingForm({
  categories,
  brands,
  conditions: _conditions,
  initialCategory = "",
  onSubmit,
  submitting,
  submitProgress = null,
  clubCatalogue,
  clothingBrands,
  onStepChange,
}: ListingFormProps) {
  const [step, setStep] = useState<StepId>(1);
  const [category, setCategory] = useState(initialCategory);
  const [brand, setBrand] = useState("");
  const [otherBrandName, setOtherBrandName] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [itemType, setItemType] = useState("");
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [gender, setGender] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [guidedPhotos, setGuidedPhotos] = useState<GuidedPhotoValue>({
    filesBySlot: {},
    extras: [],
    serialNotFound: false,
  });
  const [clubSpecs, setClubSpecs] = useState<ClubSpecsFormState>(emptyClubSpecsFormState);
  const [clubError, setClubError] = useState<{ field: string; message: string } | null>(null);
  const [writingCopy, setWritingCopy] = useState(false);
  const [priceGuidance, setPriceGuidance] = useState<{
    minPence: number;
    maxPence: number;
    source: string;
  } | null>(null);
  const [priceGuidanceLoading, setPriceGuidanceLoading] = useState(false);
  const [shaftOptions, setShaftOptions] = useState<string[]>([]);
  const [shaftCatalogueLoading, setShaftCatalogueLoading] = useState(false);
  const [gripCatalogue, setGripCatalogue] = useState<{
    brands: string[];
    modelsByBrand: Record<string, string[]>;
  } | null>(null);
  const [gripCatalogueLoading, setGripCatalogueLoading] = useState(false);
  const modelSelectRef = useRef<SearchableSelectHandle>(null);
  const abandonedRef = useRef(false);

  const isClothing = isClothingCategory(category);
  const isAccessories = isAccessoriesCategory(category);
  const isStructured = isClothing || isAccessories;
  const isGolfEquipment = isGolfEquipmentCategory(category);
  const totalSteps = isGolfEquipment ? 4 : 3;

  const catalogueBrandsForCategory =
    clubCatalogue && isGolfEquipment && category
      ? clubCatalogue.brandsByCategory[category]
      : undefined;
  const brandsOptions = isClothing
    ? clothingBrands?.length
      ? [...clothingBrands, "Other"]
      : [...CLOTHING_BRANDS]
    : isAccessories
      ? [...ACCESSORY_BRANDS]
      : catalogueBrandsForCategory?.length
        ? [...catalogueBrandsForCategory, "Other"]
        : brands;
  const modelOptions =
    !isStructured && brand
      ? clubCatalogue && isGolfEquipment && category
        ? (clubCatalogue.modelsByCategoryAndBrand[category]?.[brand] ??
          MODELS_BY_BRAND[brand] ??
          [])
        : (MODELS_BY_BRAND[brand] ?? [])
      : [];
  const sizeOptions = isClothing && itemType ? getSizeOptionsForClothingType(itemType) : [];
  const conditionOptions = category ? getConditionsForCategory(category) : [];
  const effectiveBrand = brand === "Other" ? otherBrandName.trim() : brand;

  const specsPayload = useMemo(
    () => (isGolfEquipment ? buildClubSpecsSubmitPayload(category, clubSpecs) : null),
    [isGolfEquipment, category, clubSpecs]
  );

  const autoTitle = useMemo(() => {
    if (!isGolfEquipment || !effectiveBrand) return "";
    return buildListingTitleFromSpecs({
      category,
      brand: effectiveBrand,
      model: model.trim(),
      handed: specsPayload?.handed ?? null,
      degree: specsPayload?.degree ?? null,
      shaft_flex: specsPayload?.shaft_flex ?? null,
      shaft: specsPayload?.shaft ?? null,
      listing_format: specsPayload?.listing_format ?? null,
      iron_number: specsPayload?.iron_number ?? null,
      set_composition: specsPayload?.set_composition ?? null,
      head_number: specsPayload?.head_number ?? null,
      club_length: specsPayload?.club_length ?? null,
      standard_spec_status: specsPayload?.standard_spec_status ?? null,
      clubs: specsPayload?.clubs,
    });
  }, [isGolfEquipment, effectiveBrand, category, model, specsPayload]);

  const summaryLines = useMemo(() => {
    if (!isGolfEquipment) return [];
    const lines = buildListingSummaryLines({
      category,
      brand: effectiveBrand,
      model: model.trim(),
      handed: specsPayload?.handed ?? null,
      degree: specsPayload?.degree ?? null,
      shaft_flex: specsPayload?.shaft_flex ?? null,
      shaft: specsPayload?.shaft ?? null,
      listing_format: specsPayload?.listing_format ?? null,
      iron_number: specsPayload?.iron_number ?? null,
      set_composition: specsPayload?.set_composition ?? null,
      head_number: specsPayload?.head_number ?? null,
      club_length: specsPayload?.club_length ?? null,
      standard_spec_status: specsPayload?.standard_spec_status ?? null,
      clubs: specsPayload?.clubs,
    });
    if (condition) lines.push(condition);
    return lines;
  }, [isGolfEquipment, category, effectiveBrand, model, specsPayload, condition]);

  useEffect(() => {
    setCategory((c) => (initialCategory && c === "" ? initialCategory : c));
  }, [initialCategory]);

  useEffect(() => {
    track("listing_started");
    track("seller_listing_started");
  }, []);

  useEffect(() => {
    const onLeave = () => {
      if (!abandonedRef.current && !submitting) {
        abandonedRef.current = true;
        track("listing_abandoned", { step });
      }
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [step, submitting]);

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
        if (!shaftRes.ok || !gripRes.ok) throw new Error("catalogue");
        const shaftData = (await shaftRes.json().catch(() => [])) as unknown;
        const gripData = (await gripRes.json().catch(() => null)) as unknown;
        if (cancelled) return;
        setShaftOptions(Array.isArray(shaftData) ? shaftData.filter((s) => typeof s === "string") : []);
        if (gripData && typeof gripData === "object") {
          const g = gripData as { brands?: unknown; modelsByBrand?: unknown };
          const brandsList = Array.isArray(g.brands)
            ? g.brands.filter((b) => typeof b === "string")
            : [];
          const modelsByBrand: Record<string, string[]> =
            g.modelsByBrand && typeof g.modelsByBrand === "object"
              ? (g.modelsByBrand as Record<string, string[]>)
              : {};
          setGripCatalogue({ brands: brandsList, modelsByBrand });
        }
      } catch {
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
    if (!isClothing) {
      setSize("");
      setGender("");
      return;
    }
    if (itemType) {
      const allowed = getSizeOptionsForClothingType(itemType);
      setSize((s) => (s && allowed.includes(s) ? s : ""));
    }
  }, [isClothing, itemType]);

  useEffect(() => {
    if (!isGolfEquipment) {
      setClubSpecs(emptyClubSpecsFormState());
    }
  }, [isGolfEquipment]);

  useEffect(() => {
    window.scrollTo(0, 0);
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (isStructured || !category || !effectiveBrand || !model.trim() || !condition) {
      setPriceGuidance(null);
      return;
    }
    let cancelled = false;
    setPriceGuidanceLoading(true);
    const params = new URLSearchParams({
      category,
      brand: effectiveBrand,
      model: model.trim(),
      condition,
    });
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
        } else setPriceGuidance(null);
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
  }, [category, brand, otherBrandName, model, condition, isStructured, effectiveBrand]);

  const photoSlots = useMemo(
    () =>
      getPhotoSlots({
        category,
        listingFormat: clubSpecs.listingFormat,
        wedgeLofts: clubSpecs.wedgeClubs.map((w) => w.degree).filter(Boolean),
      }),
    [category, clubSpecs.listingFormat, clubSpecs.wedgeClubs]
  );

  const goNextFromItem = () => {
    if (!category) {
      alert("Please select a category.");
      return;
    }
    track("category_selected", { category });
    if (brand === "Other" && !otherBrandName.trim()) {
      alert("Please enter the brand name.");
      return;
    }
    if (!effectiveBrand) {
      alert("Please select a brand.");
      return;
    }
    if (isClothing) {
      if (!itemType) {
        alert("Please select clothing type.");
        return;
      }
      if (!gender) {
        alert("Please select Men, Women, or Junior.");
        return;
      }
      if (!size) {
        alert("Please select size.");
        return;
      }
      setStep(2);
      return;
    }
    if (isAccessories) {
      if (!itemType) {
        alert("Please select item type.");
        return;
      }
      setStep(2);
      return;
    }
    if (!model.trim()) {
      alert("Please fill in Model.");
      return;
    }
    if (isGolfEquipment) {
      if (category === "Irons" || category === "Wedges") {
        if (clubSpecs.listingFormat !== "single" && clubSpecs.listingFormat !== "set") {
          alert("Please choose one club or a set.");
          return;
        }
      }
      if (category === "Wedges" && clubSpecs.listingFormat === "set") {
        const lofts = clubSpecs.wedgeClubs.map((w) => w.degree.trim()).filter(Boolean);
        if (lofts.length < 2) {
          alert("Add at least two wedge lofts so we can ask for each sole photo.");
          return;
        }
      }
      setStep(2);
      return;
    }
    setStep(2);
  };

  const goNextFromPhotos = () => {
    if (isGolfEquipment) {
      if (!guidedPhotosComplete(photoSlots, guidedPhotos)) {
        alert("Please add the required photos — it only takes a minute.");
        return;
      }
      setStep(3);
      return;
    }
    if (
      images.length < MIN_GENERIC_LISTING_IMAGES ||
      images.length > MAX_GENERIC_LISTING_IMAGES
    ) {
      alert(`Please upload ${MIN_GENERIC_LISTING_IMAGES}–${MAX_GENERIC_LISTING_IMAGES} images.`);
      return;
    }
    setStep(3);
  };

  const goNextFromClubDetails = () => {
    const validation = validateClubDetails(category, clubSpecs);
    if (validation) {
      setClubError(validation);
      return;
    }
    setClubError(null);
    track("required_specs_completed", { category });
    track("club_details_completed", { category });
    setStep(4);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGolfEquipment) {
      if (!guidedPhotosComplete(photoSlots, guidedPhotos)) {
        alert("Please add the required photos.");
        setStep(2);
        return;
      }
    } else if (
      images.length < MIN_GENERIC_LISTING_IMAGES ||
      images.length > MAX_GENERIC_LISTING_IMAGES
    ) {
      alert(`Please upload ${MIN_GENERIC_LISTING_IMAGES}–${MAX_GENERIC_LISTING_IMAGES} images.`);
      setStep(2);
      return;
    }
    if (!condition) {
      alert("Please select a condition.");
      return;
    }
    if (!price.trim() || Number.isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    if (isGolfEquipment) {
      const validation = validateClubDetails(category, clubSpecs);
      if (validation) {
        setClubError(validation);
        setStep(3);
        return;
      }
    }

    const title = titleOverride.trim() || autoTitle || undefined;
    const clubPayload = isGolfEquipment ? buildClubSpecsSubmitPayload(category, clubSpecs) : {};

    let listingDescription = description;
    setWritingCopy(true);
    try {
      const enhanceBody: Record<string, unknown> = isStructured
        ? {
            category,
            brand: effectiveBrand,
            condition,
            item_type: itemType,
            ...(isClothing
              ? {
                  size: size || undefined,
                  colour: colour.trim() || undefined,
                  gender: gender || undefined,
                }
              : { model: model.trim() || undefined }),
            description: description.trim() || undefined,
            title: title || undefined,
          }
        : {
            category,
            brand: effectiveBrand,
            model: model.trim(),
            condition,
            description: description.trim() || undefined,
            title: title || undefined,
            ...(isGolfEquipment
              ? {
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
                }
              : {}),
          };
      const enhanceRes = await fetch("/api/ai/enhance-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enhanceBody),
      });
      const enhanceData = await enhanceRes.json().catch(() => ({}));
      if (enhanceRes.ok && typeof enhanceData.description === "string" && enhanceData.description.trim()) {
        listingDescription = enhanceData.description.trim();
      }
    } catch {
      // Keep seller notes if AI is unavailable.
    } finally {
      setWritingCopy(false);
    }

    abandonedRef.current = true;
    track("listing_submitted", { category });
    track("seller_listing_completed");

    onSubmit({
      category,
      brand: effectiveBrand,
      ...(isStructured
        ? {
            model: null as string | null,
            item_type: itemType || null,
            size: isClothing ? size || null : null,
            colour: colour.trim() || null,
            gender: isClothing ? gender || null : null,
          }
        : { model: model.trim(), item_type: null, size: null, colour: null, gender: null }),
      condition,
      description: listingDescription,
      price,
      ...(title ? { title } : {}),
      ...(isGolfEquipment
        ? {
            shaft: clubPayload.shaft ?? undefined,
            degree: clubPayload.degree ?? undefined,
            shaftFlex: clubPayload.shaft_flex ?? undefined,
            lieAngle: clubPayload.lie_angle ?? undefined,
            clubLength: clubPayload.club_length ?? undefined,
            shaftWeight: clubPayload.shaft_weight ?? undefined,
            shaftMaterial: clubPayload.shaft_material ?? undefined,
            gripBrand: clubPayload.grip_brand ?? undefined,
            gripModel: clubPayload.grip_model ?? undefined,
            gripSize: clubPayload.grip_size ?? undefined,
            gripCondition: clubPayload.grip_condition ?? undefined,
            handed: clubPayload.handed,
            ...clubPayload,
          }
        : {}),
      images: isGolfEquipment ? flattenGuidedPhotos(photoSlots, guidedPhotos).map((r) => r.file!) : images,
      guidedPhotos: isGolfEquipment
        ? flattenGuidedPhotos(photoSlots, guidedPhotos).map((r) => ({ slot: r.slot, file: r.file! }))
        : undefined,
      hosel_serial_status: isGolfEquipment
        ? guidedPhotos.serialNotFound
          ? "not_found"
          : photoSlots.some((s) => s.serialHelp && guidedPhotos.filesBySlot[s.key])
            ? "uploaded"
            : "not_applicable"
        : null,
    });
  };

  const stepProgressUi = (
    <ListingWizardTimeline
      step={step}
      includeClubDetails={category ? isGolfEquipment : true}
    />
  );

  const lastStep = totalSteps;
  const priceStep = isGolfEquipment ? 4 : 3;
  const primaryCta =
    step === 1
      ? "Continue to photos →"
      : step === 2
        ? isGolfEquipment
          ? "Continue to club details →"
          : "Continue to condition & price →"
        : step === 3 && isGolfEquipment
          ? "Continue to condition & price →"
          : "List my club";

  const onPrimary = () => {
    if (step === 1) goNextFromItem();
    else if (step === 2) goNextFromPhotos();
    else if (step === 3 && isGolfEquipment) goNextFromClubDetails();
  };

  return (
    <form onSubmit={handleFinalSubmit} className="mt-8 space-y-6 pb-32">
      {stepProgressUi}

      {step === 1 ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-mowing-green mb-1">What are you selling?</h2>
            <p className="text-sm text-mowing-green/70">
              Category, brand, and model — so we can match the right photos and details.
            </p>
          </div>
          <div>
            <SearchableSelect
              options={[...categories]}
              value={category}
              onChange={(v) => {
                setCategory(v);
                setBrand("");
                setModel("");
                setCondition("");
                setItemType("");
                setGender("");
                setClubSpecs(emptyClubSpecsFormState());
                setGuidedPhotos({ filesBySlot: {}, extras: [], serialNotFound: false });
              }}
              placeholder="Select category"
              label="Category"
              required
            />
          </div>
          <div>
            <SearchableSelect
              options={brandsOptions}
              value={brand}
              onChange={(v) => {
                setBrand(v);
                setModel("");
                if (v !== "Other") setOtherBrandName("");
              }}
              placeholder="Select brand"
              label="Brand"
              required
              allowCustom={false}
            />
            {brand === "Other" ? (
              <input
                type="text"
                value={otherBrandName}
                onChange={(e) => setOtherBrandName(e.target.value)}
                placeholder="Enter brand name"
                className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
              />
            ) : null}
          </div>
          {isClothing ? (
            <>
              <div>
                <SearchableSelect
                  options={[...CLOTHING_TYPES]}
                  value={itemType}
                  onChange={setItemType}
                  placeholder="Select type"
                  label="Type"
                  required
                />
              </div>
              <div>
                <p className="text-sm font-medium text-mowing-green mb-2">
                  For <span className="text-par-3-punch">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {CLOTHING_GENDERS.map((g) => (
                    <FilterChip key={g} selected={gender === g} onClick={() => setGender(g)}>
                      {g}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div>
                <SearchableSelect
                  options={sizeOptions}
                  value={size}
                  onChange={setSize}
                  placeholder="Select size"
                  label="Size"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Colour</label>
                <input
                  type="text"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
                />
              </div>
            </>
          ) : null}
          {isAccessories ? (
            <div>
              <SearchableSelect
                options={[...ACCESSORY_ITEM_TYPES]}
                value={itemType}
                onChange={setItemType}
                placeholder="Select item type"
                label="Item type"
                required
              />
            </div>
          ) : null}
          {!isStructured && category ? (
            <div>
              <SearchableSelect
                ref={modelSelectRef}
                options={modelOptions}
                value={model}
                onChange={setModel}
                placeholder="Select or type model"
                label="Model"
                required
                allowCustom
              />
            </div>
          ) : null}
          {isGolfEquipment && (category === "Irons" || category === "Wedges") ? (
            <RadioCards
              label="What are you selling?"
              required
              value={clubSpecs.listingFormat}
              onChange={(v) => {
                setClubSpecs((prev) => ({
                  ...prev,
                  listingFormat: v,
                  wedgeClubs:
                    category === "Wedges" && v === "set" && prev.wedgeClubs.length === 0
                      ? [newWedgeClubDraft(), newWedgeClubDraft()]
                      : prev.wedgeClubs,
                }));
                if (category === "Wedges") {
                  track(v === "set" ? "wedge_set_selected" : "wedge_single_selected");
                }
              }}
              options={
                category === "Irons"
                  ? [
                      { value: "single", title: "Individual iron", description: "One iron only." },
                      { value: "set", title: "Iron set", description: "A matching set of irons." },
                    ]
                  : [
                      { value: "single", title: "One wedge", description: "A single wedge." },
                      { value: "set", title: "A set of wedges", description: "Multiple wedges as one listing." },
                    ]
              }
            />
          ) : null}
          {isGolfEquipment && category === "Wedges" && clubSpecs.listingFormat === "set" ? (
            <div>
              <p className="text-sm font-medium text-mowing-green mb-2">Wedge lofts *</p>
              <p className="text-xs text-mowing-green/65 mb-2">
                We&apos;ll ask for a sole photo of each loft.
              </p>
              {clubSpecs.wedgeClubs.map((w, index) => (
                <div key={w.clientId} className="mb-2">
                  <ChipGroup
                    label={`Wedge ${index + 1}`}
                    options={WEDGE_LOFT_OPTIONS}
                    value={WEDGE_LOFT_OPTIONS.some((o) => o.value === w.degree) ? w.degree : w.degree ? "Other" : ""}
                    onChange={(v) =>
                      setClubSpecs((prev) => ({
                        ...prev,
                        wedgeClubs: prev.wedgeClubs.map((c) =>
                          c.clientId === w.clientId ? { ...c, degree: v === "Other" ? c.degree : v } : c
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              {clubSpecs.wedgeClubs.length < WEDGE_SET_MAX ? (
                <button
                  type="button"
                  className="text-sm font-medium text-mowing-green underline"
                  onClick={() =>
                    setClubSpecs((prev) => ({
                      ...prev,
                      wedgeClubs: [...prev.wedgeClubs, newWedgeClubDraft()],
                    }))
                  }
                >
                  Add another wedge
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        isGolfEquipment ? (
          <GuidedPhotoStep
            category={category}
            listingFormat={clubSpecs.listingFormat}
            wedgeLofts={clubSpecs.wedgeClubs.map((w) => w.degree)}
            value={guidedPhotos}
            onChange={setGuidedPhotos}
          />
        ) : (
          <section>
            <h2 className="text-lg font-semibold text-mowing-green mb-1">Add photos</h2>
            <p className="text-sm text-mowing-green/70 mb-3">
              Add at least {MIN_GENERIC_LISTING_IMAGES} photos — more photos sell faster.
            </p>
            <ImageUpload
              min={MIN_GENERIC_LISTING_IMAGES}
              max={MAX_GENERIC_LISTING_IMAGES}
              value={images}
              onChange={setImages}
              variant="hero"
              slotLabels={["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5", "Photo 6"]}
            />
          </section>
        )
      ) : null}

      {step === 3 && isGolfEquipment ? (
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
      ) : null}

      {step === priceStep ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-mowing-green mb-1">Condition &amp; price</h2>
            <p className="text-sm text-mowing-green/70">Almost done — just the essentials.</p>
          </div>

          {isGolfEquipment && summaryLines.length > 0 ? (
            <div className="rounded-xl border border-mowing-green/20 bg-mowing-green/5 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-mowing-green/55 mb-1">
                Your listing
              </p>
              <p className="text-sm font-semibold text-mowing-green">
                {titleOverride.trim() || autoTitle}
              </p>
              <p className="text-sm text-mowing-green/70 mt-1">{summaryLines.join(" · ")}</p>
              <button
                type="button"
                className="mt-2 text-sm text-par-3-punch min-h-[44px]"
                onClick={() => {
                  setTitleEditing((v) => !v);
                  if (!titleOverride && autoTitle) setTitleOverride(autoTitle);
                }}
              >
                {titleEditing ? "Hide title edit" : "Edit listing title"}
              </button>
              {titleEditing ? (
                <input
                  type="text"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
                />
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">
              Condition <span className="text-par-3-punch">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((c) => (
                <FilterChip key={c} selected={condition === c} onClick={() => setCondition(c)}>
                  {CONDITION_LABELS[c] ?? c}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">
              Price (£) <span className="text-par-3-punch">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
              placeholder="0.00"
            />
            {priceGuidanceLoading ? (
              <p className="mt-1 text-xs text-mowing-green/55">Checking similar listings…</p>
            ) : priceGuidance ? (
              <p className="mt-1 text-xs text-mowing-green/70">
                Similar listings: £{(priceGuidance.minPence / 100).toFixed(0)}–£
                {(priceGuidance.maxPence / 100).toFixed(0)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">
              Anything else buyers should know?{" "}
              <span className="font-normal text-mowing-green/55">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Marks, damage, reason for selling, etc. We’ll write these into the listing description."
              className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
            <p className="mt-1 text-xs text-mowing-green/55">
              Teevo writes the listing description from your club details, any modifications, and these notes.
            </p>
          </div>

          {!isGolfEquipment ? (
            <div>
              <label className="block text-sm font-medium text-mowing-green mb-1">
                Title <span className="font-normal text-mowing-green/55">(optional)</span>
              </label>
              <input
                type="text"
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
                placeholder="Optional listing title"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {step > 1 ? (
        <button
          type="button"
          onClick={() => {
            if (step === priceStep && isGolfEquipment) setStep(3);
            else setStep((step - 1) as StepId);
          }}
          className="min-h-[44px] text-sm text-mowing-green/70"
        >
          ← Back
        </button>
      ) : null}

      {submitting && submitProgress ? <ListingSubmitLoading progress={submitProgress} /> : null}

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-mowing-green/15 bg-white/95 backdrop-blur px-4 pt-3 pb-3 safe-area-pb">
        <div className="mx-auto w-full max-w-xl">
          {step < lastStep ? (
            <button
              type="button"
              onClick={onPrimary}
              className="w-full min-h-[48px] rounded-xl bg-mowing-green text-white font-semibold"
            >
              {primaryCta}
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || writingCopy}
              className="w-full min-h-[48px] rounded-xl bg-mowing-green text-white font-semibold disabled:opacity-60"
            >
              {writingCopy ? "Writing listing…" : submitting ? "Listing…" : "List my club"}
            </button>
          )}
          <p className="mt-2 text-center text-xs text-mowing-green/50">
            By listing you agree to our{" "}
            <Link href="/terms" className="underline">
              terms
            </Link>
            .
          </p>
        </div>
      </div>
    </form>
  );
}
