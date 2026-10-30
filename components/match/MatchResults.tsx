"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MatchRefinementPanel } from "@/components/match/MatchRefinementPanel";
import { GuidanceSummary } from "@/components/match/results/GuidanceSummary";
import { RecommendationHeadCard } from "@/components/match/results/RecommendationHeadCard";
import { BrandFilterEmpty } from "@/components/match/results/BrandFilterEmpty";
import { ResultsHeading, SuitableResultsHeading } from "@/components/match/results/ResultsHeading";
import type { HeadChoice } from "@/lib/match/app/present-head-choices";
import { SUITABLE_EXAMPLE_PRECEDENCE } from "@/lib/match/app/present-catalogue-selection";
import {
  ListingAvailabilityNotice,
  RefreshStatus,
  ResultsLoading,
} from "@/components/match/results/ResultsStatus";
import { track } from "@/lib/analytics";
import { presentNamedHeadCards } from "@/lib/match/app/present-head-card";
import { presentHeadChoices } from "@/lib/match/app/present-head-choices";
import { presentAttachedListingLabels } from "@/lib/match/app/present-listing-labels";
import { presentShaftOptionsSection } from "@/lib/match/app/present-shaft-options";
import {
  loadInventoryLoadStatus,
  loadMatchAnswers,
  MATCH_RESULTS_STORAGE_KEY,
  type MatchInventoryLoadStatus,
} from "@/lib/match/app/session-storage";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";
import type { OemShaftOptionAssessment } from "@/lib/match/app/select-oem-shaft-options";

const ADMIN_PREVIEW_PROPS = { surface: "admin_preview" as const };

