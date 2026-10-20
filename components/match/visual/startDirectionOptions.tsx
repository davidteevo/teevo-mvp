import type { VisualChoiceOption } from "./VisualChoiceGroup";
import {
  BallStartDiagram,
  type BallStartDiagramValue,
} from "./BallStartDiagram";
import {
  START_DIRECTION_ENUMS,
  START_DIRECTION_LABELS,
  type StartDirectionEnum,
} from "@/lib/match/app/visual-option-maps";

export function startDirectionVisualOptions(
  labels: Record<StartDirectionEnum, string> = START_DIRECTION_LABELS
): VisualChoiceOption<StartDirectionEnum>[] {
  return START_DIRECTION_ENUMS.map((value) => ({
    value,
    title: labels[value],
    diagram: (
      <BallStartDiagram
        value={value as BallStartDiagramValue}
        className="h-[72px] w-[120px]"
      />
    ),
  }));
}
