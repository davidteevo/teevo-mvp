# Teevo Driver Match — current regression package

Current fitting contract: **MATCH_DRIVER_CONTRACT_V1.3**. Current rules: **DRIVER_MATCH_LOGIC_V1.2**. Marketplace filter: MATCH_MARKETPLACE_BRAND_FILTER_V1. Frozen head/shaft baseline: 2026-10-16. Folder name driver-match-v1.1 is retained for existing paths; read the manifest for current versions.

**48 exact normalized golfer archetypes and 168 stage probes. D01–D07 are resolved.** The package has been verified; the Teevo production engine has NOT run here. Independent fitter review, real inventory integration and release gates remain outstanding.

## Read first

1. RULES_V1_2.md — authoritative versioned amendments resolving D01–D07; overrides conflicting baseline rules.
2. BRAND_FILTER_V1.md — unchanged optional strict marketplace brand-filter behavior.
3. CURSOR_HANDOFF.md — Phase 1-only implementation authorization/scope; later phases require review.
4. DECISIONS.md — decisions and remaining release gates.
5. ARCHETYPES.md and boundary-probes.json — concrete expected inputs/outputs.

The reference/ folder preserves the pre-amendment live-source snapshots and complete frozen datasets for reproducibility. It is not updated to hide history. Read its fitting rules together with RULES_V1_2.md. No archived NOT IN USE source is authoritative. Frozen data never changes to accommodate algorithm output.

## Files and fixture limitations

archetypes.json expands every raw input, synthetic inventory and expected full normalized vector, including numeric launch targets and requirement-confidence provenance. Each case now also has exact golfer evidence confidence. Selected hand-worked candidate score/confidence goldens supplement the stage probes.

boundary-probes.json contains 101 original probes, 16 brand/availability probes and 51 decision-resolution probes. Equipment records are real frozen rows; listing IDs, availability and prices are synthetic. They are not stock claims or verified physical adapter compatibility. The original narrow equipment examples remain arithmetic fixtures, not representative brand-quality validation.

harness.py checks production-adapter responses. test_harness.py checks the QA checker/fixture arithmetic only. build_suite.py, brand_filter_probes.py and resolve_suite.py author the checked-in expectations; **never import these into the production engine or adapter**. Some fixture-authoring calculations are reused by package sanity checks, so those checks cannot establish independent engine correctness. Manual arithmetic checks and deliberate wrong-output mutations complement them. The actual adapter run must use separately implemented production functions.

source-manifest.json pins SHA-256 hashes of frozen source representations, brand policy and the current rules amendment. It is not a Google-native file checksum. verification-report.json distinguishes package verification from production execution.

## Run

Use normal Python 3 (not -O) from this folder:

```sh
python3 harness.py --verify
python3 -m unittest -v test_harness.py
python3 harness.py --adapter 'node /absolute/path/to/teevo-match-test-adapter.mjs'
```

--verify exit 0 means artifact verification only. Without an adapter, default execution exits 2 and says NOT RUN. An adapter assertion failure exits 1. D01–D07 no longer cause blanket exit 3: passing all current actual-function assertions permits exit 0, but is not consumer-launch or fitter sign-off. Never classify an unrelated failure as blocked. If a new source contradiction arises, record it specifically and stop the affected implementation instead of waiving tests.

## Adapter input and response

One JSON request on stdin, one JSON response on stdout; diagnostics to stderr. Input includes archetypes (id, raw_inputs, inventory), probes (id, stage, inputs), selected equipment fixtures and reference_directory. Expected answers are stripped. The adapter may load immutable source datasets and must call actual production functions. It may not read expected fixtures, import fixture-authoring logic or implement a duplicate scorer.

Response maps `archetypes` and `probes` by every requested ID. Each archetype includes normalised_requirements (complete V1.3 vector), candidates (every input listing gets an exclusion or scored trace), presentation and versions. Versions use adapter aliases: contract MATCH_DRIVER_CONTRACT_V1.3, logic DRIVER_MATCH_LOGIC_V1.2, heads DRIVER_V1_2026-10-16, shafts SHAFT_V1_2026-10-16. These aliases do not replace the public API contract.

Excluded candidates: listing_id, excluded=true, nonempty exclusion_reasons. Scored candidates: listing_id, excluded=false, raw_fit_score, match_band, suppressed, dimensions, guardrail_gaps, confidence_components, confidence_score, confidence and considerations. Dimension keys: forgiveness, stability, direction, head_launch, head_spin, workability, loft, flex, weight, shaft_launch, shaft_spin. Each reports active, nominal_weight, reliability, score when active and omission_reason when inactive. Guardrail gaps report flex, loft, direction, head_launch and shaft_launch; null where unassessable. Confidence components are golfer/equipment/listing.

Presentation: cards with listing_id and merged labels; empty_state boolean; unfilled_slots array. Card order and label order follow D07. No consumer percentage or internal numeric Fit score. The harness checks exact semantic slot selection, deduplication and merged labels, as well as scoring/guardrail/confidence consistency and the expected requirement vector. No brand selection appears inside normalized fitting requirements.

Stage probes return their expected result shape:
- target_category: numeric value → launch and direction summaries.
- speed_region/carry_region: numeric speed/carry → flex/weight/loft intervals; unavailable intervals null.
- requirements: full raw input → normalised_requirements.
- confidence_aggregate: clamp input components, calculate score/category.
- aggregate with no active dimensions: score=null, scorable=false, reason=NO_ACTIVE_FIT_DIMENSIONS. Production full candidate/output semantics are defined in RULES_V1_2.md.
- merge_labels: semantic slots → ordered unique cards and unfilled slots.
- money_saving: integer-pence inputs → qualifies.
- identity_resolution: all matching reference identities → resolution/eligibility; don't filter the universe before resolution.
- Existing band, dimension, guardrail, eligibility, parsing, loft and marketplace stages retain their shapes. `loft.reachable` is a discrete published set when supplied, interval endpoints when only a verified range exists, otherwise the stated loft singleton.
- brand_marketplace: pre-scored synthetic candidates plus selected_brand_ids/known_brand_ids/budget → scoped slots, unique_cards, normalized selected_brand_ids, scope, state, reset-action flag and unchanged fit_snapshot; invalid selection returns INVALID_BRAND_SELECTION. These stage fixtures test marketplace behavior, not physical fit predictions.

Production scoring must use numeric launch targets; enum summaries are explanatory only. Exact confidence requirement structure, omission deductions, decimal comparisons and identity semantics are in RULES_V1_2.md. Full frozen-universe ingestion, actual inventory/pagination, malicious/invalid inputs, database/RLS, mobile/UI and affected checkout/watchlist/listing tests remain repository integration gates, not claims made by these fixtures.

## Availability and release boundary

No qualifying live inventory means no purchase recommendation. Requirements may still be derived. Unavailable-model discovery and partner-stock integration are not included. Phase 1 is pure engine and adapter only; no listing edits, migrations, public API/UI or feature enablement. Current rules are conservative product heuristics and require independent fitter review before consumer release.
