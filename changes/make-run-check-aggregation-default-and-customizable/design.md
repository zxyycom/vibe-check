# Design

本设计把 Run 汇总限定为对**本次有效 Check 列表**的调用级折叠；默认规则和同步定制函数共用同一事实源。

## Context

- [API 机制](../../docs/api-mechanics.md#runcontrols-与-check-aggregation)和[Check 结果 owner](../../docs/development/check-results.md#explicit-aggregation-and-repository-gate-mapping)定义当前显式 policy、`aggregate: null` 默认及四态 Check facts；这些是现状，不是目标契约。
- `src/project-run/invocation/candidate.ts` 已在完整 snapshot 形成后计算聚合；`ResolvedCheckExecution.effectiveCheckIds` 保存本次 flag-and-`dependsOn` 选择。有效选择不等于全量 snapshot：未选 Check 也有 `not-applicable` facts。
- `src/project-run/invocation/run.ts` 当前把一般异常捕获为 `task-engine-failed`；`finalizeInvocation` 负责关闭诊断与 progress 输出。`candidate.ts` 当前先渲染 execution final summary 再计算 aggregate，拒绝路径需避免以该 summary 暗示 Run 汇总成功。Gate root 已捕获 bound Run 的拒绝，并映射为 unavailable/nonzero exit；bound Run 的 consumer lease 已由 `finally` 清理。
- [effective-selection Decision](../../docs/decisions/unify-effective-flag-selection-and-aggregation.md)当前要求同源选择，但保留显式 policy、`aggregate: null` 并排除 callback；实施须形成覆盖新方向的后继判断。

## Goals / Non-Goals

Product 负责形成有效列表、调用同步汇总、验证四态返回和关闭 Run 生命周期；调用方负责定制解释。完整 Check/Record snapshot 仍是原始事实，`aggregate` 只供本次 Run 的消费者使用。Scheduler、Check settlement、Definition 和 machine publication 沿用各自职责；ast-grep 的 Check 拆分由独立 Change 处理。

## Decisions

### Intended Change

1. Product 从已结算 snapshot 按 canonical Check order 选出 `effectiveCheckIds` 对应的只读 `CoreCheck[]`。`snapshot.checks` / `snapshot.records` 继续保存全量事实；默认和定制函数只消费这一个有效列表。
2. 默认折叠返回 `CheckAggregate`：有效列表**非空且全部 `passed`**时为 `passed`，空列表或任何 `failed`、`unavailable`、`not-applicable` 时为 `failed`。各 Check 原终态不变。
3. `RunControls.checkAggregation?: CheckAggregation` 直接替换旧 policy；公开 `CheckAggregation` 为同步 `(checks: readonly CoreCheck[]) => CheckAggregate`。列表项保留 `checkId`、`outcome` 和 passed/failed final data；将 `CoreCheck` 作为可从 package root 导入的公开类型。函数仅在完整 settlement 后调用，不进入 Definition fingerprint。
4. Product 在聚合边界验证闭合四态返回；Promise、其他值或 callback 抛错均形成 Error 并让 `run` 的 Promise 拒绝。callback 抛出的 Error 保留原错误；非 Error throwable 与非法返回转换为可定位的 Error。普通配置、planning、Check callback、execution 与 output 失败仍由原 `RunResult` 分支表达。

### Resulting Impacts

- Controls 验证接受 trusted function 并保留函数 identity；`RunResultFacts.aggregate` 在有完整 facts 的分支改为非 null `CheckAggregate`。cancellation 和无完整 facts 的分支继续沿用现有语义。同步函数返回 Promise 按非法返回处理，不等待其结算，并避免未处理的 Promise rejection。
- 当前通用 catch 必须仅识别聚合边界的错误并传播到 caller；聚合先于正常 final progress 成功呈现，拒绝路径关闭诊断与 progress writer，不调用正常 RunResult 的 terminal publication。清理失败不得掩盖原聚合错误。调用方不从拒绝的 Promise 获得 snapshot；已结算 facts 不被改写。
- Gate bound Run 省略 `checkAggregation` 并消费默认严格结果；root 已有 Promise-rejection catch，须以故障注入验证错误报告和非零 exit。Gate 原始 Check facts、选择、resultContributor 与 candidate binding 保持原责任。
- 公开 API、用户指南/示例、内部 owner、package inventory/type acceptance、聚合矩阵/effective-selection tests 和 Decision 在同一实施中同步；按[文档影响审查](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)由非实施代理依据实际 diff 反查。

## Risks / Trade-offs

默认 `failed` 是严格验收摘要，不把 Check `unavailable` 的事实变成可信 Check failure；完整 snapshot 仍显示原四态。直接抛错可避免定制规则失败后出现伪成功，但这次调用不返回已结算 snapshot。关闭资源的失败路径和 Gate 的异常报告必须由测试证明。trusted 函数的非确定性与独立副作用由调用方负责；Product 只验证返回边界。

## Open Questions

无。实施中若发现现行 owner 或测试证明四态返回、有效列表或同步调用不足以承接现实消费者，应先修订本 Plan，再扩大公开契约。
