# Tasks

任务先闭合并行 Scheduler 语义和默认 trace 基线，再抽取纯 policy、同步稳定 owner，最后证明结构变化没有改变产品行为。

## Readiness

- [ ] 0.1 审阅并集成 `require-passed-dependencies-and-observe-outcomes` 的最终 graph eligibility、blocked settlement 与 observation 模型，记录 fail-fast、named resource 和 performance diagnostics 的实际实施顺序。
- [ ] 0.2 按 `test-evidence-review` 核对 Scheduler 现有 Case owner，保存 ordinary、priority、scope tightening、reservation、capacity wait、cancellation 和 blocked settlement 的默认 decision trace 基线。
- [ ] 0.3 从当前源码恢复 policy 所需的最小 immutable input，确认本 Change 没有提前复制公共 custom-selector Change 的 hook、注册表、console、fingerprint 或 composition contract。

## Implementation

- [ ] 1.1 在 `src/project-run/task-scheduler/**` 定义 private admission policy input 与结构化 select/wait result，并保持闭合 reason 和 reservation vocabulary。
- [ ] 1.2 将当前 reservation、tightening scope、constrained continuation 和 ordinary ready 选择迁入 static-priority policy，保留全部 comparator 与 tie-break 顺序。
- [ ] 1.3 让 pure admission decision 调用 policy、验证 selected Task 属于本轮候选，并继续形成现有 guarded `SchedulerDecision`；imperative shell 不解释 policy。
- [ ] 1.4 为 private Task engine 增加最小 frozen policy value handoff和省略时 static 默认，不修改 package exports、Definition、RunControls 或 fingerprint。
- [ ] 1.5 更新 Scheduler/Architecture owner 与语义 Cases，删除已经失去 owner 的旧 selector，但不复制完整算法到多个文档。

## Verification

- [ ] 2.1 运行最窄 Scheduler pure decision 与 imperative Task engine tests，逐字段证明默认 policy 的 admission/await trace、reservation transition 和 settlement order 等价。
- [ ] 2.2 运行非法 policy result、无 running wait、blocked/cancelled Task、scope capacity 与 diagnostic projection 的边界测试，并运行 `bun run test-evidence -- check --root .`。
- [ ] 2.3 运行 format、typecheck、lint、dependency/public-entry 检查和 `bun run verify:vibe-check-workspace:required`，确认 public declaration、fingerprint、Check facts、outputs 与默认 Gate membership 未变。
- [ ] 2.4 按编码规范审阅 policy/guard 的命名、纯函数边界、exhaustive handling 与文件职责，确认没有多余 interface、barrel、兼容 re-export 或第二状态机。
