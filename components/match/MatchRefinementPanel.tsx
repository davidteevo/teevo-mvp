"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RadioCards } from "@/components/listing/club-specs/RadioCards";
import { VisualChoiceGroup } from "@/components/match/visual/VisualChoiceGroup";
import {
  curvatureStraightOptionalVisualOptions,
  curvatureVariableClarifyVisualOptions,
  curvatureVisualOptions,
} from "@/components/match/visual/curvatureOptions";
import { startDirectionVisualOptions } from "@/components/match/visual/startDirectionOptions";
import { trajectoryVisualOptions } from "@/components/match/visual/trajectoryOptions";
import { track } from "@/lib/analytics";
import type {
  CurvatureEnum,
  StartDirectionEnum,
  TrajectoryEnum,
} from "@/lib/match/app/visual-option-maps";
import {
  CURVATURE_PATHWAY_C_LABELS,
  CURVATURE_UNKNOWN_REFINE_LABELS,
  CURVATURE_VARIABLE_CLARIFY_LABELS,
  START_DIRECTION_REFINE_LABELS,
} from "@/lib/match/app/visual-option-maps";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";
import {
  applyRefinementAnswer,
  isInformativeRefinementAnswer,
  selectRefinement,
  type RefinementQuestion,
  type RefinementQuestionId,
} from "@/lib/match/app/refinement-policy";
import {
  commitRefinementProgress,
  fingerprintAnswers,
  loadRefinementState,
  mergeOfferedKey,
  saveRefinementState,
  syncRefinementStateForAnswers,
  type MatchRefinementState,
} from "@/lib/match/app/refinement-session";
import {
  PATHWAY_C_SPEED_REPLACES_CARRY,
  pathwayCReplacesCarry,
} from "@/lib/match/app/present-guidance";
import {
  answersToApiPayload,
  loadMatchAnswers,
  saveMatchAnswers,
  saveMatchResult,
  type MatchInventoryLoadStatus,
  type MatchQuestionnaireAnswers,
} from "@/lib/match/app/session-storage";
import {
  loadStep2Draft,
  proposePathwayCMeasurement,
  saveStep2Draft,
} from "@/lib/match/app/step2-measurement";

const ADMIN_PREVIEW_PROPS = { surface: "admin_preview" as const };

type RefreshActivity = {
  pending: boolean;
  refreshFailed: boolean;
  detail: string | null;
};

type Props = {
  result: CatalogueRecommendResult;
  onResult: (next: CatalogueRecommendResult) => void;
  onActivity?: (activity: RefreshActivity) => void;
};

async function postRecommend(
  answers: MatchQuestionnaireAnswers
): Promise<
  | {
      ok: true;
      result: CatalogueRecommendResult;
      inventoryStatus: MatchInventoryLoadStatus;
    }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/admin/match/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: answersToApiPayload(answers) }),
  });
  let data: {
    result?: CatalogueRecommendResult;
    error?: string;
    validation_errors?: string[];
    inventory_status?: MatchInventoryLoadStatus;
  } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Could not read server response." };
  }
  if (!res.ok || !data.result) {
    return {
      ok: false,
      error: (data.validation_errors || [data.error || "Request failed"]).join(
        "; "
      ),
    };
  }
  return {
    ok: true,
    result: data.result,
    inventoryStatus: data.inventory_status === "unavailable" ? "unavailable" : "ready",
  };
}

function toRecord(a: MatchQuestionnaireAnswers): Record<string, unknown> {
  return { ...a };
}

function fromRecord(r: Record<string, unknown>): MatchQuestionnaireAnswers {
  const cur = loadMatchAnswers();
  return { ...cur, ...(r as Partial<MatchQuestionnaireAnswers>) };
}

