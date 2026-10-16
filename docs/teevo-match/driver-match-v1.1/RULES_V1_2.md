# Driver Match V1.2 — resolved implementation decisions

Effective 16 October 2026 under the founder's instruction to continue closing D01–D07. This is the current implementation policy, not empirical fitting validation. It supersedes conflicting parts of Logic V1.1 and Data Contract V1.2 only as stated below. All other rules, eligibility gates, weights and scoring curves remain in force. Frozen DRIVER_V1 and SHAFT_V1 extracts remain unchanged. Marketplace brand filter V1 remains in force.

Emit rules/logic version DRIVER_MATCH_LOGIC_V1.2 and contract version MATCH_DRIVER_CONTRACT_V1.3. Persist both. Never replay an old session with these new rules implicitly. The folder name driver-match-v1.1 is retained for existing links; the manifest and this document identify the current version.

## D01 — retain quarter-step requirements

Forgiveness, stability and workability requirements accept multiples of 0.25 in [1,5]. Sum all applicable baseline/handicap/strike/miss/objective modifiers, then clamp once. Do not round away quarter steps. Minimum-need scoring linearly interpolates every fractional gap between the published integer knots (not only half steps). Missing remains null, never zero. Handicap intervals are [0,6), [6,13), [13,21), [21,31), [31,54], covering decimal handicaps without gaps.

## D02 — numeric launch targets and descriptive categories

Add nullable head_launch_target_numeric and shaft_launch_target_numeric to normalised_requirements. Values are in [-2,2]. Null means unresolved; numeric zero is genuine MID evidence. Fit and launch guardrails consume numeric targets, not categorical summaries. Spin stays UNRESOLVED; no numeric spin fields or calibration are introduced.

Use the existing trajectory and objective numeric contributions; add them and clamp to [-2,2]. With no trajectory evidence and no explicit flight objective, both numeric targets are null. MID trajectory supplies valid zero evidence. Contradictory nonzero trajectory/objective contributions set LAUNCH_INPUT_CONFLICT; retain their sum and reduce confidence, not their individual score. No speed/current-equipment inference supplies a launch target.

Categorical summaries use nearest ordinal knot, with exact half-step ties away from zero: magnitude <0.5 maps to 0; [0.5,1.5) maps to signed 1; [1.5,2] maps to signed 2. Launch knots are LOW, MID_LOW, MID, MID_HIGH, HIGH. Direction knots are STRONG_FADE_ASSIST, FADE_ASSIST, NEUTRAL, DRAW_ASSIST, STRONG_DRAW_ASSIST. Null maps to UNRESOLVED, not ANY. Scoring retains the original numeric value (e.g. 1.005), never the rounded summary.

For direction, apply the existing handedness/severity calculation. A known CENTRE or STRAIGHT component supplies evidence even when its contribution is zero. UNKNOWN/VARIABLE start contributes no start evidence. If curvature is VARIABLE, direction stays unresolved even if a directional objective is selected; apply only the two-way forgiveness/stability modifiers, not additional severity modifiers. If any stable ball-flight component exists, combine its signal with half the directional objective; if neither exists, an explicit directional objective supplies its full signal. No component and no objective means null. Apply miss severity modifiers only for a nonzero raw stable miss signal; UNKNOWN severity adds no forgiveness/stability modifier. Variable start with stable curvature uses curvature alone.

## D03 — measured speed bins; conservative carry fallback

Measured speed bins and existing ranges:

| Speed mph | Flex values | Actual weight g | Loft degrees |
|---|---|---|---|
| <80 | 0–2 | 40–55 | 10.5–12.5 |
| [80,90) | 1–2.5 | 45–60 | 10–12 |
| [90,100) | 2–3 | 50–65 | 9–11.5 |
| [100,110) | 2.5–4 | 55–70 | 8.5–10.5 |
| ≥110 | 3–5 | 60–75 | 8–10.5 |

Only finite positive speed and carry values are valid; reject nonpositive, nonnumeric and nonfinite inputs with validation diagnostics rather than coercing them. These broad ranges are calibration priors, not scientific fitting claims.

Without measured speed, retain the existing broad carry-to-flex guidance, explicitly mapped to frozen numeric values:

| Carry yards | Flex values |
|---|---|
| <180 | 0–2 |
| [180,200) | 2–2 |
| [200,220) | 2–2 |
| [220,260) | 2–3 |
| [260,280) | 3–3 |
| ≥280 | 3–4 |

Carry alone does NOT determine shaft weight or loft. Both are unresolved unless D04 supplies a current-loft fallback. This intentionally supersedes Logic V1.1 §18's undefined equivalent-speed-band instruction. It avoids making up precision before fitter calibration. Missing speed and carry leaves flex and weight unresolved; no current-shaft flex/weight anchoring is introduced.

