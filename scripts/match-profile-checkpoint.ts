/**
 * Representative golfer-profile checkpoint runner for Phase 2D quality gates.
 * Usage:
 *   npx tsx scripts/match-profile-checkpoint.ts --label=A [--out=path.json]
 *   npx tsx scripts/match-profile-checkpoint.ts --label=B --out=...
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  loadHeadConfigOverlay,
  loadMatchIntelligence,
  runCatalogueRecommendation,
} from "../lib/match";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

/** 24 representative admin-preview profiles (handedness always RIGHT for determinism). */
export const PROFILE_FIXTURES: Record<string, Record<string, unknown>> = {
  beginner_forgiveness: {
    handedness: "RIGHT",
    handicap: 28,
    club_speed_mph: 78,
    typical_trajectory: "LOW",
    typical_start_direction: "RIGHT",
    typical_curvature: "RIGHT",
    miss_severity: "LARGE",
    strike_pattern: "HEEL",
    strike_consistency: "LOW",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "LOW",
  },
  high_handicap_slice: {
    handedness: "RIGHT",
    handicap: 22,
    club_speed_mph: 85,
    typical_trajectory: "MID",
    typical_start_direction: "LEFT",
    typical_curvature: "RIGHT",
    miss_severity: "LARGE",
    strike_pattern: "CENTRE",
    strike_consistency: "LOW",
    primary_objective: "REDUCE_RIGHT_MISS",
    current_club_satisfaction: "LOW",
  },
  mid_handicap_distance: {
    handedness: "RIGHT",
    handicap: 14,
    club_speed_mph: 95,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  mid_handicap_hook: {
    handedness: "RIGHT",
    handicap: 12,
    club_speed_mph: 98,
    typical_trajectory: "HIGH",
    typical_start_direction: "RIGHT",
    typical_curvature: "LEFT",
    miss_severity: "MODERATE",
    strike_pattern: "TOE",
    strike_consistency: "MEDIUM",
    primary_objective: "REDUCE_LEFT_MISS",
    current_club_satisfaction: "MEDIUM",
  },
  low_handicap_workability: {
    handedness: "RIGHT",
    handicap: 4,
    club_speed_mph: 110,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "VARIABLE",
    miss_severity: "SMALL",
    strike_pattern: "CENTRE",
    strike_consistency: "HIGH",
    primary_objective: "CONTROL",
    current_club_satisfaction: "HIGH",
  },
  low_handicap_low_spin: {
    handedness: "RIGHT",
    handicap: 2,
    club_speed_mph: 115,
    typical_trajectory: "LOW",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "SMALL",
    strike_pattern: "CENTRE",
    strike_consistency: "HIGH",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  faster_swing_high_flight: {
    handedness: "RIGHT",
    handicap: 8,
    club_speed_mph: 108,
    typical_trajectory: "HIGH",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  slower_swing_high_launch: {
    handedness: "RIGHT",
    handicap: 20,
    club_speed_mph: 72,
    typical_trajectory: "LOW",
    typical_start_direction: "RIGHT",
    typical_curvature: "RIGHT",
    miss_severity: "LARGE",
    strike_pattern: "HEEL",
    strike_consistency: "LOW",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "LOW",
  },
  rich_right_miss: {
    handedness: "RIGHT",
    handicap: 10,
    club_speed_mph: 95,
    typical_trajectory: "MID",
    typical_start_direction: "RIGHT",
    typical_curvature: "RIGHT",
    miss_severity: "LARGE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "UNKNOWN",
    budget_max_gbp: 250,
  },
  borderline_forgiveness: {
    handedness: "RIGHT",
    handicap: 18,
    club_speed_mph: 92,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "VARIABLE",
    miss_severity: "MODERATE",
    strike_pattern: "HEEL",
    strike_consistency: "LOW",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "LOW",
  },
  incomplete_launch: {
    handedness: "RIGHT",
    handicap: 16,
    club_speed_mph: 90,
    typical_trajectory: "UNKNOWN",
    typical_start_direction: "RIGHT",
    typical_curvature: "RIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  sparse_incomplete: {
    handedness: "RIGHT",
    handicap: 14,
    typical_trajectory: "UNKNOWN",
    typical_start_direction: "UNKNOWN",
    typical_curvature: "UNKNOWN",
    miss_severity: "UNKNOWN",
    strike_pattern: "UNKNOWN",
    strike_consistency: "UNKNOWN",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "UNKNOWN",
  },
  sparse_handedness_only: {
    handedness: "RIGHT",
  },
  mid_fade_bias: {
    handedness: "RIGHT",
    handicap: 11,
    club_speed_mph: 96,
    typical_trajectory: "MID",
    typical_start_direction: "LEFT",
    typical_curvature: "RIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "REDUCE_RIGHT_MISS",
    current_club_satisfaction: "MEDIUM",
  },
  senior_slower: {
    handedness: "RIGHT",
    handicap: 24,
    club_speed_mph: 68,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "RIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "MEDIUM",
  },
  strong_draw_assist: {
    handedness: "RIGHT",
    handicap: 19,
    club_speed_mph: 88,
    typical_trajectory: "MID",
    typical_start_direction: "RIGHT",
    typical_curvature: "RIGHT",
    miss_severity: "LARGE",
    strike_pattern: "HEEL",
    strike_consistency: "LOW",
    primary_objective: "REDUCE_RIGHT_MISS",
    current_club_satisfaction: "LOW",
  },
  mid_control: {
    handedness: "RIGHT",
    handicap: 9,
    club_speed_mph: 102,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "SMALL",
    strike_pattern: "CENTRE",
    strike_consistency: "HIGH",
    primary_objective: "CONTROL",
    current_club_satisfaction: "HIGH",
  },
  high_ball_flight: {
    handedness: "RIGHT",
    handicap: 15,
    club_speed_mph: 93,
    typical_trajectory: "HIGH",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  low_ball_flight: {
    handedness: "RIGHT",
    handicap: 7,
    club_speed_mph: 105,
    typical_trajectory: "LOW",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "SMALL",
    strike_pattern: "CENTRE",
    strike_consistency: "HIGH",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  toe_miss_moderate: {
    handedness: "RIGHT",
    handicap: 13,
    club_speed_mph: 94,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "LEFT",
    miss_severity: "MODERATE",
    strike_pattern: "TOE",
    strike_consistency: "MEDIUM",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "MEDIUM",
  },
  distance_seeker_unknown_satisfaction: {
    handedness: "RIGHT",
    handicap: 17,
    club_speed_mph: 91,
    typical_trajectory: "MID",
    typical_start_direction: "RIGHT",
    typical_curvature: "STRAIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "UNKNOWN",
  },
  inconsistent_strike: {
    handedness: "RIGHT",
    handicap: 21,
    club_speed_mph: 82,
    typical_trajectory: "UNKNOWN",
    typical_start_direction: "VARIABLE",
    typical_curvature: "VARIABLE",
    miss_severity: "LARGE",
    strike_pattern: "VARIABLE",
    strike_consistency: "LOW",
    primary_objective: "FORGIVENESS",
    current_club_satisfaction: "LOW",
  },
  mid_handicap_carry_hint: {
    handedness: "RIGHT",
    handicap: 12,
    club_speed_mph: 97,
    carry_distance_yards: 230,
    typical_trajectory: "MID",
    typical_start_direction: "CENTRE",
    typical_curvature: "STRAIGHT",
    miss_severity: "MODERATE",
    strike_pattern: "CENTRE",
    strike_consistency: "MEDIUM",
    primary_objective: "DISTANCE",
    current_club_satisfaction: "MEDIUM",
  },
  rich_left_start: {
    handedness: "RIGHT",
    handicap: 6,
    club_speed_mph: 107,
    typical_trajectory: "MID",
    typical_start_direction: "LEFT",
    typical_curvature: "LEFT",
    miss_severity: "SMALL",
    strike_pattern: "CENTRE",
    strike_consistency: "HIGH",
    primary_objective: "CONTROL",
    current_club_satisfaction: "HIGH",
  },
};

function parseArgs(argv: string[]) {
  const out: { label: string; outPath: string; applyUk: boolean } = {
    label: "checkpoint",
    outPath: "",
    applyUk: false,
  };
  for (const a of argv) {
    if (a.startsWith("--label=")) out.label = a.slice("--label=".length);
    if (a.startsWith("--out=")) out.outPath = a.slice("--out=".length);
    if (a === "--uk") out.applyUk = true;
  }
  if (!out.outPath) {
    out.outPath = path.join(
      process.cwd(),
      "docs/teevo-match/validation",
      `phase2d-profile-checkpoint-${out.label}.json`
    );
  }
  return out;
}

async function main() {
  const { label, outPath, applyUk } = parseArgs(process.argv.slice(2));
  const intel = loadMatchIntelligence(REFERENCE);
  const configOverlay = loadHeadConfigOverlay(REFERENCE, intel);

  const rows = Object.entries(PROFILE_FIXTURES).map(([id, answers]) => {
    const result = runCatalogueRecommendation({
      answers,
      intelligence: intel,
      headConfigOverlay: configOverlay,
      skipUkMarketGate: !applyUk,
    });
    return {
      profile_id: id,
      mode: result.mode,
      reason: result.audit.insufficient_evidence_reason,
      named_count: result.recommendations.length,
      heads: result.recommendations.map((r) => ({
        catalogue_key: r.catalogue_key,
        display_name: r.display_name,
        fit: r.catalogue_fit_score,
        band: r.catalogue_match_band,
        confidence: r.head_recommendation_confidence,
        active_dims: r.active_catalogue_dim_count,
        release_year: r.release_year,
      })),
      audit: {
        qualifying_heads: result.audit.qualifying_heads,
        qualifying_families_after_dedupe:
          result.audit.qualifying_families_after_dedupe,
        top_tied_family_count: result.audit.top_tied_family_count,
        top_tied_max_active_dims: result.audit.top_tied_max_active_dims,
        top_tied_min_active_dims: result.audit.top_tied_min_active_dims,
        family_duplicates_suppressed: result.audit.family_duplicates_suppressed,
        heads_held_config_overlay: result.audit.heads_held_config_overlay,
        heads_held_uk_market: result.audit.heads_held_uk_market,
        heads_uk_market_eligible: result.audit.heads_uk_market_eligible,
      },
      versions: result.versions,
    };
  });

  const payload = {
    checkpoint: label,
    generated_at: new Date().toISOString(),
    profile_count: rows.length,
    named_profile_count: rows.filter((r) => r.mode === "NAMED_HEADS").length,
    guidance_profile_count: rows.filter(
      (r) => r.mode === "CHARACTERISTIC_GUIDANCE"
    ).length,
    no_defensible_count: rows.filter((r) => r.mode === "NO_DEFENSIBLE_HEADS")
      .length,
    rows,
  };

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        checkpoint: label,
        out: outPath,
        named: payload.named_profile_count,
        guidance: payload.guidance_profile_count,
        no_defensible: payload.no_defensible_count,
      },
      null,
      2
    )
  );
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("match-profile-checkpoint.ts") ||
    process.argv[1].endsWith("match-profile-checkpoint.js") ||
    process.argv[1].includes("match-profile-checkpoint"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
