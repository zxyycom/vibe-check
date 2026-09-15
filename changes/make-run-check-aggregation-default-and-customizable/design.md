# Design

本 Draft 以 Run 的 terminal Check facts 为唯一输入源，在已存在的结算后聚合位置提供简单默认折叠和可选 caller strategy；公开形状与迁移细节尚待审阅。

## Context

- [API 机制](../../docs/api-mechanics.md#runcontrols-与-check-aggregation)和[Project Run owner](../../docs/development/project-run.md#invocation-and-results)规定当前 `checkAggregation` 只在 RunControls，省略时 `aggregate: null`；[Check results owner](../../docs/development/check-results.md#explicit-aggregation-and-repository-gate-mapping)将聚合定位为 invocation-derived result，不是 Check fact。
- `src/project-run/invocation/candidate.ts` 已在完整 Check snapshot 形成后、terminal output closure 前计算 aggregate；`run` 是执行、调度和输出的异步入口，不是纯函数。单独的状态折叠可以保持纯计算。
- [effective-selection Decision](../../docs/decisions/unify-effective-flag-selection-and-aggregation.md)让聚合消费 Product 的同一 private flag-and-dependsOn selection，明确保持 `aggregate: null` 默认并排除 caller-local callback。拟议方向须作为公开契约修订审查，不能把历史决策当作当前 API 已支持的证据。
- [Gate owner](../../docs/tooling/project-gate.md#聚合结果)当前以显式 `mode: all / unavailable: propagate` 聚合全部 effective statuses，再由 Gate adapter 将非 passed aggregate 映射为失败。Gate 退出/验收策略由 Gate 拥有。

## Goals / Non-Goals

目标是让 Run 使用者获得可复核的默认严格摘要和本次调用定制能力，而 Check facts、Run operational branch、effective selection 与 Gate process exit 各保留唯一 owner。不把聚合移到 Check Definition、Core entity、Scheduler、machine publisher 或 command Check；不恢复旧 Record/reference 通用评估器。

## Decisions

### Intended Change

1. **暂定**：在 `RunResult` 已拥有完整 terminal Check facts 的分支保留 `snapshot.checks` / `snapshot.records` 为事实源；`aggregate` 仍是单独的 invocation-derived readback，不把 `RunResult.kind = completed` 改写成“所有 Check 通过”。配置、planning 或无完整 facts 的 execution 失败不能伪装为空 Check 列表。
2. **暂定默认**：省略本次自定义聚合函数时，Run 使用 Product 已形成的 effective Check 集合做 strict-all fold；集合非空且每项 `passed` 才 `passed`，任何 `failed`、`unavailable`、`not-applicable` 或空集合均 `failed`。这只是默认验收摘要，不声称不可用事实已变成可信失败；原四态仍在 Check 列表。
3. **暂定定制**：RunControls 允许 trusted caller 提供聚合函数，Product 在已冻结、canonical-ordered 的选中 Check facts 上调用，并验证返回的闭合聚合结果。调用方拥有解释规则；Product 拥有选择、时序、返回边界与 facts 保全。函数不进入 Definition 的 declarative fingerprint，也不修改 Check 状态、Record 或调度。
4. 保留 selection 与汇总同源：默认使用 `effective`；对现有 `all` / Check-ID list 消费者的兼容方案在公开签名审阅时确定，不让 Gate 从 `not-applicable` reason 或 Check 列表重建 effective membership。

### Resulting Impacts

- `RunControls` validation、`RunResult.aggregate` 默认、现有 `CheckAggregation` 公开类型、聚合矩阵与 effective-selection tests，以及指南/内部 owner/Decision 需要同步。当前“省略即 null”是可观察行为；必须明确 raw-only consumer 如何选择不聚合或迁移。
- custom callback 若抛错、返回非法值或试图改变输入，必须有独立、稳定的聚合失败结算，且不能让 `executeValidatedRun` 的顶层 catch 把已形成的 snapshot 丢成无 facts 的 execution failure。callback 同步/异步、信任与取消边界也需验收。
- `completed` 与保留完整 facts 的 `output` branch 应使用一致的聚合 readback；execution cancellation 的现有无 aggregate 语义和 machine publication 是否展示该摘要需明确，不得从聚合反向决定 output status。
- Gate 可消费新默认 strict-all 结果，或在自己的 RunControls 中选择领域策略；需复查 Gate 文本、测试和 exit mapping。ast-grep version/rule-tests 的语义拆分是独立实施，不是默认聚合 Change 的隐式工作。

## Risks / Trade-offs

简单默认可以消除配置负担及 `failed + unavailable` 的验收歧义，但会失去 aggregate 层面的不可用区分；原 Check facts 是保留该证据的权威位置。自定义函数增加灵活性，也引入运行时 callback failure、非确定性和安全输入边界。不能把调用方的摘要误命名为 Product 的普遍最终质量结果。

该设计与 `make-command-check-cover-process-backed-checks` 独立：前者处理 Run 汇总，后者处理单次命令与调用方领域执行。两者可以分别验证和交付。

## Open Questions

1. 公开定制 API 的字段名、回调签名和返回类型：只允许 `CheckAggregate`，还是另有 caller-owned typed summary？回调只读 selected `{ checkId, outcome }`，还是完整 Check facts？
2. `all` / 显式 ID selection 与现有闭合 policy 的兼容路径，以及显式关闭默认聚合的机制是什么？是否需要迁移期双入口？
3. callback 异常/非法返回如何表示 aggregate failure，同时保留已结算 snapshot 与 output branch；是否只支持同步纯计算？
4. Gate 是否仅需要默认 strict-all 验收，还是仍需要区分验收失败与证据覆盖不完整？这是 Gate 消费目标，不预先规定 Product 默认。
