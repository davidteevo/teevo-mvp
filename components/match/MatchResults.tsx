"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MatchRefinementPanel } from "@/components/match/MatchRefinementPanel";
import { RecommendationHeadCard } from "@/components/match/results/RecommendationHeadCard";
import { ResultsHeading } from "@/components/match/results/ResultsHeading";
import { track } from "@/lib/analytics";
import {
  EQUAL_HEAD_SCORE_MESSAGE,
  namedHeadsScoredEqually,
} from "@/lib/match/app/present-head-card";
import { presentAttachedListingLabels } from "@/lib/match/app/present-listing-labels";
import { loadMatchAnswers } from "@/lib/match/app/session-storage";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";

const ADMIN_PREVIEW_PROPS = { surface: "admin_preview" as const };

export function MatchResults() {
  const [result, setResult] = useState<CatalogueRecommendResult | null>(null);
  const [budgetGbp, setBudgetGbp] = useState<number | null>(null);

  useEffect(() => {
    try {
      const rawBudget = loadMatchAnswers().budget_max_gbp.trim();
      const parsedBudget = Number(rawBudget);
      setBudgetGbp(rawBudget && Number.isFinite(parsedBudget) ? parsedBudget : null);
      const raw = sessionStorage.getItem("teevo_match_admin_results_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as CatalogueRecommendResult;
        setResult(parsed);
        track("match_recommendations_viewed", {
          ...ADMIN_PREVIEW_PROPS,
          mode: parsed.mode,
          named_count: parsed.recommendations?.length ?? 0,
        });
      }
    } catch {
      setResult(null);
    }
  }, []);

  if (!result) {
    return (
      <div className="max-w-xl space-y-3">
        <p className="text-sm text-mowing-green/80">No results in this session.</p>
        <Link
          href="/admin/match/questionnaire"
          className="text-sm font-semibold text-mowing-green underline"
        >
          Start questionnaire
        </Link>
      </div>
    );
  }

  const g = result.characteristic_guidance;
  const shaft = result.shaft_guidance;
  const named = result.mode === "NAMED_HEADS" ? result.recommendations : [];
  const hasEqualFitAmongNamed = namedHeadsScoredEqually(named);
  const olderAboveNewer = named.some((rec, i) =>
    named.slice(i + 1).some((later) => {
      const older = rec.release_year;
      const newer = later.release_year;
      return (
        older != null &&
        newer != null &&
        Number.isFinite(older) &&
        Number.isFinite(newer) &&
        older < newer
      );
    })
  );

  const listingRows =
    result.mode === "NAMED_HEADS"
      ? result.recommendations.flatMap(
          (rec) =>
            result.inventory_attachments?.find(
              (attachment) => attachment.catalogue_key === rec.catalogue_key
            )?.items ?? []
        )
      : [];
  const listingRoles = presentAttachedListingLabels(listingRows, budgetGbp);
  const anyListing = listingRows.length > 0;

  return (
    <div className="max-w-6xl space-y-6">
      {result.mode === "NAMED_HEADS" ? (
        <>
          <ResultsHeading />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.recommendations.map((rec, i) => (
              <li key={rec.catalogue_key} className="min-w-0">
                <RecommendationHeadCard
                  score={rec}
                  peers={result.recommendations}
                  explanation={result.explanations[i]}
                  requirements={result.normalised_requirements}
                  listings={
                    result.inventory_attachments?.find(
                      (attachment) => attachment.catalogue_key === rec.catalogue_key
                    )?.items ?? []
                  }
                  listingRoles={listingRoles}
                  showEmptyListing={anyListing}
                />
              </li>
            ))}
          </ul>
          {hasEqualFitAmongNamed ? (
            <div className="rounded-xl bg-par-3-punch/10 px-4 py-3 text-sm text-mowing-green">
              <p className="font-semibold">Similar suitability</p>
              <p className="mt-1 text-mowing-green/80">{EQUAL_HEAD_SCORE_MESSAGE}</p>
            </div>
          ) : null}
          {anyListing ? null : (
            <div className="rounded-xl border border-mowing-green/15 bg-white px-4 py-3 text-sm text-mowing-green">
              <p className="font-semibold">No matching Teevo listings right now</p>
              <p className="mt-1 text-mowing-green/80">
                The model-level recommendation still applies.
              </p>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch">
            Admin preview · not purchasable offers
          </p>
          <h1 className="text-2xl font-semibold text-mowing-green mt-1">
            Equipment recommendations
          </h1>
          <p className="text-sm text-mowing-green/70 mt-1">
            Mode: {result.mode.replace(/_/g, " ").toLowerCase()}.
          </p>
          <div className="mt-3 rounded-xl border border-par-3-punch/40 bg-par-3-punch/5 px-3 py-2 text-sm text-mowing-green">
            <p className="font-semibold">
              Assessed head characteristics only — not a complete club fitting
            </p>
            <p className="mt-1 text-mowing-green/80">
              Catalogue Fit scores model-level head characteristics that could be
              assessed from your answers. Loft and shaft suitability are not
              included. Recommendations do not prove a handedness, loft or shaft
              configuration exists. UK-market presence is not proof of live
              inventory. Confirm on real stock before buying.
            </p>
          </div>
        </div>
      )}

      {/* Guidance refine + optional post-recovery refine (secondary to named cards). */}
      <MatchRefinementPanel result={result} onResult={setResult} />

      {(result.mode === "CHARACTERISTIC_GUIDANCE" ||
        result.mode === "NO_DEFENSIBLE_HEADS") && (
        <div className="rounded-xl border border-par-3-punch/30 bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-mowing-green">
            Characteristic guidance
          </h2>
          <p className="text-sm text-mowing-green/80">
            {result.mode === "CHARACTERISTIC_GUIDANCE"
              ? result.audit.insufficient_evidence_reason ===
                "NO_MEANINGFUL_HEAD_DIFFERENTIATION"
                ? "Too many leading heads share similar incomplete Fit evidence for Teevo to name a shortlist confidently."
                : "Not enough independent head-fit evidence for named rankings yet."
              : "No catalogue heads cleared the defensive gates for this session."}
          </p>
          <ul className="list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
            {g.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="text-sm text-mowing-green/70">
            Direction: {g.directional_requirement}. Head launch:{" "}
            {g.head_launch_target}. Forgiveness target:{" "}
            {g.forgiveness_requirement ?? "unresolved"}.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-mowing-green/15 bg-white p-4 space-y-2">
        <h2 className="text-lg font-semibold text-mowing-green">
          Shaft profile guidance
        </h2>
        {!shaft.available ? (
          <p className="text-sm text-mowing-green/70">
            Add swing speed or carry to refine flex and weight.
          </p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
            {shaft.flex_label ? <li>{shaft.flex_label}</li> : null}
            {shaft.weight_label ? <li>{shaft.weight_label}</li> : null}
            {shaft.launch_label ? <li>{shaft.launch_label}</li> : null}
          </ul>
        )}
        <ul className="list-disc pl-5 text-xs text-mowing-green/60 space-y-1">
          {shaft.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      {result.mode !== "NAMED_HEADS" ? (
        <section className="rounded-xl border border-dashed border-mowing-green/25 p-4">
          <h2 className="text-sm font-semibold text-mowing-green">
            Available on Teevo
          </h2>
          <p className="text-sm text-mowing-green/70 mt-1">
            Inventory is shown alongside named head recommendations when
            available.
          </p>
        </section>
      ) : null}

      <details className="text-xs text-mowing-green/60">
        <summary className="cursor-pointer font-semibold">Admin audit</summary>
        {olderAboveNewer ? (
          <p className="mt-2">
            An older release year appears above a newer head. Fit scores are
            unchanged.
          </p>
        ) : null}
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-mowing-green/5 p-3">
          {JSON.stringify(
            {
              session: result.session,
              audit: result.audit,
              versions: result.versions,
              handedness: g.handedness,
            },
            null,
            2
          )}
        </pre>
      </details>

      <Link
        href="/admin/match/questionnaire"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
      >
        Revise answers
      </Link>
    </div>
  );
}
