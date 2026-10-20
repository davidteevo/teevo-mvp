import type { VisualChoiceOption } from "./VisualChoiceGroup";
import {
  TrajectoryDiagram,
  type TrajectoryDiagramValue,
} from "./TrajectoryDiagram";
import {
  TRAJECTORY_ENUMS,
  TRAJECTORY_LABELS,
  type TrajectoryEnum,
} from "@/lib/match/app/visual-option-maps";

/**
 * Visual options for typical_trajectory — questionnaire + refinement reuse.
 * Labels match the previous RadioCards titles (Low / Mid / High / Not sure).
 */
export function trajectoryVisualOptions(): VisualChoiceOption<TrajectoryEnum>[] {
  return TRAJECTORY_ENUMS.map((value) => ({
    value,
    title: TRAJECTORY_LABELS[value],
    diagram: (
      <TrajectoryDiagram
        value={value as TrajectoryDiagramValue}
        className="h-[72px] w-[120px]"
      />
    ),
  }));
}
