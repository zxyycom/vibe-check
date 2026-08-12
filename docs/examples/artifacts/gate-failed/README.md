# Complete scan blocked by the selected policy

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: One warning record entered the all-current and all-unaccepted views and matched blockWhen.
- Invocation: `invocation/v1:docs-gate-failed`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `all`

## Expected user result

- Gate request: all
- Process outcome: `gate-failed`
- Exit code: `1`

The expected process outcome and exit code are scenario metadata, not facts inferable from the
two-file machine set. Consumers must interpret the set together with the producing CLI outcome.

## Canonical publication

- `run.json` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- `records.ndjson` contains 1 canonical record(s) in recordId order.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
