# Design

本设计把物理移动与责任重划分开：仅在多个文件已有共同生命周期、消费者和变化原因时建子 owner；测试随被证明的行为 owner，而非按 test/support 文件类型集中。

## Context

Product 唯一公开入口仍为 `src/index.ts`，scripts 只经 exact candidate 消费 Product。前轮已经确认 `project-run/invocation`、`completion`、`outputs` 是 Run 的 child。深层审计确认 Scheduler 内 immutable admission graph/reducer 与 measurement accumulation 是两个独立簇；Lizard analyzer 的 model/context、pipeline 与 retained extension-output parity 需要独立处理。test-evidence profile 当前从 discovery child 取得 Bun surface schema，Gate process-entry 同时承载 common entry factory，package-checks 有仅含 test helper 的伪 owner。

## Goals / Non-Goals

目标是让内部路径、依赖方向与共置测试表达真实职责，并保持 Product 可观察行为和连续 Case 语义不变。非目标是不按 LOC 拆分、不将所有测试移到 tests/、不为 helper 建泛化 shared 层、不改变 Lizard parity/公开能力、Product 输出契约或 Gate result/evidence data，也不把同-owner 路径调整作为新的长期 policy。Gate terminal 收敛只改变其人读 info 投影，不改变 `gate.log` 的完整 evidence。

## Decisions

### Intended Change

`task-scheduler/admission-core/**` 承接 compiled graph、immutable selection/query/transition/projection 与其测试；`task-scheduler/measurement/**` 承接 diagnostics/timing/integrals/summary/policy measurement 及其测试，terminal delivery 留 Scheduler lifecycle 层。`analyzer/**` 按私有 model/context、pipeline、extension-output compatibility、reader registry 与 façade 分解；主变更同步其外部 imports、docs 与 Cases。profile 重新拥有 Bun surface schema，discovery 消费它；Gate 的 `entry-factories` 负责形成带 selection metadata 的 entry；单一 package Check test helper 直接归 package-checks。配对 tests 保持实现旁；跨文件 invocation/output/Scheduler tests 与专属 support 随对应 child，Run root integration/support 若证明 public Run 契约则保留根。

### Resulting Impacts

移动测试仅更新连续 Case 的 entity path，不拆分 Case；每次路径迁移前后运行 closure 和最窄测试。架构/脚本工具说明同步目录 owner；analyzer 的 source mapping/provenance 由 source-aligned analyzer 实现维护。路径变动风险集中在内部 import、Bun entity identity 与 published readable ESM tree，故不保留 bridge/barrel，并以针对最终完整 diff 的 exact package complete Gate 覆盖。

## Risks / Trade-offs

Scheduler measurement 的时序、admission-core 的 public opaque state 和 analyzer source parity 都不能由编译替代行为证据；测试移动会导致 Case closure 失败但不应改变 Proves。保留 Run root 的 integration tests 会留下少量根文件，这是刻意按 public observable owner 而非目录整齐取舍。published physical deep paths 可能有未支持消费者，风险仍按既有 package policy 报告。

## Open Questions

无。analyzer 的 path/Case/import mapping 已交付；若最终 diff 或最终 Gate 出现新事实，按 Verification 任务更新本 Plan。

## Resolved Boundary

`invocation/`、`completion/`、`outputs/` 继续是 Run child；admission-core 与 measurement 是 task-scheduler child，不上提为 Product top-level。测试目录不构成独立 owner，只有被证明能力的实现 owner 才构成目录。
