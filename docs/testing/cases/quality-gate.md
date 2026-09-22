# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate uses Product default strict aggregation

Owner: `docs/development/check-results.md#effective-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps required, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > settles a blocking normal quality Finding through its owning Check and effective aggregate`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps a rejected bound Run to the existing unavailable adapter boundary`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Required, complete `--all` and focused preset Gate selections retain their golden direct members. Four blocking repository-quality Checks belong to required and `--quality`; advisory Markdown lint has the same membership and also belongs to `--materials`. Markdown link validation stays on its full materials path, while lint is incrementally selected only for required material changes and always forced by materials/quality/all. The bound Project Run passes no aggregation policy, so Product applies its default strict-all aggregate to the same private flag-and-`dependsOn` effective selection, rather than the `--all` selection. Any non-passed effective Check or an empty effective selection fails the aggregate. A selected actual blocking normal quality Finding settles its owning Check failed and makes that same aggregate failed, while Markdown lint Finding Records remain visible in a passed owning Check; aggregation does not inspect Records.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots and maps aggregate, definition-warning and progress-output facts to the initial Gate result; non-completed or malformed Run facts form an unavailable initial result.
- A rejected bound Run reaches the existing root adapter catch and produces one unavailable result and its matching process exit; the Gate does not add a second aggregation-error mapping.
