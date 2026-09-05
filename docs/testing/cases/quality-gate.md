# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate binds eligibility to package aggregation

Owner: `docs/development/check-results.md#explicit-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps required, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles all four blocking repository-quality Checks through the existing Gate aggregate`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > settles a blocking normal quality Finding through its owning Check and effective aggregate`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Required, complete `--all` and focused preset Gate selections retain their golden direct members. All four repository-quality Checks belong to required and `--quality`; only Markdown link validation also belongs to `--docs`. The bound Project Run receives explicit `effective` aggregation (not the `--all` selection), so Product reuses the same private flag-and-`dependsOn` selection; unavailable propagates, included N/A fails, and an empty selection fails. A selected actual blocking normal quality Finding settles its owning Check failed and makes that same aggregate failed, while a zero-Finding run remains passed; aggregation does not inspect its Record.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots and maps aggregate, definition-warning and progress-output facts to the initial Gate result; non-completed or malformed Run facts form an unavailable initial result.
