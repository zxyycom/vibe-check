## 1. Blocking artifact audit

- [x] 1.1 Audit the proposal core sentence, modified capability coverage, delta scenarios, numbered design decisions, active-change interaction, migration path, and open-question gate; do not begin implementation until this task is checked.

## 2. Test evidence baseline

- [x] 2.1 Run the pre-change test-evidence integrity check and recover the semantic Cases that own CLI baseline planning, function warning comparison, and repository dogfood behavior.

## 3. Explicit baseline planning

- [x] 3.1 Add focused parser and formal-entry tests for removed `--with-baseline`, current-only omission, required comparison baseline, `--skip-baseline` conflicts, invalid revisions, and canonical full-SHA pinning.
- [x] 3.2 Resolve raw explicit revisions once before config/dependency/scanner/cache/artifact work and pass only `baselineCommitSha` or null into Quality Core.
- [x] 3.3 Remove Core auto-selection and skip booleans while preserving explicit baseline materialization, runtime-unavailable evidence, changed-input detection, cache identity, and metadata.

## 4. Stable function comparison

- [x] 4.1 Add focused warning tests for line-only movement, two-sided unique names, current/baseline duplicate names, anonymous/unknown names, new named functions, and cross-file moves.
- [x] 4.2 Replace the line-based function baseline map with a two-sided unambiguous `file + name` matcher while preserving current warning locations, ordering, thresholds, and machine shape.

## 5. Repository contract migration

- [x] 5.1 Make `quality:full-check` a no-baseline full snapshot and keep `quality:gate` a thin explicit-baseline pass-through.
- [x] 5.2 Update CLI, quality-metrics, script-tooling, help, and test-fixture owner materials to remove inferred-baseline claims and document canonical explicit comparison.
- [x] 5.3 Update existing semantic Case entity paths/proof text as needed without creating a second test inventory or weakening Case closure.

## 6. Verification and decision alignment

- [x] 6.1 Run focused product tests, product import/typecheck/lint, test-evidence check, docs/OpenSpec validation, and the full product suite.
- [x] 6.2 Run required workspace verification plus current-only full-check and an explicit-baseline regression gate; inspect artifacts for canonical baseline identity and line-shift noise removal.
- [x] 6.3 Review the final diff for scope/contract synchronization, then mark `workflow-policy/require-explicit-quality-baselines` aligned and rerun decision validation.
