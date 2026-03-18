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

// GET /api/club-specs/shafts
// Returns: string[] of options to store in listings.shaft
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "shafts-catalogue.csv");
    const text = await readFile(filePath, "utf8");
    const rows = parseCsv(text);
    if (rows.length <= 1) return NextResponse.json([]);

    // Header: Brand,Model,Release Year
    const options = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const brand = row[0] ?? "";
      const model = row[1] ?? "";
      if (!brand || !model) continue;
      options.add(`${brand} ${model}`);
    }

    return NextResponse.json(Array.from(options).sort((a, b) => a.localeCompare(b)));
  } catch (e) {
    console.error("[club-specs/shafts] error:", e);
    return NextResponse.json({ error: "Failed to load shafts catalogue" }, { status: 500 });
  }
}

