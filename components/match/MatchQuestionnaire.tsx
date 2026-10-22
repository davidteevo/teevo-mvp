"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RadioCards } from "@/components/listing/club-specs/RadioCards";
import { Step2Measurement } from "@/components/match/Step2Measurement";
import { VisualChoiceGroup } from "@/components/match/visual/VisualChoiceGroup";
import { curvatureVisualOptions } from "@/components/match/visual/curvatureOptions";
import { startDirectionVisualOptions } from "@/components/match/visual/startDirectionOptions";
import { strikePatternVisualOptions } from "@/components/match/visual/strikePatternOptions";
import { trajectoryVisualOptions } from "@/components/match/visual/trajectoryOptions";
import { track } from "@/lib/analytics";
import { clearRefinementState } from "@/lib/match/app/refinement-session";
import {
  answersToApiPayload,
  clearMatchQuestionnaireAnswers,
  EMPTY_MATCH_ANSWERS,
  loadMatchAnswers,
  saveMatchAnswers,
  saveMatchResult,
  type MatchQuestionnaireAnswers,
} from "@/lib/match/app/session-storage";
import {
  clearStep2Draft,
  commitStep2Measurement,
  EMPTY_STEP2_DRAFT,
  hydrateStep2,
  loadStep2Draft,
  saveStep2Draft,
  step2ContinueError,
  type Step2Draft,
} from "@/lib/match/app/step2-measurement";
import type {
  CurvatureEnum,
  StartDirectionEnum,
  StrikeHandedness,
  StrikePatternEnum,
  TrajectoryEnum,
} from "@/lib/match/app/visual-option-maps";

const STEPS = [
  "Handedness",
  "Speed & distance",
  "Ball flight",
  "Strike & goal",
  "Current club",
] as const;

const ADMIN_PREVIEW_PROPS = { surface: "admin_preview" as const };

