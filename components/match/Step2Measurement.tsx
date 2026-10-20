"use client";

import { VisualChoiceGroup } from "@/components/match/visual/VisualChoiceGroup";
import {
  step2ContinueError,
  step2Messages,
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
  value: Exclude<SwingKnowledge, "">;
  title: string;
  icon: "speed" | "distance" | "unknown";
}> = [
  {
    value: "SPEED",
    title: "I know my swing speed.",
    icon: "speed",
  },
  {
    value: "DISTANCE",
    title: "I know my driver carry distance.",
    icon: "distance",
  },
  {
    value: "UNKNOWN",
    title: "I'm not sure.",
    icon: "unknown",
  },
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

  return (
    <div className="space-y-4">
      <VisualChoiceGroup
        label="Which measurement would you like to use?"
        hint="You can continue without a swing speed or carry distance."
        value={draft.knowledge}
        onChange={choose}
        options={CHOICES.map((choice) => ({
          value: choice.value,
          title: choice.title,
          diagram: <MeasurementIcon kind={choice.icon} />,
        }))}
      />

      {draft.knowledge === "SPEED" ? (
        <Field
          label="Driver clubhead speed (mph)"
          hint="Driver clubhead speed in mph — not ball speed."
          value={draft.speedDraft}
          onChange={(speedDraft) => onDraft({ ...draft, speedDraft })}
          inputMode="decimal"
          error={validationError}
        />
      ) : null}

      {draft.knowledge === "DISTANCE" ? (
        <Field
          label="Typical driver carry (yards)"
          hint="How far your ball travels through the air before landing, excluding roll."
          value={draft.carryDraft}
          onChange={(carryDraft) => onDraft({ ...draft, carryDraft })}
          inputMode="decimal"
          error={validationError}
        />
      ) : null}

      {validationError ? (
        <button
          type="button"
          onClick={skipMeasurement}
          className="min-h-[48px] text-sm font-semibold text-mowing-green underline"
        >
          Skip this measurement
        </button>
      ) : null}

      {draft.knowledge === "UNKNOWN" ? (
        <p className="text-sm text-mowing-green/80">
          That's fine. We won't guess a swing speed from your other answers.
        </p>
      ) : null}

      {messages.length > 0 ? (
        <div className="space-y-2" role="status">
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

      <Field
        label="Handicap"
        hint="Optional. Helps us understand your playing characteristics."
        value={handicap}
        onChange={onHandicap}
        inputMode="decimal"
      />
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
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "text";
  error?: string | null;
}) {
  const errorId = error ? `${label}-error` : undefined;
  return (
    <label className="block">
      <span className="text-sm font-medium text-mowing-green">{label}</span>
      <span className="mb-1 block text-xs text-mowing-green/60">{hint}</span>
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

function MeasurementIcon({ kind }: { kind: "speed" | "distance" | "unknown" }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      aria-hidden="true"
      className="block"
    >
      <rect width="44" height="44" rx="10" fill="#F0F8F1" />
      {kind === "speed" ? (
        <path
          d="M12 28c0-6.6 4.5-12 10-12s10 5.4 10 12"
          fill="none"
          stroke="#265C4B"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : null}
      {kind === "speed" ? (
        <path
          d="M22 26.5 28 18"
          fill="none"
          stroke="#49C184"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : null}
      {kind === "distance" ? (
        <path
          d="M14 30h16M16 30V16m0 0 8 4-8 4"
          fill="none"
          stroke="#265C4B"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {kind === "unknown" ? (
        <text
          x="22"
          y="29"
          textAnchor="middle"
          fill="#265C4B"
          fontSize="20"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          ?
        </text>
      ) : null}
    </svg>
  );
}
