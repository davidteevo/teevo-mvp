/**
 * Harness adapter: stdin JSON → production lib/match functions → stdout JSON.
 * Does not read expected fixtures or import package authoring scripts.
 */
import { readFileSync } from "fs";
import {
  aggregateConfidence,
  aggregateFit,
  brandMarketplace,
  carryRegion,
  confidenceFromScore,
  guardrailForGap,
  isMatchEligible,
  loadMatchIntelligence,
  loftReachable,
  matchBandFromScore,
  mergeLabels,
  moneySavingQualifies,
  normalizeRequirements,
  parseNumber,
  resolveIdentity,
  runMatchSession,
  scoreDimensionCurve,
  selectMarketplaceSlots,
  speedRegion,
  targetCategories,
} from "../lib/match";
import type {
  DimensionCurveName,
} from "../lib/match/scoring/curves";
import type { InventoryListing, MarketplaceCandidate } from "../lib/match/types";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function runProbe(
  stage: string,
  inputs: Record<string, unknown>,
  intelligence: ReturnType<typeof loadMatchIntelligence>
): unknown {
  switch (stage) {
    case "band":
      return { band: matchBandFromScore(Number(inputs.score)) };
    case "confidence_band":
      return { confidence: confidenceFromScore(Number(inputs.score)) };
    case "dimension":
      return {
        score: scoreDimensionCurve(
          inputs.dimension as DimensionCurveName,
          Number(inputs.gap)
        ),
      };
    case "aggregate": {
      const dims = (inputs.dimensions as Array<{
        weight: number;
        reliability: number;
        score: number;
      }>) || [];
      const result = aggregateFit(dims);
      if (!result.scorable) {
        return {
          score: null,
          scorable: false,
          reason: result.reason,
        };
      }
      return { score: result.score };
    }
    case "guardrail":
      return guardrailForGap(
        inputs.dimension as "flex" | "loft" | "direction",
        Number(inputs.gap)
      );
    case "loft":
      return {
        reachable: loftReachable({
          mode: String(inputs.mode),
          stated: Number(inputs.stated),
          min: inputs.min != null ? Number(inputs.min) : undefined,
          max: inputs.max != null ? Number(inputs.max) : undefined,
          settings: inputs.settings as number[] | undefined,
        }),
      };
    case "marketplace": {
      const { slots, unique_cards } = selectMarketplaceSlots(
        inputs.candidates as MarketplaceCandidate[],
        (inputs.budget as number | null) ?? null
      );
      return { slots, unique_cards };
    }
    case "brand_marketplace":
      return brandMarketplace({
        selected_brand_ids: inputs.selected_brand_ids as
          | string[]
          | null
          | undefined,
        known_brand_ids: inputs.known_brand_ids as string[],
        candidates: inputs.candidates as MarketplaceCandidate[],
        budget: (inputs.budget as number | null) ?? null,
      });
    case "eligibility":
      return {
        eligible: isMatchEligible(
          inputs as unknown as Parameters<typeof isMatchEligible>[0]
        ),
      };
    case "parse_number":
      return parseNumber(inputs.raw);
    case "target_category":
      return targetCategories(
        inputs.value === null || inputs.value === undefined
          ? null
          : Number(inputs.value)
      );
    case "speed_region":
      return speedRegion(Number(inputs.speed));
    case "carry_region":
      return carryRegion(Number(inputs.carry));
    case "requirements":
      return {
        normalised_requirements: normalizeRequirements(
          inputs.raw_inputs as Record<string, unknown>,
          intelligence.headsByKey
        ),
      };
    case "confidence_aggregate":
      return aggregateConfidence({
        golfer: Number(inputs.golfer),
        equipment: Number(inputs.equipment),
        listing: Number(inputs.listing),
      });
    case "merge_labels":
      return mergeLabels(
        inputs.slots as {
          BEST_MATCH: string | null;
          BEST_VALUE: string | null;
          BUDGET_OPTION: string | null;
        }
      );
    case "money_saving":
      return {
        qualifies: moneySavingQualifies(
          Number(inputs.best_price_pence),
          Number(inputs.candidate_price_pence)
        ),
      };
    case "identity_resolution":
      return resolveIdentity(
        inputs.matches as Array<{ key: string; eligibility: string }>
      );
    default:
      throw new Error(`Unknown probe stage: ${stage}`);
  }
}

async function main() {
  const payload = JSON.parse(await readStdin()) as {
    archetypes: Array<{
      id: string;
      raw_inputs: Record<string, unknown>;
      inventory: InventoryListing[];
    }>;
    probes: Array<{ id: string; stage: string; inputs: Record<string, unknown> }>;
    reference_directory: string;
  };

  const intelligence = loadMatchIntelligence(payload.reference_directory);

  const archetypes: Record<string, unknown> = {};
  for (const arch of payload.archetypes) {
    archetypes[arch.id] = runMatchSession({
      raw_inputs: arch.raw_inputs,
      inventory: arch.inventory,
      intelligence,
    });
  }

  const probes: Record<string, unknown> = {};
  for (const probe of payload.probes) {
    probes[probe.id] = runProbe(probe.stage, probe.inputs, intelligence);
  }

  process.stdout.write(JSON.stringify({ archetypes, probes }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
