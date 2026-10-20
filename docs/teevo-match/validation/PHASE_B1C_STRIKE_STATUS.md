# Phase B1c — Driver Strike-Face Visual Answers

**Status:** Implemented for product review. Public Match remains disabled. Fitting logic unchanged. Not merged or deployed.

## What shipped

| Item | Detail |
|------|--------|
| `StrikeFaceDiagram` | Clubface CENTRE / HEEL / TOE / HIGH_FACE / LOW_FACE / VARIABLE / UNKNOWN |
| `strikePatternVisualOptions` | Questionnaire labels + diagrams, handedness-aware |
| Questionnaire | Step 4 strike pattern replaces text RadioCards |
| Refinement | Unchanged. No current pathway asks `strike_pattern` |

Figma source: Clubface symbols on the visual-kit page (`15:538`–`15:575`), used on questionnaire step 4 (`14:524`).

## Enums (unchanged)

| Label | `strike_pattern` |
|-------|------------------|
| Centre | `CENTRE` |
| Heel | `HEEL` |
| Toe | `TOE` |
| High on face | `HIGH_FACE` |
| Low on face | `LOW_FACE` |
| Varies a lot | `VARIABLE` |
| Not sure | `UNKNOWN` |

Right-handed diagrams match Figma: heel on the left of the face, toe on the right, high toward the top, low toward the sole. Left-handed diagrams mirror the face so heel stays nearest the hosel. The stored enum does not change with handedness.

## Out of B1c

Step 2 speed-knowledge redesign · Results redesign · OEM / named shafts · Phase 2F · Public Match

## Validation

- `npx vitest run lib/match/` — **134 passed** (17 visual-option tests, 27 Phase 2E.3 tests)
- `npx tsc --noEmit` — pass
- `npm run match:harness` — PASS (48 archetypes, 168 probes, frozen hashes PASS)
- No Supabase / RLS changes

## Fitting logic

Unchanged: validate-inputs, requirements, catalogue scoring, UK, B2.1, refinement policy, DRIVER_V1 / SHAFT_V1.
