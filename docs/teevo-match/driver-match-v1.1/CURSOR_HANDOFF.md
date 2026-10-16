# Driver Match V1.2 — Phase 1 implementation handoff

## Feature
Implement the deterministic Driver Match engine behind a disabled consumer feature flag, using this regression package. Start in Plan Mode. Inspect the actual Teevo repository before proposing file paths or migrations. This workspace contains specifications and frozen data, not the application repository; no application implementation has been tested here.

## Context
Read `RULES_V1_2.md` first (current resolved implementation rules), then the approved `BRAND_FILTER_V1.md` marketplace addendum and `source-manifest.json`, the live-source snapshots in `reference/`, `DECISIONS.md`, `README.md`, and the 48 archetypes. Authority: Product Principles → Data Contract V1.3 for schema/NULL/eligibility → frozen Driver/Shaft V1 values → Logic V1.2 for calculations → live Architecture for integration. Do not read or reuse archived NOT IN USE rules. Frozen files are immutable. The harness is subordinate to these sources.

## Problem
Golfer requirements, actual head/loft/shaft configuration and marketplace economics must remain distinct. Missing data and averages must not disguise unsuitable primary recommendations. Historical listings often lack exact shaft identity.

## Objective
Produce reproducible, conservative matches from existing purchasable inventory, with separate Fit, confidence and marketplace labels. The first milestone is passing the resolved regression suite against actual pure engine functions. D01–D07 are resolved in RULES_V1_2.md. Consumer release is not part of Phase 1.

## User stories
A buyer can understand suitable available configurations and uncertainty. A budget-conscious buyer can see cheaper qualifying options. A buyer with sparse data can skip questions without invented answers. An operator can inspect exclusions and unmet demand without reopening all equipment research.

## User flow
Existing profile seeds → simple optional golfer questions plus required handedness → requirements → eligible inventory joined by exact identities → head/loft/shaft scoring → guardrails → confidence → bands → unique marketplace cards → existing listing/watchlist/checkout. Empty states preserve thresholds and record unmet demand.

## Functional requirements
1. Inventory the existing architecture, tests, catalogues, listing visibility rules, profile/auth patterns and analytics path. Identify reuse and migration risks before coding.
2. Validate the frozen complete extracts. Only DRIVER_V1 eligible STANDARD heads and uniquely resolved MATCH_ELIGIBLE shafts enter full Match. Preserve non-candidate rows as reference data; never promote them.
3. Build pure, separately testable modules for ingestion/identity, requirements, configuration, scoring, guardrails, confidence, fit ranking and marketplace presentation. Resolve identity against the full reference identity universe before eligibility; never create false uniqueness by pre-filtering excluded or recognition-only variants. Fit consumes normalized requirements only. Never pass budget/price into the scorer.
4. Implement the exact D01–D07 resolutions in RULES_V1_2.md. Preserve the frozen datasets. Flag any new contradiction explicitly; never regenerate expected values from the production implementation to make tests pass.
5. Implement an adapter for `harness.py` as described in README. Translate test-stage names into production functions; do not duplicate fitting logic inside the adapter or read expected outputs. Retain repository-native unit tests as well.
6. Wire the pure engine to existing listings. Apply existing public/purchasable visibility, exact handedness, head identity, usable loft and unique shaft identity gates. Treat free text as identity lookup input only; do not infer performance from it.
7. Query the full eligible candidate inventory with a configurable limit/pagination; avoid the ordinary browse cap silently hiding the best candidate. Never manufacture a Cartesian head×shaft×loft combination and claim it is a listing.
8. Recheck purchasability at view/checkout using existing behavior. Sold, hidden or otherwise non-purchasable records cannot be primary recommendations; reuse the actual availability function rather than guessing from a status label.

## UI/UX requirements
Reuse ListingCard/ListingGrid and existing listing detail. Mobile first; plain ball-flight visuals, optional skip states and accessible inputs. Lead with Excellent/Very Good/Good Match and separate confidence. Show 2–4 supported reasons and meaningful uncertainty. No percentages, predicted yardage or guaranteed swing correction. Add optional multi-select “Filter by brand” on results, default “All brands”; this strictly limits results by canonical head brand. Recalculate presentation slots inside the selection without changing Fit/confidence or repeating questions. Label “Best Match within your selected brands”. With no qualifying selected-brand listings, show the approved empty-state copy and “Show all brands” action; never silently broaden. Show above-budget amount for Best Match. One listing appears once; one or two valid options must not become three filler cards. Preserve loading/error/empty states. Build consumer UX only after the engine gate passes.

## Business logic
Implement Logic V1.2 §§8–48 exactly where unambiguous. Missing dimensions are omitted/reweighted; low confidence changes badge eligibility, never Fit. Critical mismatches suppress or cap final band. Best Value must have at least Very Good Match, Medium/High confidence, Fit within 7 points of Best Match and savings ≥max(£20,10%). Budget Option must have at least Good Match and Medium/High confidence, and respect budget when supplied. No price/brand/newness/adjustability/head-profile bonus. Use decimal comparisons before display rounding.

## Data / database requirements
Prefer existing versioned application intelligence data initially. Stable catalogue_key and shaft_key join to the actual listing configuration. Do not build another inventory/catalogue/search stack. Assess match_golfer_profiles, match_sessions and match_interactions against existing tables before migrations. Store raw inputs, normalized requirements/evidence, all active/omitted scoring dimensions, reliability, raw score, ceilings/suppression, final band, confidence, exact listing configuration and prices used, identities, ranking/labels, and all versions. Replay uses stored snapshots, not mutable current inventory. Do not modify the frozen reference files to repair algorithm output.

