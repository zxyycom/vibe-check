# Complete scan with a non-gating finding

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: One applicable Check completed with one warning record.
- Invocation: `invocation/v1:docs-complete-warning`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `disabled`

## Expected user result

- Gate request: none (policy disabled for this scenario projection)
- Process outcome: `success`
- Exit code: `0`

## Canonical publication

- `run.json` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- `records.ndjson` contains 1 canonical record(s) in recordId order.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
