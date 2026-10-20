import type { MatchQuestionnaireAnswers } from "./session-storage";

/** Separate from fitting answers. Never sent to the recommend API. */
export const STEP2_DRAFT_STORAGE_KEY = "teevo_match_admin_q_step2_draft_v1";

export type SwingKnowledge = "" | "SPEED" | "DISTANCE" | "UNKNOWN";

export type Step2Draft = {
  knowledge: SwingKnowledge;
  /** UI-only text. Not a fitting field. */
  speedDraft: string;
  /** UI-only text. Not a fitting field. */
  carryDraft: string;
  /**
   * A saved questionnaire already had both measurements. Speed stays
   * committed; carry remains in this draft.
   */
  legacyDualResolved: boolean;
};

export const EMPTY_STEP2_DRAFT: Step2Draft = {
  knowledge: "",
  speedDraft: "",
  carryDraft: "",
  legacyDualResolved: false,
};

const KNOWLEDGE = new Set<SwingKnowledge>(["", "SPEED", "DISTANCE", "UNKNOWN"]);

export function loadStep2Draft(): Step2Draft {
  if (typeof window === "undefined") return { ...EMPTY_STEP2_DRAFT };
  try {
    const raw = sessionStorage.getItem(STEP2_DRAFT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_STEP2_DRAFT };
    const parsed = JSON.parse(raw) as Partial<Step2Draft>;
    const knowledge = KNOWLEDGE.has(parsed.knowledge as SwingKnowledge)
      ? (parsed.knowledge as SwingKnowledge)
      : "";
    return {
      knowledge,
      speedDraft: typeof parsed.speedDraft === "string" ? parsed.speedDraft : "",
      carryDraft: typeof parsed.carryDraft === "string" ? parsed.carryDraft : "",
      legacyDualResolved: parsed.legacyDualResolved === true,
    };
  } catch {
    return { ...EMPTY_STEP2_DRAFT };
  }
}

export function saveStep2Draft(draft: Step2Draft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STEP2_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearStep2Draft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STEP2_DRAFT_STORAGE_KEY);
}

/**
 * Copy the active draft into the fitting answers and clear the other
 * measurement. Handicap and every other answer are left unchanged.
 * UNKNOWN and no selection commit neither measurement.
 */
export function commitStep2Measurement(
  answers: MatchQuestionnaireAnswers,
  draft: Step2Draft
): MatchQuestionnaireAnswers {
  if (draft.knowledge === "SPEED") {
    return {
      ...answers,
      club_speed_mph: draft.speedDraft,
      carry_distance_yards: "",
    };
  }
  if (draft.knowledge === "DISTANCE") {
    return {
      ...answers,
      club_speed_mph: "",
      carry_distance_yards: draft.carryDraft,
    };
  }
  return {
    ...answers,
    club_speed_mph: "",
    carry_distance_yards: "",
  };
}

/**
 * Restore Step 2 from fitting answers plus the UI draft.
 * A session that already stored both numbers keeps speed for matching
 * and holds carry in the draft. Draft text is never discarded here.
 */
export function hydrateStep2(
  answers: MatchQuestionnaireAnswers,
  draft: Step2Draft
): { answers: MatchQuestionnaireAnswers; draft: Step2Draft } {
  const speed = answers.club_speed_mph.trim();
  const carry = answers.carry_distance_yards.trim();
  const next: Step2Draft = {
    knowledge: draft.knowledge,
    speedDraft: draft.speedDraft || speed,
    carryDraft: draft.carryDraft || carry,
    legacyDualResolved: draft.legacyDualResolved,
  };

  if (!next.knowledge) {
    if (speed && carry) {
      next.knowledge = "SPEED";
      next.legacyDualResolved = true;
    } else if (speed) {
      next.knowledge = "SPEED";
    } else if (carry) {
      next.knowledge = "DISTANCE";
    }
  }

  return {
    draft: next,
    answers: commitStep2Measurement(answers, next),
  };
}

/** Same bounds as validate-inputs.ts: positive and at most 160. Blank is unused, not invalid. */
export function isUsableClubSpeed(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= 160;
}

