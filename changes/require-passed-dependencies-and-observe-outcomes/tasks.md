# Tasks

任务先闭合长期决策和现有 consumer 分类，再实施 relation 与 task-local lifecycle，最后以 source、package candidate 和外部 consumer 的同一行为完成验收。

## Readiness

- [ ] 0.1 使用 Decision evolution 固定 `dependsOn`、`observes`、task-local preflight、blocked dependent outcome 与 inheritance语义，并运行严格 Decision check。
- [ ] 0.2 审计仓库内全部 effective `dependsOn` authoring与测试，将每个 consumer明确分类为成功前置或终态观测，记录需要迁移到 `observes` 的完整清单。
- [ ] 0.3 在修改原生测试前运行 Test Evidence check，定位 dependency、preflight、scheduler、cancellation和package API 的现有 Cases 与最窄测试入口。

## Implementation

- [ ] 1.1 扩展 Check authoring、collection inheritance、Definition normalization/fingerprint和public types，以独立 closed collections表达 `dependsOn` 与 `observes`，并拒绝双重 relation、unknown/self/cycle。
- [ ] 1.2 将 preflight纳入受 Scheduler约束的单 Check Task lifecycle，并让 task settlement在不解释领域数据的前提下区分可满足 prerequisite与已形成非成功 Check outcome。
- [ ] 1.3 对未通过 prerequisite 的 dependent形成 duration 为 `null` 的 Product-owned `unavailable / dependency-not-passed`，同时让 observer等待任意四态结算并从两类 relation union读取 direct outcomes。
- [ ] 1.4 迁移仓库 Gate、examples、test fixtures和其它 consumer，保留必要的边界防御但移除对手写 success guard 的正确性依赖。
- [ ] 1.5 同步 README、configuration、API mechanics、architecture、package declarations与installed documentation，使默认依赖、观测例外和非 DSL边界从入口即可恢复。

## Verification

- [ ] 2.1 用语义 Cases证明三种非 passed upstream均阻止 dependent preflight/execution，passed upstream正常传递数据，observer在四态下运行，mixed relation graph拒绝非法边与cycle。
- [ ] 2.2 运行最窄 dependency/preflight/task-scheduler tests及 Test Evidence check，再运行 product和script typecheck、lint、format与相关测试集。
- [ ] 2.3 构建 exact package candidate，并用外部 consumer同时验证类型拒绝、runtime gating、observer readback与README/API示例。
- [ ] 2.4 运行 `bun run verify:vibe-check-workspace:full`，审阅 cancellation、console、progress、aggregation、machine output和Project Gate diagnostics没有语义回退。
- [ ] 2.5 运行 Change Plan、Decision、文档链接/示例、Git diff和workspace状态检查，确认稳定 owner与Plan artifacts同步且没有无关改动。
