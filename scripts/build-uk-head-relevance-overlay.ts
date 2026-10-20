/**
 * Generate MATCH_UK_HEAD_RELEVANCE_V1 from a UK_HEAD_RELEVANCE CSV export.
 *
 * Usage:
 *   npx tsx scripts/build-uk-head-relevance-overlay.ts \
 *     --csv=docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE.csv
 *
 * Fails closed on any catalogue_key mismatch vs repository heads.json,
 * duplicate keys, invalid enums, or market_code other than GB.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  deriveUkRecommendationEligibility,
  MATCH_UK_HEAD_RELEVANCE_VERSION,
  UK_MARKET_CODE_GB,
  UK_MARKET_REVIEW_STATES,
  UK_MARKET_STATUSES,
  type UkMarketReviewState,
  type UkMarketStatus,
} from "../lib/match/uk-head-relevance";
import { MATCH_HEADS_VERSION } from "../lib/match/versions";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);
const DEFAULT_CSV = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE.csv"
);
const OUT_JSON = path.join(REFERENCE, "uk-head-relevance.v1.json");
const OUT_REPORT = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE_RECONCILIATION.md"
);

function parseArgs(argv: string[]) {
  let csv = DEFAULT_CSV;
  for (const a of argv) {
    if (a.startsWith("--csv=")) csv = a.slice("--csv=".length);
  }
  return { csv };
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length < 2) throw new Error("CSV must include header + rows");
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      obj[header[i]] = (r[i] ?? "").trim();
    }
    return obj;
  });
}

function pick(
  row: Record<string, string>,
  names: string[]
): string | undefined {
  for (const n of names) {
    if (row[n] != null && row[n] !== "") return row[n];
  }
  // case-insensitive
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])
  );
  for (const n of names) {
    const v = lower[n.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function main() {
  const { csv } = parseArgs(process.argv.slice(2));
  const errors: string[] = [];

  const headsRaw = JSON.parse(
    readFileSync(path.join(REFERENCE, "heads.json"), "utf8")
  ) as unknown[][];
  const cols = headsRaw[0] as string[];
  const keyIdx = cols.indexOf("catalogue_key");
  const catIdx = cols.indexOf("category");
  const subtypeIdx = cols.indexOf("driver_subtype");
  const eligibleIdx = cols.indexOf("match_eligible");
  if (keyIdx < 0 || catIdx < 0) {
    throw new Error("heads.json missing catalogue_key/category columns");
  }

  const frozenDriverKeys = new Set<string>();
  const frozenStandardEligible = new Set<string>();
  const frozenSubtypeByKey = new Map<string, string>();
  const frozenReleaseYearByKey = new Map<string, string>();
  const yearIdx = cols.indexOf("release_year");
  for (const r of headsRaw.slice(1)) {
    const key = String(r[keyIdx] ?? "");
    if (!key) continue;
    if (String(r[catIdx] ?? "").toUpperCase() !== "DRIVER") continue;
    frozenDriverKeys.add(key);
    const subtype = String(r[subtypeIdx] ?? "").toUpperCase();
    const eligible = String(r[eligibleIdx] ?? "").toUpperCase();
    frozenSubtypeByKey.set(key, subtype);
    if (yearIdx >= 0) frozenReleaseYearByKey.set(key, String(r[yearIdx] ?? ""));
    if (subtype === "STANDARD" && eligible === "TRUE") {
      frozenStandardEligible.add(key);
    }
  }

  const csvText = readFileSync(csv, "utf8");
  const rows = parseCsv(csvText);
  const byKey = new Map<string, Record<string, string>>();

  for (const row of rows) {
    const catalogue_key = pick(row, [
      "catalogue_key",
      "Catalogue Key",
      "catalogueKey",
    ]);
    if (!catalogue_key) {
      errors.push(`CSV row missing catalogue_key: ${JSON.stringify(row)}`);
      continue;
    }
    if (byKey.has(catalogue_key)) {
      errors.push(`Duplicate catalogue_key in CSV: ${catalogue_key}`);
      continue;
    }
    byKey.set(catalogue_key, row);
  }

  Array.from(frozenDriverKeys).forEach((key) => {
    if (!byKey.has(key)) {
      errors.push(`Frozen DRIVER key missing from CSV: ${key}`);
    }
  });
  Array.from(byKey.keys()).forEach((key) => {
    if (!frozenDriverKeys.has(key)) {
      errors.push(`CSV catalogue_key absent from frozen DRIVER heads.json: ${key}`);
    }
  });

  const members = [];
  let established = 0;
  let observed = 0;
  let unverified = 0;
  let regionRestricted = 0;
  let reviewed = 0;
  let needsReview = 0;
  let notReviewed = 0;
  let eligiblePositiveReviewed = 0;
  let standardEligiblePositiveReviewed = 0;
  let standardEligiblePositiveReviewedAfterConfigHolds = 0;

  const CONFIG_HL_HOLDS = new Set([
    "ping|g430-max-hl|2023",
    "ping|g440-max-hl|2025",
    "ping|g440-k-hl|2026",
    "taylormade|qi10-max-hl|2024",
  ]);

  for (const key of Array.from(frozenDriverKeys).sort()) {
    const row = byKey.get(key);
    if (!row) continue;

    const market_code = pick(row, ["market_code", "Market Code", "marketCode"]);
    const statusRaw = pick(row, [
      "uk_market_status",
      "UK Market Status",
      "market_status",
      "uk_status",
    ]);
    const reviewRaw = pick(row, [
      "market_review_state",
      "Market Review State",
      "review_state",
      "uk_review_state",
    ]);
    const csvSubtype = pick(row, [
      "driver_subtype",
      "Driver Subtype",
      "subtype",
    ]);
    const csvYear = pick(row, ["release_year", "Release Year", "year"]);

    if (market_code !== UK_MARKET_CODE_GB) {
      errors.push(
        `${key}: market_code must be GB (register value); got ${JSON.stringify(
          market_code
        )}`
      );
      continue;
    }
    if (
      !statusRaw ||
      !(UK_MARKET_STATUSES as readonly string[]).includes(statusRaw)
    ) {
      errors.push(`${key}: invalid uk_market_status ${JSON.stringify(statusRaw)}`);
      continue;
    }
    if (
      !reviewRaw ||
      !(UK_MARKET_REVIEW_STATES as readonly string[]).includes(reviewRaw)
    ) {
      errors.push(
        `${key}: invalid market_review_state ${JSON.stringify(reviewRaw)}`
      );
      continue;
    }
    const frozenSubtype = frozenSubtypeByKey.get(key) ?? "";
    if (
      csvSubtype &&
      csvSubtype.toUpperCase() !== frozenSubtype &&
      // CSV may use same token; require exact case-insensitive match
      true
    ) {
      if (csvSubtype.toUpperCase() !== frozenSubtype) {
        errors.push(
          `${key}: driver_subtype mismatch CSV=${JSON.stringify(
            csvSubtype
          )} frozen=${JSON.stringify(frozenSubtype)}`
        );
      }
    }
    const frozenYear = frozenReleaseYearByKey.get(key) ?? "";
    if (csvYear != null && String(csvYear) !== String(frozenYear)) {
      errors.push(
        `${key}: release_year mismatch CSV=${JSON.stringify(
          csvYear
        )} frozen=${JSON.stringify(frozenYear)}`
      );
    }

    const uk_market_status = statusRaw as UkMarketStatus;
    const market_review_state = reviewRaw as UkMarketReviewState;
    const derived = deriveUkRecommendationEligibility(
      uk_market_status,
      market_review_state
    );

    if (uk_market_status === "UK_ESTABLISHED") established++;
    if (uk_market_status === "UK_OBSERVED") observed++;
    if (uk_market_status === "UK_UNVERIFIED") unverified++;
    if (uk_market_status === "REGION_RESTRICTED") regionRestricted++;
    if (market_review_state === "REVIEWED") reviewed++;
    if (market_review_state === "NEEDS_REVIEW") needsReview++;
    if (market_review_state === "NOT_REVIEWED") notReviewed++;
    if (derived.recommendation_eligible) {
      eligiblePositiveReviewed++;
      if (frozenStandardEligible.has(key)) {
        standardEligiblePositiveReviewed++;
        if (!CONFIG_HL_HOLDS.has(key)) {
          standardEligiblePositiveReviewedAfterConfigHolds++;
        }
      }
    }

    members.push({
      catalogue_key: key,
      market_code: UK_MARKET_CODE_GB,
      uk_market_status,
      market_review_state,
      recommendation_eligible: derived.recommendation_eligible,
      hold_reason: derived.hold_reason,
      evidence_class: derived.evidence_class,
    });
  }

  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error_count: errors.length,
          errors: errors.slice(0, 50),
          truncated: errors.length > 50,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const overlay = {
    overlay_version: MATCH_UK_HEAD_RELEVANCE_VERSION,
    intelligence_heads_ref: MATCH_HEADS_VERSION,
    source_register_ref: `UK_HEAD_RELEVANCE_CSV:${path.basename(csv)}`,
    members,
  };

  writeFileSync(OUT_JSON, JSON.stringify(overlay, null, 2) + "\n");

  const report = `# UK_HEAD_RELEVANCE reconciliation

Generated: ${new Date().toISOString()}
CSV: \`${csv}\`
Frozen DRIVER keys (heads.json): **${frozenDriverKeys.size}**
CSV matched keys: **${byKey.size}**
Overlay members: **${members.length}**

## Status counts

| Status | Count |
|---|---|
| UK_ESTABLISHED | ${established} |
| UK_OBSERVED | ${observed} |
| UK_UNVERIFIED | ${unverified} |
| REGION_RESTRICTED | ${regionRestricted} |

## Review state counts

| State | Count |
|---|---|
| REVIEWED | ${reviewed} |
| NEEDS_REVIEW | ${needsReview} |
| NOT_REVIEWED | ${notReviewed} |

## Eligibility intersection

| Metric | Count |
|---|---|
| recommendation_eligible (REVIEWED + ESTABLISHED/OBSERVED) | ${eligiblePositiveReviewed} |
| of which frozen STANDARD match_eligible=TRUE | ${standardEligiblePositiveReviewed} |
| after known HL config holds | ${standardEligiblePositiveReviewedAfterConfigHolds} |

Expected research snapshot targets: 186 ESTABLISHED, 225 OBSERVED, 207 UNVERIFIED, 1 REGION_RESTRICTED; 395 STANDARD+positive UK; 394 after known HL config holds.

market_code validated as **GB** for all rows (no silent rewrite).
driver_subtype and release_year reconciled against frozen heads.json.
`;

  mkdirSync(path.dirname(OUT_REPORT), { recursive: true });
  writeFileSync(OUT_REPORT, report);

  console.log(
    JSON.stringify(
      {
        ok: true,
        out_json: OUT_JSON,
        out_report: OUT_REPORT,
        frozen_driver_keys: frozenDriverKeys.size,
        members: members.length,
        established,
        observed,
        unverified,
        regionRestricted,
        reviewed,
        needsReview,
        notReviewed,
        eligiblePositiveReviewed,
        standardEligiblePositiveReviewed,
        standardEligiblePositiveReviewedAfterConfigHolds,
      },
      null,
      2
    )
  );
}

main();
