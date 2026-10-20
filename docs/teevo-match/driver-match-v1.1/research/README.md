# UK head relevance research → runtime overlay

## Export

1. Open the UK research register spreadsheet.
2. Export tab `UK_HEAD_RELEVANCE` as CSV.
3. Save as:

`docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE.csv`

Required columns (names may vary; generator accepts common aliases):

- `catalogue_key`
- `market_code` — must be **`GB`** (ISO 3166-1 alpha-2; not rewritten)
- `uk_market_status` — `UK_ESTABLISHED` | `UK_OBSERVED` | `UK_UNVERIFIED` | `REGION_RESTRICTED`
- `market_review_state` — `REVIEWED` | `NEEDS_REVIEW` | `NOT_REVIEWED`

## Generate

```bash
npx tsx scripts/build-uk-head-relevance-overlay.ts \
  --csv=docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE.csv
```

The generator reconciles **exact** `catalogue_key` values against repository `reference/heads.json` DRIVER rows. Any missing, extra, duplicate, or invalid row **fails the build**.

Outputs:

- `reference/uk-head-relevance.v1.json`
- `research/UK_HEAD_RELEVANCE_RECONCILIATION.md`

## Runtime

Loader: `lib/match/uk-head-relevance.ts` (`MATCH_UK_HEAD_RELEVANCE_V1`).

If the overlay is missing or invalid, catalogue Match returns characteristic guidance with audit reason `UK_MARKET_OVERLAY_UNAVAILABLE` (fail closed — never recommends UK-unverified heads by accident).
