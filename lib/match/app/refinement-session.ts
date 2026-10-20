/** Client-side refinement journey state (admin preview). */
export const MATCH_REFINEMENT_STORAGE_KEY = "teevo_match_admin_refine_v1";

export type MatchRefinementState = {
  /** Fingerprint of questionnaire answers that started this refine journey. */
  answersFingerprint: string;
  askedQuestionIds: string[];
  stepCount: number;
  /** Prevent duplicate match_refinement_offered for the same offer key. */
  offeredKeys: string[];
  skipped: boolean;
  /**
   * True after a Pathway B/C clarification successfully produced NAMED_HEADS.
   * Enables optional post-recovery refine — not for initially named profiles.
   */
  recoveredNamedViaRefinement: boolean;
  /** Golfer chose "Keep these results" on the optional post-recovery prompt. */
  optionalRefineDismissed: boolean;
};

export const EMPTY_REFINEMENT_STATE: MatchRefinementState = {
  answersFingerprint: "",
  askedQuestionIds: [],
  stepCount: 0,
  offeredKeys: [],
  skipped: false,
  recoveredNamedViaRefinement: false,
  optionalRefineDismissed: false,
};

export function fingerprintAnswers(answers: Record<string, unknown>): string {
  try {
    return JSON.stringify(answers);
  } catch {
    return "";
  }
}

function normalizeState(
  parsed: Partial<MatchRefinementState> | null | undefined
): MatchRefinementState {
  if (!parsed || typeof parsed !== "object") {
    return { ...EMPTY_REFINEMENT_STATE };
  }
  return {
    ...EMPTY_REFINEMENT_STATE,
    ...parsed,
    askedQuestionIds: Array.isArray(parsed.askedQuestionIds)
      ? parsed.askedQuestionIds.map(String)
      : [],
    offeredKeys: Array.isArray(parsed.offeredKeys)
      ? parsed.offeredKeys.map(String)
      : [],
    stepCount:
      typeof parsed.stepCount === "number" && Number.isFinite(parsed.stepCount)
        ? parsed.stepCount
        : 0,
    skipped: !!parsed.skipped,
    answersFingerprint: String(parsed.answersFingerprint ?? ""),
    recoveredNamedViaRefinement: !!parsed.recoveredNamedViaRefinement,
    optionalRefineDismissed: !!parsed.optionalRefineDismissed,
  };
}

export function loadRefinementState(): MatchRefinementState {
  if (typeof window === "undefined") return { ...EMPTY_REFINEMENT_STATE };
  try {
    const raw = sessionStorage.getItem(MATCH_REFINEMENT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_REFINEMENT_STATE };
    return normalizeState(JSON.parse(raw) as Partial<MatchRefinementState>);
  } catch {
    return { ...EMPTY_REFINEMENT_STATE };
  }
}

export function saveRefinementState(state: MatchRefinementState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MATCH_REFINEMENT_STORAGE_KEY, JSON.stringify(state));
}

export function clearRefinementState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MATCH_REFINEMENT_STORAGE_KEY);
}

/**
 * Reset refine meta when underlying questionnaire answers change.
 * Preserves state when fingerprint matches.
 */
export function syncRefinementStateForAnswers(
  answers: Record<string, unknown>
): MatchRefinementState {
  const fp = fingerprintAnswers(answers);
  const current = loadRefinementState();
  if (current.answersFingerprint && current.answersFingerprint === fp) {
    return current;
  }
  const next: MatchRefinementState = {
    ...EMPTY_REFINEMENT_STATE,
    answersFingerprint: fp,
  };
  saveRefinementState(next);
  return next;
}

/**
 * Prefer the fresher of two refine snapshots (higher stepCount wins;
 * then more asked ids; then longer offeredKeys). Prevents stale offer
 * effects from regressing committed progress.
 */
export function preferFresherRefineState(
  a: MatchRefinementState,
  b: MatchRefinementState
): MatchRefinementState {
  if (b.stepCount !== a.stepCount) {
    return b.stepCount > a.stepCount ? b : a;
  }
  if (b.askedQuestionIds.length !== a.askedQuestionIds.length) {
    return b.askedQuestionIds.length > a.askedQuestionIds.length ? b : a;
  }
  if (b.offeredKeys.length !== a.offeredKeys.length) {
    return b.offeredKeys.length > a.offeredKeys.length ? b : a;
  }
  // Prefer recovery / dismiss flags if set on either.
  return {
    ...a,
    recoveredNamedViaRefinement:
      a.recoveredNamedViaRefinement || b.recoveredNamedViaRefinement,
    optionalRefineDismissed:
      a.optionalRefineDismissed || b.optionalRefineDismissed,
    skipped: a.skipped || b.skipped,
    offeredKeys: Array.from(new Set([...a.offeredKeys, ...b.offeredKeys])),
    askedQuestionIds: Array.from(
      new Set([...a.askedQuestionIds, ...b.askedQuestionIds])
    ),
  };
}

/** Merge an offer key into the authoritative (freshest) refine state. */
export function mergeOfferedKey(
  reactState: MatchRefinementState,
  storageState: MatchRefinementState,
  key: string
): MatchRefinementState {
  const base = preferFresherRefineState(reactState, storageState);
  if (base.offeredKeys.includes(key)) return base;
  return {
    ...base,
    offeredKeys: [...base.offeredKeys, key],
  };
}

/**
 * Commit refine progress after a successful recommendation (or local KEEP).
 * Failed API calls must not call this.
 */
export function commitRefinementProgress(input: {
  previous: MatchRefinementState;
  questionId: string | null;
  answersFingerprint: string;
  /** Increment Pathway B/C clarification allowance. */
  consumeStep: boolean;
  resultMode: string | null;
}): MatchRefinementState {
  const asked = input.questionId
    ? Array.from(new Set([...input.previous.askedQuestionIds, input.questionId]))
    : [...input.previous.askedQuestionIds];
  const stepCount = input.consumeStep
    ? input.previous.stepCount + 1
    : input.previous.stepCount;
  const recoveredNamedViaRefinement =
    input.previous.recoveredNamedViaRefinement ||
    input.resultMode === "NAMED_HEADS";
  return {
    ...input.previous,
    askedQuestionIds: asked,
    stepCount,
    answersFingerprint: input.answersFingerprint,
    recoveredNamedViaRefinement,
  };
}
