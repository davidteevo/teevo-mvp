/**
 * Phase 2E.3 — deterministic refinement question selection (admin preview).
 * Does not change Fit scoring. Prefer ball-flight fields; never silent overwrite
 * of legitimate STRAIGHT / VARIABLE / UNKNOWN or primary_objective.
 */
import type { CatalogueRecommendResult } from "../catalogue-types";
import { countEvidenceBackedCatalogueRequirementDims } from "../scoring/head-dimensions";
import type { NormalisedRequirements } from "../types";

export type RefinementPathway = "A" | "B" | "C" | "OPTIONAL_B" | "NONE";

export type RefinementQuestionId =
  | "typical_curvature_variable_clarify"
  | "typical_trajectory"
  | "typical_start_direction"
  | "typical_curvature_unknown"
  | "typical_curvature_straight_optional"
  | "primary_objective_miss_confirm";

export type RefinementQuestion = {
  id: RefinementQuestionId;
  fields: Array<
    | "typical_curvature"
    | "typical_start_direction"
    | "typical_trajectory"
    | "primary_objective"
  >;
  headline: string;
  prompt: string;
  requiresObjectiveConfirm?: boolean;
};

export type RefinementDecision =
  | { pathway: "A" | "NONE"; question: null }
  | { pathway: "B"; question: RefinementQuestion }
  | { pathway: "OPTIONAL_B"; question: RefinementQuestion }
  | { pathway: "C"; question: null };

/** Context for optional post-recovery refine (not used for initial Pathway A). */
export type SelectRefinementOptions = {
  recoveredNamedViaRefinement?: boolean;
  optionalRefineDismissed?: boolean;
  skipped?: boolean;
};

export const REFINEMENT_MAX_B_STEPS = 2;

function upper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function startIsDirectional(start: string): boolean {
  return start === "LEFT" || start === "RIGHT";
}

function trajResolved(traj: string): boolean {
  return traj === "LOW" || traj === "MID" || traj === "HIGH";
}

function isMissReduction(obj: string): boolean {
  return obj === "REDUCE_RIGHT_MISS" || obj === "REDUCE_LEFT_MISS";
}

function directionNeutralOrUnresolved(req: NormalisedRequirements): boolean {
  if (req.directional_target_numeric == null) return true;
  return req.directional_target_numeric === 0;
}

function launchUnresolved(req: NormalisedRequirements): boolean {
  return (
    req.head_launch_target === "UNRESOLVED" ||
    req.head_launch_target_numeric == null
  );
}

const QUESTIONS: Record<RefinementQuestionId, RefinementQuestion> = {
  typical_curvature_variable_clarify: {
    id: "typical_curvature_variable_clarify",
    fields: ["typical_curvature"],
    headline: "We've found several drivers that could suit your game",
    prompt:
      "You said your miss goes both ways. Is one pattern more common, or do you still miss both ways?",
  },
  typical_trajectory: {
    id: "typical_trajectory",
    fields: ["typical_trajectory"],
    headline: "We've found several drivers that could suit your game",
    prompt: "What is your typical driver ball flight?",
  },
  typical_start_direction: {
    id: "typical_start_direction",
    fields: ["typical_start_direction"],
    headline: "We've found several drivers that could suit your game",
    prompt:
      "Your shot shape is mostly straight. Where does the ball usually start relative to your target?",
  },
  typical_curvature_unknown: {
    id: "typical_curvature_unknown",
    fields: ["typical_curvature"],
    headline: "We've found several drivers that could suit your game",
    prompt: "What does your typical driver shot do through the air?",
  },
  typical_curvature_straight_optional: {
    id: "typical_curvature_straight_optional",
    fields: ["typical_curvature"],
    headline: "One more detail could help us narrow them down",
    prompt:
      "You said your shot is mostly straight. Keep that, or refine if one curve is more common?",
  },
  primary_objective_miss_confirm: {
    id: "primary_objective_miss_confirm",
    fields: ["primary_objective"],
    headline: "Change your main goal?",
    prompt:
      "To narrow recommendations we can update your main goal to reducing a left or right miss. This replaces your current goal.",
    requiresObjectiveConfirm: true,
  },
};

