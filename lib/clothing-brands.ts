/**
 * Clothing brands: parses data/clothing-catalogue.csv and returns brand names
 * for the listing form. Server-side only (uses Node fs).
 */

import { readFileSync } from "fs";
import path from "path";
import { CLOTHING_BRANDS } from "@/lib/listing-categories";

/**
 * Read data/clothing-catalogue.csv and return an array of brand names.
 * Supports header line (e.g. "Brand Name" or "Brand"); first column is used.
 * Call from Server Components or API routes only.
 */
export function getClothingBrands(): string[] {
  const csvPath = path.join(process.cwd(), "data", "clothing-catalogue.csv");
  let raw: string;
  try {
    raw = readFileSync(csvPath, "utf-8");
  } catch {
    return [...CLOTHING_BRANDS];
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [...CLOTHING_BRANDS];

  const header = lines[0].toLowerCase();
  const looksLikeHeaderRow = (s: string) =>
    ["brand", "brand name", "name", "brandname"].includes(s.toLowerCase().trim());
  const firstCol = (line: string) => line.split(",").map((p) => p.trim())[0] ?? "";
  const startIdx = header.includes("brand") || header.includes("name") ? 1 : 0;
  const brands = new Set<string>();
  for (let i = startIdx; i < lines.length; i++) {
    const name = firstCol(lines[i]);
    if (name && !looksLikeHeaderRow(name)) brands.add(name);
  }

  if (brands.size === 0) return [...CLOTHING_BRANDS];
  return Array.from(brands).sort();
}