export function MatchResults() {
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<CatalogueRecommendResult | null>(null);
  const [budgetGbp, setBudgetGbp] = useState<number | null>(null);
  const [inventoryStatus, setInventoryStatus] =
    useState<MatchInventoryLoadStatus>("ready");
  const [activity, setActivity] = useState({
    pending: false,
    refreshFailed: false,
    detail: null as string | null,
  });

  useEffect(() => {
    try {
      setInventoryStatus(loadInventoryLoadStatus());
      const rawBudget = loadMatchAnswers().budget_max_gbp.trim();
      const parsedBudget = Number(rawBudget);
      setBudgetGbp(rawBudget && Number.isFinite(parsedBudget) ? parsedBudget : null);
      const raw = sessionStorage.getItem(MATCH_RESULTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CatalogueRecommendResult;
        setResult(parsed);
        const named =
          parsed.mode === "NAMED_HEADS" ? parsed.recommendations : [];
        const cards =
          parsed.mode === "NAMED_HEADS"
            ? presentNamedHeadCards(
                named,
                parsed.explanations,
                parsed.normalised_requirements
              )
            : [];
        const attached =
          parsed.mode === "NAMED_HEADS"
            ? parsed.recommendations.flatMap(
                (rec) =>
                  parsed.inventory_attachments?.find(
                    (attachment) => attachment.catalogue_key === rec.catalogue_key
                  )?.items ?? []
              )
            : [];
        const choices =
          parsed.mode === "NAMED_HEADS"
            ? parsed.presentation_choices?.length
              ? parsed.presentation_choices
              : presentHeadChoices(named)
            : [];
        const roles = presentAttachedListingLabels(
          attached,
          rawBudget && Number.isFinite(parsedBudget) ? parsedBudget : null
        );
        const listingLabelCount = (code: "BEST_MATCH" | "BEST_VALUE" | "BUDGET_OPTION") =>
          Array.from(roles.values()).filter((labels) => labels.includes(code)).length;
        const shaftOptionRows = parsed.shaft_options ?? [];
        const namedShaftCount = shaftOptionRows.reduce(
          (n, row) => n + (row.options?.length ?? 0),
          0
        );
        track("match_recommendations_viewed", {
          ...ADMIN_PREVIEW_PROPS,
          mode: parsed.mode,
          named_count: parsed.recommendations?.length ?? 0,
          top_head_matches: cards.filter((card) => card.role === "BEST_SUPPORTED").length,
          alternative_head_matches: cards.filter((card) => card.role === "ALTERNATIVE").length,
          similarly_suitable: cards.filter((card) => card.role === "SIMILAR").length,
          best_match_heads: choices.filter((choice) => choice.category === "BEST_MATCH").length,
          newer_option_heads: choices.filter((choice) => choice.category === "NEWER_OPTION").length,
          alternative_match_heads: choices.filter((choice) => choice.category === "ALTERNATIVE_MATCH")
            .length,
          best_match_listings: listingLabelCount("BEST_MATCH"),
          best_value_listings: listingLabelCount("BEST_VALUE"),
          budget_option_listings: listingLabelCount("BUDGET_OPTION"),
          named_shaft_option_count: namedShaftCount,
          heads_with_named_shafts: shaftOptionRows.filter(
            (row) => (row.options?.length ?? 0) > 0
          ).length,
        });
      }
    } catch {
      setResult(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  if (!hydrated) {
    return <ResultsLoading />;
  }

  if (!result) {
    return (
      <div className="max-w-xl space-y-3">
        <p className="text-sm text-mowing-green/80">No results in this session.</p>
        <Link
          href="/fit"
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
  const choices =
    result.presentation_choices?.length === named.length
      ? result.presentation_choices
      : presentHeadChoices(named);
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

  const exampleHeads =
    result.mode === "CHARACTERISTIC_GUIDANCE" &&
    result.audit.insufficient_evidence_reason === "NO_MEANINGFUL_HEAD_DIFFERENTIATION"
      ? result.example_heads ?? []
      : [];
  const suitableExamples = exampleHeads.length > 0;
  const shownHeads = result.mode === "NAMED_HEADS" ? result.recommendations : exampleHeads;
  const listingRows = shownHeads.flatMap(
    (rec) =>
      result.inventory_attachments?.find(
        (attachment) => attachment.catalogue_key === rec.catalogue_key
      )?.items ?? []
  );
  const listingRoles = presentAttachedListingLabels(listingRows, budgetGbp);
  const anyListing = listingRows.length > 0;
  const pageHasSharedShaftGuidance = Boolean(
    result.mode === "NAMED_HEADS" || suitableExamples
  );
  const shaftOptionsByKey = new Map(
    (result.shaft_options ?? []).map((row) => [row.catalogue_key, row.options ?? []])
  );
  const normalisedRequirements = result.normalised_requirements;

  function shaftSectionFor(catalogueKey: string) {
    return presentShaftOptionsSection({
      options: (shaftOptionsByKey.get(catalogueKey) ??
        []) as OemShaftOptionAssessment[],
      requirements: normalisedRequirements,
      pageHasSharedShaftGuidance,
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      {suitableExamples ? (
        <>
          <SuitableResultsHeading count={exampleHeads.length} />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {exampleHeads.map((rec, i) => (
              <li key={rec.catalogue_key} className="min-w-0">
                <RecommendationHeadCard
                  score={rec}
                  peers={exampleHeads}
                  explanation={result.explanations[i]}
                  requirements={result.normalised_requirements}
                  listings={
                    result.inventory_attachments?.find(
                      (attachment) => attachment.catalogue_key === rec.catalogue_key
                    )?.items ?? []
                  }
                  choice={unrankedChoice(rec.catalogue_key)}
                  listingRoles={listingRoles}
                  emptyListingsMode={
                    inventoryStatus === "unavailable"
                      ? "unchecked"
                      : anyListing
                        ? "head"
                        : "page"
                  }
                  shaftSection={shaftSectionFor(rec.catalogue_key)}
                  suppressEmptyShaftGuidance={pageHasSharedShaftGuidance}
                />
              </li>
            ))}
          </ul>
          <ListingAvailabilityNotice
            status={inventoryStatus}
            hasListings={anyListing}
          />
        </>
      ) : result.mode === "NAMED_HEADS" ? (
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
                  choice={choices[i]}
                  listingRoles={listingRoles}
                  emptyListingsMode={
                    inventoryStatus === "unavailable"
                      ? "unchecked"
                      : anyListing
                        ? "head"
                        : "page"
                  }
                  shaftSection={shaftSectionFor(rec.catalogue_key)}
                  suppressEmptyShaftGuidance={pageHasSharedShaftGuidance}
                />
              </li>
            ))}
          </ul>
          <ListingAvailabilityNotice
            status={inventoryStatus}
            hasListings={anyListing}
          />
        </>
      ) : result.audit.insufficient_evidence_reason === "BRAND_FILTER_NO_ELIGIBLE_HEADS" ? (
        <BrandFilterEmpty onResult={setResult} />
      ) : result.mode === "CHARACTERISTIC_GUIDANCE" ||
        result.mode === "NO_DEFENSIBLE_HEADS" ? (
        <GuidanceSummary result={result} />
      ) : (
        <div>
          <h1 className="text-2xl font-semibold text-mowing-green">
            Teevo could not show recommendations
          </h1>
          <p className="mt-1 text-sm text-mowing-green/80">
            Check the answers and try again. Previous fitting results are unchanged.
          </p>
        </div>
      )}

      {/* Guidance refine + optional post-recovery refine (secondary to named cards). */}
      <RefreshStatus
        pending={activity.pending}
        failed={activity.refreshFailed}
        detail={activity.detail}
      />
      <MatchRefinementPanel
        result={result}
        onResult={(next) => {
          setResult(next);
          setInventoryStatus(loadInventoryLoadStatus());
        }}
        onActivity={setActivity}
      />

      {result.mode === "NAMED_HEADS" || suitableExamples ? (
      <section className="rounded-xl border border-mowing-green/15 bg-white p-4 space-y-2">
        <h2 className="text-lg font-semibold text-mowing-green">
          What to look for in a shaft
        </h2>
        <p className="text-sm text-mowing-green/80">
          Shared guidance for every driver above. Named shaft options on a card are
          original manufacturer offerings for that head only.
        </p>
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
              presentation_choices: result.presentation_choices ?? null,
              example_selection: suitableExamples ? SUITABLE_EXAMPLE_PRECEDENCE : null,
              diversity_selection: result.diversity_selection?.map((item) => ({
                catalogue_key: item.head.catalogue_key,
                reasons: item.reasons,
              })) ?? null,
              shaft_options_audit: result.shaft_options_audit ?? null,
              shaft_options: (result.shaft_options ?? []).map((row) => ({
                catalogue_key: row.catalogue_key,
                withheld_reason: row.withheld_reason,
                options: row.options.map((option) => ({
                  shaft_key: option.shaft_key,
                  suitability_score: option.suitability_score,
                  suitability_band: option.suitability_band,
                  assessment_confidence: option.assessment_confidence,
                  active_fitting_dimensions: option.active_fitting_dimensions,
                  selection_reasons: option.selection_reasons,
                  limitations: option.limitations,
                  configuration_claim: option.configuration_claim,
                  offering_verification_status: option.offering_verification_status,
                  dimensions: {
                    flex: option.dimensions.flex,
                    weight: option.dimensions.weight,
                    shaft_launch: option.dimensions.shaft_launch,
                    shaft_spin: option.dimensions.shaft_spin,
                  },
                  diagnostics: option.diagnostics,
                  evidence_refs: option.evidence_refs,
                })),
              })),
              heads: shownHeads.map((head) => ({
                catalogue_key: head.catalogue_key,
                fit: head.catalogue_fit_score,
                band: head.catalogue_match_band,
                active_dims: head.active_catalogue_dim_count,
                confidence: head.head_recommendation_confidence,
                golfer_confidence: head.confidence_components.golfer,
                equipment_confidence: head.confidence_components.equipment,
                dimensions: Object.fromEntries(
                  Object.entries(head.dimensions)
                    .filter(([, trace]) => trace.active)
                    .map(([name, trace]) => [
                      name,
                      { score: trace.score, reliability: trace.reliability },
                    ])
                ),
              })),
            },
            null,
            2
          )}
        </pre>
      </details>

      <Link
        href="/fit"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
      >
      Revise answers
    </Link>
    </div>
  );
}

function unrankedChoice(catalogueKey: string): HeadChoice {
  return {
    catalogueKey,
    category: null,
    label: null,
    tiedForTopSuitability: false,
    note: null,
    substitution: null,
  };
}
