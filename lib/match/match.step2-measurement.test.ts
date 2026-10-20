import { describe, expect, it, vi } from "vitest";
import {
  answersToApiPayload,
  EMPTY_MATCH_ANSWERS,
  type MatchQuestionnaireAnswers,
} from "@/lib/match/app/session-storage";
import {
  clearStep2Draft,
  commitStep2Measurement,
  EMPTY_STEP2_DRAFT,
  hydrateStep2,
  proposePathwayCMeasurement,
  STEP2_DRAFT_STORAGE_KEY,
  step2ContinueError,
  step2Messages,
  type Step2Draft,
} from "@/lib/match/app/step2-measurement";
import {
  clearMatchQuestionnaireAnswers,
  MATCH_QUESTIONNAIRE_STORAGE_KEY,
} from "@/lib/match/app/session-storage";
import { validateMatchQuestionnaireInputs } from "@/lib/match/app/validate-inputs";
import { normalizeRequirements } from "@/lib/match/requirements";

const PAYLOAD_KEYS = [
  "budget_max_gbp",
  "carry_distance_yards",
  "club_speed_mph",
  "current_club_satisfaction",
  "current_loft_deg",
  "handedness",
  "handicap",
  "miss_severity",
  "primary_objective",
  "strike_consistency",
  "strike_pattern",
  "typical_curvature",
  "typical_start_direction",
  "typical_trajectory",
] as const;

function answers(
  patch: Partial<MatchQuestionnaireAnswers> = {}
): MatchQuestionnaireAnswers {
  return { ...EMPTY_MATCH_ANSWERS, handedness: "RIGHT", handicap: "14", ...patch };
}

function payloadOf(next: MatchQuestionnaireAnswers) {
  return answersToApiPayload(next);
}

