# Proposal

本 Change 将 Product runtime 收敛为一条执行链：Task engine 是唯一执行 owner；每个 Check 由同一静态 Task graph 中的 Check execution scope 承载；Core 只冻结 Check 与 QualityRecord 两类产品实体。迁移采用一次 hard cut，不保留独立 CheckRun lifecycle 或平行 catalog 重组层。

## Why

当前 Product 已使用 shared task scheduler，但 Project Definition、resolved catalog、CheckManager、Check orchestration 与 Core snapshot 仍分别保存或重组 definitions、selection、bindings、scheduling constraints、CheckRun、integrity 和 completeness。同一 `checkId` 因此跨多个 owner 重复关联，direct Check 与 TaskPlan Check 也通过不同 adapter 回到同一个 scheduler。

目标不是删除 npm package API，而是让 package 作者只面对稳定的 Project Definition、Check authoring、Run 与 result contract；Task、capability 和 scheduler bookkeeping 继续保持内部实现细节。

## Outcome

1. Project Definition 只产生一个 canonical resolved Check collection。
2. Planning 从该 collection 构造一个静态 Task graph；direct Check 与 TaskPlan Check 都由同一 Task engine 执行。
3. 每个 Check execution scope 由 Core 创建不可伪造的 capability。scope 内 Task 可通过绑定归属的 `RecordSink` 提交 QualityRecord；只有受信 Product adapter 可以唯一结算 Core Check。
4. 每个 canonical Resolved Check 恰好产生一个 Core Check；不存在于 Check tree 的 leaf 不产生 `unselected` fact。Core snapshot 的实体集合恰好为 `checks` 与 `records`，其它 summary 只能从它们派生。
5. Policy、publication、effects 与 Run result 只消费冻结后的 Core snapshot，不再消费 definitions+runs 双投影或 `checkRunId`。

## Scope

- 将 `src/product/task-scheduler/**` 收敛为唯一静态 Task engine，负责 graph validation、dependency、mutex、scoped `maxParallel`、cancellation、admission 与 task settlement。
- 将 direct Check 映射为一个 executable Check root Task；将 TaskPlan Check 映射为一个 Check scope、其 child Tasks 与一个 trusted completion Task。普通 child Task 不产生 public Check 实体。
- 在 `src/product/quality-core/check-record/**` 建立最小 Check/QualityRecord capability boundary，并保持 record identity、provenance、duplicate/conflict、accepted-record retention 与 settlement-before-availability 语义。
- 删除 `workHandles`、acknowledgement ports 与 planned/acknowledged coverage；Task settlement 成为唯一 execution accounting，临时进度只从 Task events 派生。
- 将 Definition normalization、private execution binding 和 resolved constraints 收敛为 canonical resolved Check；只在 planning boundary 投影 Task graph，不长期保存用于按 ID 重组的平行 collections 或 maps。
- 迁移 policy、Run result、human output、machine publication、effects、validators、schemas、examples、tests 与 Case evidence，使其消费两类 Core 实体。
- 按已经建立的 `active + unaligned` decisions 实施目标边界；完成 behavior evidence 与 migration inventory 后再开始 runtime contract implementation。

### Out of Scope

- 不把 Task、TaskRun、scheduler、capability 或 Core internals 导出为 npm API。
- 不支持 execution-time task registration、动态任务图、per-Check scheduler 或第二 queue。
- 不改变 built-in descriptor `.replace/.append` 语义；该工作由 `simplify-built-in-descriptor-adjustments` 独立负责。
- 不在本 Change 中构建、发布或修改下游 npm package candidate。

## Success Criteria

- Product 只有一个 Task execution engine；dependency、mutex、scoped cap、cancellation 和 settlement 各自只有一个 owner。
- 同一 invocation 中每个 canonical Resolved Check 恰好对应一个 Core Check；不存在 `unselected` row、`CheckRun`、`checkRunId`、替代 instance ID 或 `.runs` consumer。
- scope 外 Task 不能提交归属于该 Check 的 Record；project user functions 不持有可重复调用的 Check settle port；late capability 不能修改已经冻结的 availability 或 facts。
- direct、TaskPlan、not-applicable、blocked/unavailable、quality failed、execution/protocol/record failure 都映射为已确认的闭合 Core Check outcome。
- Core snapshot 的实体 collections 只有 `checks` 和 `records`；任何 completeness 或 integrity summary 都只能从这两类事实派生，不成为第三类实体事实源。
- machine publication 单版本硬切到 run/record v3；schema、mapper、validator、examples 和 current output docs 同步，不维护 v2 writer/reader、fallback 或 dual path。
- npm package 继续提供 definition/run authoring 与 structured result；internal Task rows、functions、capabilities 和 scheduler metadata 不进入 public declarations、fingerprint 或 output。

## Affected Owners

- `docs/architecture.md`、`docs/configuration.md`：Task、Check、Core 的责任、数据流与 authoring contract。
- `src/product/definition/**`：Check tree、canonical normalization、private bindings 与 public authoring types。
- `src/product/task-scheduler/**`：唯一 Task engine。
- `src/product/quality-core/check-record/**`：Core Check、QualityRecord、policy inputs 与 capability settlement。
- `src/product/run/**`：invocation planning、policy、result、effects 与 output projection。
- `docs/output.md`、当前 `src/product/quality-core/output/publication-v2/**`、`src/product/quality-core/scan-command/publication-v2.ts`、`docs/schemas/**`、`docs/examples/**`：现有 machine contract 及其 successor migration owner。
- `scripts/vibe-check-workspace/**`、`docs/script-tooling.md`：scripts-only task authoring 经 adapter 使用 Product Task engine，不扩张 Product Task authoring contract。
- `scripts/tools/validators/**`、tests 与 `docs/testing/cases/**`：schema、artifact、behavior 和 evidence verification。
- `docs/decisions/configuration/**`、`docs/decisions/product-contract/**`：实施前必须闭合的长期边界。
- `changes/establish-api-only-npm-product-boundary/**`：只读 downstream handoff。该 Change 必须在 candidate 前自行复核、必要更新并 re-plan；本 Change 不修改其 artifacts。
