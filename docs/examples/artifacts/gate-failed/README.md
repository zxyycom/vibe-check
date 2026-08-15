# Complete scan blocked by the selected policy

This directory is a deterministic current-product machine publication example. Regenerate it
with `bun run generate:machine-examples`.

## Fixed scenario

- Input: One warning record entered the all-current view and matched blockWhen.
- Invocation: `invocation/v1:docs-gate-failed`
- Project root: `.`
- Timestamp: `2026-08-12T00:00:00.000Z`
- Selected policy: `docs-gate`

## Package Run result

- Result variant: `completed`
- Gate status: `failed`

The artifact set is a projection of the same validated model returned by Package Run. Effect status
and other result-variant fields are not inferred from these two files; API consumers use the
structured Run Result. A project-owned command adapter may map that result to process behavior, but
process exit codes are not part of this publication example.

## Canonical publication

- `run.json` contains v3 Check outcomes, the declarative catalog fingerprint, the canonical
  Record-set fingerprint, reference facts, acceptance and decision evidence. It contains no
  execution run, integrity, completeness or effect view.
- `records.ndjson` contains 1 canonical record(s) in recordId order.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v3 validator. They are one publication set; neither file is trusted alone.