function RefinementChoiceControl({
  question,
  choice,
  onChange,
}: {
  question: RefinementQuestion;
  choice: string;
  onChange: (v: string) => void;
}) {
  if (question.id === "typical_trajectory") {
    return (
      <VisualChoiceGroup
        label={question.prompt}
        value={(choice || "") as TrajectoryEnum | ""}
        onChange={onChange}
        options={trajectoryVisualOptions()}
      />
    );
  }
  if (question.id === "typical_start_direction") {
    return (
      <VisualChoiceGroup
        label={question.prompt}
        value={(choice || "") as StartDirectionEnum | ""}
        onChange={onChange}
        options={startDirectionVisualOptions(START_DIRECTION_REFINE_LABELS)}
      />
    );
  }
  if (question.id === "typical_curvature_unknown") {
    return (
      <VisualChoiceGroup
        label={question.prompt}
        value={(choice || "") as CurvatureEnum | ""}
        onChange={onChange}
        options={curvatureVisualOptions(CURVATURE_UNKNOWN_REFINE_LABELS)}
      />
    );
  }
  if (question.id === "typical_curvature_variable_clarify") {
    return (
      <VisualChoiceGroup
        label={question.prompt}
        value={(choice || "") as CurvatureEnum | ""}
        onChange={onChange}
        options={curvatureVariableClarifyVisualOptions(
          CURVATURE_VARIABLE_CLARIFY_LABELS
        )}
      />
    );
  }
  if (question.id === "typical_curvature_straight_optional") {
    return (
      <VisualChoiceGroup
        label={question.prompt}
        value={
          (choice || "") as "KEEP" | "LEFT" | "RIGHT" | "UNKNOWN" | ""
        }
        onChange={onChange}
        options={curvatureStraightOptionalVisualOptions()}
      />
    );
  }
  return (
    <RadioCards
      label={question.prompt}
      value={choice}
      onChange={onChange}
      options={optionsFor(question)}
    />
  );
}

function optionsFor(q: RefinementQuestion): {
  value: string;
  title: string;
}[] {
  switch (q.id) {
    case "typical_curvature_variable_clarify":
      return [
        { value: "VARIABLE", title: "Still miss both ways" },
        { value: "LEFT", title: "More often curves left" },
        { value: "RIGHT", title: "More often curves right" },
        { value: "STRAIGHT", title: "More often straight" },
        { value: "UNKNOWN", title: "Not sure" },
      ];
    case "typical_curvature_straight_optional":
      return [
        { value: "KEEP", title: "Keep mostly straight" },
        { value: "LEFT", title: "Actually curves left more" },
        { value: "RIGHT", title: "Actually curves right more" },
        { value: "UNKNOWN", title: "Not sure" },
      ];
    case "typical_curvature_unknown":
      return [
        { value: "LEFT", title: "Curves left" },
        { value: "STRAIGHT", title: "Mostly straight" },
        { value: "RIGHT", title: "Curves right" },
        { value: "VARIABLE", title: "Varies a lot" },
        { value: "UNKNOWN", title: "Not sure" },
      ];
    case "typical_start_direction":
      return [
        { value: "LEFT", title: "Starts left" },
        { value: "CENTRE", title: "Starts on line" },
        { value: "RIGHT", title: "Starts right" },
        { value: "VARIABLE", title: "Varies" },
        { value: "UNKNOWN", title: "Not sure" },
      ];
    case "typical_trajectory":
      return [
        { value: "LOW", title: "Low" },
        { value: "MID", title: "Mid" },
        { value: "HIGH", title: "High" },
        { value: "UNKNOWN", title: "Not sure" },
      ];
    case "primary_objective_miss_confirm":
      return [
        { value: "KEEP", title: "Keep my current goal" },
        { value: "REDUCE_RIGHT_MISS", title: "Change goal: reduce right misses" },
        { value: "REDUCE_LEFT_MISS", title: "Change goal: reduce left misses" },
      ];
    default:
      return [{ value: "UNKNOWN", title: "Not sure" }];
  }
}

function formatApiError(message: string): string {
  const trimmed = message.trim().replace(/\.*$/, "");
  return `${trimmed}. Previous results are unchanged.`;
}

