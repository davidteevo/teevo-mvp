/**
 * Brand suggestions for listing filters (datalist). Aggregates club, clothing,
 * shaft & grip CSVs plus legacy names. Server-side only.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { canonicalFilterBrand } from "@/lib/brand-canonical";
import { getClubCatalogue } from "@/lib/club-catalogue";
import { getClothingBrands } from "@/lib/clothing-brands";

const LEGACY_FILTER_BRANDS = [
  "Titleist",
  "Callaway",
  "TaylorMade",
  "Ping",
  "Cobra",
  "Mizuno",
  "Srixon",
  "Wilson",
  "Other",
  "Nike",
  "Adidas",
  "FootJoy",
  "Lululemon",
  "Peter Millar",
  "RLX Ralph Lauren",
  "J.Lindeberg",
  "TravisMathew",
  "Puma",
  "Under Armour",
  "Bushnell",
  "Garmin",
  "Shot Scope",
  "Scotty Cameron",
];

function brandsFromCsvColumn(filename: string, columnHeader: string): string[] {
  const csvPath = path.join(process.cwd(), "data", filename);
  if (!existsSync(csvPath)) return [];
  let raw: string;
  try {
    raw = readFileSync(csvPath, "utf-8");
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = header.findIndex((h) => h.toLowerCase() === columnHeader.toLowerCase());
  if (idx < 0) return [];
  const brands = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const brand = lines[i].split(",").map((p) => p.trim())[idx] ?? "";
    if (brand) brands.add(brand);
  }
  return Array.from(brands);
}

export function getFilterBrands(): string[] {
  const set = new Set<string>();
  const add = (b: string) => {
    const c = canonicalFilterBrand(b);
    if (c) set.add(c);
  };
  for (const b of LEGACY_FILTER_BRANDS) add(b);
  const club = getClubCatalogue();
  for (const list of Object.values(club.brandsByCategory)) {
    for (const b of list) add(b);
  }
  for (const b of getClothingBrands()) add(b);
  for (const b of brandsFromCsvColumn("shafts-catalogue.csv", "Brand")) add(b);
  for (const b of brandsFromCsvColumn("grips-catalogue.csv", "Brand")) add(b);
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
