import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FitAnswerIcon, type FitAnswerIconName } from "@/components/match/visual/FitAnswerIcon";
import { MatchQuestionnaire } from "@/components/match/MatchQuestionnaire";
import { Step2Measurement } from "@/components/match/Step2Measurement";
import { EMPTY_STEP2_DRAFT } from "@/lib/match/app/step2-measurement";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
}));

const ICONS: FitAnswerIconName[] = [
  "hand-right",
  "hand-left",
  "miss-small",
  "miss-moderate",
  "miss-large",
  "unsure",
  "speed-measured",
  "speed-estimated",
  "carry",
  "speed-band",
  "band-slow",
  "band-medium",
  "band-fast",
  "contact-solid",
  "contact-mixed",
  "contact-poor",
  "goal-distance",
  "goal-forgiveness",
  "goal-accuracy",
  "goal-control",
  "goal-flight",
  "flight-higher",
  "flight-lower",
  "keep",
  "miss-left",
  "miss-right",
];

function radioChunks(html: string): string[] {
  return html.split('role="radio"').slice(1);
}

describe("Teevo Fit answer tiles", () => {
  it("draws a mark for every text-answer icon, including speed estimate and rough category", () => {
    for (const name of ICONS) {
      const html = renderToStaticMarkup(<FitAnswerIcon name={name} />);
      expect(html, name).toMatch(/<(path|text|circle|rect) /);
      expect(html, name).not.toMatch(/<rect width="44"/);
    }
  });

  it("gives handedness a section label and a tile on each answer", () => {
    const html = renderToStaticMarkup(<MatchQuestionnaire />);
    expect(html).toContain("Handedness");
    expect(html).toContain("Which hand do you play?");
    expect(html).toContain("Sets the clubface view for strike location.");
    const choices = radioChunks(html);
    expect(choices.length).toBeGreaterThanOrEqual(2);
    for (const choice of choices.slice(0, 2)) {
      expect(choice).toContain("h-20 w-20");
      expect(choice).toMatch(/<(path|text|circle|rect) /);
    }
  });

  it("attaches the speed input to the selected answer and separates handicap", () => {
    const html = renderToStaticMarkup(
      <Step2Measurement
        draft={{ ...EMPTY_STEP2_DRAFT, knowledge: "MEASURED" }}
        handicap=""
        onDraft={() => undefined}
        onHandicap={() => undefined}
      />
    );
    expect(html).toContain("Speed");
    expect(html).toContain("Playing level");
    expect(html).toContain("border-l-2 border-par-3-punch");
    const measuredAt = html.indexOf("I have a measured clubhead speed.");
    const fieldAt = html.indexOf("Measured clubhead speed (mph)");
    const estimateAt = html.indexOf("I can estimate my clubhead speed.");
    expect(fieldAt).toBeGreaterThan(measuredAt);
    expect(fieldAt).toBeLessThan(estimateAt);
    const choices = radioChunks(html);
    expect(choices).toHaveLength(5);
    for (const choice of choices) {
      expect(choice).toMatch(/<(path|text|circle|rect) /);
    }
  });

  it("shows icon tiles for an estimated speed and a rough speed category", () => {
    const estimated = renderToStaticMarkup(
      <Step2Measurement
        draft={{ ...EMPTY_STEP2_DRAFT, knowledge: "ESTIMATED", speedDraft: "90" }}
        handicap="12"
        onDraft={() => undefined}
        onHandicap={() => undefined}
      />
    );
    expect(estimated).toContain("Estimated clubhead speed (mph)");
    expect(estimated).toContain("border-l-2 border-par-3-punch");

    const band = renderToStaticMarkup(
      <Step2Measurement
        draft={{ ...EMPTY_STEP2_DRAFT, knowledge: "BAND", band: "MEDIUM" }}
        handicap=""
        onDraft={() => undefined}
        onHandicap={() => undefined}
      />
    );
    expect(band).toContain("Approximate clubhead speed");
    expect(band).toContain(">Slow<");
    expect(band).toContain(">Fast<");
    expect(radioChunks(band).length).toBe(8);
  });
});