## Admin requirements
Reuse the existing feature-toggle/config mechanism. Add only essential diagnostics: input validation failures, identity resolution failures, exclusion counts, unavailable slots and rule versions. No new research console or calibration UI in this slice.

## Notifications / emails
No new notification delivery in this implementation slice. Capture optional inventory-alert intent only where an existing consent/workflow exists; do not create marketing subscriptions implicitly.

## Analytics / events
Extend existing events/track() and allowlist. Reconcile naming differences in Architecture versus Logic without double-emitting. Link starts, completions, results, views, saves, rejects/reasons, checkout starts, purchases and feedback to session, version, listing and recommendation. Distinguish no-suitable-inventory from missing-input and technical errors. Primary launch validity measure: independent fitter-reviewed credible territory with no materially unsuitable primary recommendation. Marketplace learning: Match listing views/saves/checkout/purchase versus an appropriately comparable Browse cohort; monitor Match-to-purchase and Match-influenced GMV, with coverage and empty-result rates as guardrails.

## Edge cases
Use all 48 archetypes and 168 boundary probes. Add repository integration tests for identity ambiguity, OEM/aftermarket non-substitution, fractional speed bins once defined, carry thresholds, current-anchor conflicts, double launch mismatch, missing handedness, invalid enum/numeric values, no active dimensions, repeated requests, inventory permutation, candidate pagination, sold/hidden inventory and configuration changes. Add metamorphic tests: price/condition/seller/delivery changes cannot alter Fit or confidence; mirrored handedness preserves golfer-relative requirements; brand/release year alone adds no points; identical config fixed versus adjustable earns no bonus; removed optional evidence never becomes zero-quality evidence. No goldens should depend on current stock.

## Security / permissions
Review Supabase/RLS before any persistence change. User-scoped Match profiles; authenticated session ownership; anonymous session isolation; no exposure of another user's golfer measurements or outcomes. Reuse listing-read policies and server-side purchasability. Test owner/non-owner/anonymous/service-role access. Never weaken existing listing, purchase or payment protections to make joins work. Keep scoring internals out of public result cards while preserving authorized audit access.

## Acceptance criteria
- Frozen counts, source hashes, eligible identity uniqueness and schema validation pass; no archived authority used.
- All 48 archetypes are wired to actual production functions; 168 stage probes pass through the adapter. No D01–D07 expectations remain blocked. New contradictions must be documented, not waived or auto-regenerated from the implementation.
- Show a full report of pass/fail/blocked checks. Passing artifact verification or harness self-tests is not an engine pass.
- Run complete frozen eligible-universe ingestion plus representative actual listing configurations; avoid fake universal compatibility combinations. Review coverage by handedness, head type, shaft eligibility, missing evidence and guardrails.
- A meaningful blinded sample is reviewed by an independent experienced fitter, including every high-risk guardrail and uncertain territory. Record reviewer, case, credible territory, unsuitable top choice, rationale and follow-up. No clinical/scientific validation claim.
- Audit replay produces the same result for stored versions, raw inputs and inventory snapshot.
- Affected browse, sell/listing editing, listing detail, watchlist, checkout and mobile workflows remain passing. Security tests pass. Consumer feature remains disabled until expert review and the integration/security/product release gates are complete.

## Out of scope
New inventory systems; broad catalogue migration; ML/LLM fitting; TrackMan integration; telemetry calibration; mini drivers; torque/EI/length/grip fitting; per-setting movable-weight models; retailer integration; production deployment.

## Future iterations
Use observed rejection and purchase outcomes for controlled rule calibration. Add separately versioned telemetry and richer configuration support only after V1 demonstrates credible matching and marketplace value.

## First response expected from Cursor
A repository-grounded plan listing reused components/services, proposed modules and migrations, any newly discovered contradictions, adapter/test strategy, RLS impact, phased implementation and release gate. Include the MATCH_MARKETPLACE_BRAND_FILTER_V1 request/persistence extension, all 16 new brand/availability probes, and explicit no-inventory behavior in the plan. Do not claim the engine is validated until it has actually run.

## Inventory clarification
Requirements may be derived without stock, but V1 purchase recommendations require real qualifying purchasable listings. No catalogue-only unavailable-model recommendation experience is included. Read BRAND_FILTER_V1.md for empty states, request validation and audit/version details.

## Authorized next slice: Phase 1 only
The founder has instructed us to continue closing the decisions; those decisions are now versioned and explicit. In Cursor, implement only pure lib/match functions, immutable frozen-data ingestion and the actual-function adapter on the staging branch. Emit MATCH_DRIVER_CONTRACT_V1.3 and DRIVER_MATCH_LOGIC_V1.2 plus the unchanged freeze and marketplace policy IDs. Run all 48 exact normalized archetypes and 168 probes; report genuine failures separately from any newly discovered contradiction. Do not import resolve_suite.py into production: it is fixture-authoring code, not the engine. Do not change database tables, listings, auth, public API/UI, feature flags or production. Return changed files, test results and remaining risks for review. Later sections of this handoff describe subsequent phases, not permission to implement them now.
