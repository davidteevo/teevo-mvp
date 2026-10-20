# Phase 2E.3 — Reliability Remediation (Milestone A)

**Status:** Implemented on branch `feat/match-phase-2e3-reliability`. Public Match remains disabled.

**Date:** 2026-10-20

## What shipped

1. **Transactional refinement submission** — proposed answers are built without mutating committed questionnaire/refine/results state; commit only after a successful `/api/admin/match/recommend` response. Failures preserve last valid state; Retry reuses the same choice without consuming a clarification step; in-flight + request sequence guards block duplicates and stale overwrites.

2. **Authoritative refine session accounting** — `mergeOfferedKey` / `preferFresherRefineState` / `commitRefinementProgress` prevent stale offer-effects from resetting `stepCount` or `askedQuestionIds`. Failed requests never call commit. Pathway C minimum intake remains separate.

3. **Optional refinement after weak named recovery** — only when `recoveredNamedViaRefinement` is set (golfer recovered named via B/C), a meaningful unresolved characteristic exists (trajectory / launch), an unanswered question is available, and step count is under the max of 2. Initially named profiles stay Pathway A. Prompt copy: “Want to refine your Match?” / Refine my Match / Keep these results. Named cards remain visible and primary.

4. **UX copy** — API error punctuation; STRAIGHT optional question no longer duplicates its headline in the body; Retry label after failure.

## Validation

- `npx vitest run lib/match/` — **117 passed**
- `npx tsc --noEmit` — pass
- `npm run match:harness` — PASS
- `public_match_enabled: false` unchanged

## Unchanged

DRIVER_V1 / SHAFT_V1, Fit scores/curves/weights, B2.1, UK overlay, head-config holds, inventory attach, Supabase/RLS, checkout, public Match.
