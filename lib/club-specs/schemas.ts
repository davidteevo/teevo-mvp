import type {
  CustomisedAspect,
  ListingCategory,
  ListingFormat,
  StandardSpecStatus,
} from "@/types/database";
import { SPEC_UNKNOWN } from "./unknown";

export type ClubSpecFieldKey =
  | "handed"
  | "degree"
  | "shaft_flex"
  | "shaft"
  | "head_number"
  | "iron_number"
  | "set_composition"
  | "listing_format"
  | "bounce"
  | "grind"
  | "club_length"
  | "lie_angle"
  | "shaft_weight"
  | "shaft_material"
  | "grip_brand"
  | "grip_model"
  | "grip_size"
  | "grip_condition"
  | "standard_spec_status";

export type ChipOption = { value: string; label: string };

export type WoodClubLoftOption = {
  value: string;
  label: string;
  headNumber: string;
  degree: string;
};

export type IronSetPreset = {
  id: string;
  label: string;
  clubs: string[];
};

export type CategorySpecSchema = {
  category: ListingCategory;
  required: ClubSpecFieldKey[];
  recommended: ClubSpecFieldKey[];
  advanced: ClubSpecFieldKey[];
  supportsFormatChoice?: boolean;
  customisedAspects: CustomisedAspect[];
};

export const GOLF_EQUIPMENT_CATEGORIES: ListingCategory[] = [
  "Driver",
  "Woods",
  "Driving Irons",
  "Hybrids",
  "Irons",
  "Wedges",
  "Putter",
];

export function isGolfEquipmentCategory(category: string): boolean {
  return (GOLF_EQUIPMENT_CATEGORIES as string[]).includes(category);
}

export const SHAFT_FLEX_OPTIONS: ChipOption[] = [
  { value: "Ladies", label: "Ladies" },
  { value: "Senior", label: "Senior" },
  { value: "Regular", label: "Regular" },
  { value: "Stiff", label: "Stiff" },
  { value: "X-Stiff", label: "X-Stiff" },
  { value: "Other", label: "Other" },
];

export const DRIVER_LOFT_OPTIONS: ChipOption[] = [
  { value: "9", label: "9°" },
  { value: "10.5", label: "10.5°" },
  { value: "12", label: "12°" },
  { value: "Other", label: "Other" },
];

export const WEDGE_LOFT_OPTIONS: ChipOption[] = [
  { value: "46", label: "46°" },
  { value: "48", label: "48°" },
  { value: "50", label: "50°" },
  { value: "52", label: "52°" },
  { value: "54", label: "54°" },
  { value: "56", label: "56°" },
  { value: "58", label: "58°" },
  { value: "60", label: "60°" },
  { value: "Other", label: "Other" },
];

export const PUTTER_LENGTH_OPTIONS: ChipOption[] = [
  { value: '33"', label: '33"' },
  { value: '34"', label: '34"' },
  { value: '35"', label: '35"' },
  { value: '36"', label: '36"' },
  { value: "Other", label: "Other" },
];

/** Length vs stock spec — used when selling (not the club's measured length). */
export const CLUB_LENGTH_ADJUST_OPTIONS: ChipOption[] = [
  { value: '-1"', label: '-1"' },
  { value: '-0.5"', label: '-0.5"' },
  { value: "Standard", label: "Standard" },
  { value: '+0.5"', label: '+0.5"' },
  { value: '+1"', label: '+1"' },
  { value: "Other", label: "Other" },
];

export const HEADCOVER_CATEGORIES = ["Woods", "Hybrids", "Putter"] as const;

export function categoryAsksHeadcover(category: string): boolean {
  return (HEADCOVER_CATEGORIES as readonly string[]).includes(category);
}

export const IRON_NUMBER_OPTIONS: ChipOption[] = [
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "PW", label: "PW" },
  { value: "GW", label: "GW" },
];

