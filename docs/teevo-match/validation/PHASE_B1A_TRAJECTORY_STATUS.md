# Phase B1a — Trajectory Visual Answers

**Status:** Implemented for product review. Public Match remains disabled. Fitting logic unchanged.

## What shipped

| Item | Detail |
|------|--------|
| `VisualChoiceGroup` | Reusable accessible radiogroup (selected / unselected / focus / disabled) |
| `TrajectoryDiagram` | Side-on LOW / MID / HIGH / UNKNOWN SVG from Figma paths (`2:88`, `2:94`, `2:100`, `2:106`) |
| Questionnaire | Step “Ball flight” — `typical_trajectory` uses visuals |
| Refinement | Pathway B / OPTIONAL_B when `typical_trajectory`; Pathway C flight question |
| Enums | `LOW` · `MID` · `HIGH` · `UNKNOWN` only — labels Low / Mid / High / Not sure |

## Explicitly out of B1a

- Ball-start, curvature, strike visuals (B1b+)
- Step 2 speed-knowledge UX
- Results redesign
- Named shafts / OEM / Phase 2F / public Match

## Validation

- `npx vitest run lib/match/` — **122 passed** (includes `match.visual-options.test.ts`)
- `npx tsc --noEmit` — pass
- `npm run match:harness` — PASS
- No Supabase / RLS changes

## Fitting logic

Unchanged: `validate-inputs`, requirements, catalogue scoring, UK, B2.1, refinement policy, DRIVER_V1 / SHAFT_V1.
