# D01–D07 resolved — implementation baseline

Effective 16 October 2026. Read RULES_V1_2.md for exact algorithms, fields, thresholds and precedence. New versions: MATCH_DRIVER_CONTRACT_V1.3 and DRIVER_MATCH_LOGIC_V1.2. Frozen DRIVER_V1/SHAFT_V1 data and marketplace brand-filter policy V1 are unchanged. No archived NOT IN USE document was used.

| Decision | Resolution |
|---|---|
| D01 | Preserve 0.25 increments, sum modifiers then clamp; interpolate fractional score gaps. |
| D02 | Add nullable numeric head/shaft launch targets. Score numeric targets; categorical summaries round to nearest knot with half ties away from zero. Null remains unresolved. |
| D03 | Use continuous measured-speed bands. Carry supplies only the specified broad flex interval; do not invent weight or loft. This deliberately replaces the earlier proposal for an unvalidated carry-to-weight/loft table. |
| D04 | Current equipment anchors only loft, only without measured speed and with uniquely identified standard head, usable loft and HIGH/MEDIUM satisfaction. Apply explicit flight shifts. No broad head/shaft anchoring or continuity bonus. |
| D05 | Define all eleven requirement-confidence entries, source/flag vocabulary, active nominal-weight equipment confidence, listing deductions, clamping and zero-active behavior. |
| D06 | Define speed/carry conflict at flex-midpoint difference ≥1, exact deductions, directional uncertainty and non-duplicated launch/current-equipment penalty. |
| D07 | Rank by final band, raw Fit, numeric confidence, then listing ID. Price ties use that order. Merge labels and compare savings using integer pence. |

These are conservative, versioned product heuristics, not independent fitter approval. Do not claim suitability validation from passing the test package.

## Identity correction

Resolve against the full relevant reference identity universe before applying Match eligibility. Ineligible/recognition-only variants must not disappear and create a false unique match. No missing shaft variant property is inferred from a bare brand/model string. Explicit evidence across multiple listing fields may resolve a unique exact variant; display-name equality is not the only route.

## Implementation scope now

Phase 0 is complete according to Cursor's report. It reported three staging Driver listings and no configuration ready for full Match. That sample cannot establish public-launch coverage. Do not modify those listings to manufacture passing examples.

Proceed with Phase 1 only: pure engine, versioned intelligence ingestion and production-function test adapter. No migrations, listing edits, UI/API release, production deployment or feature enablement. Resolve newly discovered material contradictions explicitly; do not auto-change goldens to match the implementation.

## Still required before launch

Representative brand/configuration coverage; complete eligible-universe and real-listing integration; security/RLS and affected workflow tests; independent fitter review; product review of availability coverage. Partner stock remains a later supply decision. Unavailable catalogue-only recommendations remain out of scope.