export function MatchQuestionnaire() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MatchQuestionnaireAnswers>(EMPTY_MATCH_ANSWERS);
  const [step2Draft, setStep2Draft] = useState<Step2Draft>(EMPTY_STEP2_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const fresh =
      new URLSearchParams(window.location.search).get("fresh") === "1";
    if (fresh) {
      clearMatchQuestionnaireAnswers();
      clearStep2Draft();
      clearRefinementState();
      setAnswers({ ...EMPTY_MATCH_ANSWERS });
      setStep2Draft({ ...EMPTY_STEP2_DRAFT });
      setStep(0);
      router.replace("/admin/match/questionnaire");
    } else {
      const hydrated = hydrateStep2(loadMatchAnswers(), loadStep2Draft());
      setAnswers(hydrated.answers);
      setStep2Draft(hydrated.draft);
      saveMatchAnswers(hydrated.answers);
      saveStep2Draft(hydrated.draft);
    }
    track("match_questionnaire_started", ADMIN_PREVIEW_PROPS);
  }, [router]);

  function startAgain() {
    clearMatchQuestionnaireAnswers();
    clearStep2Draft();
    clearRefinementState();
    setAnswers({ ...EMPTY_MATCH_ANSWERS });
    setStep2Draft({ ...EMPTY_STEP2_DRAFT });
    setStep(0);
    setError(null);
  }

  function patch(p: Partial<MatchQuestionnaireAnswers>) {
    setAnswers((prev) => {
      const next = { ...prev, ...p };
      saveMatchAnswers(next);
      return next;
    });
  }

  function applyStep2Draft(nextDraft: Step2Draft) {
    setStep2Draft(nextDraft);
    saveStep2Draft(nextDraft);
    setAnswers((prev) => {
      const next = commitStep2Measurement(prev, nextDraft);
      saveMatchAnswers(next);
      return next;
    });
  }

  function next() {
    setError(null);
    if (step === 0 && !answers.handedness) {
      setError("Handedness is required.");
      return;
    }
    if (step === 1) {
      const measurementError = step2ContinueError(step2Draft);
      if (measurementError) {
        setError(measurementError);
        return;
      }
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else submit();
  }

  function back() {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  }

  function submit() {
    const committed = commitStep2Measurement(answers, step2Draft);
    startTransition(async () => {
      setError(null);
      setAnswers(committed);
      saveMatchAnswers(committed);
      const res = await fetch("/api/admin/match/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToApiPayload(committed) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          (data.validation_errors || [data.error || "Request failed"]).join(
            "; "
          )
        );
        return;
      }
      saveMatchResult(
        data.result,
        data.inventory_status === "unavailable" ? "unavailable" : "ready"
      );
      clearRefinementState();
      track("match_questionnaire_completed", {
        ...ADMIN_PREVIEW_PROPS,
        mode: data.result?.mode ?? null,
      });
      router.push("/admin/match/results");
    });
  }

  return (
    <div className="max-w-xl mx-auto">
      <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch mb-2">
        Teevo Fit
      </p>
      <h1 className="text-2xl font-semibold text-mowing-green mb-1">
        Driver questionnaire
      </h1>
      <p className="text-sm text-mowing-green/70 mb-4">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}. Unknown is fine where
        offered.
      </p>

      <div
        className="mb-5 flex gap-1"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
      >
        {STEPS.map((_, i) => (
          <div
            key={STEPS[i]}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-mowing-green" : "bg-mowing-green/15"
            }`}
          />
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-mowing-green/15 bg-white p-4">
        {step === 0 && (
          <RadioCards
            label="Which hand do you play?"
            required
            value={answers.handedness}
            onChange={(v) => patch({ handedness: v })}
            options={[
              { value: "RIGHT", title: "Right-handed" },
              { value: "LEFT", title: "Left-handed" },
            ]}
            error={error}
          />
        )}

        {step === 1 && (
          <Step2Measurement
            draft={step2Draft}
            handicap={answers.handicap}
            onDraft={applyStep2Draft}
            onHandicap={(handicap) => patch({ handicap })}
          />
        )}

        {step === 2 && (
          <>
            <VisualChoiceGroup
              label="Typical ball flight height"
              hint="Choose the flight you see most often — not the one you want."
              value={answers.typical_trajectory as TrajectoryEnum | ""}
              onChange={(v) => patch({ typical_trajectory: v })}
              options={trajectoryVisualOptions()}
            />
            <VisualChoiceGroup
              label="Typical start direction (your view)"
              hint="Where does your ball first travel from the tee?"
              value={answers.typical_start_direction as StartDirectionEnum | ""}
              onChange={(v) => patch({ typical_start_direction: v })}
              options={startDirectionVisualOptions()}
            />
            <VisualChoiceGroup
              label="Typical curve"
              hint="Which way does the ball bend through the air?"
              value={answers.typical_curvature as CurvatureEnum | ""}
              onChange={(v) => patch({ typical_curvature: v })}
              options={curvatureVisualOptions()}
            />
            <RadioCards
              label="How big is the miss when it goes offline?"
              value={answers.miss_severity}
              onChange={(v) => patch({ miss_severity: v })}
              options={[
                { value: "SMALL", title: "Small" },
                { value: "MODERATE", title: "Moderate" },
                { value: "LARGE", title: "Large" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <RadioCards
              label="Strike consistency"
              value={answers.strike_consistency}
              onChange={(v) => patch({ strike_consistency: v })}
              options={[
                { value: "HIGH", title: "Usually centred" },
                { value: "MEDIUM", title: "Mixed" },
                { value: "LOW", title: "Often off-centre" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
            />
            <VisualChoiceGroup
              label="Typical strike pattern"
              hint="Where on the driver face do you usually make contact?"
              value={answers.strike_pattern as StrikePatternEnum | ""}
              onChange={(v) => patch({ strike_pattern: v })}
              options={strikePatternVisualOptions(
                (answers.handedness || "RIGHT") as StrikeHandedness
              )}
            />
            <RadioCards
              label="Main goal with a new driver"
              value={answers.primary_objective}
              onChange={(v) => patch({ primary_objective: v })}
              options={[
                { value: "DISTANCE", title: "More distance" },
                { value: "FORGIVENESS", title: "More forgiveness" },
                { value: "ACCURACY", title: "More accuracy" },
                { value: "REDUCE_RIGHT_MISS", title: "Reduce right misses" },
                { value: "REDUCE_LEFT_MISS", title: "Reduce left misses" },
                { value: "HIGHER_FLIGHT", title: "Higher flight" },
                { value: "LOWER_FLIGHT", title: "Lower flight" },
                { value: "CONTROL", title: "More control" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
            />
          </>
        )}

        {step === 4 && (
          <>
            <Field
              label="Current driver loft (degrees)"
              hint="Optional"
              value={answers.current_loft_deg}
              onChange={(v) => patch({ current_loft_deg: v })}
              inputMode="decimal"
            />
            <RadioCards
              label="How happy are you with your current driver?"
              value={answers.current_club_satisfaction}
              onChange={(v) => patch({ current_club_satisfaction: v })}
              options={[
                { value: "HIGH", title: "Happy" },
                { value: "MEDIUM", title: "Okay" },
                { value: "LOW", title: "Unhappy" },
                { value: "UNKNOWN", title: "No current driver / not sure" },
              ]}
            />
            <Field
              label="Budget ceiling (£)"
              hint="Optional — marketplace only later"
              value={answers.budget_max_gbp}
              onChange={(v) => patch({ budget_max_gbp: v })}
              inputMode="decimal"
            />
          </>
        )}
      </div>

      {error && step !== 0 ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || pending}
          className="min-h-[48px] flex-1 rounded-xl border-2 border-mowing-green text-sm font-semibold text-mowing-green disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={pending || (step === 1 && step2ContinueError(step2Draft) != null)}
          className="min-h-[48px] flex-1 rounded-xl bg-mowing-green text-sm font-semibold text-off-white-pique disabled:opacity-60"
        >
          {pending
            ? "Finding your fit…"
            : step === STEPS.length - 1
              ? "See recommendations"
              : "Continue"}
        </button>
      </div>
      <button
        type="button"
        onClick={startAgain}
        disabled={pending}
        className="mt-3 min-h-[48px] text-sm font-semibold text-mowing-green underline disabled:opacity-40"
      >
        Start again
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-mowing-green">{label}</span>
      {hint ? (
        <span className="block text-xs text-mowing-green/60 mb-1">{hint}</span>
      ) : (
        <span className="block mb-1" />
      )}
      <input
        className="w-full min-h-[48px] rounded-xl border border-mowing-green/25 px-3 text-sm text-mowing-green"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
      />
    </label>
  );
}
