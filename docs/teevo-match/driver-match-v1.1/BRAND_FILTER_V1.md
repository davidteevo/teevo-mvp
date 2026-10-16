# Approved marketplace addendum — optional brand filter V1

Approved by the founder in this conversation; incorporated 16 October 2026.
Marketplace policy/schema identifier: MATCH_MARKETPLACE_BRAND_FILTER_V1.
Current fitting contract: MATCH_DRIVER_CONTRACT_V1.3. Current fitting logic: DRIVER_MATCH_LOGIC_V1.2. See RULES_V1_2.md; the brand-filter policy itself is unchanged.

This separately versioned marketplace addendum supplements the pinned pre-addendum source snapshots. It changes marketplace selection and presentation, not the golfer fitting vector, Fit calculations, confidence or frozen datasets. It is also recorded in the live Contract §17, Logic §56 and Architecture. Read this alongside the baseline references. D01–D07 are resolved separately in RULES_V1_2.md.

## Product behaviour

On the results screen, offer an optional multi-select control labelled “Filter by brand”. Default: “All brands”. This is a strict filter, not a soft preference or popularity boost. Do not add a compulsory questionnaire step. Selecting brands updates the results without repeating the questionnaire. Clearing the selection restores all brands.

Filter on the driver head's canonical brand, not shaft manufacturer or free-text listing spelling. Use stable brand identifiers mapped from the existing catalogue, with display labels such as Ping, TaylorMade and Callaway. Do not create a second catalogue. Multiple selections use OR. No brand is preselected or promoted by popularity. Sorting the control's options alphabetically must not affect recommendation order.

## Marketplace request extension

marketplace_preferences.brand_ids: optional array of canonical head-brand IDs. Missing or [] means all brands. Deduplicate and sort valid IDs for deterministic persistence/cache keys. Validate IDs against the catalogue's brand registry, including brands with no current inventory. Invalid IDs produce a validation error; they must not silently broaden selection. Brand selection remains outside raw fitting answers and normalised_requirements. Brand selection introduces no golfer-side fitting field.

Persist the normalized selection, MATCH_MARKETPLACE_BRAND_FILTER_V1, inventory snapshot/version and presentation result with the session/result event. Keep questionnaire/profile fitting evidence unchanged. Do not infer a permanent user preference from one filter selection. Reuse existing analytics and privacy controls.

## Selection algorithm

1. Derive equipment requirements and evaluate existing eligible, publicly purchasable listings under Logic V1.1.
2. Intersect qualifying listings with selected canonical head-brand IDs; [] allows all brands. Equivalent query pushdown is allowed if it preserves identical candidate-level Fit/confidence and does not apply a browse cap before finding eligible inventory.
3. Apply the existing BEST_MATCH, BEST_VALUE and BUDGET_OPTION rules within this filtered pool. For Best Value, compare price savings and the 7-point Fit window against the filtered Best Match. Budget rules remain unchanged.
4. Preserve raw Fit, final band, confidence, dimensions and guardrails for every configuration. Only scoped presentation selection/rank changes; retain the original internal fit rank where full-pool scores are available.
5. Deduplicate listing cards. Show “Best Match within your selected brands” for an active selection, with the selected brands visible. Best Value and Budget Option share this clearly stated scope.

An unsuitable, suppressed, low-confidence, sold, hidden, unresolved-shaft or otherwise ineligible listing cannot become a primary recommendation because the user selected its brand. No randomization, catalogue row order, brand name or model newness may supply extra Fit points. Use the exact tie and label-merging policy in RULES_V1_2.md D07.

## Empty states and availability

When no qualifying listing exists within an active selection, show “No suitable matches from these brands right now” and a “Show all brands” action. Do not automatically clear the filter or insert other-brand results. Show all brands clears the filter and may still result in no suitable inventory.

When all brands are selected and no qualifying inventory exists, show “No suitable drivers available right now”. Do not manufacture Best Match, Best Value or Budget Option cards, stock, pricing or purchase actions. Capture unmet demand and optional alert intent only through an existing consent flow.

The engine may derive and retain equipment requirements without inventory. That is not a recommendation to purchase an unavailable model. A separate catalogue-only experience recommending unavailable models/configurations is not included or authorized by this update; it remains a product decision. All test inventory is synthetic and must never be presented to users as real stock.

## Data and analytics

Extend the existing Match analytics path with brand-filter changes and resets: session ID, selected canonical IDs, marketplace policy version, qualifying result count and empty-result reason. Link subsequent listing views, saves, checkout starts and purchases to the selection snapshot. Distinguish NO_QUALIFYING_INVENTORY from NO_QUALIFYING_IN_SELECTED_BRANDS. Exposure data is required before drawing conclusions about brand demand. Do not add a popularity ranking model in V1.

## Acceptance tests

- Missing/empty selection preserves existing results; reset is equivalent to [] without new questionnaire answers.
- One/multiple selected brands limit results to those brands (OR), using canonical head brand.
- A lower globally ranked qualifying listing may become filtered Best Match without a score/confidence change.
- Best Value's 7-point and max(£20,10%) checks use the filtered Best Match.
- Budget constraints and unique cards remain enforced inside the selection.
- Out-of-scope brands are not inserted to fill slots; valid selection with zero results has explicit empty state and reset action.
- Poor-fit, LOW-confidence, suppressed and non-purchasable selected-brand candidates cannot receive primary labels.
- The same candidates retain identical score/band/confidence before and after filtering; input permutation cannot change non-tied results.
- Duplicate selections normalize deterministically; unknown IDs fail validation.
- With no inventory, requirements can be computed but there are no purchase recommendations.
- Existing mobile accessibility, listing visibility/RLS, watchlist and checkout behavior remains intact.
