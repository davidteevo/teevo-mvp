import type {
  CustomisedAspect,
  Listing,
  ListingCategory,
  ListingFormat,
  SpecProvenanceMap,
  StandardSpecStatus,
} from "@/types/database";
import {
  type ClubSpecsFormState,
  type WedgeClubDraft,
  emptyClubSpecsFormState,
  IRON_SET_PRESETS,
  PUTTER_LENGTH_OPTIONS,
  CLUB_LENGTH_ADJUST_OPTIONS,
  resolveBounce,
  resolveClubLength,
  resolveDegree,
  resolveGrind,
  resolveLieAngle,
  resolveShaft,
  resolveShaftFlex,
} from "./schemas";
import { SPEC_UNKNOWN } from "./unknown";

export type ListingClubPayload = {
  sort_order: number;
  club_type: string;
  iron_number?: string | null;
  degree?: string | null;
  bounce?: string | null;
  grind?: string | null;
  shaft?: string | null;
  shaft_flex?: string | null;
  spec_provenance?: SpecProvenanceMap;
};

export type ClubSpecsSubmitPayload = {
  handed?: "left" | "right";
  listing_format?: ListingFormat | null;
  iron_number?: string | null;
  set_composition?: string[] | null;
  degree?: string | null;
  head_number?: string | null;
  shaft?: string | null;
  shaft_flex?: string | null;
  bounce?: string | null;
  grind?: string | null;
  lie_angle?: string | null;
  club_length?: string | null;
  shaft_weight?: string | null;
  shaft_material?: string | null;
  grip_brand?: string | null;
  grip_model?: string | null;
  grip_size?: string | null;
  grip_condition?: string | null;
  standard_spec_status?: StandardSpecStatus | null;
  customised_aspects?: CustomisedAspect[] | null;
  customised_other_note?: string | null;
  spec_provenance?: SpecProvenanceMap;
  clubs?: ListingClubPayload[];
  headcover_included?: boolean | null;
};

function sellerProvenance(fields: string[]): SpecProvenanceMap {
  const map: SpecProvenanceMap = {};
  for (const key of fields) {
    map[key] = { source: "seller", confidence: "confirmed" };
  }
  return map;
}

