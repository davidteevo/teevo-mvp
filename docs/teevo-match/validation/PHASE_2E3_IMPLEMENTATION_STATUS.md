# Phase 2E.3 — Conditional Refinement Implementation Status

**Status:** Implemented (product-amended). Public Match remains disabled.

**Study inputs:** [PHASE_2E2_RECOMMENDATION_RECOVERY_STUDY.md](./PHASE_2E2_RECOMMENDATION_RECOVERY_STUDY.md)

## What shipped

| Pathway | Behaviour |
|---|---|
| **A** | `NAMED_HEADS` → no refinement panel (19 synthetic named profiles unchanged). |
| **B** | `NO_MEANINGFUL_HEAD_DIFFERENTIATION` → ≤2 ball-flight clarifications. |
| **C** | `INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS` → compact optional intake (hcp/speed optional; traj/curve helpful). |

### Question policy (actual)

1. VARIABLE curve → keep-or-pattern clarify (retain VARIABLE if still both ways).  
2. Unresolved launch → typical trajectory.  
3. NEUTRAL + STRAIGHT curve → typical **start** (does not overwrite STRAIGHT).  
4. UNKNOWN curve → typical curve.  
5. Optional STRAIGHT refine only after start exhausted — KEEP preserves STRAIGHT.  
6. Miss-reduction objective **only** after ball-flight exhausted + explicit UI confirmation (replaces primary goal).

### Protections

- STRAIGHT / VARIABLE / UNKNOWN never silently overwritten to force named.  
- `primary_objective` never silently set to REDUCE_*.  
- API failure keeps last valid results.  
- Refine state in `teevo_match_admin_refine_v1`; cleared on full questionnaire resubmit.  
- Skip is explicit (`match_refinement_skipped`); no inferred abandonment.

## Synthetic outcomes (engine + policy tests)

| Metric | Result |
|---|---|
| Named profiles Pathway A | **19 / 19** |
| Guidance → Pathway B or C | **5 / 5** |
| `sparse_handedness_only` | Pathway **C** |
| Mid-handicap one-Q (start RIGHT, STRAIGHT kept) | **NAMED**, ≥4 active dims |
| Sparse incomplete traj+curve | **NAMED**, 5 active dims |
| Inconsistent VARIABLE retained then traj | Policy order correct; traj+RIGHT curve → **NAMED** 5 dims |

Credible recovery question counts (when golfer answers informatively): mid **1**; sparse/inconsistent **1–2**; handedness-only **intake screen**.

## Validation

- `npx vitest run lib/match/` — **105 passed**  
- `npx tsc --noEmit` — pass  
- `npm run match:harness` — PASS  
- `public_match_enabled: false` unchanged  

## Remaining limitations

- UNKNOWN / KEEP / skip correctly leave guidance.  
- Large equal-Fit 5-dim ties still soft-shortlisted (not Phase 2E.3).  
- Admin preview only — not public Match.  
- Weak single-answer recoveries (e.g. HIGHER_FLIGHT-only) not promoted by policy.

## Phase 2F

**Do not start** until product reviews this refinement UX on admin preview. Three-choice / Best Value / public Match remain out of scope.