## D04 — narrowly scoped current-loft fallback

Derive intent as before: unresolved current head or UNKNOWN satisfaction → UNANCHORED; otherwise HIGH → PRESERVE, MEDIUM → OPTIMISE, LOW → CORRECT. Resolve current identity across the full relevant reference identity universe before evaluating eligibility. A confidently identified current head need not be a candidate recommendation; current-loft fallback requires a uniquely identified STANDARD DRIVER_V1 head and finite positive stated loft. Do not infer head identity or loft from marketing text.

If measured speed is present, use its loft baseline; current equipment never overrides it. If speed is absent and current head/loft are usable with HIGH or MEDIUM satisfaction, baseline loft is current loft ±1 degree. Otherwise loft remains unresolved, even if carry is supplied. LOW satisfaction and unresolved current head never anchor.

Apply the existing trajectory/objective loft shifts to whichever baseline exists, clamping their combined movement to ±1 degree. With no baseline, do not invent a loft interval from a shift. The golfer's explicit flight objective therefore can change a satisfactory current-loft territory. No additional intersection, averaging, approximately-defined cap, head-characteristic or current-shaft anchoring is performed in V1.2. PRESERVE/OPTIMISE remain descriptive intents; only loft has an implemented anchor. No same-brand/model/continuity bonus.

For measured-speed sessions with usable HIGH/MEDIUM current equipment, compute the final speed-based interval first. If current loft lies more than 1 degree outside it, add LOFT_EVIDENCE_CONFLICT but keep that interval. No conflict penalty applies solely because an unsatisfactory current club is different.

## D05 — explicit confidence and unscorable behavior

Fit uses only active, available evidence with nonzero reliability; omitted dimensions are not zero-quality dimensions. Reliability is HIGH=1, MEDIUM=.85, LOW=.5, UNRESOLVED/UNKNOWN=0. Missing frozen confidence is UNRESOLVED. Clamp confidence components and final confidence to [0,100]. Requirement confidence is explanatory provenance, not an extra Fit multiplier.

requirement_confidence has exactly these eleven keys: forgiveness, stability, direction, head_launch, head_spin, workability, loft, flex, weight, shaft_launch, shaft_spin. Each value is {band: HIGH|MEDIUM|LOW|UNRESOLVED, source_codes: sorted unique string[], conflict_codes: sorted unique controlled string[]}.

Source codes are MEASURED_SPEED, CARRY_PROXY, BALL_FLIGHT, TRAJECTORY, PRIMARY_OBJECTIVE, CURRENT_LOFT, STRIKE_CONSISTENCY, STRIKE_PATTERN, HANDICAP, BASELINE. Include only evidence actually used for that dimension. Unknown inputs supply no source code. Spin is always UNRESOLVED with empty arrays. Loft is UNRESOLVED if no baseline exists, even if a flight objective was supplied.

Base requirement bands: measured-speed flex/weight/loft HIGH; carry-derived flex LOW; current-loft fallback MEDIUM; direction/launch from direct observations or explicit objectives MEDIUM; baseline/handicap-only forgiveness/stability/workability LOW, upgraded to MEDIUM if strike or a relevant objective/miss modifier contributes. Apply input_confidence as a ceiling (HIGH, MEDIUM or LOW). Then reduce the affected requirement band once for any applicable D06 uncertainty/conflict; LOW stays LOW, unresolved stays unresolved. Multiple flags never repeatedly downgrade the same requirement.

Golfer evidence confidence starts at 100 and uses Logic §38's existing deductions, with D06's explicit additions. Unknown optional values include null/absent/UNKNOWN. Unknown miss severity deducts 3 only if a stable nonzero miss or VARIABLE curvature is described. Carry fallback deducts 10; neither speed nor carry deducts 25. Unknown current equipment itself adds no new global deduction. Input confidence MEDIUM deducts 5; LOW deducts 15. Sum each defined deduction once, then clamp.

Equipment confidence is the active-dimension NOMINAL-weighted average of HIGH=100, MEDIUM=80, LOW=50 evidence confidence. Do not multiply reliability again inside this confidence average. An inactive requirement does not count against completeness. Missing relevant equipment evidence is instead handled by the listing deductions below, avoiding a hidden Fit penalty or a changing confidence denominator that masquerades as Fit.

Listing confidence starts at 100. Retain existing deductions: flex unmapped -10 only when a flex requirement is active; weight unavailable -5 only when weight relevant; shaft launch unavailable -5 only when shaft launch relevant; legacy-delta loft fallback -5 only when an adjustment is actually needed for target access; unknown hosel range -5 only when stated loft is outside an active target. Add -5 for each relevant unavailable head dimension among forgiveness, stability, direction, head_launch and workability (numeric value missing/UNKNOWN or evidence reliability zero). Do not penalise missing spin because spin is inactive. Record all applied deductions; apply each once and clamp.