/**
 * Optional trajectory clarify after weak named recovery via conditional refine.
 * Only when recovery flag is set — never for initially named Pathway A profiles.
 */
export function selectOptionalPostRecoveryQuestion(
  result: CatalogueRecommendResult,
  answers: Record<string, unknown>,
  askedQuestionIds: string[],
  stepCount: number,
  options: SelectRefinementOptions
): RefinementQuestion | null {
  if (result.mode !== "NAMED_HEADS") return null;
  if (!options.recoveredNamedViaRefinement) return null;
  if (options.optionalRefineDismissed || options.skipped) return null;
  if (stepCount >= REFINEMENT_MAX_B_STEPS) return null;

  const asked = new Set(askedQuestionIds);
  const traj = upper(answers.typical_trajectory);
  const req = result.normalised_requirements;

  // Prioritise unresolved launch / trajectory (inconsistent_strike weak-name path).
  if (
    launchUnresolved(req) &&
    !trajResolved(traj) &&
    traj !== "UNKNOWN" &&
    !asked.has("typical_trajectory")
  ) {
    return QUESTIONS.typical_trajectory;
  }

  return null;
}

/**
 * Decide pathway and optional next question.
 * `askedQuestionIds` includes answered/declined/exhausted question ids.
 */
export function selectRefinement(
  result: CatalogueRecommendResult,
  answers: Record<string, unknown>,
  askedQuestionIds: string[],
  stepCount: number,
  options: SelectRefinementOptions = {}
): RefinementDecision {
  if (result.mode === "NAMED_HEADS") {
    const optionalQ = selectOptionalPostRecoveryQuestion(
      result,
      answers,
      askedQuestionIds,
      stepCount,
      options
    );
    if (optionalQ) {
      return { pathway: "OPTIONAL_B", question: optionalQ };
    }
    return { pathway: "A", question: null };
  }

  if (result.mode !== "CHARACTERISTIC_GUIDANCE") {
    return { pathway: "NONE", question: null };
  }

  const reason = result.audit.insufficient_evidence_reason;
  const req = result.normalised_requirements;
  const evidence = countEvidenceBackedCatalogueRequirementDims(req);

  if (
    reason === "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS" ||
    evidence < 2
  ) {
    return { pathway: "C", question: null };
  }

  if (reason !== "NO_MEANINGFUL_HEAD_DIFFERENTIATION") {
    return { pathway: "NONE", question: null };
  }

  if (stepCount >= REFINEMENT_MAX_B_STEPS) {
    return { pathway: "NONE", question: null };
  }

  const asked = new Set(askedQuestionIds);
  const curve = upper(answers.typical_curvature);
  const start = upper(answers.typical_start_direction);
  const traj = upper(answers.typical_trajectory);
  const objective = upper(answers.primary_objective);

  const pick = (id: RefinementQuestionId): RefinementDecision | null => {
    if (asked.has(id)) return null;
    return { pathway: "B", question: QUESTIONS[id] };
  };

  // 1) VARIABLE curve — invite keep or more-common pattern (never force LEFT/RIGHT).
  if (curve === "VARIABLE") {
    const q = pick("typical_curvature_variable_clarify");
    if (q) return q;
  }

  // 2) Trajectory only when it was never answered. "I'm not sure" is not asked again.
  if (launchUnresolved(req) && !trajResolved(traj) && traj !== "UNKNOWN") {
    const q = pick("typical_trajectory");
    if (q) return q;
  }

  // 3) Neutral + STRAIGHT curve — ask start without overwriting STRAIGHT.
  if (
    directionNeutralOrUnresolved(req) &&
    curve === "STRAIGHT" &&
    start !== "UNKNOWN" &&
    start !== "" &&
    !startIsDirectional(start)
  ) {
    const q = pick("typical_start_direction");
    if (q) return q;
  }

  // 4) Curve only when it was never answered. An explicit "I'm not sure" stays.
  if (directionNeutralOrUnresolved(req) && curve === "") {
    const q = pick("typical_curvature_unknown");
    if (q) return q;
  }

  // 5) Optional STRAIGHT refine. An unknown start is already an answer.
  if (
    directionNeutralOrUnresolved(req) &&
    curve === "STRAIGHT" &&
    (asked.has("typical_start_direction") ||
      startIsDirectional(start) ||
      start === "UNKNOWN")
  ) {
    const q = pick("typical_curvature_straight_optional");
    if (q) return q;
  }

  // 6) Miss-reduction only with explicit confirm after ball-flight exhausted.
  // Do not use this to re-ask a curve the golfer already left as "I'm not sure".
  if (
    directionNeutralOrUnresolved(req) &&
    !isMissReduction(objective) &&
    curve !== "LEFT" &&
    curve !== "RIGHT" &&
    curve !== "VARIABLE" &&
    curve !== "UNKNOWN" &&
    curve !== ""
  ) {
    const ballFlightTried =
      asked.has("typical_curvature_unknown") ||
      asked.has("typical_curvature_straight_optional") ||
      asked.has("typical_start_direction") ||
      asked.has("typical_trajectory") ||
      asked.has("typical_curvature_variable_clarify");
    if (ballFlightTried) {
      const q = pick("primary_objective_miss_confirm");
      if (q) return q;
    }
  }

  return { pathway: "NONE", question: null };
}

