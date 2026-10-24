# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate uses Product default strict aggregation

Owner: `docs/development/check-results.md#effective-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps fast, changed, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > settles a blocking normal quality Finding through its owning Check and effective aggregate`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps a rejected bound Run to the existing unavailable adapter boundary`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Fast, affected `--changed`, complete `--all` and focused preset Gate selections retain their golden direct members. Fast provides engineering feedback, not complete acceptance; the four blocking repository-quality Checks and advisory Markdown lint are outside fast, selected by their affected input regions under changed, and forced by quality/all. Markdown lint and link validation also belong to materials. The bound Project Run passes no aggregation policy, so Product applies its default strict-all aggregate to the same private flag-and-`dependsOn` effective selection, rather than the `--all` selection. Any non-passed effective Check or an empty effective selection fails the aggregate. A selected actual blocking normal quality Finding settles its owning Check failed and makes that same aggregate failed, while Markdown lint Finding Records remain visible in a passed owning Check; aggregation does not inspect Records.
- The adapter reads the package-produced aggregate rather than traversing raw Check snapshots and maps aggregate, definition-warning and progress-output facts to the initial Gate result; non-completed or malformed Run facts form an unavailable initial result.
- A rejected bound Run reaches the existing root adapter catch and produces one unavailable result and its matching process exit; the Gate does not add a second aggregation-error mapping.

## Case AUX-PACKAGE-CONSUMER-DIAGNOSTICS-001: 隔离准备留下有界安全阶段证据

Owner: `docs/tooling/package-lifecycle.md#隔离安装诊断`
Entities:

- `bun|scripts/package/candidate/external-consumer/preparation-diagnostics.test.ts|consumer preparation diagnostics retain safe facts without changing operation outcomes`
- `bun|scripts/package/candidate/external-consumer/preparation-diagnostics.test.ts|consumer preparation diagnostics bound inspection and transcript without skipping work`
- `bun|scripts/project/gate/checks/external-consumer-material.test.ts|external consumer provider binds typed output to invocation provenance`
  Proves:

- 阶段开始在同步工作前可观察，完成和异常保留计时及结果，原返回对象与异常身份不变。安装摘要仅发布安全数值和固定标记，不复制原始安装输出或异常中的私密内容。
- 输出检查与诊断总量有界，截断明确可见且不跳过后续工作；写入失败不会被伪装成诊断成功。Provider Check 的真实子进程接线将 stderr 阶段证据保留到 Product transcript，同时 stdout material 与 passed typed result 不变。
