/**
 * Phase 2E.2 diagnostic only — counterfactual clarification study.
 * Does not change production Match behaviour.
 *
 * Usage:
 *   npx tsx scripts/phase2e2-recovery-study.ts
 *   npx tsx scripts/phase2e2-recovery-study.ts --out=docs/teevo-match/validation/phase2e2-recovery-matrix.json
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  countEvidenceBackedCatalogueRequirementDims,
  countResolvedCatalogueRequirementDims,
  loadMatchIntelligence,
  normalizeRequirements,
  runCatalogueRecommendation,
} from "../lib/match";
import { PROFILE_FIXTURES } from "./match-profile-checkpoint";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

const GUIDANCE_PROFILES = [
  "sparse_handedness_only",
  "sparse_incomplete",
  "inconsistent_strike",
  "mid_handicap_distance",
  "mid_handicap_carry_hint",
] as const;

type Patch = Record<string, unknown>;

type Scenario = {
  id: string;
  label: string;
  /** Fields changed relative to baseline (counterfactual answers). */
  patch: Patch;
  questions: string[];
};

function summarizeResult(
  answers: Record<string, unknown>,
  intel: ReturnType<typeof loadMatchIntelligence>
) {
  const result = runCatalogueRecommendation({
    answers,
    intelligence: intel,
    inventory: [],
  });
  const req = result.normalised_requirements;
  const conf = req.requirement_confidence;
  return {
    mode: result.mode,
    reason: result.audit.insufficient_evidence_reason,
    resolved_dims: countResolvedCatalogueRequirementDims(req),
    evidence_backed_dims: countEvidenceBackedCatalogueRequirementDims(req),
    directional_target: req.directional_target_numeric,
    directional_requirement: req.directional_requirement,
    head_launch_target: req.head_launch_target,
    head_launch_numeric: req.head_launch_target_numeric,
    forgiveness: req.forgiveness_requirement,
    stability: req.stability_requirement,
    workability: req.workability_preference,
    launch_sources: conf?.head_launch?.source_codes ?? [],
    launch_band: conf?.head_launch?.band ?? null,
    direction_sources: conf?.direction?.source_codes ?? [],
    direction_band: conf?.direction?.band ?? null,
    qualifying_heads: result.audit.qualifying_heads,
    qualifying_families: result.audit.qualifying_families_after_dedupe,
    top_tied_family_count: result.audit.top_tied_family_count,
    top_tied_min_active_dims: result.audit.top_tied_min_active_dims,
    top_tied_max_active_dims: result.audit.top_tied_max_active_dims,
    heads_uk_market_eligible: result.audit.heads_uk_market_eligible,
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
    guidance_notes_head: result.characteristic_guidance.notes.slice(0, 2),
  };
}

