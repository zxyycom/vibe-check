# Incomplete scan with retained run evidence

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: The selected Check could not run because its dependency was unavailable.
- Invocation: `invocation/v1:docs-scan-incomplete`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `all`

## Expected user result

- Gate request: all
- Process outcome: `failed`
- Exit code: `2`

The expected process outcome and exit code are scenario metadata, not facts inferable from the
two-file machine set. Consumers must interpret the set together with the producing CLI outcome.

## Canonical publication

- `run.json` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- `records.ndjson` contains 0 canonical record(s) and is exactly zero bytes.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
