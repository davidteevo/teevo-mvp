import { presentCharacteristicGuidance } from "@/lib/match/app/present-guidance";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";

type Props = {
  result: CatalogueRecommendResult;
};

export function GuidanceSummary({ result }: Props) {
  const guidance = presentCharacteristicGuidance({
    mode: result.mode,
    insufficientEvidenceReason: result.audit.insufficient_evidence_reason,
    guidance: result.characteristic_guidance,
    shaft: result.shaft_guidance,
  });

  return (
    <section className="space-y-3" aria-labelledby="match-guidance-title">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
        Admin preview
      </p>
      <h1
        id="match-guidance-title"
        className="text-2xl font-semibold leading-tight text-mowing-green"
      >
        {guidance.title}
      </h1>
      <p className="text-sm leading-5 text-mowing-green/90">{guidance.reason}</p>
      {guidance.characteristics.length > 0 ? (
        <ul className="space-y-2">
          {guidance.characteristics.map((line) => (
            <li
              key={line}
              className="rounded-xl bg-par-3-punch/10 px-3 py-2 text-sm text-mowing-green"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-mowing-green/80">{guidance.limitation}</p>
      {guidance.details.length > 0 ? (
        <details className="rounded-xl border border-mowing-green/15 bg-white px-3 py-2 text-sm text-mowing-green">
          <summary className="min-h-[44px] cursor-pointer font-semibold leading-[44px]">
            Technical details
          </summary>
          <ul className="list-disc space-y-1 pb-2 pl-5 text-mowing-green/80">
            {guidance.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
