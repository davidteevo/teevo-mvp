# MATCH_UK_HEAD_RELEVANCE_V1

Static UK-market relevance overlay for Teevo Match catalogue recommendations.

## Policy

Eligible for named recommendations only when:

- Frozen technical eligibility / STANDARD scope already pass
- Fitting qualification gates pass
- Head-config overlay allows the head
- UK overlay: (`UK_ESTABLISHED` or `UK_OBSERVED`) **and** `market_review_state = REVIEWED`

Held / excluded:

- `UK_UNVERIFIED` (any review state)
- `REGION_RESTRICTED` (any review state)
- `NEEDS_REVIEW` / `NOT_REVIEWED` (any classification, including ESTABLISHED)
- Missing / invalid mapping

`market_code` is **`GB`** (ISO 3166-1 alpha-2) as in the research register. No silent rewrite to `UK`.

## Pipeline position

UK eligibility is applied with configuration holds **before** family deduplication and B2.1 differentiation. Fit scores are unchanged. ESTABLISHED is not ranked above OBSERVED.

## Fail closed

Missing or invalid overlay → catalogue pathway returns `CHARACTERISTIC_GUIDANCE` with audit `UK_MARKET_OVERLAY_UNAVAILABLE`. Unverified heads never become recommendable by accident.

## Regeneration

See [`research/README.md`](research/README.md).
