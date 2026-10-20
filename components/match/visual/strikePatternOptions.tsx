import type { VisualChoiceOption } from "./VisualChoiceGroup";
import { StrikeFaceDiagram } from "./StrikeFaceDiagram";
import {
  STRIKE_PATTERN_ENUMS,
  STRIKE_PATTERN_LABELS,
  type StrikeHandedness,
  type StrikePatternEnum,
} from "@/lib/match/app/visual-option-maps";

export function strikePatternVisualOptions(
  handedness: StrikeHandedness = "RIGHT"
): VisualChoiceOption<StrikePatternEnum>[] {
  return STRIKE_PATTERN_ENUMS.map((value) => ({
    value,
    title: STRIKE_PATTERN_LABELS[value],
    diagram: (
      <StrikeFaceDiagram
        value={value}
        handedness={handedness}
        className="h-[72px] w-[120px]"
      />
    ),
  }));
}
