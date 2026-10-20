import { MATCH_HEAD_CONFIG_OVERLAY_VERSION } from "./head-config-overlay";
import { MATCH_UK_HEAD_RELEVANCE_VERSION } from "./uk-head-relevance";

export { MATCH_HEAD_CONFIG_OVERLAY_VERSION, MATCH_UK_HEAD_RELEVANCE_VERSION };

export const MATCH_CONTRACT_VERSION = "MATCH_DRIVER_CONTRACT_V1.3" as const;
export const MATCH_LOGIC_VERSION = "DRIVER_MATCH_LOGIC_V1.2" as const;
export const MATCH_HEADS_VERSION = "DRIVER_V1_2026-10-16" as const;
export const MATCH_SHAFTS_VERSION = "SHAFT_V1_2026-10-16" as const;
export const MATCH_MARKETPLACE_BRAND_FILTER_VERSION =
  "MATCH_MARKETPLACE_BRAND_FILTER_V1" as const;

export function matchAdapterVersions() {
  return {
    contract: MATCH_CONTRACT_VERSION,
    logic: MATCH_LOGIC_VERSION,
    heads: MATCH_HEADS_VERSION,
    shafts: MATCH_SHAFTS_VERSION,
    head_config_overlay: MATCH_HEAD_CONFIG_OVERLAY_VERSION,
    uk_head_relevance: MATCH_UK_HEAD_RELEVANCE_VERSION,
  };
}