export function isInformativeRefinementAnswer(
  questionId: RefinementQuestionId,
  value: string
): boolean {
  const v = upper(value);
  if (v === "UNKNOWN" || v === "" || v === "KEEP") return false;
  switch (questionId) {
    case "typical_curvature_variable_clarify":
      return v === "LEFT" || v === "RIGHT" || v === "STRAIGHT";
    case "typical_curvature_straight_optional":
      return v === "LEFT" || v === "RIGHT";
    case "typical_curvature_unknown":
      return (
        v === "LEFT" ||
        v === "RIGHT" ||
        v === "STRAIGHT" ||
        v === "VARIABLE"
      );
    case "typical_start_direction":
      return v === "LEFT" || v === "RIGHT" || v === "CENTRE" || v === "VARIABLE";
    case "typical_trajectory":
      return trajResolved(v);
    case "primary_objective_miss_confirm":
      return isMissReduction(v);
    default:
      return false;
  }
}

/**
 * Apply a refinement choice. KEEP / retained VARIABLE|STRAIGHT leave answers intact.
 */
export function applyRefinementAnswer(
  answers: Record<string, unknown>,
  questionId: RefinementQuestionId,
  value: string
): { answers: Record<string, unknown>; changed: boolean } {
  const v = upper(value);
  const next = { ...answers };

  if (v === "KEEP" || v === "") {
    return { answers: next, changed: false };
  }

  switch (questionId) {
    case "typical_curvature_variable_clarify":
    case "typical_curvature_unknown":
    case "typical_curvature_straight_optional": {
      if (
        v === "VARIABLE" ||
        v === "STRAIGHT" ||
        v === "LEFT" ||
        v === "RIGHT" ||
        v === "UNKNOWN"
      ) {
        if (upper(answers.typical_curvature) === v) {
          return { answers: next, changed: false };
        }
        next.typical_curvature = v;
        return { answers: next, changed: true };
      }
      return { answers: next, changed: false };
    }
    case "typical_start_direction": {
      if (
        v === "LEFT" ||
        v === "RIGHT" ||
        v === "CENTRE" ||
        v === "VARIABLE" ||
        v === "UNKNOWN"
      ) {
        if (upper(answers.typical_start_direction) === v) {
          return { answers: next, changed: false };
        }
        next.typical_start_direction = v;
        return { answers: next, changed: true };
      }
      return { answers: next, changed: false };
    }
    case "typical_trajectory": {
      if (v === "LOW" || v === "MID" || v === "HIGH" || v === "UNKNOWN") {
        if (upper(answers.typical_trajectory) === v) {
          return { answers: next, changed: false };
        }
        next.typical_trajectory = v;
        return { answers: next, changed: true };
      }
      return { answers: next, changed: false };
    }
    case "primary_objective_miss_confirm": {
      if (isMissReduction(v)) {
        if (upper(answers.primary_objective) === v) {
          return { answers: next, changed: false };
        }
        next.primary_objective = v;
        return { answers: next, changed: true };
      }
      return { answers: next, changed: false };
    }
    default:
      return { answers: next, changed: false };
  }
}