function scenariosFor(profileId: string): Scenario[] {
  switch (profileId) {
    case "sparse_handedness_only":
      return [
        {
          id: "speed_only",
          label: "One Q: club_speed_mph=95",
          questions: ["club_speed_mph"],
          patch: { club_speed_mph: 95 },
        },
        {
          id: "handicap_only",
          label: "One Q: handicap=14",
          questions: ["handicap"],
          patch: { handicap: 14 },
        },
        {
          id: "objective_forgiveness",
          label: "One Q: primary_objective=FORGIVENESS",
          questions: ["primary_objective"],
          patch: { primary_objective: "FORGIVENESS" },
        },
        {
          id: "trajectory_mid",
          label: "One Q: typical_trajectory=MID",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "MID" },
        },
        {
          id: "curve_right",
          label: "One Q: typical_curvature=RIGHT",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "RIGHT" },
        },
        {
          id: "min_intake_a",
          label: "Min intake: handicap+speed+objective DISTANCE",
          questions: ["handicap", "club_speed_mph", "primary_objective"],
          patch: {
            handicap: 14,
            club_speed_mph: 95,
            primary_objective: "DISTANCE",
          },
        },
        {
          id: "min_intake_b",
          label: "Min intake: handicap+speed+traj MID+objective DISTANCE",
          questions: [
            "handicap",
            "club_speed_mph",
            "typical_trajectory",
            "primary_objective",
          ],
          patch: {
            handicap: 14,
            club_speed_mph: 95,
            typical_trajectory: "MID",
            primary_objective: "DISTANCE",
          },
        },
        {
          id: "min_intake_c",
          label: "Min intake + direction REDUCE_RIGHT_MISS",
          questions: [
            "handicap",
            "club_speed_mph",
            "typical_trajectory",
            "primary_objective",
          ],
          patch: {
            handicap: 14,
            club_speed_mph: 95,
            typical_trajectory: "MID",
            primary_objective: "REDUCE_RIGHT_MISS",
          },
        },
        {
          id: "min_intake_full_slice",
          label: "Credible intake: speed+hcp+traj+curve+objective",
          questions: [
            "handicap",
            "club_speed_mph",
            "typical_trajectory",
            "typical_curvature",
            "primary_objective",
          ],
          patch: {
            handicap: 18,
            club_speed_mph: 88,
            typical_trajectory: "MID",
            typical_curvature: "RIGHT",
            primary_objective: "FORGIVENESS",
          },
        },
      ];
    case "sparse_incomplete":
      return [
        {
          id: "speed",
          label: "One Q: club_speed_mph=95",
          questions: ["club_speed_mph"],
          patch: { club_speed_mph: 95 },
        },
        {
          id: "traj_high",
          label: "One Q: typical_trajectory=HIGH",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "HIGH" },
        },
        {
          id: "traj_unknown",
          label: "One Q: typical_trajectory=UNKNOWN (no change)",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "UNKNOWN" },
        },
        {
          id: "curve_right",
          label: "One Q: typical_curvature=RIGHT",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "RIGHT" },
        },
        {
          id: "curve_unknown",
          label: "One Q: typical_curvature=UNKNOWN",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "UNKNOWN" },
        },
        {
          id: "start_right",
          label: "One Q: typical_start_direction=RIGHT",
          questions: ["typical_start_direction"],
          patch: { typical_start_direction: "RIGHT" },
        },
        {
          id: "obj_reduce_right",
          label: "One Q: primary_objective=REDUCE_RIGHT_MISS",
          questions: ["primary_objective"],
          patch: { primary_objective: "REDUCE_RIGHT_MISS" },
        },
        {
          id: "obj_higher_flight",
          label: "One Q: primary_objective=HIGHER_FLIGHT",
          questions: ["primary_objective"],
          patch: { primary_objective: "HIGHER_FLIGHT" },
        },
        {
          id: "strike_heel",
          label: "One Q: strike_pattern=HEEL",
          questions: ["strike_pattern"],
          patch: { strike_pattern: "HEEL" },
        },
        {
          id: "two_speed_curve",
          label: "Two Q: speed=95 + curvature=RIGHT",
          questions: ["club_speed_mph", "typical_curvature"],
          patch: { club_speed_mph: 95, typical_curvature: "RIGHT" },
        },
        {
          id: "two_speed_traj",
          label: "Two Q: speed=95 + trajectory=HIGH",
          questions: ["club_speed_mph", "typical_trajectory"],
          patch: { club_speed_mph: 95, typical_trajectory: "HIGH" },
        },
        {
          id: "two_speed_reduce",
          label: "Two Q: speed=95 + REDUCE_RIGHT_MISS",
          questions: ["club_speed_mph", "primary_objective"],
          patch: {
            club_speed_mph: 95,
            primary_objective: "REDUCE_RIGHT_MISS",
          },
        },
        {
          id: "two_traj_curve",
          label: "Two Q: trajectory=MID + curvature=RIGHT",
          questions: ["typical_trajectory", "typical_curvature"],
          patch: {
            typical_trajectory: "MID",
            typical_curvature: "RIGHT",
          },
        },
      ];
    case "inconsistent_strike":
      return [
        {
          id: "traj_high",
          label: "One Q: typical_trajectory=HIGH",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "HIGH" },
        },
        {
          id: "traj_low",
          label: "One Q: typical_trajectory=LOW",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "LOW" },
        },
        {
          id: "traj_mid",
          label: "One Q: typical_trajectory=MID",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "MID" },
        },
        {
          id: "traj_unknown",
          label: "One Q: typical_trajectory=UNKNOWN",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "UNKNOWN" },
        },
        {
          id: "curve_right",
          label: "One Q: typical_curvature=RIGHT (was VARIABLE)",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "RIGHT" },
        },
        {
          id: "curve_left",
          label: "One Q: typical_curvature=LEFT",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "LEFT" },
        },
        {
          id: "curve_straight",
          label: "One Q: typical_curvature=STRAIGHT",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "STRAIGHT" },
        },
        {
          id: "start_right",
          label: "One Q: typical_start_direction=RIGHT",
          questions: ["typical_start_direction"],
          patch: { typical_start_direction: "RIGHT" },
        },
        {
          id: "obj_reduce_right",
          label: "One Q: primary_objective=REDUCE_RIGHT_MISS",
          questions: ["primary_objective"],
          patch: { primary_objective: "REDUCE_RIGHT_MISS" },
        },
        {
          id: "strike_heel",
          label: "One Q: strike_pattern=HEEL (was VARIABLE)",
          questions: ["strike_pattern"],
          patch: { strike_pattern: "HEEL" },
        },
        {
          id: "two_traj_curve",
          label: "Two Q: trajectory=MID + curvature=RIGHT",
          questions: ["typical_trajectory", "typical_curvature"],
          patch: {
            typical_trajectory: "MID",
            typical_curvature: "RIGHT",
          },
        },
        {
          id: "two_traj_reduce",
          label: "Two Q: trajectory=HIGH + REDUCE_RIGHT_MISS",
          questions: ["typical_trajectory", "primary_objective"],
          patch: {
            typical_trajectory: "HIGH",
            primary_objective: "REDUCE_RIGHT_MISS",
          },
        },
        {
          id: "two_curve_heel",
          label: "Two Q: curvature=RIGHT + strike=HEEL",
          questions: ["typical_curvature", "strike_pattern"],
          patch: {
            typical_curvature: "RIGHT",
            strike_pattern: "HEEL",
          },
        },
      ];
    case "mid_handicap_distance":
    case "mid_handicap_carry_hint":
      return [
        {
          id: "curve_right",
          label: "One Q: typical_curvature=RIGHT (was STRAIGHT)",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "RIGHT" },
        },
        {
          id: "curve_left",
          label: "One Q: typical_curvature=LEFT",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "LEFT" },
        },
        {
          id: "curve_unknown",
          label: "One Q: typical_curvature=UNKNOWN",
          questions: ["typical_curvature"],
          patch: { typical_curvature: "UNKNOWN" },
        },
        {
          id: "start_right",
          label: "One Q: typical_start_direction=RIGHT",
          questions: ["typical_start_direction"],
          patch: { typical_start_direction: "RIGHT" },
        },
        {
          id: "start_left",
          label: "One Q: typical_start_direction=LEFT",
          questions: ["typical_start_direction"],
          patch: { typical_start_direction: "LEFT" },
        },
        {
          id: "obj_reduce_right",
          label: "One Q: primary_objective=REDUCE_RIGHT_MISS",
          questions: ["primary_objective"],
          patch: { primary_objective: "REDUCE_RIGHT_MISS" },
        },
        {
          id: "obj_reduce_left",
          label: "One Q: primary_objective=REDUCE_LEFT_MISS",
          questions: ["primary_objective"],
          patch: { primary_objective: "REDUCE_LEFT_MISS" },
        },
        {
          id: "obj_forgiveness",
          label: "One Q: primary_objective=FORGIVENESS",
          questions: ["primary_objective"],
          patch: { primary_objective: "FORGIVENESS" },
        },
        {
          id: "obj_higher_flight",
          label: "One Q: primary_objective=HIGHER_FLIGHT",
          questions: ["primary_objective"],
          patch: { primary_objective: "HIGHER_FLIGHT" },
        },
        {
          id: "obj_control",
          label: "One Q: primary_objective=CONTROL",
          questions: ["primary_objective"],
          patch: { primary_objective: "CONTROL" },
        },
        {
          id: "traj_high",
          label: "One Q: typical_trajectory=HIGH (was MID)",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "HIGH" },
        },
        {
          id: "traj_low",
          label: "One Q: typical_trajectory=LOW",
          questions: ["typical_trajectory"],
          patch: { typical_trajectory: "LOW" },
        },
        {
          id: "strike_heel",
          label: "One Q: strike_pattern=HEEL",
          questions: ["strike_pattern"],
          patch: { strike_pattern: "HEEL" },
        },
        {
          id: "consistency_low",
          label: "One Q: strike_consistency=LOW",
          questions: ["strike_consistency"],
          patch: { strike_consistency: "LOW" },
        },
        {
          id: "two_curve_heel",
          label: "Two Q: curvature=RIGHT + strike=HEEL",
          questions: ["typical_curvature", "strike_pattern"],
          patch: {
            typical_curvature: "RIGHT",
            strike_pattern: "HEEL",
          },
        },
        {
          id: "two_traj_curve",
          label: "Two Q: trajectory=HIGH + curvature=RIGHT",
          questions: ["typical_trajectory", "typical_curvature"],
          patch: {
            typical_trajectory: "HIGH",
            typical_curvature: "RIGHT",
          },
        },
        {
          id: "two_reduce_heel",
          label: "Two Q: REDUCE_RIGHT_MISS + strike=HEEL",
          questions: ["primary_objective", "strike_pattern"],
          patch: {
            primary_objective: "REDUCE_RIGHT_MISS",
            strike_pattern: "HEEL",
          },
        },
      ];
    default:
      return [];
  }
}

