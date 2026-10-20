import type { VisualChoiceOption } from "./VisualChoiceGroup";
import {
  BallCurveDiagram,
  type BallCurveDiagramValue,
} from "./BallCurveDiagram";
import {
  CURVATURE_ENUMS,
  CURVATURE_LABELS,
  CURVATURE_VARIABLE_CLARIFY_ORDER,
  type CurvatureEnum,
} from "@/lib/match/app/visual-option-maps";

export function curvatureVisualOptions(
  labels: Record<CurvatureEnum, string> = CURVATURE_LABELS,
  order: readonly CurvatureEnum[] = CURVATURE_ENUMS
): VisualChoiceOption<CurvatureEnum>[] {
  return order.map((value) => ({
    value,
    title: labels[value],
    diagram: (
      <BallCurveDiagram
        value={value as BallCurveDiagramValue}
        className="h-[72px] w-[120px]"
      />
    ),
  }));
}

/** Pathway B variable-clarify option order + labels. */
export function curvatureVariableClarifyVisualOptions(
  labels: Record<CurvatureEnum, string>
): VisualChoiceOption<CurvatureEnum>[] {
  return curvatureVisualOptions(labels, CURVATURE_VARIABLE_CLARIFY_ORDER);
}

/**
 * Straight-optional refine: KEEP uses STRAIGHT diagram; LEFT/RIGHT use curve;
 * UNKNOWN uses unknown. KEEP is refinement-only (not a curvature enum).
 */
export function curvatureStraightOptionalVisualOptions(): VisualChoiceOption<
  "KEEP" | "LEFT" | "RIGHT" | "UNKNOWN"
>[] {
  return [
    {
      value: "KEEP",
      title: "Keep mostly straight",
      diagram: (
        <BallCurveDiagram value="STRAIGHT" className="h-[72px] w-[120px]" />
      ),
    },
    {
      value: "LEFT",
      title: "Actually curves left more",
      diagram: (
        <BallCurveDiagram value="LEFT" className="h-[72px] w-[120px]" />
      ),
    },
    {
      value: "RIGHT",
      title: "Actually curves right more",
      diagram: (
        <BallCurveDiagram value="RIGHT" className="h-[72px] w-[120px]" />
      ),
    },
    {
      value: "UNKNOWN",
      title: "Not sure",
      diagram: (
        <BallCurveDiagram value="UNKNOWN" className="h-[72px] w-[120px]" />
      ),
    },
  ];
}