export function buildClubSpecsSubmitPayload(
  category: string,
  state: ClubSpecsFormState
): ClubSpecsSubmitPayload {
  const provenanceFields: string[] = [];
  const payload: ClubSpecsSubmitPayload = {};

  if (state.handed) {
    payload.handed = state.handed;
    provenanceFields.push("handed");
  }

  if (state.standardSpecStatus) {
    payload.standard_spec_status = state.standardSpecStatus;
    provenanceFields.push("standard_spec_status");
  }

  if (state.standardSpecStatus === "customised") {
    payload.customised_aspects = state.customisedAspects;
    payload.customised_other_note = state.customisedOtherNote.trim() || null;
  } else {
    payload.customised_aspects = null;
    payload.customised_other_note = null;
  }

  const degree = resolveDegree(state);
  const shaftFlex = resolveShaftFlex(state);
  const shaft = resolveShaft(state);
  const bounce = resolveBounce(state);
  const grind = resolveGrind(state);
  const clubLength = resolveClubLength(state);
  const lieAngle = resolveLieAngle(state);

  if (category === "Driver") {
    payload.listing_format = "single";
    if (degree) {
      payload.degree = degree;
      provenanceFields.push("degree");
    }
    if (shaftFlex) {
      payload.shaft_flex = shaftFlex;
      provenanceFields.push("shaft_flex");
    }
    if (shaft) {
      payload.shaft = shaft;
      provenanceFields.push("shaft");
    }
  }

  if (category === "Woods" || category === "Hybrids" || category === "Driving Irons") {
    payload.listing_format = "single";
    if (state.headNumber) {
      payload.head_number = state.headNumber;
      provenanceFields.push("head_number");
    }
    if (degree) {
      payload.degree = degree;
      provenanceFields.push("degree");
    }
    if (shaftFlex) {
      payload.shaft_flex = shaftFlex;
      provenanceFields.push("shaft_flex");
    }
    if (shaft) {
      payload.shaft = shaft;
      provenanceFields.push("shaft");
    }
  }

  if (category === "Irons") {
    payload.listing_format = state.listingFormat || "single";
    if (state.listingFormat === "single") {
      payload.iron_number = state.ironNumber || null;
      payload.set_composition = null;
      if (state.ironNumber) provenanceFields.push("iron_number");
    } else {
      payload.iron_number = null;
      payload.set_composition = state.setComposition.length ? state.setComposition : null;
      if (state.setComposition.length) provenanceFields.push("set_composition");
    }
    if (shaftFlex) {
      payload.shaft_flex = shaftFlex;
      provenanceFields.push("shaft_flex");
    }
    if (shaft) {
      payload.shaft = shaft;
      provenanceFields.push("shaft");
    }
  }

  if (category === "Wedges") {
    payload.listing_format = state.listingFormat || "single";
    if (state.listingFormat === "set") {
      payload.degree = null;
      payload.bounce = null;
      payload.grind = null;
      payload.clubs = state.wedgeClubs.map((w, i) => {
        const club: ListingClubPayload = {
          sort_order: i,
          club_type: "wedge",
          degree: w.degree.trim() || null,
          bounce: w.bounce === SPEC_UNKNOWN ? SPEC_UNKNOWN : w.bounce.trim() || null,
          grind: w.grind === SPEC_UNKNOWN ? SPEC_UNKNOWN : w.grind.trim() || null,
          spec_provenance: sellerProvenance(
            ["degree", ...(w.bounce ? ["bounce"] : []), ...(w.grind ? ["grind"] : [])].filter(Boolean)
          ),
        };
        return club;
      });
      provenanceFields.push("listing_format");
    } else {
      payload.clubs = [];
      if (degree) {
        payload.degree = degree;
        provenanceFields.push("degree");
      }
      if (bounce) {
        payload.bounce = bounce;
        provenanceFields.push("bounce");
      }
      if (grind) {
        payload.grind = grind;
        provenanceFields.push("grind");
      }
    }
    if (shaftFlex) {
      payload.shaft_flex = shaftFlex;
      provenanceFields.push("shaft_flex");
    }
    if (shaft) {
      payload.shaft = shaft;
      provenanceFields.push("shaft");
    }
  }

  if (category === "Putter") {
    payload.listing_format = "single";
    if (clubLength) {
      payload.club_length = clubLength;
      provenanceFields.push("club_length");
    }
  }

  // Advanced / customised fields
  const showAdvanced =
    state.advancedOpen ||
    state.standardSpecStatus === "customised" ||
    category === "Putter";

  if (showAdvanced || state.standardSpecStatus === "customised") {
    const aspects = new Set(state.customisedAspects);
    const includeAllAdvanced = state.advancedOpen || state.standardSpecStatus !== "customised";

    if (includeAllAdvanced || aspects.has("length")) {
      if (clubLength && category !== "Putter") {
        payload.club_length = clubLength;
        provenanceFields.push("club_length");
      }
    }
    if (includeAllAdvanced || aspects.has("loft_lie")) {
      if (lieAngle) {
        payload.lie_angle = lieAngle;
        provenanceFields.push("lie_angle");
      }
      if (aspects.has("loft_lie") && degree && !payload.degree) {
        payload.degree = degree;
        provenanceFields.push("degree");
      }
    }
    if (includeAllAdvanced || aspects.has("shaft")) {
      if (shaft && !payload.shaft) {
        payload.shaft = shaft;
        provenanceFields.push("shaft");
      }
      if (shaftFlex && !payload.shaft_flex) {
        payload.shaft_flex = shaftFlex;
        provenanceFields.push("shaft_flex");
      }
      if (state.shaftWeight.trim()) {
        payload.shaft_weight = state.shaftWeight.trim();
        provenanceFields.push("shaft_weight");
      }
      if (state.shaftMaterial.trim()) {
        payload.shaft_material = state.shaftMaterial.trim();
        provenanceFields.push("shaft_material");
      }
    }
    if (includeAllAdvanced || aspects.has("grip")) {
      if (state.gripBrand.trim()) {
        payload.grip_brand = state.gripBrand.trim();
        provenanceFields.push("grip_brand");
      }
      if (state.gripModel.trim()) {
        payload.grip_model = state.gripModel.trim();
        provenanceFields.push("grip_model");
      }
      if (state.gripSize.trim()) {
        payload.grip_size = state.gripSize.trim();
        provenanceFields.push("grip_size");
      }
      if (state.gripCondition.trim()) {
        payload.grip_condition = state.gripCondition.trim();
        provenanceFields.push("grip_condition");
      }
    }
  }

  if (state.headcoverIncluded === "yes") {
    payload.headcover_included = true;
    provenanceFields.push("headcover_included");
  } else if (state.headcoverIncluded === "no") {
    payload.headcover_included = false;
    provenanceFields.push("headcover_included");
  }

  payload.spec_provenance = sellerProvenance(Array.from(new Set(provenanceFields)));
  return payload;
}

