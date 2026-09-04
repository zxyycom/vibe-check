# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate binds eligibility to package aggregation

Owner: `docs/quality-metrics.md#explicit-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps required, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Required, complete `--all` and focused preset Gate selections retain their golden direct members. The bound Project Run receives explicit `effective` aggregation (not the `--all` selection), so Product reuses the same private flag-and-`dependsOn` selection; unavailable propagates, included N/A fails, and an empty selection fails.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots and maps aggregate, definition-warning and progress-output facts to the initial Gate result; non-completed or malformed Run facts form an unavailable initial result.