describe("B1d Step 2 measurement choice", () => {
  it("does not add the UI choice or drafts to the API payload", () => {
    const committed = commitStep2Measurement(
      answers({ club_speed_mph: "95", carry_distance_yards: "240" }),
      {
        knowledge: "SPEED",
        speedDraft: "95",
        carryDraft: "240",
        legacyDualResolved: true,
      }
    );
    const payload = payloadOf(committed);
    expect(Object.keys(payload).sort()).toEqual([...PAYLOAD_KEYS]);
    expect(payload).not.toHaveProperty("swing_knowledge");
    expect(payload).not.toHaveProperty("knowledge");
    expect(payload).not.toHaveProperty("speedDraft");
    expect(payload).not.toHaveProperty("carryDraft");
  });

  it("submits neither measurement when no choice is selected", () => {
    const hydrated = hydrateStep2(answers(), EMPTY_STEP2_DRAFT);
    expect(hydrated.draft.knowledge).toBe("");
    const payload = payloadOf(hydrated.answers);
    expect(payload.club_speed_mph).toBeNull();
    expect(payload.carry_distance_yards).toBeNull();
    expect(payload.handicap).toBe(14);
  });

  it("submits swing speed and omits carry", () => {
    const draft: Step2Draft = {
      ...EMPTY_STEP2_DRAFT,
      knowledge: "SPEED",
      speedDraft: "95",
      carryDraft: "240",
    };
    const committed = commitStep2Measurement(answers(), draft);
    const payload = payloadOf(committed);
    expect(payload.club_speed_mph).toBe(95);
    expect(payload.carry_distance_yards).toBeNull();
    expect(payload.handicap).toBe(14);
    expect(step2Messages(draft).join(" ")).toContain("240");
    expect(step2Messages(draft).join(" ")).toContain("will not be used");
  });

  it("submits carry and omits swing speed", () => {
    const draft: Step2Draft = {
      ...EMPTY_STEP2_DRAFT,
      knowledge: "DISTANCE",
      speedDraft: "95",
      carryDraft: "220",
    };
    const payload = payloadOf(commitStep2Measurement(answers(), draft));
    expect(payload.club_speed_mph).toBeNull();
    expect(payload.carry_distance_yards).toBe(220);
    expect(payload.handicap).toBe(14);
  });

  it("submits neither measurement for I'm not sure and keeps drafts", () => {
    const draft: Step2Draft = {
      knowledge: "UNKNOWN",
      speedDraft: "95",
      carryDraft: "220",
      legacyDualResolved: false,
    };
    const committed = commitStep2Measurement(answers(), draft);
    const payload = payloadOf(committed);
    expect(payload.club_speed_mph).toBeNull();
    expect(payload.carry_distance_yards).toBeNull();
    expect(draft.speedDraft).toBe("95");
    expect(draft.carryDraft).toBe("220");
    expect(step2Messages(draft).join(" ")).toContain("will be submitted");
  });

  it("keeps handicap while switching and restores each draft", () => {
    let draft: Step2Draft = {
      knowledge: "SPEED",
      speedDraft: "98",
      carryDraft: "",
      legacyDualResolved: false,
    };
    let current = commitStep2Measurement(answers({ handicap: "18" }), draft);

    draft = { ...draft, knowledge: "DISTANCE", carryDraft: "230" };
    current = commitStep2Measurement(current, draft);
    expect(current.club_speed_mph).toBe("");
    expect(current.carry_distance_yards).toBe("230");
    expect(current.handicap).toBe("18");
    expect(draft.speedDraft).toBe("98");

    draft = { ...draft, knowledge: "SPEED" };
    current = commitStep2Measurement(current, draft);
    expect(current.club_speed_mph).toBe("98");
    expect(current.carry_distance_yards).toBe("");
    expect(current.handicap).toBe("18");
    expect(draft.carryDraft).toBe("230");

    draft = { ...draft, knowledge: "DISTANCE" };
    current = commitStep2Measurement(current, draft);
    expect(current.carry_distance_yards).toBe("230");
    expect(current.club_speed_mph).toBe("");
    expect(payloadOf(current).handicap).toBe(18);
  });

  it("resolves a legacy dual-value session to speed without dropping carry", () => {
    const stored = answers({
      club_speed_mph: "95",
      carry_distance_yards: "240",
    });
    const once = hydrateStep2(stored, EMPTY_STEP2_DRAFT);
    expect(once.draft.knowledge).toBe("SPEED");
    expect(once.draft.legacyDualResolved).toBe(true);
    expect(once.draft.speedDraft).toBe("95");
    expect(once.draft.carryDraft).toBe("240");
    expect(once.answers.club_speed_mph).toBe("95");
    expect(once.answers.carry_distance_yards).toBe("");

    const remounted = hydrateStep2(once.answers, once.draft);
    expect(remounted.draft.carryDraft).toBe("240");
    expect(remounted.answers.carry_distance_yards).toBe("");
    expect(payloadOf(remounted.answers).club_speed_mph).toBe(95);
    expect(payloadOf(remounted.answers).carry_distance_yards).toBeNull();

    const notice = step2Messages(remounted.draft).join(" ");
    expect(notice).toContain("Measured swing speed is used");
    expect(notice).toContain("240");

    const distance = {
      ...remounted.draft,
      knowledge: "DISTANCE" as const,
    };
    const usingCarry = commitStep2Measurement(remounted.answers, distance);
    expect(usingCarry.carry_distance_yards).toBe("240");
    expect(usingCarry.club_speed_mph).toBe("");
    expect(distance.speedDraft).toBe("95");
  });

  it("restores a single saved measurement on remount", () => {
    const speedOnly = hydrateStep2(
      answers({ club_speed_mph: "88" }),
      EMPTY_STEP2_DRAFT
    );
    expect(speedOnly.draft.knowledge).toBe("SPEED");
    expect(speedOnly.draft.legacyDualResolved).toBe(false);
    expect(payloadOf(speedOnly.answers).club_speed_mph).toBe(88);

    const carryOnly = hydrateStep2(
      answers({ carry_distance_yards: "210" }),
      EMPTY_STEP2_DRAFT
    );
    expect(carryOnly.draft.knowledge).toBe("DISTANCE");
    expect(payloadOf(carryOnly.answers).carry_distance_yards).toBe(210);
    expect(payloadOf(carryOnly.answers).club_speed_mph).toBeNull();
  });

  it("treats a blank active measurement as unused and still validates bad numbers", () => {
    const blank = commitStep2Measurement(answers(), {
      ...EMPTY_STEP2_DRAFT,
      knowledge: "SPEED",
      speedDraft: "   ",
    });
    expect(payloadOf(blank).club_speed_mph).toBeNull();
    expect(step2Messages({ ...EMPTY_STEP2_DRAFT, knowledge: "SPEED" }).join(" ")).toContain(
      "will not be used"
    );

    const invalid = commitStep2Measurement(answers(), {
      ...EMPTY_STEP2_DRAFT,
      knowledge: "SPEED",
      speedDraft: "abc",
    });
    const invalidPayload = payloadOf(invalid);
    expect(invalidPayload.club_speed_mph).toBe("abc");
    const validated = validateMatchQuestionnaireInputs(invalidPayload);
    expect(validated.ok).toBe(false);

    const tooFast = commitStep2Measurement(answers(), {
      ...EMPTY_STEP2_DRAFT,
      knowledge: "DISTANCE",
      carryDraft: "900",
    });
    const tooFastPayload = payloadOf(tooFast);
    expect(validateMatchQuestionnaireInputs(tooFastPayload).ok).toBe(false);
    expect(
      step2ContinueError({
        ...EMPTY_STEP2_DRAFT,
        knowledge: "DISTANCE",
        carryDraft: "900",
      })
    ).toMatch(/400 yards/);
    expect(step2ContinueError({ ...EMPTY_STEP2_DRAFT, knowledge: "SPEED" })).toBeNull();
    expect(step2ContinueError({ ...EMPTY_STEP2_DRAFT, knowledge: "UNKNOWN", speedDraft: "abc" })).toBeNull();
    expect(step2ContinueError(EMPTY_STEP2_DRAFT)).toBeNull();
    expect(
      step2ContinueError({ ...EMPTY_STEP2_DRAFT, knowledge: "SPEED", speedDraft: "160" })
    ).toBeNull();
    expect(
      step2ContinueError({ ...EMPTY_STEP2_DRAFT, knowledge: "SPEED", speedDraft: "161" })
    ).toMatch(/160 mph/);
  });

  it("lets Pathway C replace carry with a new swing speed without dropping the carry draft", () => {
    const stored = answers({
      club_speed_mph: "",
      carry_distance_yards: "220",
      handicap: "18",
    });
    const draft: Step2Draft = {
      knowledge: "DISTANCE",
      speedDraft: "",
      carryDraft: "220",
      legacyDualResolved: false,
    };
    const planned = proposePathwayCMeasurement(
      stored,
      {
        handicap: "18",
        club_speed_mph: "96",
        typical_trajectory: "MID",
        typical_curvature: "RIGHT",
      },
      draft
    );
    expect(stored.carry_distance_yards).toBe("220");
    expect(planned.answers.club_speed_mph).toBe("96");
    expect(planned.answers.carry_distance_yards).toBe("");
    expect(planned.answers.handicap).toBe("18");
    expect(planned.draft.knowledge).toBe("SPEED");
    expect(planned.draft.speedDraft).toBe("96");
    expect(planned.draft.carryDraft).toBe("220");
    expect(planned.draft.legacyDualResolved).toBe(true);
    const payload = payloadOf(planned.answers);
    expect(payload.club_speed_mph).toBe(96);
    expect(payload.carry_distance_yards).toBeNull();
    expect(payload).not.toHaveProperty("knowledge");
  });

  it("leaves carry in place when Pathway C does not supply a speed", () => {
    const stored = answers({ carry_distance_yards: "220", club_speed_mph: "" });
    const draft: Step2Draft = {
      knowledge: "DISTANCE",
      speedDraft: "",
      carryDraft: "220",
      legacyDualResolved: false,
    };
    const planned = proposePathwayCMeasurement(
      stored,
      {
        handicap: "14",
        club_speed_mph: "   ",
        typical_trajectory: "UNKNOWN",
        typical_curvature: "UNKNOWN",
      },
      draft
    );
    expect(planned.answers.carry_distance_yards).toBe("220");
    expect(planned.answers.club_speed_mph).toBe("");
    expect(planned.draft).toBe(draft);
  });

  it("clears committed answers and the Step 2 draft together", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", storage);
    memory.set(MATCH_QUESTIONNAIRE_STORAGE_KEY, "{\"club_speed_mph\":\"95\"}");
    memory.set(STEP2_DRAFT_STORAGE_KEY, "{\"knowledge\":\"SPEED\"}");
    clearMatchQuestionnaireAnswers();
    clearStep2Draft();
    expect(memory.has(MATCH_QUESTIONNAIRE_STORAGE_KEY)).toBe(false);
    expect(memory.has(STEP2_DRAFT_STORAGE_KEY)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("does not invent a swing speed from carry, and keeps speed precedence in the fitter", () => {
    const speedOnly = validateMatchQuestionnaireInputs(
      payloadOf(
        commitStep2Measurement(answers(), {
          ...EMPTY_STEP2_DRAFT,
          knowledge: "SPEED",
          speedDraft: "95",
          carryDraft: "150",
        })
      )
    );
    const both = validateMatchQuestionnaireInputs(
      answersToApiPayload(
        answers({ club_speed_mph: "95", carry_distance_yards: "150" })
      )
    );
    const carryOnly = validateMatchQuestionnaireInputs(
      payloadOf(
        commitStep2Measurement(answers(), {
          ...EMPTY_STEP2_DRAFT,
          knowledge: "DISTANCE",
          carryDraft: "150",
        })
      )
    );
    expect(speedOnly.ok && both.ok && carryOnly.ok).toBe(true);
    if (!speedOnly.ok || !both.ok || !carryOnly.ok) return;

    expect(speedOnly.raw.club_speed_mph).toBe(95);
    expect(speedOnly.raw.carry_distance_yards).toBeNull();
    expect(carryOnly.raw.club_speed_mph).toBeNull();
    expect(carryOnly.raw.carry_distance_yards).toBe(150);

    const speedReq = normalizeRequirements(speedOnly.raw, {});
    const bothReq = normalizeRequirements(both.raw, {});
    const carryReq = normalizeRequirements(carryOnly.raw, {});
    expect(speedReq.shaft_flex_min_value).toEqual(bothReq.shaft_flex_min_value);
    expect(speedReq.shaft_flex_max_value).toEqual(bothReq.shaft_flex_max_value);
    expect(bothReq.conflict_flags).toContain("SPEED_CARRY_CONFLICT");
    expect(speedReq.conflict_flags).not.toContain("SPEED_CARRY_CONFLICT");
    expect(carryReq.shaft_flex_min_value).not.toBeNull();
    expect(carryOnly.raw.club_speed_mph).toBeNull();
  });
});
