# Incomplete scan with retained run evidence

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: The selected Check could not run because its dependency was unavailable.
- Invocation: `invocation/v1:docs-scan-incomplete`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `docs-gate`

## Package Run result

- Result variant: `completed`
- Gate status: `not-evaluated`

The artifact set is a projection of the same validated model returned by Package Run. Effect status
and other result-variant fields are not inferred from these two files; API consumers use the
structured Run Result. A project-owned command adapter may map that result to process behavior, but
process exit codes are not part of this publication example.

## Canonical publication

- `run.json` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- `records.ndjson` contains 0 canonical record(s) and is exactly zero bytes.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
