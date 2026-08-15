# Tasks

Readiness 已闭合目标契约、现有行为证据与全部已知 consumers；下一执行入口是 1.1，Implementation 按单向数据流执行一次 integrated hard cut，Verification 证明语义保留、旧 lifecycle 退出以及最终 public boundary。

**Dependency rule:** Readiness 0.1–0.9 均已完成，`1.x` Implementation 可以按编号开始；不得跳过同一 hard cut 中负责删除旧 truth source 的后续任务而把过渡状态当成完成。

## Readiness

- [x] 0.1 已确认目标边界：Task engine 是唯一通用执行模型；Product Check adapter 用 graph scope 持有 Core capability；Core 最终实体只有 Check 与 QualityRecord；普通 child Task 不成为 public row。
- [x] 0.2 已读取 Architecture、Configuration、coding style、definition/task-scheduler/check-record/run owner、相邻测试、相关 active decisions 与下游 package Change；已确认 runtime migration 必须整体 hard cut。
- [x] 0.3 已确认普通 `BuiltInCheck`、顶层 `replace` / `append`、declarative normalization 与 Package Run-owned private binding 已成为当前前置契约；本 Change 消费这些事实，不恢复 descriptor carrier 或 normalization-owned built-in binding。
- [x] 0.4 已确认每个 canonical Resolved Check 对应一个 Core Check 且没有 `unselected` row，Task settlement 取代 work-handle acknowledgement，machine contract 单版本硬切到 v3。
- [x] 0.5 已按 `decision-records` 建立并核对 Core facts、single graph、Check cap、machine hard cut 等 successor decisions，归档被替代的 Core/CheckRun、TaskPlan/ack 与 cap side-map representation owners，并通过 `bun run decisions:check`。
- [x] 0.6 已按 `test-evidence-review` 运行全树闭合并审阅 Definition/Core/TaskPlan/scheduler/Run/output Cases；Design 的 “Current behavior to target evidence” 已映射 direct、TaskPlan、zero-child、not-applicable、blocked、quality failed、failure/Record、late capability、cap、trusted invariant、current cancellation 与 v2 output，并明确 execution cancellation/v3 是实施期新增证据。
- [x] 0.7 Design 的 “Owner-to-consumer hard-cut inventory” 已列出 normalized declarative/private handoff、catalog、`.runs`/`checkRunId`、definitions/runs、ack/completeness/integrity、policy/reference、Run result、machine/readable output、schemas/examples/validators、annotation、scripts adapter、public/package consumer、stable docs，以及每项 target owner、删除动作、历史 v2 边界和验证入口。
- [x] 0.8 已由用户确认 streaming fact model 下的 cooperative graph cancellation；已建立 `product-contract/cooperatively-cancel-task-graphs`，固定 admission cutoff、admitted Task drain、fact retention、cancelled Check closure、late capability 与 Run terminal boundary，并通过 `bun run decisions:check`。本 Change 只记录下游必须自行复核的 handoff assumptions，不修改下游 Change。
- [x] 0.9 已由用户确认 machine v3 只保留 Checks、Records 与必要运行元数据；已建立 `product-contract/publish-check-record-machine-v3` 并在 Design 冻结 target fact shapes、safe diagnostic taxonomy、structured Run Result、run/record v3、human output、canonical order、cross-file invariants、atomic publication 与 historical v2 handling。该 matrix 是 readiness contract，不替代 runtime schema owner。

## Implementation

