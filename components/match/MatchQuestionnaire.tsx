"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RadioCards } from "@/components/listing/club-specs/RadioCards";
import {
  answersToApiPayload,
  EMPTY_MATCH_ANSWERS,
  loadMatchAnswers,
  saveMatchAnswers,
  type MatchQuestionnaireAnswers,
} from "@/lib/match/app/session-storage";

const STEPS = [
  "Handedness",
  "Speed & distance",
  "Ball flight",
  "Strike & goal",
  "Current club",
] as const;

export function MatchQuestionnaire() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MatchQuestionnaireAnswers>(EMPTY_MATCH_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAnswers(loadMatchAnswers());
  }, []);

  function patch(p: Partial<MatchQuestionnaireAnswers>) {
    setAnswers((prev) => {
      const next = { ...prev, ...p };
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
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else submit();
  }

  function back() {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  }

  function submit() {
    startTransition(async () => {
      setError(null);
      saveMatchAnswers(answers);
      const res = await fetch("/api/admin/match/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToApiPayload(answers) }),
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
      sessionStorage.setItem(
        "teevo_match_admin_results_v1",
        JSON.stringify(data.result)
      );
      router.push("/admin/match/results");
    });
  }

  return (
    <div className="max-w-xl mx-auto">
      <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch mb-2">
        Admin Match preview
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
          <>
            <Field
              label="Driver clubhead speed (mph)"
              hint="Skip if unknown"
              value={answers.club_speed_mph}
              onChange={(v) => patch({ club_speed_mph: v })}
              inputMode="decimal"
            />
            <Field
              label="Typical driver carry (yards)"
              hint="Used only if speed is unknown"
              value={answers.carry_distance_yards}
              onChange={(v) => patch({ carry_distance_yards: v })}
              inputMode="decimal"
            />
            <Field
              label="Handicap"
              hint="Optional"
              value={answers.handicap}
              onChange={(v) => patch({ handicap: v })}
              inputMode="decimal"
            />
          </>
        )}

        {step === 2 && (
          <>
            <RadioCards
              label="Typical ball flight height"
              value={answers.typical_trajectory}
              onChange={(v) => patch({ typical_trajectory: v })}
              options={[
                { value: "LOW", title: "Low" },
                { value: "MID", title: "Mid" },
                { value: "HIGH", title: "High" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
            />
            <RadioCards
              label="Typical start direction (your view)"
              value={answers.typical_start_direction}
              onChange={(v) => patch({ typical_start_direction: v })}
              options={[
                { value: "LEFT", title: "Left" },
                { value: "CENTRE", title: "Centre" },
                { value: "RIGHT", title: "Right" },
                { value: "VARIABLE", title: "Varies" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
            />
            <RadioCards
              label="Typical curve"
              value={answers.typical_curvature}
              onChange={(v) => patch({ typical_curvature: v })}
              options={[
                { value: "LEFT", title: "Curves left" },
                { value: "STRAIGHT", title: "Mostly straight" },
                { value: "RIGHT", title: "Curves right" },
                { value: "VARIABLE", title: "Varies" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
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
            <RadioCards
              label="Typical strike pattern"
              value={answers.strike_pattern}
              onChange={(v) => patch({ strike_pattern: v })}
              options={[
                { value: "CENTRE", title: "Centre" },
                { value: "HEEL", title: "Heel" },
                { value: "TOE", title: "Toe" },
                { value: "HIGH_FACE", title: "High on face" },
                { value: "LOW_FACE", title: "Low on face" },
                { value: "VARIABLE", title: "Varies a lot" },
                { value: "UNKNOWN", title: "Not sure" },
              ]}
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
          disabled={pending}
          className="min-h-[48px] flex-1 rounded-xl bg-mowing-green text-sm font-semibold text-off-white-pique disabled:opacity-60"
        >
          {pending
            ? "Matching…"
            : step === STEPS.length - 1
              ? "See recommendations"
              : "Continue"}
        </button>
      </div>
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
