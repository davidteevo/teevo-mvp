# Phase B1b — Ball Start & Ball Curve Visual Answers

**Status:** Implemented for product review. Public Match remains disabled. Fitting logic unchanged.

## What shipped

| Item | Detail |
|------|--------|
| `BallStartDiagram` | Top-down LEFT / CENTRE / RIGHT / VARIABLE / UNKNOWN (Figma `2:13`–`2:27`, `2:55`) |
| `BallCurveDiagram` | Top-down LEFT / STRAIGHT / RIGHT / VARIABLE / UNKNOWN (Figma `2:34`–`2:55`) |
| `DiagramUnknown` + `TopDownChrome` | Shared UNKNOWN + dashed target-line chrome |
| Option maps | Questionnaire + refinement label variants |
| Questionnaire | Start + curve replace text RadioCards |
| Refinement | start, curve-unknown, variable-clarify, straight-optional, Pathway C curve |

## Enums (unchanged)

**Start:** `LEFT` · `CENTRE` · `RIGHT` · `VARIABLE` · `UNKNOWN`  
**Curve:** `LEFT` · `STRAIGHT` · `RIGHT` · `VARIABLE` · `UNKNOWN`

## Out of B1b

Strike-face visuals · Step 2 speed-knowledge · Results redesign · Named shafts · Public Match

## Validation

- `npx vitest run lib/match/` — **130 passed**
- `npx tsc --noEmit` — pass
- `npm run match:harness` — PASS
- No Supabase / RLS changes

## Fitting logic

Unchanged: validate-inputs, requirements, catalogue scoring, UK, B2.1, refinement policy, DRIVER_V1 / SHAFT_V1.