- [ ] 1.1 在 Definition owner 建立单一 canonical Normalized Check collection，只含 definition、继承后的 dependency/mutex/cap 与 declarative options；将 trusted custom function slots 保持在明确 private handoff。Package Run pre-work 再为每项 attach applicability、private binding 与 invocation-only operational input，形成唯一 canonical Resolved Check collection；join 后不保留下游按 ID 重组 truth sources。
- [ ] 1.2 建立 Definition-owned `CustomCheck`、TaskPlan、planning context 与 result-facing public types；保持 contextual typing，但不导出或直接复用 scheduler-private Task、TaskRun、worker、capability types。
- [ ] 1.3 将 `src/product/task-scheduler/**` 收敛为唯一静态 Task engine，只统一 graph validation、dependency、mutex、root admission、Task settlement 与 `cooperatively-cancel-task-graphs` semantics；让 Product Check adapter 与 `scripts/vibe-check-workspace/**` scripts adapter 分别投影本地字段，不把 scripts-only authoring 或 Check/Core 语义并入 engine contract。
- [ ] 1.4 在同一 planned Task graph 中实现 `kind: "check"` execution scope，使 scope/cap/ownership/terminal metadata 成为 graph 结构；保持 root-min-active cap、first-admission-to-terminal span、deterministic reservation/drain、non-preemption 和 constrained continuation priority，不建立 keyed side map、per-Check scheduler 或第二 queue。
- [ ] 1.5 实现最小 Core capability boundary：每个 Resolved Check 注册一个 Core Check slot；not-applicable 由 trusted non-execution path 直接关闭；applicable scope 获得自动绑定 `checkId` 且验证 Record 类型的 RecordSink，只有 trusted terminal adapter 可单次 settle；scope-external、duplicate 和 late mutation fail closed，已接受独立 Record 在普通后续失败后保留。
- [ ] 1.6 将 direct Check、static/zero-child TaskPlan、not-applicable、dependency blocking 与 cooperative cancellation 映射到统一 terminal flow；按 0.9 taxonomy 映射 `completed(passed/failed)` 和 `unavailable(diagnostic)`，并让 trusted invariant failure 保持 Package Run execution failure，不伪造成普通 Check outcome。
- [ ] 1.7 建立只含 `checks`/`records` entity collections 的 Core snapshot；删除 `CheckManager`、`CheckRun`、`checkRunId`、替代 Check instance ID、definitions+runs 双投影和 work-handle acknowledgement/completeness lifecycle；不在 Core 或 machine v3 保留 derived integrity/completeness view。
- [ ] 1.8 迁移 policy、reference facts、human status、Run result、effects 与 runtime validation，使其只消费 target Core Check/QualityRecord facts；保持 quality failure 与 execution unavailability 的区别、committed Record retention 以及 fatal invocation failure 与 contained Check unavailability 的区别。
- [ ] 1.9 按 0.9 projection matrix 单版本硬切到 run/record v3 machine publication：同步新 schema identity/files、mapper、validator、decision/reference invariants、artifacts、examples 与 readable output；保留历史 v2 schema identity/bytes 但移除 v2 runtime writer/reader、fallback、dual path 与默认 docs entry，并删除 current consumers 的 `.runs`/`checkRunId`。
- [ ] 1.10 更新 Architecture、Configuration、Quality Metrics、Scanner Dependencies、Output、Testing、Script Tooling、current public-contract 与 validators，明确两阶段 Check resolution、共享 engine/adapter boundary、Check scope、minimal Core capability、two-entity snapshot、terminal contract、v3 projection 和 downstream package handoff；只在导航责任或入口实际变化时更新 navigation。
- [ ] 1.11 按 `test-evidence-review` 更新测试节点、Case Owner/Proves 与 target invariant tests；删除仅证明旧 CheckRun、side-map 或 acknowledgement duplicate lifecycle 的 Cases，但保留每项仍成立行为的独立证据。

## Verification

- [ ] 2.1 运行最窄 Definition normalization/Run resolution、Task graph/engine、Check scope/Core capability、direct/TaskPlan mapping 与 Run tests；覆盖 dependency/mutex、root/scoped cap、reservation/drain、admission-boundary cooperative cancellation、三种 Core Check outcome、quality/execution failure、partial Records、conflict/provenance、trusted invariant failure 和 late capability rejection。
- [ ] 2.2 在测试修改前后运行 `bun run test-evidence:check`；证明每个被删除的 CheckRun/acknowledgement Case 已由 target responsibility 覆盖，而不是因改名或删测试丢失义务。
- [ ] 2.3 运行 Product import-boundary、typecheck、lint 和目标 suites；focused search 确认 current source/script/stable-doc consumers 中不存在 `.runs`、`checkRunId`、替代 Check instance ID 或 keyed scope/cap side map，且 functions/capabilities/private Task data 不进入 fingerprint、Core output 或 public types。允许命中仅限明确列出的 unchanged v2 schema material、decision evolution 与 migration 说明。
- [ ] 2.4 验证 run/record v3 schema、mapper、validator、examples、artifacts、decision/reference invariants、structured result 与 human output；证明 snapshot entity collections 恰好为 `checks`/`records`，machine v3 不含 derived integrity/completeness view，历史 v2 identity/bytes 未被改写且 current runtime 不存在 v2 或 dual publication path。
- [ ] 2.5 运行 Project Run integration，证明 built-in/custom direct Check、static/zero-child TaskPlan、policy/effects/result、scanner adapter 与 scripts adapter 通过唯一 engine 协作，没有 config reload、dynamic plan、second scheduler 或跨层 field leakage。
- [ ] 2.6 完成 Architecture、Configuration、Quality Metrics、Scanner Dependencies、Output、Script Tooling、public-contract、docs/examples/schemas/validators 的 owner-to-artifact audit；对 `changes/establish-api-only-npm-product-boundary` 只读记录 downstream handoff，确认其必须自行复核并 re-plan，本 Change 未修改它。
- [ ] 2.7 运行 `bun run decisions:check`、本 Change `change-plan -- check` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 2.8 在结束 runtime/Core/machine contract hard cut 前运行 `bun run verify:vibe-check-workspace:full`；该验证为必需项。
