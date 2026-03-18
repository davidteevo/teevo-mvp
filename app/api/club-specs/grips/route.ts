import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      // Escaped quote
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line).map((s) => s.trim()));
}

export const dynamic = "force-dynamic";

// GET /api/club-specs/grips
// Returns: { brands: string[], modelsByBrand: Record<brand, string[]> }
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "grips-catalogue.csv");
    const text = await readFile(filePath, "utf8");
    const rows = parseCsv(text);
    if (rows.length <= 1) {
      return NextResponse.json({ brands: [], modelsByBrand: {} });
    }

    // Header: Brand,Model
    const modelsByBrand: Record<string, Set<string>> = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const brand = row[0] ?? "";
      const model = row[1] ?? "";
      if (!brand || !model) continue;
      if (!modelsByBrand[brand]) modelsByBrand[brand] = new Set();
      modelsByBrand[brand].add(model);
    }

    const brands = Object.keys(modelsByBrand).sort((a, b) => a.localeCompare(b));
    const modelsByBrandOut: Record<string, string[]> = {};
    for (const b of brands) {
      modelsByBrandOut[b] = Array.from(modelsByBrand[b]).sort((a, c) => a.localeCompare(c));
    }

    return NextResponse.json({ brands, modelsByBrand: modelsByBrandOut });
  } catch (e) {
    console.error("[club-specs/grips] error:", e);
    return NextResponse.json({ error: "Failed to load grips catalogue" }, { status: 500 });
  }
}