export const WOOD_CLUB_LOFT_OPTIONS: WoodClubLoftOption[] = [
  { value: "3-15", label: "3 Wood — 15°", headNumber: "3", degree: "15" },
  { value: "5-18", label: "5 Wood — 18°", headNumber: "5", degree: "18" },
  { value: "7-21", label: "7 Wood — 21°", headNumber: "7", degree: "21" },
  { value: "Other", label: "Other", headNumber: "", degree: "" },
];

export const HYBRID_CLUB_LOFT_OPTIONS: WoodClubLoftOption[] = [
  { value: "3-19", label: "3 Hybrid — 19°", headNumber: "3", degree: "19" },
  { value: "4-22", label: "4 Hybrid — 22°", headNumber: "4", degree: "22" },
  { value: "5-25", label: "5 Hybrid — 25°", headNumber: "5", degree: "25" },
  { value: "Other", label: "Other", headNumber: "", degree: "" },
];

export const DRIVING_IRON_CLUB_LOFT_OPTIONS: WoodClubLoftOption[] = [
  { value: "2-18", label: "2 Iron — 18°", headNumber: "2", degree: "18" },
  { value: "3-21", label: "3 Iron — 21°", headNumber: "3", degree: "21" },
  { value: "4-24", label: "4 Iron — 24°", headNumber: "4", degree: "24" },
  { value: "Other", label: "Other", headNumber: "", degree: "" },
];

export const IRON_SET_PRESETS: IronSetPreset[] = [
  { id: "4-pw", label: "4–PW", clubs: ["4", "5", "6", "7", "8", "9", "PW"] },
  { id: "5-pw", label: "5–PW", clubs: ["5", "6", "7", "8", "9", "PW"] },
  { id: "6-pw", label: "6–PW", clubs: ["6", "7", "8", "9", "PW"] },
  { id: "5-pw-gw", label: "5–PW + GW", clubs: ["5", "6", "7", "8", "9", "PW", "GW"] },
  { id: "custom", label: "Custom", clubs: [] },
];

export const CUSTOMISED_ASPECT_OPTIONS: { value: CustomisedAspect; label: string }[] = [
  { value: "shaft", label: "Shaft" },
  { value: "length", label: "Length" },
  { value: "loft_lie", label: "Loft / Lie" },
  { value: "grip", label: "Grip" },
  { value: "other", label: "Other" },
];

export const WEDGE_SET_MAX = 6;

export const LIE_ANGLE_OPTIONS: ChipOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "1° upright", label: "1° upright" },
  { value: "1° flat", label: "1° flat" },
  { value: "2° upright", label: "2° upright" },
  { value: "2° flat", label: "2° flat" },
  { value: "Other", label: "Other" },
];

export const SHAFT_MATERIAL_OPTIONS: ChipOption[] = [
  { value: "Graphite", label: "Graphite" },
  { value: "Steel", label: "Steel" },
];

export const GRIP_SIZE_OPTIONS: ChipOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "Midsize", label: "Midsize" },
  { value: "Oversize", label: "Oversize" },
];

const COMMON_ASPECTS: CustomisedAspect[] = ["shaft", "length", "loft_lie", "grip", "other"];

