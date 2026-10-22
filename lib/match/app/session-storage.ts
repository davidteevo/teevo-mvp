/** Client-side questionnaire persistence (Checkpoint A — no DB). */
export const MATCH_QUESTIONNAIRE_STORAGE_KEY = "teevo_match_admin_q_v1";
export const MATCH_RESULTS_STORAGE_KEY = "teevo_match_admin_results_v1";
export const MATCH_INVENTORY_STATUS_KEY = "teevo_match_admin_inventory_v1";

/** Whether the recommend request could read Teevo stock. Not a Fit score. */
export type MatchInventoryLoadStatus = "ready" | "unavailable";

export function saveMatchResult(
  result: unknown,
  inventoryStatus?: MatchInventoryLoadStatus
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MATCH_RESULTS_STORAGE_KEY, JSON.stringify(result));
  if (inventoryStatus) {
    sessionStorage.setItem(MATCH_INVENTORY_STATUS_KEY, inventoryStatus);
  }
}

export function loadInventoryLoadStatus(): MatchInventoryLoadStatus {
  if (typeof window === "undefined") return "ready";
  return sessionStorage.getItem(MATCH_INVENTORY_STATUS_KEY) === "unavailable"
    ? "unavailable"
    : "ready";
}

export type MatchQuestionnaireAnswers = {
  handedness: "LEFT" | "RIGHT" | "";
  handicap: string;
  club_speed_mph: string;
  carry_distance_yards: string;
  typical_trajectory: string;
  typical_start_direction: string;
  typical_curvature: string;
  miss_severity: string;
  strike_pattern: string;
  strike_consistency: string;
  primary_objective: string;
  current_loft_deg: string;
  current_club_satisfaction: string;
  budget_max_gbp: string;
};

export const EMPTY_MATCH_ANSWERS: MatchQuestionnaireAnswers = {
  handedness: "",
  handicap: "",
  club_speed_mph: "",
  carry_distance_yards: "",
  typical_trajectory: "UNKNOWN",
  typical_start_direction: "UNKNOWN",
  typical_curvature: "UNKNOWN",
  miss_severity: "UNKNOWN",
  strike_pattern: "UNKNOWN",
  strike_consistency: "UNKNOWN",
  primary_objective: "UNKNOWN",
  current_loft_deg: "",
  current_club_satisfaction: "UNKNOWN",
  budget_max_gbp: "",
};

export function loadMatchAnswers(): MatchQuestionnaireAnswers {
  if (typeof window === "undefined") return { ...EMPTY_MATCH_ANSWERS };
  try {
    const raw = sessionStorage.getItem(MATCH_QUESTIONNAIRE_STORAGE_KEY);
    if (!raw) return { ...EMPTY_MATCH_ANSWERS };
    return { ...EMPTY_MATCH_ANSWERS, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_MATCH_ANSWERS };
  }
}

export function clearMatchQuestionnaireAnswers(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MATCH_QUESTIONNAIRE_STORAGE_KEY);
}

export function saveMatchAnswers(answers: MatchQuestionnaireAnswers): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    MATCH_QUESTIONNAIRE_STORAGE_KEY,
    JSON.stringify(answers)
  );
}

/**
 * Fitting payload only. Step 2's measurement choice and inactive drafts
 * live outside this object and must not be added here.
 */
export function answersToApiPayload(
  a: MatchQuestionnaireAnswers
): Record<string, unknown> {
  const num = (s: string) => {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  };
  return {
    handedness: a.handedness || null,
    handicap: num(a.handicap),
    club_speed_mph: num(a.club_speed_mph),
    carry_distance_yards: num(a.carry_distance_yards),
    typical_trajectory: a.typical_trajectory,
    typical_start_direction: a.typical_start_direction,
    typical_curvature: a.typical_curvature,
    miss_severity: a.miss_severity,
    strike_pattern: a.strike_pattern,
    strike_consistency: a.strike_consistency,
    primary_objective: a.primary_objective,
    current_loft_deg: num(a.current_loft_deg),
    current_club_satisfaction: a.current_club_satisfaction,
    budget_max_gbp: num(a.budget_max_gbp),
  };
}