function parseOut(argv: string[]): string {
  for (const a of argv) {
    if (a.startsWith("--out=")) return a.slice("--out=".length);
  }
  return path.join(
    process.cwd(),
    "docs/teevo-match/validation/phase2e2-recovery-matrix.json"
  );
}

function main() {
  const outPath = parseOut(process.argv.slice(2));
  const intel = loadMatchIntelligence(REFERENCE);

  const profiles = GUIDANCE_PROFILES.map((profileId) => {
    const baselineAnswers = {
      ...(PROFILE_FIXTURES[profileId] as Record<string, unknown>),
    };
    const baseline = summarizeResult(baselineAnswers, intel);
    const req = normalizeRequirements(baselineAnswers, intel.headsByKey);

    const scenarios = scenariosFor(profileId).map((s) => {
      const answers = { ...baselineAnswers, ...s.patch };
      const outcome = summarizeResult(answers, intel);
      return {
        ...s,
        answers_applied: s.patch,
        outcome,
        recovered_named: outcome.mode === "NAMED_HEADS",
        blocker_cleared:
          baseline.reason !== outcome.reason ||
          (baseline.mode !== "NAMED_HEADS" && outcome.mode === "NAMED_HEADS"),
      };
    });

    const oneQ = scenarios.filter((s) => s.questions.length === 1);
    const twoQ = scenarios.filter((s) => s.questions.length === 2);
    const multiQ = scenarios.filter((s) => s.questions.length >= 3);

    return {
      profile_id: profileId,
      baseline_answers: baselineAnswers,
      baseline_requirements_snapshot: {
        directional_requirement: req.directional_requirement,
        directional_target_numeric: req.directional_target_numeric,
        head_launch_target: req.head_launch_target,
        head_launch_target_numeric: req.head_launch_target_numeric,
        forgiveness_requirement: req.forgiveness_requirement,
        stability_requirement: req.stability_requirement,
        workability_preference: req.workability_preference,
        evidence_backed_dims: countEvidenceBackedCatalogueRequirementDims(req),
        resolved_dims: countResolvedCatalogueRequirementDims(req),
        direction_confidence: req.requirement_confidence?.direction,
        head_launch_confidence: req.requirement_confidence?.head_launch,
      },
      baseline,
      scenarios,
      summary: {
        one_question_named_count: oneQ.filter((s) => s.recovered_named).length,
        one_question_total: oneQ.length,
        two_question_named_count: twoQ.filter((s) => s.recovered_named).length,
        two_question_total: twoQ.length,
        multi_question_named_count: multiQ.filter((s) => s.recovered_named)
          .length,
        recovering_one_q_ids: oneQ
          .filter((s) => s.recovered_named)
          .map((s) => s.id),
        recovering_two_q_ids: twoQ
          .filter((s) => s.recovered_named)
          .map((s) => s.id),
        recovering_multi_ids: multiQ
          .filter((s) => s.recovered_named)
          .map((s) => s.id),
      },
    };
  });

  const payload = {
    study: "PHASE_2E2_RECOMMENDATION_RECOVERY",
    generated_at: new Date().toISOString(),
    engine: "runCatalogueRecommendation (production path, UK gate on)",
    note: "Counterfactual answers are testing scenarios, not golfer claims.",
    profiles,
  };

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        out: outPath,
        profiles: profiles.map((p) => ({
          id: p.profile_id,
          baseline_mode: p.baseline.mode,
          baseline_reason: p.baseline.reason,
          tied: p.baseline.top_tied_family_count,
          min_dims: p.baseline.top_tied_min_active_dims,
          one_q_recoveries: p.summary.recovering_one_q_ids,
          two_q_recoveries: p.summary.recovering_two_q_ids,
          multi_recoveries: p.summary.recovering_multi_ids,
        })),
      },
      null,
      2
    )
  );
}

main();
