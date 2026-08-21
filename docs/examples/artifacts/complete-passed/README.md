# Complete passed Check without Records

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun scripts/docs/machine-examples.ts`.

## Fixed scenario

- Input: One applicable Check completed without supplemental Records.
- Invocation: `invocation/v1:docs-complete-passed`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`

## Package Run result

The artifact set projects the same frozen Core Check/Record facts returned by Package Run. Effect
status and any invocation-specific aggregate are structured Run Result facts, not recoverable from
these artifacts. A command adapter may map its result to process behavior, but process exit codes
are not part of this publication example.

## Canonical publication

- `run.json` contains v4 terminal Check outcomes (with final data only for passed/failed Checks),
  invocation metadata, and the complete Record-set fingerprint. It contains no catalog, aggregate,
  decision, reference, acceptance, view, blocking, or presentation evidence.
- `records.ndjson` contains 0 canonical supplemental Record(s) and is exactly zero bytes. Each row is `{ checkId, id, data }` plus its v4 schema identity.

Both files are produced from the current Check / Record publication model and accepted together by
the formal machine-v4 validator. They are one publication set; neither file is trusted alone.
