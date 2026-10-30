"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FitQuestionSection } from "@/components/match/FitQuestionSection";
import { Step2Measurement } from "@/components/match/Step2Measurement";
import { BallCurveDiagram } from "@/components/match/visual/BallCurveDiagram";
import { FitAnswerIcon } from "@/components/match/visual/FitAnswerIcon";
import { VisualChoiceGroup } from "@/components/match/visual/VisualChoiceGroup";
import { curvatureVisualOptions } from "@/components/match/visual/curvatureOptions";
import { startDirectionVisualOptions } from "@/components/match/visual/startDirectionOptions";
import { strikePatternVisualOptions } from "@/components/match/visual/strikePatternOptions";
import { trajectoryVisualOptions } from "@/components/match/visual/trajectoryOptions";
import { track } from "@/lib/analytics";
import { TEEVO_FIT_PATH, TEEVO_FIT_RESULTS_PATH } from "@/lib/fit-access";
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
  "Speed",
  "Ball flight",
  "Contact and goal",
] as const;

const ADMIN_PREVIEW_PROPS = { surface: "admin_preview" as const };

export function MatchQuestionnaire() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MatchQuestionnaireAnswers>(EMPTY_MATCH_ANSWERS);
  const [step2Draft, setStep2Draft] = useState<Step2Draft>(EMPTY_STEP2_DRAFT);
  const [pendingFlightChange, setPendingFlightChange] = useState(false);
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
      router.replace(TEEVO_FIT_PATH);
    } else {
      const hydrated = hydrateStep2(loadMatchAnswers(), loadStep2Draft());
      setAnswers(hydrated.answers);
      setStep2Draft(hydrated.draft);
      saveMatchAnswers(hydrated.answers);
      saveStep2Draft(hydrated.draft);
    }
    track("match_questionnaire_started", ADMIN_PREVIEW_PROPS);
  }, [router]);

  // Each questionnaire step is a new "page": always start at the top so the
  // user sees the start of the step and knows to scroll down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

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
    if (
      step === STEPS.length - 1 &&
      pendingFlightChange &&
      answers.primary_objective !== "HIGHER_FLIGHT" &&
      answers.primary_objective !== "LOWER_FLIGHT"
    ) {
      setError("Choose a higher or lower flight, or pick a different goal.");
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
      router.push(TEEVO_FIT_RESULTS_PATH);
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

      <div className="rounded-xl border border-mowing-green/15 bg-white p-4">
        {step === 0 && (
          <FitQuestionSection first eyebrow="Handedness">
            <VisualChoiceGroup
              tile="icon"
              label="Which hand do you play?"
              hint="Sets the clubface view for strike location."
              required
              value={answers.handedness}
              onChange={(v) => patch({ handedness: v })}
              options={[
                {
                  value: "RIGHT",
                  title: "Right-handed",
                  diagram: <FitAnswerIcon name="hand-right" />,
                },
                {
                  value: "LEFT",
                  title: "Left-handed",
                  diagram: <FitAnswerIcon name="hand-left" />,
                },
              ]}
              error={error}
            />
          </FitQuestionSection>
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
            <FitQuestionSection first eyebrow="Ball flight">
              <VisualChoiceGroup
                label="Typical ball flight height"
                hint="Choose the flight you see most often — not the one you want."
                value={answers.typical_trajectory as TrajectoryEnum | ""}
                onChange={(v) => patch({ typical_trajectory: v })}
                options={trajectoryVisualOptions()}
              />
            </FitQuestionSection>
            <FitQuestionSection eyebrow="Start direction">
              <VisualChoiceGroup
                label="Typical start direction (your view)"
                hint="Where does your ball first travel from the tee?"
                value={answers.typical_start_direction as StartDirectionEnum | ""}
                onChange={(v) => patch({ typical_start_direction: v })}
                options={startDirectionVisualOptions()}
              />
            </FitQuestionSection>
            <FitQuestionSection eyebrow="Curve">
              <VisualChoiceGroup
                label="Typical curve"
                hint="Which way does the ball bend through the air?"
                value={answers.typical_curvature as CurvatureEnum | ""}
                onChange={(v) => patch({ typical_curvature: v })}
                options={curvatureVisualOptions()}
              />
            </FitQuestionSection>
            {answers.typical_curvature === "LEFT" ||
            answers.typical_curvature === "RIGHT" ||
            answers.typical_start_direction === "LEFT" ||
            answers.typical_start_direction === "RIGHT" ? (
              <FitQuestionSection eyebrow="Miss size">
                <VisualChoiceGroup
                  tile="icon"
                  label="How big is the miss when it goes offline?"
                  hint="How far offline that miss usually finishes."
                  value={answers.miss_severity}
                  onChange={(v) => patch({ miss_severity: v })}
                  options={[
                    {
                      value: "SMALL",
                      title: "Small",
                      diagram: <FitAnswerIcon name="miss-small" />,
                    },
                    {
                      value: "MODERATE",
                      title: "Moderate",
                      diagram: <FitAnswerIcon name="miss-moderate" />,
                    },
                    {
                      value: "LARGE",
                      title: "Large",
                      diagram: <FitAnswerIcon name="miss-large" />,
                    },
                    {
                      value: "UNKNOWN",
                      title: "I'm not sure",
                      diagram: <FitAnswerIcon name="unsure" />,
                    },
                  ]}
                />
              </FitQuestionSection>
            ) : null}
          </>
        )}

        {step === 3 && (
          <>
            <FitQuestionSection first eyebrow="Contact">
              <VisualChoiceGroup
                tile="icon"
                label="How consistent is your contact with the driver?"
                hint="How often the strike feels centred on the face."
                value={answers.strike_consistency}
                onChange={(v) => patch({ strike_consistency: v })}
                options={[
                  {
                    value: "HIGH",
                    title: "Most strikes feel solid",
                    diagram: <FitAnswerIcon name="contact-solid" />,
                  },
                  {
                    value: "MEDIUM",
                    title: "Some good strikes, some poor",
                    diagram: <FitAnswerIcon name="contact-mixed" />,
                  },
                  {
                    value: "LOW",
                    title: "I often struggle to make solid contact",
                    diagram: <FitAnswerIcon name="contact-poor" />,
                  },
                  {
                    value: "UNKNOWN",
                    title: "I'm not sure",
                    diagram: <FitAnswerIcon name="unsure" />,
                  },
                ]}
              />
            </FitQuestionSection>
            <FitQuestionSection eyebrow="Strike">
              <details className="rounded-xl border border-mowing-green/15 bg-white px-3 py-2">
                <summary className="flex min-h-[48px] cursor-pointer items-center text-lg font-semibold leading-snug text-mowing-green">
                  Where you usually strike the face (optional)
                </summary>
                <div className="pb-2 pt-1">
                  <VisualChoiceGroup
                    hideLabel
                    label="Strike location"
                    hint="Optional. We record this and do not use it to claim one driver is better."
                    value={answers.strike_pattern as StrikePatternEnum | ""}
                    onChange={(v) => patch({ strike_pattern: v })}
                    options={strikePatternVisualOptions(
                      (answers.handedness || "RIGHT") as StrikeHandedness
                    )}
                  />
                </div>
              </details>
            </FitQuestionSection>
            <FitQuestionSection eyebrow="Goal">
              <VisualChoiceGroup
                tile="icon"
                label="What do you most want from a new driver?"
                hint="The main thing you want the next driver to help with."
                value={
                  pendingFlightChange ||
                  answers.primary_objective === "HIGHER_FLIGHT" ||
                  answers.primary_objective === "LOWER_FLIGHT"
                    ? "CHANGE_FLIGHT"
                    : answers.primary_objective
                }
                onChange={(v) => {
                  if (v === "CHANGE_FLIGHT") {
                    setPendingFlightChange(true);
                    if (
                      answers.primary_objective !== "HIGHER_FLIGHT" &&
                      answers.primary_objective !== "LOWER_FLIGHT"
                    ) {
                      patch({ primary_objective: "UNKNOWN" });
                    }
                    return;
                  }
                  setPendingFlightChange(false);
                  patch({ primary_objective: v });
                }}
                options={[
                  {
                    value: "DISTANCE",
                    title: "More distance",
                    diagram: <FitAnswerIcon name="goal-distance" />,
                  },
                  {
                    value: "FORGIVENESS",
                    title: "More forgiveness",
                    diagram: <FitAnswerIcon name="goal-forgiveness" />,
                  },
                  {
                    value: "ACCURACY",
                    title: "Straighter shots",
                    diagram: <FitAnswerIcon name="goal-accuracy" />,
                  },
                  {
                    value: "CONTROL",
                    title: "More control",
                    diagram: <FitAnswerIcon name="goal-control" />,
                  },
                  {
                    value: "CHANGE_FLIGHT",
                    title: "Change my ball flight",
                    diagram: <FitAnswerIcon name="goal-flight" />,
                  },
                  {
                    value: "UNKNOWN",
                    title: "I'm not sure",
                    diagram: <FitAnswerIcon name="unsure" />,
                  },
                ]}
                followUp={
                  pendingFlightChange ||
                  answers.primary_objective === "HIGHER_FLIGHT" ||
                  answers.primary_objective === "LOWER_FLIGHT" ? (
                    <VisualChoiceGroup
                      tile="icon"
                      headingLevel={3}
                      label="Which way do you want the flight to change?"
                      hint="Compared with the flight you have now."
                      value={
                        answers.primary_objective === "HIGHER_FLIGHT" ||
                        answers.primary_objective === "LOWER_FLIGHT"
                          ? answers.primary_objective
                          : ""
                      }
                      onChange={(v) => {
                        setPendingFlightChange(false);
                        patch({ primary_objective: v });
                      }}
                      options={[
                        {
                          value: "HIGHER_FLIGHT",
                          title: "Higher",
                          diagram: <FitAnswerIcon name="flight-higher" />,
                        },
                        {
                          value: "LOWER_FLIGHT",
                          title: "Lower",
                          diagram: <FitAnswerIcon name="flight-lower" />,
                        },
                      ]}
                    />
                  ) : answers.primary_objective === "ACCURACY" &&
                    answers.typical_curvature === "UNKNOWN" ? (
                    <VisualChoiceGroup
                      headingLevel={3}
                      label="Which way does the miss usually go?"
                      hint="The side the ball usually finishes toward."
                      value={answers.typical_curvature}
                      onChange={(v) => patch({ typical_curvature: v })}
                      options={[
                        {
                          value: "LEFT",
                          title: "Left",
                          diagram: (
                            <BallCurveDiagram
                              value="LEFT"
                              className="h-[72px] w-[120px]"
                            />
                          ),
                        },
                        {
                          value: "RIGHT",
                          title: "Right",
                          diagram: (
                            <BallCurveDiagram
                              value="RIGHT"
                              className="h-[72px] w-[120px]"
                            />
                          ),
                        },
                        {
                          value: "VARIABLE",
                          title: "Both ways",
                          diagram: (
                            <BallCurveDiagram
                              value="VARIABLE"
                              className="h-[72px] w-[120px]"
                            />
                          ),
                        },
                        {
                          value: "UNKNOWN",
                          title: "I'm not sure",
                          diagram: (
                            <BallCurveDiagram
                              value="UNKNOWN"
                              className="h-[72px] w-[120px]"
                            />
                          ),
                        },
                      ]}
                    />
                  ) : answers.primary_objective === "DISTANCE" ? (
                    <p className="text-sm leading-snug text-mowing-green/80">
                      More distance is saved as your goal. It does not add a predicted yardage gain.
                    </p>
                  ) : null
                }
              />
            </FitQuestionSection>
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

