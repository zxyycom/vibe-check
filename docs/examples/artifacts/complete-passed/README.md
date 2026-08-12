# Complete scan without findings

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: One applicable Check completed its work without records.
- Invocation: `invocation/v1:docs-complete-passed`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `disabled`

## Expected user result

- Gate request: none (policy disabled)
- Process outcome: `success`
- Exit code: `0`

The expected process outcome and exit code are scenario metadata, not facts inferable from the
two-file machine set. Consumers must interpret the set together with the producing CLI outcome.

## Canonical publication

- `run.json` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- `records.ndjson` contains 0 canonical record(s) and is exactly zero bytes.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