Overall confidence = .45×golfer + .35×equipment + .20×listing. HIGH ≥80; MEDIUM ≥60; LOW <60. LOW prohibits primary labels but never lowers Fit or final Match band.

If the Fit denominator is zero: raw_fit_score=null, match_score_internal=null, match_band=null, confidence_score=null, confidence=null, scorable=false, suppression reason NO_ACTIVE_FIT_DIMENSIONS; no ranking or primary presentation. Do not divide by zero, return a fabricated neutral score or assign a Fit band. For a hard exclusion, retain a distinct exclusion trace rather than conflating it with this unscorable state.

## D06 — controlled conflicts and exact deductions

Use sorted unique conflict_flags. Carry comparison is diagnostic only when measured speed is present: compare the midpoint of its preferred flex interval with the midpoint of the D03 carry interval. Absolute midpoint difference ≥1 normalized flex unit sets SPEED_CARRY_CONFLICT. Use the measured-speed requirements without averaging; golfer confidence -5 once. Affect flex, weight and loft requirement confidence where those requirements exist.

DIRECTION_INPUT_CONFLICT retains Logic §14's opposite-sign and magnitude ≥1 test on observed miss and unweighted objective signals. Golfer -10 once; direction requirement one-band downgrade.

LAUNCH_INPUT_CONFLICT occurs when nonzero trajectory and flight-objective launch contributions have opposite signs. LOFT_EVIDENCE_CONFLICT follows D04. If either/both occur, apply a single -5 golfer deduction for the launch/current-equipment conflict group, not -5 each. Both codes may be recorded. Launch conflict affects head_launch, shaft_launch and loft; loft evidence conflict affects loft only.

DIRECTION_EVIDENCE_PARTIAL: exactly one of start/curvature is UNKNOWN or start is VARIABLE while curvature is stable. TWO_WAY_MISS: VARIABLE curvature. These downgrade direction requirement confidence when resolved; two-way direction remains UNRESOLVED. VARIABLE start or curvature causes one additional golfer deduction of 5 in total; existing UNKNOWN start/curvature deductions still apply to unknown inputs. This is a versioned uncertainty policy, not a swing diagnosis.

For the above codes, emit controlled consideration codes as well as conflict_flags. SWING_SPEED_INFERRED_FROM_CARRY and SWING_SPEED_UNKNOWN remain considerations, not conflict_flags. Requirement entries list only applicable conflict codes. Explanations must never promise to fix a miss.

## D07 — deterministic ranking and merged labels

Equipment ordering: final Match band descending, raw Fit descending, numeric overall confidence_score descending, listing_id ascending by bytewise/ASCII order. Use unrounded finite scores. IDs must be unique; reject duplicate listing IDs in a candidate snapshot rather than relying on input order. Canonical production UUID strings should be lowercase; fixture IDs retain their explicit case. No locale-aware alphabetic brand sorting or listing freshness/price tie-break in equipment Fit ordering.

Best Match uses the highest eligible Medium/High-confidence candidate under that order. Best Value uses the existing Very Good minimum, 7-point window and max(£20,10%) savings; prefer in-budget candidates if any in the near-best pool, then price ascending, then equipment order. Budget Option uses the existing Good minimum and budget constraint, then price ascending, then equipment order. Apply within selected brands when a brand filter is active.

Compare money as integer pence; 10% savings qualifies when 10×savings_pence ≥ best_match_price_pence AND savings_pence ≥2000. Do not round percentage thresholds down. Free/invalid/negative prices must follow existing marketplace validation, not introduce a new Match pricing policy.

Merge all assigned labels onto one unique listing card. Label order is BEST_MATCH, BEST_VALUE, BUDGET_OPTION. Card order is first occurrence while visiting those slots in that order. A shared Budget label remains assigned and is not reported as unfilled. Missing semantic slots are recorded as unfilled. No filler cards.

## Identity correction and next implementation scope

Resolve identities against the full relevant frozen identity universe and explicit aliases before applying eligibility. Recognition-only, quarantined or excluded-scope identities may disambiguate or prevent a false unique match but never become candidates. Unique among eligible rows alone is insufficient. Exact shaft identity can be established from multiple explicit fields together; a bare Brand+Model hit must not imply missing variant specifications.

Proceed with Phase 1 only: pure functions, immutable intelligence loading and real-function test adapter. No database migration, listing edits, public API/UI rollout, production deployment or Match enablement is authorized by this handoff. Stage-0 inventory audit is reported by Cursor, not independently re-run here. Complete representative brand/configuration coverage and independent fitter review before consumer enablement. The resolved rules remove specification blocking; they do not establish product validity or guarantee suitability.
