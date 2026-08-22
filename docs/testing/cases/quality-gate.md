# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate binds eligibility to package aggregation

Owner: `docs/quality-metrics.md#explicit-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/quality/project-gate/project-definition.test.ts|Project Gate Definition > binds required, full, and partial eligibility selections to explicit aggregation`
- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project-gate/index.test.ts|Project Gate adapter closure > maps aggregate, definition warning, effect and malformed facts to Gate exits`
  Proves:
- Required, full and local partial repository Gate selections produce the same eligible Check IDs that the bound Project Run passes to explicit `all` aggregation, with unavailable propagation, included N/A failure and failed empty set.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots, and maps aggregate, definition-warning and progress-effect facts to exit `0` or `1`; non-completed or malformed Run facts map to infrastructure exit `2`.
