import type { WorkflowStage } from "@/lib/admin-order-timeline";

export function OrderWorkflowTimeline({
  stages,
  currentStageLabel,
  nextActionLabel,
}: {
  stages: WorkflowStage[];
  currentStageLabel: string;
  nextActionLabel: string;
}) {
  return (
    <div className="rounded-lg border border-par-3-punch/20 bg-off-white-pique/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">Current stage</p>
      <p className="mt-0.5 text-sm font-semibold text-mowing-green">{currentStageLabel}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-mowing-green/70">Next action</p>
      <p className="mt-0.5 text-sm text-mowing-green">{nextActionLabel}</p>
      <ol className="mt-3 space-y-1.5">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 w-4 shrink-0 text-center text-mowing-green" aria-hidden>
              {stage.state === "done" ? "✓" : stage.state === "current" ? "●" : "○"}
            </span>
            <span
              className={
                stage.state === "done"
                  ? "text-mowing-green/70"
                  : stage.state === "current"
                    ? "font-medium text-mowing-green"
                    : "text-mowing-green/45"
              }
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
