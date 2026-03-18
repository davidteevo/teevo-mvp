/**
 * Club catalogue: parses data/club-catalogue.csv (or legacy Club-Catalogue.csv)
 * and exposes brands/models by category for the listing form. Server-side only.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

const CATALOGUE_FILENAMES = ["club-catalogue.csv", "Club-Catalogue.csv"] as const;

/**
 * Map CSV "Club Type / Category" values to app sell-form categories
 * (Driver, Woods, Driving Irons, Hybrids, Irons, Wedges, Putter).
 */
const CATEGORY_MAP: Record<string, string> = {
  Driver: "Driver",
  Irons: "Irons",
  Wedge: "Wedges",
  Wedges: "Wedges",
  Putter: "Putter",
  Hybrid: "Hybrids",
  Hybrids: "Hybrids",
  "Fairway Wood": "Woods",
  "Fairway Woods": "Woods",
  Wood: "Woods",
  Woods: "Woods",
  "Utility / Driving Iron": "Driving Irons",
  "Driving Iron": "Driving Irons",
  "Driving Irons": "Driving Irons",
};

export type ClubCatalogue = {
  brandsByCategory: Record<string, string[]>;
  modelsByCategoryAndBrand: Record<string, Record<string, string[]>>;
};

function normalizeCategory(csvCategory: string): string {
  return CATEGORY_MAP[csvCategory?.trim()] ?? csvCategory?.trim() ?? "";
}

/**
 * Parse club catalogue CSV and return structure for the form.
 * Call from Server Components or API routes only.
 */
export function getClubCatalogue(): ClubCatalogue {
  const dataDir = path.join(process.cwd(), "data");
  const csvPath = CATALOGUE_FILENAMES.map((name) => path.join(dataDir, name)).find((p) =>
    existsSync(p)
  );
  let raw: string;
  try {
    raw = csvPath ? readFileSync(csvPath, "utf-8") : "";
  } catch {
    return { brandsByCategory: {}, modelsByCategoryAndBrand: {} };
  }
  if (!raw) return { brandsByCategory: {}, modelsByCategoryAndBrand: {} };

  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { brandsByCategory: {}, modelsByCategoryAndBrand: {} };

  const header = lines[0].split(",").map((h) => h.trim());
  const categoryIdx = header.findIndex(
    (h) => h === "Club Type / Category" || h.toLowerCase() === "category"
  );
  const brandIdx = header.findIndex((h) => h === "Brand" || h.toLowerCase() === "brand");
  const modelIdx = header.findIndex((h) => h === "Model" || h.toLowerCase() === "model");

  if (categoryIdx < 0 || brandIdx < 0 || modelIdx < 0) {
    return { brandsByCategory: {}, modelsByCategoryAndBrand: {} };
  }

  const brandsByCategory: Record<string, Set<string>> = {};
  const modelsByCategoryAndBrand: Record<string, Record<string, Set<string>>> = {};

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const csvCat = parts[categoryIdx];
    const category = normalizeCategory(csvCat);
    const brand = parts[brandIdx] ?? "";
    const model = parts[modelIdx] ?? "";
    if (!category || !brand || !model) continue;

    if (!brandsByCategory[category]) brandsByCategory[category] = new Set();
    brandsByCategory[category].add(brand);

    if (!modelsByCategoryAndBrand[category]) {
      modelsByCategoryAndBrand[category] = {};
    }
    if (!modelsByCategoryAndBrand[category][brand]) {
      modelsByCategoryAndBrand[category][brand] = new Set();
    }
    modelsByCategoryAndBrand[category][brand].add(model);
  }

  const toArray = (r: Record<string, Set<string>>) =>
    Object.fromEntries(
      Object.entries(r).map(([k, set]) => [k, Array.from(set).sort()] as const)
    );
  const toArrayNested = (
    r: Record<string, Record<string, Set<string>>>
  ): Record<string, Record<string, string[]>> =>
    Object.fromEntries(
      Object.entries(r).map(([cat, byBrand]) => [
        cat,
        Object.fromEntries(
          Object.entries(byBrand).map(([b, set]) => [b, Array.from(set).sort()] as const)
        ),
      ] as const)
    );

  return {
    brandsByCategory: toArray(brandsByCategory),
    modelsByCategoryAndBrand: toArrayNested(modelsByCategoryAndBrand),
  };
}