export function newWedgeClubDraft(partial?: Partial<WedgeClubDraft>): WedgeClubDraft {
  return {
    clientId: `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    degree: "",
    bounce: "",
    grind: "",
    ...partial,
  };
}

export type TitleBuildInput = {
  category: ListingCategory | string;
  brand: string;
  model?: string | null;
  handed?: "left" | "right" | null;
  degree?: string | null;
  shaft_flex?: string | null;
  shaft?: string | null;
  listing_format?: ListingFormat | null;
  iron_number?: string | null;
  set_composition?: string[] | null;
  head_number?: string | null;
  club_length?: string | null;
  standard_spec_status?: StandardSpecStatus | null;
  clubs?: { degree?: string | null }[];
};

function formatLoft(degree: string | null | undefined): string | null {
  if (!degree || degree === SPEC_UNKNOWN) return null;
  return degree.includes("°") ? degree : `${degree}°`;
}

function handedLabel(handed: "left" | "right" | null | undefined): string | null {
  if (handed === "right") return "Right Handed";
  if (handed === "left") return "Left Handed";
  return null;
}

export function buildListingTitleFromSpecs(input: TitleBuildInput): string {
  const brand = input.brand?.trim() || "";
  const model = input.model?.trim() || "";
  const base = [brand, model].filter(Boolean).join(" ").trim();
  const parts: string[] = [];

  if (input.category === "Wedges" && input.listing_format === "set") {
    const lofts = (input.clubs ?? [])
      .map((c) => formatLoft(c.degree ?? null))
      .filter(Boolean);
    const setLabel = base ? `${base} Wedge Set` : "Wedge Set";
    if (lofts.length) return `${setLabel} – ${lofts.join(" / ")}`;
    return setLabel;
  }

  if (input.category === "Irons" && input.listing_format === "set") {
    const comp = input.set_composition?.length ? input.set_composition.join("–") : null;
    const setLabel = base ? `${base} Iron Set` : "Iron Set";
    const bits = [setLabel];
    if (comp) bits.push(comp.includes("–") || comp.includes("-") ? comp : input.set_composition!.join(", "));
    if (input.shaft_flex && input.shaft_flex !== SPEC_UNKNOWN) bits.push(input.shaft_flex);
    if (handedLabel(input.handed)) bits.push(handedLabel(input.handed)!);
    return bits.join(" – ");
  }

  if (input.category === "Irons" && input.listing_format === "single" && input.iron_number) {
    parts.push(base ? `${base} ${input.iron_number} Iron` : `${input.iron_number} Iron`);
  } else if (input.category === "Putter") {
    parts.push(base ? `${base} Putter` : "Putter");
  } else if (input.category === "Driver") {
    parts.push(base ? `${base} Driver` : "Driver");
  } else if (input.category === "Wedges") {
    parts.push(base ? `${base} Wedge` : "Wedge");
  } else if (base) {
    parts.push(base);
  } else {
    parts.push(String(input.category || "Club"));
  }

  if (input.head_number && (input.category === "Woods" || input.category === "Hybrids")) {
    // already in base usually; loft still added below
  }

  const loft = formatLoft(input.degree);
  if (loft) parts.push(loft);
  if (input.shaft_flex && input.shaft_flex !== SPEC_UNKNOWN) parts.push(input.shaft_flex);
  const hand = handedLabel(input.handed);
  if (hand) parts.push(hand);
  if (input.category === "Putter" && input.club_length && input.club_length !== SPEC_UNKNOWN) {
    parts.push(input.club_length);
  }

  return parts.filter(Boolean).join(" – ");
}

export function buildListingSummaryLines(input: TitleBuildInput): string[] {
  const lines: string[] = [];
  const name = [input.brand, input.model].filter(Boolean).join(" ").trim();
  if (name) lines.push(name);
  if (input.category) lines.push(String(input.category));
  const hand = handedLabel(input.handed);
  if (hand) lines.push(hand);
  const loft = formatLoft(input.degree);
  if (loft) lines.push(loft);
  if (input.head_number) lines.push(`${input.head_number}`);
  if (input.iron_number) lines.push(`${input.iron_number} iron`);
  if (input.set_composition?.length) lines.push(input.set_composition.join(", "));
  if (input.listing_format === "set" && input.clubs?.length) {
    const lofts = input.clubs.map((c) => formatLoft(c.degree)).filter(Boolean);
    if (lofts.length) lines.push(lofts.join(" / "));
  }
  if (input.shaft && input.shaft !== SPEC_UNKNOWN) lines.push(input.shaft);
  if (input.shaft_flex && input.shaft_flex !== SPEC_UNKNOWN) lines.push(input.shaft_flex);
  if (input.club_length && input.club_length !== SPEC_UNKNOWN) lines.push(input.club_length);
  if (input.standard_spec_status === "standard") lines.push("Standard spec");
  if (input.standard_spec_status === "customised") lines.push("Customised");
  if (input.standard_spec_status === "unknown") lines.push("Spec unknown");
  return lines;
}

/** Hydrate form state from an existing listing (edit flow). Legacy listings may lack new fields. */
export function hydrateClubSpecsFromListing(listing: Partial<Listing> & {
  listing_clubs?: { degree?: string | null; bounce?: string | null; grind?: string | null }[];
}): ClubSpecsFormState {
  const state = emptyClubSpecsFormState();
  if (listing.handed === "left" || listing.handed === "right") state.handed = listing.handed;
  if (listing.listing_format === "single" || listing.listing_format === "set") {
    state.listingFormat = listing.listing_format;
  }
  if (listing.degree) {
    state.degree = listing.degree;
    state.degreeOther = listing.degree;
  }
  if (listing.shaft_flex) {
    state.shaftFlex = listing.shaft_flex;
    state.shaftFlexOther = listing.shaft_flex;
  }
  if (listing.shaft === SPEC_UNKNOWN) state.shaftUnknown = true;
  else if (listing.shaft) state.shaft = listing.shaft;
  if (listing.head_number) state.headNumber = listing.head_number;
  if (listing.iron_number) state.ironNumber = listing.iron_number;
  if (listing.set_composition?.length) {
    state.setComposition = listing.set_composition;
    const preset = IRON_SET_PRESETS.find(
      (p) =>
        p.id !== "custom" &&
        p.clubs.length === listing.set_composition!.length &&
        p.clubs.every((c, i) => c === listing.set_composition![i])
    );
    state.setCompositionPreset = preset?.id ?? "custom";
  }
  if (listing.bounce === SPEC_UNKNOWN) state.bounceUnknown = true;
  else if (listing.bounce) state.bounce = listing.bounce;
  if (listing.grind === SPEC_UNKNOWN) state.grindUnknown = true;
  else if (listing.grind) state.grind = listing.grind;
  if (listing.club_length) {
    const knownLength = [...PUTTER_LENGTH_OPTIONS, ...CLUB_LENGTH_ADJUST_OPTIONS].some(
      (o) => o.value === listing.club_length
    );
    if (knownLength && listing.club_length !== "Other") {
      state.clubLength = listing.club_length;
      state.clubLengthOther = "";
    } else {
      state.clubLength = "Other";
      state.clubLengthOther = listing.club_length;
    }
  }
  if (listing.lie_angle) {
    state.lieAngle = listing.lie_angle;
    state.lieAngleOther = listing.lie_angle;
  }
  if (listing.shaft_weight) state.shaftWeight = listing.shaft_weight;
  if (listing.shaft_material) state.shaftMaterial = listing.shaft_material;
  if (listing.grip_brand) state.gripBrand = listing.grip_brand;
  if (listing.grip_model) state.gripModel = listing.grip_model;
  if (listing.grip_size) state.gripSize = listing.grip_size;
  if (listing.grip_condition) state.gripCondition = listing.grip_condition;
  if (
    listing.standard_spec_status === "standard" ||
    listing.standard_spec_status === "customised" ||
    listing.standard_spec_status === "unknown"
  ) {
    state.standardSpecStatus = listing.standard_spec_status;
  }
  if (listing.customised_aspects?.length) {
    state.customisedAspects = listing.customised_aspects;
  }
  if (listing.customised_other_note) state.customisedOtherNote = listing.customised_other_note;
  if (listing.headcover_included === true) state.headcoverIncluded = "yes";
  if (listing.headcover_included === false) state.headcoverIncluded = "no";
  if (listing.listing_clubs?.length) {
    state.listingFormat = "set";
    state.wedgeClubs = listing.listing_clubs.map((c, i) =>
      newWedgeClubDraft({
        clientId: `existing-${i}`,
        degree: c.degree ?? "",
        bounce: c.bounce ?? "",
        grind: c.grind ?? "",
      })
    );
  }
  return state;
}
