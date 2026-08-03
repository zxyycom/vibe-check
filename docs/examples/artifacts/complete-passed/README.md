# Complete scan without warnings

This directory is a deterministic current-product artifact example. Regenerate it with
`bun run generate:machine-examples`.

## Fixed input

- Scenario: Measured TypeScript input with all three stable capabilities succeeded and no warnings.
- Project-relative input paths: `src/example.ts`
- Repository root: `/workspace/vibe-check-fixtures/canonical-project`
- Timestamp: `2026-08-03T00:00:00.000Z`
- Current commit: `0123456789abcdef0123456789abcdef01234567` at `2026-08-02T12:00:00.000Z`
- Baseline commit: `89abcdef0123456789abcdef0123456789abcdef` at `2026-07-31T12:00:00.000Z`
- Config version: `canonical-config-v1`
- Tool metadata: scc 3.6.0 (configured); lizard 1.17.31 (configured); jscpd 5.0.11 (configured)
- Configured include globs: `src/**/*.ts`
- Configured exclude directories: `dist`, `node_modules`
- Configured generated-file paths: `src/generated.ts`

## Requested gate and process result

- Gate request: none (gate disabled)
- Expected process outcome: `success`
- Expected exit code: `0`

## Why this set is contract-valid

Every stable capability succeeded, so completeness reduces to `complete`; all warning channels and both streams are empty, and the closed disabled-gate shape is valid.

The three artifact files are produced from fixed core values through the production mapper and
serializers, then accepted by the production artifact-set validator. The process outcome and exit
code above are scenario metadata; they cannot be inferred from the files alone.