export function MatchRefinementPanel({ result, onResult, onActivity }: Props) {
  const [answers, setAnswers] = useState<MatchQuestionnaireAnswers>(() =>
    loadMatchAnswers()
  );
  const [refine, setRefine] = useState<MatchRefinementState>(() =>
    syncRefinementStateForAnswers(toRecord(loadMatchAnswers()))
  );
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [pending, startTransition] = useTransition();
  const [objConfirm, setObjConfirm] = useState(false);
  /** OPTIONAL_B: soft prompt first; expand after "Refine my fit". */
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const offerLogged = useRef<string | null>(null);
  const requestSeq = useRef(0);
  const inFlight = useRef(false);

  // Pathway C local drafts (optional fields — empty means unknown).
  const [cHandicap, setCHandicap] = useState(answers.handicap);
  const [cSpeed, setCSpeed] = useState(answers.club_speed_mph);
  const [cTraj, setCTraj] = useState(
    answers.typical_trajectory === "UNKNOWN" ? "" : answers.typical_trajectory
  );
  const [cCurve, setCCurve] = useState(
    answers.typical_curvature === "UNKNOWN" ? "" : answers.typical_curvature
  );

  const decision = refine.skipped
    ? ({ pathway: "NONE" as const, question: null })
    : selectRefinement(
        result,
        toRecord(answers),
        refine.askedQuestionIds,
        refine.stepCount,
        {
          recoveredNamedViaRefinement: refine.recoveredNamedViaRefinement,
          optionalRefineDismissed: refine.optionalRefineDismissed,
          skipped: refine.skipped,
        }
      );

  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;
  useEffect(() => {
    onActivityRef.current?.({
      pending,
      refreshFailed: canRetry,
      detail: canRetry
        ? error?.replace(/ ?Previous results are unchanged\.?$/, "") || null
        : null,
    });
  }, [pending, canRetry, error]);

  useEffect(() => {
    if (
      decision.pathway === "A" ||
      decision.pathway === "NONE" ||
      refine.skipped
    ) {
      return;
    }
    const key =
      decision.pathway === "C"
        ? `C:${refine.answersFingerprint}`
        : decision.pathway === "OPTIONAL_B"
          ? `OPT:${decision.question?.id}:${refine.stepCount}`
          : `B:${decision.question?.id}:${refine.stepCount}`;
    if (offerLogged.current === key) return;
    if (refine.offeredKeys.includes(key)) {
      offerLogged.current = key;
      return;
    }
    offerLogged.current = key;
    setRefine((prev) => {
      const merged = mergeOfferedKey(prev, loadRefinementState(), key);
      saveRefinementState(merged);
      return merged;
    });
    track("match_refinement_offered", {
      ...ADMIN_PREVIEW_PROPS,
      pathway: decision.pathway,
      reason: result.audit.insufficient_evidence_reason,
      question_id: decision.question?.id ?? null,
      optional: decision.pathway === "OPTIONAL_B",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offer once per key; merge avoids stale overwrite
  }, [decision.pathway, decision.question?.id, refine.stepCount, refine.skipped]);

  function persistRefine(next: MatchRefinementState) {
    setRefine(next);
    saveRefinementState(next);
  }

  function skip() {
    persistRefine({ ...refine, skipped: true });
    track("match_refinement_skipped", {
      ...ADMIN_PREVIEW_PROPS,
      pathway: decision.pathway,
      step: refine.stepCount,
    });
  }

  function keepOptionalResults() {
    persistRefine({
      ...preferLatestRefine(refine),
      optionalRefineDismissed: true,
    });
    setOptionalExpanded(false);
    setCanRetry(false);
        setError(null);
    track("match_refinement_skipped", {
      ...ADMIN_PREVIEW_PROPS,
      pathway: "OPTIONAL_B",
      step: refine.stepCount,
      action: "keep_results",
    });
  }

  function preferLatestRefine(reactState: MatchRefinementState): MatchRefinementState {
    const stored = loadRefinementState();
    if (stored.stepCount > reactState.stepCount) return stored;
    if (stored.askedQuestionIds.length > reactState.askedQuestionIds.length) {
      return stored;
    }
    return reactState;
  }

  /**
   * Pathway B / OPTIONAL_B: propose answers → API → commit only on success.
   * Failed requests do not consume a clarification step; Retry reuses the same choice.
   */
  function submitPathwayB(question: RefinementQuestion) {
    if (pending || inFlight.current) return;
    if (!choice) {
      setCanRetry(false);
      setError("Choose an option to continue.");
      return;
    }
    if (question.requiresObjectiveConfirm && !objConfirm && choice !== "KEEP") {
      setCanRetry(false);
      setError("Confirm that you want to change your main goal.");
      return;
    }
    startTransition(async () => {
      inFlight.current = true;
      const seq = ++requestSeq.current;
      setCanRetry(false);
        setError(null);

      const committedRefine = preferLatestRefine(refine);
      const committedAnswers = answers;
      const applied = applyRefinementAnswer(
        toRecord(committedAnswers),
        question.id as RefinementQuestionId,
        choice
      );
      const informative = isInformativeRefinementAnswer(
        question.id as RefinementQuestionId,
        choice
      );

      track("match_refinement_answered", {
        ...ADMIN_PREVIEW_PROPS,
        pathway: decision.pathway,
        question_id: question.id,
        informative,
        step: committedRefine.stepCount + 1,
        optional: decision.pathway === "OPTIONAL_B",
      });

      // KEEP / unchanged answers — no API; still consume a B step locally.
      if (!applied.changed) {
        if (seq !== requestSeq.current) {
          inFlight.current = false;
          return;
        }
        const next = commitRefinementProgress({
          previous: committedRefine,
          questionId: question.id,
          answersFingerprint: fingerprintAnswers(toRecord(committedAnswers)),
          consumeStep: true,
          resultMode: result.mode,
        });
        persistRefine(next);
        setChoice("");
        setObjConfirm(false);
        setOptionalExpanded(false);
        inFlight.current = false;
        return;
      }

      const proposedAnswers = fromRecord(applied.answers);
      // Do not mutate committed answers / refine / results until success.

      const out = await postRecommend(proposedAnswers);
      if (seq !== requestSeq.current) {
        inFlight.current = false;
        return;
      }

      if (!out.ok) {
        setCanRetry(true);
        setError(formatApiError(out.error));
        inFlight.current = false;
        // Choice retained for Retry; stepCount / answers / results unchanged.
        return;
      }

      saveMatchAnswers(proposedAnswers);
      setAnswers(proposedAnswers);
      const next = commitRefinementProgress({
        previous: committedRefine,
        questionId: question.id,
        answersFingerprint: fingerprintAnswers(toRecord(proposedAnswers)),
        consumeStep: true,
        resultMode: out.result.mode,
      });
      persistRefine(next);
      saveMatchResult(out.result, out.inventoryStatus);
      onResult(out.result);
      if (out.result.mode === "NAMED_HEADS") {
        track("match_refinement_recovered", {
          ...ADMIN_PREVIEW_PROPS,
          named_count: out.result.recommendations.length,
          steps: next.stepCount,
          mode: out.result.mode,
        });
      }
      setChoice("");
      setObjConfirm(false);
      setOptionalExpanded(false);
      setCanRetry(false);
        setError(null);
      inFlight.current = false;
    });
  }

  function submitPathwayC() {
    if (pending || inFlight.current) return;
    startTransition(async () => {
      inFlight.current = true;
      const seq = ++requestSeq.current;
      setCanRetry(false);
        setError(null);

      const committedRefine = preferLatestRefine(refine);
      const planned = proposePathwayCMeasurement(
        answers,
        {
          handicap: cHandicap.trim(),
          club_speed_mph: cSpeed.trim(),
          typical_trajectory: cTraj || "UNKNOWN",
          typical_curvature: cCurve || "UNKNOWN",
        },
        loadStep2Draft()
      );
      const proposedAnswers = planned.answers;

      track("match_refinement_answered", {
        ...ADMIN_PREVIEW_PROPS,
        pathway: "C",
        question_id: "minimum_intake",
        informative: !!(cTraj || cCurve || cHandicap || cSpeed),
        step: committedRefine.stepCount + 1,
      });

      const out = await postRecommend(proposedAnswers);
      if (seq !== requestSeq.current) {
        inFlight.current = false;
        return;
      }

      if (!out.ok) {
        setCanRetry(true);
        setError(formatApiError(out.error));
        inFlight.current = false;
        return;
      }

      saveMatchAnswers(proposedAnswers);
      saveStep2Draft(planned.draft);
      setAnswers(proposedAnswers);
      const next = commitRefinementProgress({
        previous: committedRefine,
        questionId: "minimum_intake",
        answersFingerprint: fingerprintAnswers(toRecord(proposedAnswers)),
        consumeStep: true,
        resultMode: out.result.mode,
      });
      persistRefine(next);
      saveMatchResult(out.result, out.inventoryStatus);
      onResult(out.result);
      if (out.result.mode === "NAMED_HEADS") {
        track("match_refinement_recovered", {
          ...ADMIN_PREVIEW_PROPS,
          named_count: out.result.recommendations.length,
          steps: next.stepCount,
          mode: out.result.mode,
        });
      }
      setCanRetry(false);
        setError(null);
      inFlight.current = false;
    });
  }

  if (decision.pathway === "A" || decision.pathway === "NONE") {
    return null;
  }

  if (decision.pathway === "C") {
    return (
      <section
        className="rounded-xl border border-par-3-punch/40 bg-white p-4 space-y-3"
        aria-labelledby="match-refine-c-title"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
          Add what you know · Optional
        </p>
        <h2
          id="match-refine-c-title"
          className="text-lg font-semibold text-mowing-green"
        >
          A few basics before we can name drivers
        </h2>
        <p className="text-sm text-mowing-green/80">
          Handedness alone is not enough. Add what you know — leave blank if
          unsure. We will not invent numbers for you.
        </p>
        <label className="block text-sm text-mowing-green">
          <span className="font-medium">Handicap (optional)</span>
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full min-h-[48px] rounded-xl border border-mowing-green/20 px-3"
            value={cHandicap}
            onChange={(e) => setCHandicap(e.target.value)}
            placeholder="Leave blank if you don’t know"
          />
        </label>
        <label className="block text-sm text-mowing-green">
          <span className="font-medium">Estimated driver clubhead speed, mph (optional)</span>
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full min-h-[48px] rounded-xl border border-mowing-green/20 px-3"
            value={cSpeed}
            onChange={(e) => setCSpeed(e.target.value)}
            placeholder="Leave blank if you don’t know"
          />
        </label>
        {answers.typical_trajectory === "" ? (
          <VisualChoiceGroup
            label="Typical ball flight (helpful)"
            value={(cTraj || "UNKNOWN") as TrajectoryEnum}
            onChange={(v) => setCTraj(v === "UNKNOWN" ? "" : v)}
            options={trajectoryVisualOptions()}
          />
        ) : null}
        {answers.typical_curvature === "" ? (
          <VisualChoiceGroup
            label="Typical shot curve (helpful)"
            value={(cCurve || "UNKNOWN") as CurvatureEnum}
            onChange={(v) => setCCurve(v === "UNKNOWN" ? "" : v)}
            options={curvatureVisualOptions(CURVATURE_PATHWAY_C_LABELS)}
          />
        ) : null}
        {pathwayCReplacesCarry(answers.carry_distance_yards, cSpeed) ? (
          <p className="text-sm text-mowing-green" role="status">
            {PATHWAY_C_SPEED_REPLACES_CARRY}
          </p>
        ) : null}
        {error && !canRetry ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={submitPathwayC}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Updating…" : canRetry ? "Retry" : "See recommendations"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={skip}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
          >
            Skip for now
          </button>
          <Link
            href="/fit"
            className="inline-flex min-h-[48px] items-center justify-center text-sm font-semibold text-mowing-green underline"
          >
            Edit all answers
          </Link>
        </div>
      </section>
    );
  }

  if (decision.pathway === "OPTIONAL_B") {
    const question = decision.question;
    return (
      <section
        className="rounded-xl border border-mowing-green/20 bg-mowing-green/[0.03] p-4 space-y-3"
        aria-labelledby="match-optional-refine-title"
      >
        <h2
          id="match-optional-refine-title"
          className="text-base font-semibold text-mowing-green"
        >
          Want to refine your fit?
        </h2>
        <p className="text-sm text-mowing-green/75">
          One more detail about your ball flight may help us refine these
          recommendations.
        </p>
        {!optionalExpanded ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOptionalExpanded(true)}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
            >
              Refine my fit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={keepOptionalResults}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-mowing-green/80 underline"
            >
              Keep these results
            </button>
          </div>
        ) : (
          <>
            <RefinementChoiceControl
              question={question}
              choice={choice}
              onChange={setChoice}
            />
            {error && !canRetry ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={pending}
                onClick={() => submitPathwayB(question)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Updating…" : canRetry ? "Retry" : "Continue"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={keepOptionalResults}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
              >
                Keep these results
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  const question = decision.question!;

  return (
    <section
      className="rounded-xl border border-par-3-punch/40 bg-white p-4 space-y-3"
      aria-labelledby="match-refine-b-title"
    >
      <h2
        id="match-refine-b-title"
        className="text-lg font-semibold text-mowing-green"
      >
        One quick question
      </h2>
      <RefinementChoiceControl
        question={question}
        choice={choice}
        onChange={setChoice}
      />
      {question.requiresObjectiveConfirm &&
      choice &&
      choice !== "KEEP" ? (
        <label className="flex items-start gap-2 text-sm text-mowing-green">
          <input
            type="checkbox"
            className="mt-1 min-h-[20px] min-w-[20px]"
            checked={objConfirm}
            onChange={(e) => setObjConfirm(e.target.checked)}
          />
          <span>
            I understand this replaces my current main goal (
            {answers.primary_objective || "UNKNOWN"}).
          </span>
        </label>
      ) : null}
      {error && !canRetry ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => submitPathwayB(question)}
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Updating…" : canRetry ? "Retry" : "Continue"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={skip}
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
        >
          Skip for now
        </button>
        <Link
          href="/fit"
          className="inline-flex min-h-[48px] items-center justify-center text-sm font-semibold text-mowing-green underline"
        >
          Edit all answers
        </Link>
      </div>
    </section>
  );
}