const SCHEMAS: Record<string, CategorySpecSchema> = {
  Driver: {
    category: "Driver",
    required: ["handed", "degree", "shaft_flex"],
    recommended: ["shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    customisedAspects: COMMON_ASPECTS,
  },
  Woods: {
    category: "Woods",
    required: ["handed", "head_number", "degree", "shaft_flex"],
    recommended: ["shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    customisedAspects: COMMON_ASPECTS,
  },
  Hybrids: {
    category: "Hybrids",
    required: ["handed", "head_number", "degree", "shaft_flex"],
    recommended: ["shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    customisedAspects: COMMON_ASPECTS,
  },
  "Driving Irons": {
    category: "Driving Irons",
    required: ["handed", "head_number", "degree", "shaft_flex"],
    recommended: ["shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    customisedAspects: COMMON_ASPECTS,
  },
  Irons: {
    category: "Irons",
    required: ["handed", "listing_format", "shaft_flex"],
    recommended: ["shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    supportsFormatChoice: true,
    customisedAspects: COMMON_ASPECTS,
  },
  Wedges: {
    category: "Wedges",
    required: ["handed", "listing_format", "degree"],
    recommended: ["bounce", "grind", "shaft_flex", "shaft"],
    advanced: ["club_length", "lie_angle", "shaft_weight", "shaft_material", "grip_brand", "grip_model", "grip_size", "grip_condition"],
    supportsFormatChoice: true,
    customisedAspects: COMMON_ASPECTS,
  },
  Putter: {
    category: "Putter",
    required: ["handed", "club_length"],
    recommended: [],
    advanced: ["grip_brand", "grip_model", "grip_size", "grip_condition", "lie_angle"],
    customisedAspects: ["length", "loft_lie", "grip", "other"],
  },
};

export function getCategorySpecSchema(category: string): CategorySpecSchema | null {
  return SCHEMAS[category] ?? null;
}

export function getClubLoftOptions(category: string): WoodClubLoftOption[] {
  if (category === "Woods") return WOOD_CLUB_LOFT_OPTIONS;
  if (category === "Hybrids") return HYBRID_CLUB_LOFT_OPTIONS;
  if (category === "Driving Irons") return DRIVING_IRON_CLUB_LOFT_OPTIONS;
  return WOOD_CLUB_LOFT_OPTIONS;
}

export type WedgeClubDraft = {
  clientId: string;
  degree: string;
  bounce: string;
  grind: string;
};

export type ClubSpecsFormState = {
  handed: "" | "left" | "right";
  listingFormat: ListingFormat | "";
  degree: string;
  degreeOther: string;
  shaftFlex: string;
  shaftFlexOther: string;
  shaft: string;
  shaftUnknown: boolean;
  headNumber: string;
  clubLoftKey: string;
  ironNumber: string;
  setComposition: string[];
  setCompositionPreset: string;
  bounce: string;
  bounceUnknown: boolean;
  grind: string;
  grindUnknown: boolean;
  clubLength: string;
  clubLengthOther: string;
  lieAngle: string;
  lieAngleOther: string;
  shaftWeight: string;
  shaftMaterial: string;
  gripBrand: string;
  gripModel: string;
  gripSize: string;
  gripCondition: string;
  headcoverIncluded: "" | "yes" | "no";
  standardSpecStatus: StandardSpecStatus | "";
  customisedAspects: CustomisedAspect[];
  customisedOtherNote: string;
  wedgeClubs: WedgeClubDraft[];
  advancedOpen: boolean;
  editingWedgeId: string | null;
};

export function emptyClubSpecsFormState(): ClubSpecsFormState {
  return {
    handed: "",
    listingFormat: "",
    degree: "",
    degreeOther: "",
    shaftFlex: "",
    shaftFlexOther: "",
    shaft: "",
    shaftUnknown: false,
    headNumber: "",
    clubLoftKey: "",
    ironNumber: "",
    setComposition: [],
    setCompositionPreset: "",
    bounce: "",
    bounceUnknown: false,
    grind: "",
    grindUnknown: false,
    clubLength: "",
    clubLengthOther: "",
    lieAngle: "",
    lieAngleOther: "",
    shaftWeight: "",
    shaftMaterial: "",
    gripBrand: "",
    gripModel: "",
    gripSize: "",
    gripCondition: "",
    headcoverIncluded: "",
    standardSpecStatus: "",
    customisedAspects: [],
    customisedOtherNote: "",
    wedgeClubs: [],
    advancedOpen: false,
    editingWedgeId: null,
  };
}

export function resolveDegree(state: ClubSpecsFormState): string | null {
  if (state.degree === "Other") return state.degreeOther.trim() || null;
  return state.degree.trim() || null;
}

export function resolveShaftFlex(state: ClubSpecsFormState): string | null {
  if (state.shaftFlex === "Other") return state.shaftFlexOther.trim() || null;
  return state.shaftFlex.trim() || null;
}

export function resolveShaft(state: ClubSpecsFormState): string | null {
  if (state.shaftUnknown) return SPEC_UNKNOWN;
  return state.shaft.trim() || null;
}

export function resolveBounce(state: ClubSpecsFormState): string | null {
  if (state.bounceUnknown) return SPEC_UNKNOWN;
  return state.bounce.trim() || null;
}

export function resolveGrind(state: ClubSpecsFormState): string | null {
  if (state.grindUnknown) return SPEC_UNKNOWN;
  return state.grind.trim() || null;
}

export function resolveClubLength(state: ClubSpecsFormState): string | null {
  if (state.clubLength === "Other") return state.clubLengthOther.trim() || null;
  return state.clubLength.trim() || null;
}

export function resolveLieAngle(state: ClubSpecsFormState): string | null {
  if (state.lieAngle === "Other") return state.lieAngleOther.trim() || null;
  return state.lieAngle.trim() || null;
}

export type ClubDetailsValidationError = { field: string; message: string };

export function validateClubDetails(
  category: string,
  state: ClubSpecsFormState
): ClubDetailsValidationError | null {
  const schema = getCategorySpecSchema(category);
  if (!schema) return null;

  if (!state.handed) {
    return { field: "handed", message: "Select right handed or left handed." };
  }

  if (category === "Driver") {
    const loft = resolveDegree(state);
    if (!loft) return { field: "degree", message: "Select the loft of your driver." };
    if (!resolveShaftFlex(state)) return { field: "shaft_flex", message: "Select the shaft flex." };
  }

  if (category === "Woods" || category === "Hybrids" || category === "Driving Irons") {
    if (state.clubLoftKey === "Other") {
      if (!state.headNumber.trim() || !resolveDegree(state)) {
        return { field: "club_loft", message: "Enter the club and loft." };
      }
    } else if (!state.clubLoftKey) {
      return { field: "club_loft", message: "Select the club / loft." };
    }
    if (!resolveShaftFlex(state)) return { field: "shaft_flex", message: "Select the shaft flex." };
  }

  if (category === "Irons") {
    if (!state.listingFormat) {
      return { field: "listing_format", message: "Select individual iron or iron set." };
    }
    if (state.listingFormat === "single" && !state.ironNumber) {
      return { field: "iron_number", message: "Select which iron." };
    }
    if (state.listingFormat === "set" && state.setComposition.length === 0) {
      return { field: "set_composition", message: "Select what's included in the set." };
    }
    if (!resolveShaftFlex(state)) return { field: "shaft_flex", message: "Select the shaft flex." };
  }

  if (category === "Wedges") {
    if (!state.listingFormat) {
      return { field: "listing_format", message: "Select one wedge or a set of wedges." };
    }
    if (state.listingFormat === "single") {
      if (!resolveDegree(state)) return { field: "degree", message: "Select the loft of your wedge." };
    } else {
      if (state.wedgeClubs.length === 0) {
        return { field: "wedge_clubs", message: "Add at least one wedge to the set." };
      }
      for (let i = 0; i < state.wedgeClubs.length; i++) {
        if (!state.wedgeClubs[i].degree.trim()) {
          return { field: `wedge_${i}`, message: `Add the loft for Wedge ${i + 1}.` };
        }
      }
    }
  }

  if (category === "Putter") {
    if (!resolveClubLength(state)) {
      return { field: "club_length", message: "Select the putter length." };
    }
  }

  if (!state.standardSpecStatus) {
    return { field: "standard_spec_status", message: "Tell us if this club is standard spec." };
  }

  if (state.standardSpecStatus === "customised") {
    if (state.customisedAspects.length === 0) {
      return { field: "customised_aspects", message: "Select what's different." };
    }
    if (state.customisedAspects.includes("other") && !state.customisedOtherNote.trim()) {
      return { field: "customised_other_note", message: "Briefly describe what's different." };
    }
  }

  return null;
}
