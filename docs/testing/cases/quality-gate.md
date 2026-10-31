# quality-gate

## Case WB-EXPLICIT-AGGREGATION-001: Repository Gate uses Product default strict aggregation

Owner: `docs/development/check-results.md#effective-aggregation-and-repository-gate-mapping`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps fast, changed, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps a rejected bound Run to the existing unavailable adapter boundary`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- Fast、changed、all、scoped 和 focused 保持明确的 golden membership。Fast 固定包含基础文档检查，领域 scope 追加适用指标；Markdown lint Finding 仍 non-blocking，已选 blocking 指标 Finding 令 owning Check failed。bound Run 不传 aggregation policy，Product 按同次 flag-and-dependsOn 有效集合使用 strict-all；任何非 passed 或空选择令 aggregate failed，不从 Records 重算结果。
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
