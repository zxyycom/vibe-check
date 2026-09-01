# Tasks

任务先闭合并行 Scheduler 语义和默认 trace 基线，再抽取纯 policy、同步稳定 owner，最后证明结构变化没有改变产品行为。

## Readiness

- [x] 0.1 审阅当前已对齐的 `separate-passed-dependencies-from-settled-observations` Decision、Configuration、Architecture 与 runtime Case：`dependsOn` 只在 direct upstream `passed` 后 ready，`observes` 等待终态，非 passed prerequisite 由 Product 结算为 `unavailable / dependency-not-passed`；记录实施顺序为本 Change → custom selector → learned duration，fail-fast/named resource 仍为 Draft，performance diagnostics 独立观察最终 `SchedulerDecision`。
- [x] 0.2 按 `test-evidence-review` 核对 `docs/architecture.md#execution-boundary` 下的 `AUX-PARALLEL-RUNNER-001` 与 `CHECK-SCOPED-CONCURRENCY-001`：`bun run test-evidence -- check --root .` 通过 327/327 entities、91 Cases，四个 Scheduler suite 12/12；保存 ordinary pending-order tie、constrained cap→priority→scopeId→taskId、sticky reservation set/unchanged/clear、root/scope wait、cancellation drain 与 blocked settlement 的默认 decision trace 基线。
- [x] 0.3 从 `graph.ts`、`scheduler-decision-inspection.ts`、`scheduler-admission-decision.ts` 与 `scheduler-decision-model.ts` 恢复最小 input：immutable full `PlannedTaskGraph`（内置 Task priority/relations/scope/order）、inspection、relation/mutex eligible candidates 与 per-candidate capacity facts、以及 decision context；确认没有 graph 外 priority map/list，且本 Change 不复制 custom-selector 的 public hook、注册表、console、fingerprint 或 composition contract。

## Implementation

- [x] 1.1 在 `src/project-run/task-scheduler/**` 定义 private admission policy input 与结构化 select/wait result；输入交接 immutable full graph、inspection、relation/mutex eligible candidates 与 per-candidate capacity facts、以及 decision context，Task 内置 priority，保持闭合 reason 和 reservation vocabulary。
- [x] 1.2 将当前 reservation、tightening scope、constrained continuation 和 ordinary ready 选择迁入 static-priority policy，保留全部 comparator 与 tie-break 顺序。
- [x] 1.3 让 pure admission decision 调用 policy、验证 `select` Task 属于本轮 candidate 且当前可 admission、`set` reservation target 属于本轮 candidate、以及 `wait` 可 drain；不重演 policy-owned reservation/fairness/anti-starvation 策略，并继续形成现有 guarded `SchedulerDecision`；imperative shell 不解释 policy，也不内置公平/防饥饿排序。
- [x] 1.4 为 private Task engine 增加最小 frozen policy value handoff和省略时 static 默认；每轮提供 immutable full graph 与动态 inspection，不修改 package exports、Definition、RunControls 或 fingerprint。
- [x] 1.5 更新 Scheduler/Architecture owner 与语义 Cases，删除已经失去 owner 的旧 selector，但不复制完整算法到多个文档。

## Verification

- [x] 2.1 运行最窄 Scheduler pure decision 与 imperative Task engine tests，逐字段证明默认 policy 的 admission/await trace、reservation transition 和 settlement order 等价。
- [x] 2.2 运行非法 policy result、无 running wait、非法 reservation update、blocked/cancelled Task、scope capacity、full-graph read-only handoff 与 diagnostic projection 的边界测试，并运行 `bun run test-evidence -- check --root .`。
- [x] 2.3 已运行 `bun run test`（232 pass）、test-evidence（333 entities / 91 Cases）、typecheck、lint、format check、validate、decisions check、change-plan check-all 与 required Gate；full Gate 36/36 以 current exact candidate 验证 package artifact、外部 consumer type/runtime/docs，确认 public declaration、fingerprint、Check facts、outputs 与默认 Gate membership 未变。
- [x] 2.4 已完成 final correctness、coding-style 与 AI-ready 文档审阅：policy/guard 命名、纯函数边界、闭合 exact-shape handling 与文件职责清晰；只保留 private policy module 和既有 Scheduler state machine，无多余 interface、barrel、兼容 re-export 或第二状态机。
