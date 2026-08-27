# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate binds eligibility to package aggregation

Owner: `docs/quality-metrics.md#explicit-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > derives required, full, and partial aggregates from the same entries`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Required, full and local partial repository Gate selections produce the same eligible Check IDs that the bound Project Run passes to explicit `all` aggregation, with unavailable propagation, included N/A failure and failed empty set.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots and maps aggregate, definition-warning and progress-output facts to the initial Gate result; non-completed or malformed Run facts form an unavailable initial result.
