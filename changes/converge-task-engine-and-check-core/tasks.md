# Tasks

Readiness establishes the product contract and current behavior evidence. Implementation performs one integrated hard cut. Verification proves semantic preservation and the final package/output boundary.

**Dependency rule:** G1–G3 and successor decisions are complete。No `1.x` Implementation task may start until tasks 0.6–0.7 finish the behavior evidence and migration inventory。

## Readiness

- [x] 0.1 已确认目标边界：Task 是唯一执行模型；Check execution scope 持有 Core capability；Core 最终实体只有 Check 与 QualityRecord；普通 child Task 不成为 public row。
- [x] 0.2 已读取 Architecture、Configuration、coding style、definition/task-scheduler/check-record/run owner、相邻测试、相关 active decisions 与下游 package Change；已确认 runtime migration 必须整体 hard cut。
- [x] 0.3 已确认 descriptor carrier simplification 不依赖本 Change，并由 `simplify-built-in-descriptor-adjustments` 独立交付。
- [x] 0.4 已采纳 G1–G3：每个 canonical Resolved Check 一个 Core Check、无 `unselected` row；删除 work-handle acknowledgement；machine contract 单版本硬切到 v3。
- [x] 0.5 已按 `decision-records` 建立四条 `active + unaligned` successor decisions，归档旧 Core/CheckRun、TaskPlan/ack 与 cap side-map representation owners，并通过 `bun run decisions:check`。
- [ ] 0.6 修改测试前按 `test-evidence-review` 恢复 Definition/Core/TaskPlan/scheduler/Run/output Case ledger；建立 current CheckRun 到 target Core Check 的语义映射，至少覆盖 direct、TaskPlan、not-applicable、blocked、quality failed、execution/protocol/record failure、partial Record、late capability、cap reservation/drain 和 cancellation。
- [ ] 0.7 建立 owner-to-consumer migration inventory：列出 `.runs`、`checkRunId`、definitions/runs snapshot、work-handle acknowledgement、completeness/integrity、policy/reference、human/machine output、schema/examples/validators 与 package acceptance consumers；按已采纳 G1–G3 为每项标明 target owner、hard-cut 行为和验证入口。

## Implementation

- [ ] 1.1 在 Definition owner 建立单一 canonical Resolved Check model，聚合 definition、继承后的 dependency/mutex/cap、options/applicability 和 private binding；只在明确的 declarative projection 中计算 fingerprint/output。
- [ ] 1.2 建立 Definition-owned `CustomCheck`、TaskPlan、planning context 与 result-facing public types；保持 contextual typing，但不导出 scheduler-private Task、TaskRun、worker 或 capability types。
- [ ] 1.3 将 `src/product/task-scheduler/**` 收敛为唯一静态 Task engine，统一 graph validation、dependency、mutex、admission、cancellation 与 settlement；让 `scripts/vibe-check-workspace/**` 通过 adapter 使用它，不把 scripts-only authoring fields 并入 Product contract。
- [ ] 1.4 在同一 planned Task graph 中实现 `kind: "check"` execution scope，使 scope/cap/ownership/terminal metadata 成为 graph 结构；保持 root-min-active cap、first-admission-to-terminal span、deterministic reservation/drain、non-preemption 和 constrained continuation priority，不建立 keyed side map、per-Check scheduler 或第二 queue。
- [ ] 1.5 实现最小 Core capability boundary：每个 Resolved Check 只创建一个 scope；RecordSink 自动绑定 `checkId` 并验证 Record 类型；只有 trusted root/completion adapter 可单次 settle；scope-external、duplicate 和 late mutation fail closed；已接受 Record 在普通后续失败后保留。
- [ ] 1.6 将 direct Check、static TaskPlan 与 not-applicable 映射到统一 Task/settlement flow；映射 `completed(passed/failed)`、`unavailable(diagnostic)` 与 dependency availability，删除重复 adapter lifecycle。
- [ ] 1.7 建立只含 `checks`/`records` entity collections 的 Core snapshot；删除 `CheckManager`、`CheckRun`、`checkRunId`、替代 instance ID、definitions+runs 双投影和 work-handle acknowledgement/completeness lifecycle。
- [ ] 1.8 迁移 policy、reference facts、human status、Run result、effects 与 runtime validation，使其只消费 target Core Check/QualityRecord facts；保持 quality failure 与 execution unavailability 的区别以及 committed Record retention。
- [ ] 1.9 单版本硬切到 run/record v3 machine publication：同步 schema URN、mapper、validator、decision/reference invariants、artifacts、examples 与 readable output；不修改历史 v2 bytes，不保留 v2 runtime writer/reader、fallback 或 dual path，并删除所有 `.runs`/`checkRunId` consumers。
- [ ] 1.10 更新 Architecture、Configuration、Output、Testing/navigation、Script Tooling、current public-contract 与 validators，明确唯一 Task engine、Check scope、minimal Core capability、canonical normalization、two-entity snapshot 和 downstream package handoff。
- [ ] 1.11 按 `test-evidence-review` 更新测试节点、Case Owner/Proves 与 target invariant tests；删除仅证明旧 CheckRun、side-map 或 acknowledgement duplicate lifecycle 的 Cases，但保留每项仍成立行为的独立证据。

## Verification

- [ ] 2.1 运行最窄 Definition normalization、Task graph/engine、Check scope/Core capability、direct/TaskPlan mapping 与 Run tests；覆盖 dependency/mutex、root/scoped cap、reservation/drain、cancellation、三种 Core Check outcome、quality/execution failure、partial Records、conflict/provenance 和 late capability rejection。
- [ ] 2.2 在测试修改前后运行 `bun run test-evidence:check`；证明每个被删除的 CheckRun/acknowledgement Case 已由 target responsibility 覆盖，而不是因改名或删测试丢失义务。
- [ ] 2.3 运行 Product import-boundary、typecheck、lint 和目标 suites；搜索确认 current source/script/doc consumer 中不存在 `.runs`、`checkRunId`、替代 instance ID、keyed scope/cap side map，且 functions/capabilities/private Task data 不进入 fingerprint、Core output 或 public types。
- [ ] 2.4 验证 run/record v3 schema、mapper、validator、examples、artifacts、decision/reference invariants 与 human output；证明 snapshot entity collections 恰好为 `checks`/`records`，历史 v2 schema bytes 未被改写且 current runtime 不存在 v2 或 dual publication path。
- [ ] 2.5 运行 Project Run integration，证明 built-in/custom direct Check、static TaskPlan、policy/effects/result、scanner adapter 与 scripts adapter 通过唯一 engine 协作，没有 config reload、dynamic plan 或 second scheduler。
- [ ] 2.6 完成 Architecture、Configuration、Output、Script Tooling、public-contract、docs/examples/schemas/validators 的 owner-to-artifact audit；对 `changes/establish-api-only-npm-product-boundary` 只读记录 downstream handoff，确认其必须自行复核并 re-plan，本 Change 未修改它。
- [ ] 2.7 运行 `bun run decisions:check`、本 Change `change-plan -- check` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 2.8 在结束 runtime/Core/machine contract hard cut 前运行 `bun run verify:vibe-check-workspace:full`；该验证为必需项。
