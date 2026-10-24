"use client";

import { FitQuestionSection } from "@/components/match/FitQuestionSection";
import { FitAnswerIcon, type FitAnswerIconName } from "@/components/match/visual/FitAnswerIcon";
import { VisualChoiceGroup } from "@/components/match/visual/VisualChoiceGroup";
import {
  step2ContinueError,
  step2Messages,
  type SpeedBandChoice,
  type Step2Draft,
  type SwingKnowledge,
} from "@/lib/match/app/step2-measurement";

type Props = {
  draft: Step2Draft;
  handicap: string;
  onDraft: (draft: Step2Draft) => void;
  onHandicap: (value: string) => void;
};

const CHOICES: Array<{
  value: Exclude<SwingKnowledge, "" | "SPEED">;
  title: string;
  icon: FitAnswerIconName;
}> = [
  {
    value: "MEASURED",
    title: "I have a measured clubhead speed.",
    icon: "speed-measured",
  },
  {
    value: "ESTIMATED",
    title: "I can estimate my clubhead speed.",
    icon: "speed-estimated",
  },
  {
    value: "DISTANCE",
    title: "I know my typical carry distance.",
    icon: "carry",
  },
  {
    value: "BAND",
    title: "I only know roughly: slow, medium or fast.",
    icon: "speed-band",
  },
  {
    value: "UNKNOWN",
    title: "I'm not sure.",
    icon: "unsure",
  },
];

const BANDS: Array<{
  value: Exclude<SpeedBandChoice, "">;
  title: string;
  icon: FitAnswerIconName;
}> = [
  { value: "SLOW", title: "Slow", icon: "band-slow" },
  { value: "MEDIUM", title: "Medium", icon: "band-medium" },
  { value: "FAST", title: "Fast", icon: "band-fast" },
];

export function Step2Measurement({
  draft,
  handicap,
  onDraft,
  onHandicap,
}: Props) {
  const messages = step2Messages(draft);
  const validationError = step2ContinueError(draft);

  function choose(value: Exclude<SwingKnowledge, "">) {
    onDraft({ ...draft, knowledge: value });
  }

  function skipMeasurement() {
    onDraft({ ...draft, knowledge: "UNKNOWN" });
  }

  const speedFollowUp =
    draft.knowledge === "SPEED" || draft.knowledge === "MEASURED" ? (
      <Field
        label="Measured clubhead speed (mph)"
        hint="From a launch monitor or radar. Clubhead speed, not ball speed."
        value={draft.speedDraft}
        onChange={(speedDraft) => onDraft({ ...draft, speedDraft })}
        inputMode="decimal"
        error={validationError}
      />
    ) : draft.knowledge === "ESTIMATED" ? (
      <Field
        label="Estimated clubhead speed (mph)"
        hint="Your estimate. This is not recorded as a measured speed."
        value={draft.speedDraft}
        onChange={(speedDraft) => onDraft({ ...draft, speedDraft })}
        inputMode="decimal"
        error={validationError}
      />
    ) : draft.knowledge === "DISTANCE" ? (
      <Field
        label="Typical driver carry (yards)"
        hint="Airborne carry in yards. This is not converted into a clubhead speed."
        value={draft.carryDraft}
        onChange={(carryDraft) => onDraft({ ...draft, carryDraft })}
        inputMode="decimal"
        error={validationError}
      />
    ) : draft.knowledge === "BAND" ? (
      <VisualChoiceGroup
        tile="icon"
        headingLevel={3}
        label="Approximate clubhead speed"
        hint="A range for flex and weight guidance. It does not rule a shaft in or out."
        value={draft.band ?? ""}
        onChange={(band) => onDraft({ ...draft, band })}
        options={BANDS.map((band) => ({
          value: band.value,
          title: band.title,
          diagram: <FitAnswerIcon name={band.icon} />,
        }))}
      />
    ) : draft.knowledge === "UNKNOWN" ? (
      <p className="text-sm leading-snug text-mowing-green/80">
        That&apos;s fine. We won&apos;t guess a swing speed from your other answers.
      </p>
    ) : null;

  return (
    <div>
      <FitQuestionSection first eyebrow="Speed">
        <VisualChoiceGroup
          tile="icon"
          label="How should we use your driver speed?"
          hint="A measured speed, an estimate, a carry distance, or a rough category. Carry stays carry."
          value={draft.knowledge === "SPEED" ? "MEASURED" : draft.knowledge}
          onChange={choose}
          followUp={speedFollowUp}
          options={CHOICES.map((choice) => ({
            value: choice.value,
            title: choice.title,
            diagram: <FitAnswerIcon name={choice.icon} />,
          }))}
        />

        {validationError ? (
          <button
            type="button"
            onClick={skipMeasurement}
            className="mt-3 min-h-[48px] text-sm font-semibold text-mowing-green underline"
          >
            Skip this measurement
          </button>
        ) : null}

        {messages.length > 0 ? (
          <div className="mt-3 space-y-2" role="status">
            {messages.map((message) => (
              <p
                key={message}
                className="rounded-xl border border-[#d7e5d9] bg-[#f7fbf8] px-3 py-2 text-sm text-mowing-green"
              >
                {message}
              </p>
            ))}
          </div>
        ) : null}
      </FitQuestionSection>

      <FitQuestionSection eyebrow="Playing level">
        <Field
          tone="question"
          label="Handicap"
          hint="Optional. Helps us understand your playing characteristics."
          value={handicap}
          onChange={onHandicap}
          inputMode="decimal"
        />
      </FitQuestionSection>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  inputMode,
  error,
  tone = "detail",
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "text";
  error?: string | null;
  tone?: "question" | "detail";
}) {
  const errorId = error ? `${label}-error` : undefined;
  const question = tone === "question";
  return (
    <label className="block">
      <span
        className={
          question
            ? "text-lg font-semibold leading-snug text-mowing-green"
            : "text-sm font-semibold text-mowing-green"
        }
      >
        {label}
      </span>
      <span
        className={
          question
            ? "mb-3 mt-1 block text-sm leading-snug text-mowing-green/65"
            : "mb-1.5 block text-sm leading-snug text-mowing-green/65"
        }
      >
        {hint}
      </span>
      <input
        className="min-h-[48px] w-full rounded-xl border border-mowing-green/25 px-3 text-sm text-mowing-green aria-[invalid=true]:border-red-600"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      />
      {error ? (
        <span id={errorId} className="mt-1.5 block text-sm text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