/** Same bounds as validate-inputs.ts: positive and at most 400. Blank is unused, not invalid. */
export function isUsableCarryDistance(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= 400;
}

/**
 * Blocks Step 2 only when the active measurement box has a non-empty value
 * the fitter would reject. Blank, no selection, and I'm not sure do not block.
 */
export function step2ContinueError(draft: Step2Draft): string | null {
  if (draft.knowledge === "SPEED" && draft.speedDraft.trim() && !isUsableClubSpeed(draft.speedDraft)) {
    return "Enter a clubhead speed above 0 and up to 160 mph. Clear the box, or skip this measurement. What you typed is kept if you skip.";
  }
  if (
    draft.knowledge === "DISTANCE" &&
    draft.carryDraft.trim() &&
    !isUsableCarryDistance(draft.carryDraft)
  ) {
    return "Enter a carry distance above 0 and up to 400 yards. Clear the box, or skip this measurement. What you typed is kept if you skip.";
  }
  return null;
}

/**
 * Pathway C may add a measured swing speed after carry was saved.
 * The fitting request then uses speed only. Carry stays in the UI draft.
 * Callers must persist the result only after the recommendation succeeds.
 */
export function proposePathwayCMeasurement(
  answers: MatchQuestionnaireAnswers,
  input: {
    handicap: string;
    club_speed_mph: string;
    typical_trajectory: string;
    typical_curvature: string;
  },
  draft: Step2Draft
): { answers: MatchQuestionnaireAnswers; draft: Step2Draft } {
  const speed = input.club_speed_mph.trim();
  const carry = answers.carry_distance_yards.trim();
  const proposed: MatchQuestionnaireAnswers = {
    ...answers,
    handicap: input.handicap,
    club_speed_mph: speed,
    typical_trajectory: input.typical_trajectory,
    typical_curvature: input.typical_curvature,
  };
  if (!speed) {
    return { answers: proposed, draft };
  }
  if (!carry) {
    return {
      answers: proposed,
      draft: { ...draft, knowledge: "SPEED", speedDraft: speed },
    };
  }
  return {
    answers: { ...proposed, carry_distance_yards: "" },
    draft: {
      ...draft,
      knowledge: "SPEED",
      speedDraft: speed,
      carryDraft: carry,
      legacyDualResolved: true,
    },
  };
}

/** Non-blocking notes. These do not add fitting fields. */
export function step2Messages(draft: Step2Draft): string[] {
  const messages: string[] = [];
  const speed = draft.speedDraft.trim();
  const carry = draft.carryDraft.trim();

  if (draft.knowledge === "SPEED" && !speed) {
    messages.push("No swing speed entered, so it will not be used.");
  }

  if (draft.knowledge === "DISTANCE" && !carry) {
    messages.push("No carry distance entered, so it will not be used.");
  }

  if (draft.legacyDualResolved && draft.knowledge === "SPEED" && carry) {
    messages.push(
      `You had saved both a swing speed and a carry distance. Measured swing speed is used for matching. Your carry distance (${carry} yards) is saved if you choose carry distance instead.`
    );
  } else if (draft.knowledge === "SPEED" && carry) {
    messages.push(
      `Your carry distance (${carry} yards) is saved, but it will not be used unless you choose carry distance.`
    );
  } else if (draft.knowledge === "DISTANCE" && speed) {
    messages.push(
      `Your swing speed (${speed} mph) is saved, but it will not be used unless you choose swing speed.`
    );
  } else if (
    (draft.knowledge === "UNKNOWN" || draft.knowledge === "") &&
    (speed || carry)
  ) {
    if (speed && carry) {
      messages.push(
        `No swing speed or carry distance will be submitted. Swing speed (${speed} mph) and carry distance (${carry} yards) are saved if you choose one.`
      );
    } else if (speed) {
      messages.push(
        `No measurement will be submitted. Your swing speed (${speed} mph) is saved if you choose swing speed.`
      );
    } else {
      messages.push(
        `No measurement will be submitted. Your carry distance (${carry} yards) is saved if you choose carry distance.`
      );
    }
  }

  return messages;
}
