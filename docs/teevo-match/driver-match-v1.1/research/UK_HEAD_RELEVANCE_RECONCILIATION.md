# UK_HEAD_RELEVANCE reconciliation

Generated: 2026-10-19T19:52:27.327Z
CSV: `docs/teevo-match/driver-match-v1.1/research/UK_HEAD_RELEVANCE.csv`
Frozen DRIVER keys (heads.json): **619**
CSV matched keys: **619**
Overlay members: **619**

## Status counts

| Status | Count |
|---|---|
| UK_ESTABLISHED | 186 |
| UK_OBSERVED | 225 |
| UK_UNVERIFIED | 207 |
| REGION_RESTRICTED | 1 |

## Review state counts

| State | Count |
|---|---|
| REVIEWED | 410 |
| NEEDS_REVIEW | 209 |
| NOT_REVIEWED | 0 |

## Eligibility intersection

| Metric | Count |
|---|---|
| recommendation_eligible (REVIEWED + ESTABLISHED/OBSERVED) | 409 |
| of which frozen STANDARD match_eligible=TRUE | 395 |
| after known HL config holds | 394 |

Expected research snapshot targets: 186 ESTABLISHED, 225 OBSERVED, 207 UNVERIFIED, 1 REGION_RESTRICTED; 395 STANDARD+positive UK; 394 after known HL config holds.

market_code validated as **GB** for all rows (no silent rewrite).
driver_subtype and release_year reconciled against frozen heads.json.
