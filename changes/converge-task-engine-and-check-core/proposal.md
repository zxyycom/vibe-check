# Proposal

本文件保留本 Change 的目标与形成时问题；当前实现事实由稳定 owner、源码和测试拥有。下文 `Why` 中的旧 lifecycle 是 Readiness 时的 migration baseline，不是完成 hard cut 后的 runtime 描述。

本 Change 将 Product runtime 收敛为一条执行链：Definition normalization 只形成声明式 Check 事实，Package Run pre-work 再形成唯一 invocation-scoped Resolved Check collection；同一静态 Task engine 执行全部 Product Tasks；Core 只冻结 Check 与 QualityRecord 两类产品实体。迁移采用一次 hard cut，不保留独立 CheckRun lifecycle 或长期存在的 catalog 重组层。

## Why

在本 Change 的 Readiness 时，Product 已使用 shared task scheduler，但 Project Definition、resolved catalog、CheckManager、Check orchestration 与 Core snapshot 仍分别保存或重组 definitions、selection、bindings、scheduling constraints、CheckRun、integrity 和 completeness。同一 `checkId` 因此跨多个 owner 重复关联，direct Check 与 TaskPlan Check 也通过不同 adapter 回到同一个 scheduler。

Readiness 已对齐的 Check tree contract 明确区分两层责任：Definition normalization 冻结声明式 Check 数据与约束，Package Run pre-work 才构造 built-in private binding、applicability 与 operational dependency snapshot。本 Change 必须沿用这个边界，不能为了得到“单一 collection”而把 functions 或 runtime capability 塞回 declarative snapshot。

目标不是删除 npm package API，而是让 package 作者只面对稳定的 Project Definition、Check authoring、Run 与 result contract；Task、capability 和 scheduler bookkeeping 继续保持内部实现细节。

## Outcome

1. Definition normalization 产生一个确定性排序的 canonical Normalized Check collection；declarative projection 与 trusted function slots 明确分离。
2. Package Run pre-work 为每个 Normalized Check 解析 applicability、private execution binding 与 invocation-only dependencies，形成唯一的 canonical Resolved Check collection。Planning 只消费这一个 runtime collection，不再长期保存需要按 ID 重组的 definitions、schedules、caps、options 与 bindings collections。
3. Planning 从 applicable Resolved Checks 构造一个静态 Task graph；direct Check、TaskPlan Check 与 scripts-only Tasks 共享同一 Task engine，但分别通过 Product Check adapter 与 repository script adapter 保留各自局部语义。
4. 每个 applicable Check graph scope 使用 Core 签发的不可伪造 capability。scope 内 Task 只能通过绑定归属的 `RecordSink` 提交 QualityRecord；只有受信 terminal path 可以唯一结算 Core Check。not-applicable Check 不创建 executable scope，但仍直接形成一个 Core Check。Check/Record facts 在执行中成立并可交付，最终 snapshot 只是它们的闭合投影。
5. 每个 canonical Resolved Check 在成功冻结的 snapshot 中恰好产生一个 Core Check；不存在于 Check tree 的 leaf 不产生 `unselected` fact。Core snapshot 的实体集合恰好为 `checks` 与 `records`；只有 report/console 可以从 validated model 派生人读摘要。
6. Policy、publication、effects 与 Run result 只消费冻结后的 Core snapshot，不再消费 definitions+runs 双投影或 `checkRunId`。
7. Canonical machine v3 发布经过整体验证、由 Record-set fingerprint 绑定的 `run.json` + `records.ndjson`；内容只保留 Checks、Record rows 与解释 invocation/reference/acceptance/decision 所需的元数据，不发布 definitions/runs、integrity/completeness 或其它 lifecycle summary。两个固定路径不虚构跨路径 OS 原子快照保证。

## Scope

- 将 `src/product/task-scheduler/**` 收敛为唯一静态 Task engine，负责通用 graph validation、dependency、mutex、admission、root concurrency、task settlement 与已确认的 cancellation contract。
- 让 Product Check adapter 在同一 graph 中投影 Check scope、scoped `maxParallel`、RecordSink ownership 与 terminal relation；让 `scripts/vibe-check-workspace/**` 通过独立 adapter 复用 engine，而不把 scripts-only authoring fields 或 Check/Core 语义并入共享 contract。
- 保持 Definition normalization 的 declarative/function 分离，并在 Package Run pre-work 完成一次性 runtime resolution；只在 planning boundary 投影 Task graph。
- 将 direct Check 映射为一个 executable Check root Task；将 TaskPlan Check 映射为一个 Check scope、其 child Tasks 与一个 trusted terminal path。普通 child Task 不产生 public Check 实体。
- 在 `src/product/quality-core/check-record/**` 建立最小 Check/QualityRecord capability boundary，并保持 record identity、provenance、duplicate/conflict、accepted-record retention 与 settlement-before-availability 语义。
- 删除 `workHandles`、acknowledgement ports 与 planned/acknowledged coverage；Task settlement 成为唯一 execution accounting，临时进度只从 Task events 派生。
- 迁移 policy、Run result、human output、machine publication、effects、validators、schemas、examples、tests 与 Case evidence，使其消费两类 Core 实体。
- 按已确认的 cooperative graph cancellation 关闭执行流：abort 后停止新 admission、按普通 settlement 收尾已启动 Tasks、保留已成立事实与更具体 failure/dependency 原因，并将其余仍未关闭的 Check 关闭为 cancelled unavailable。

### Out of Scope

- 不把 Task、TaskRun、scheduler、capability 或 Core internals 导出为 npm API。
- 不支持 execution-time task registration、动态任务图、per-Check scheduler 或第二 queue。
- 不重新设计已经落地的普通 `BuiltInCheck`、顶层 `replace` / `append` 或 Package Run-owned built-in binding；本 Change 只消费这些当前契约。
- 不承诺抢占、强制终止或隔离 non-cooperative project code；执行期 cancellation 只承诺 Task admission cutoff、已启动工作的协作式收尾和事实闭合。
- 不在本 Change 中构建、发布或修改下游 npm package candidate。

## Success Criteria

- Product 与 repository scripts 只使用一个 Task execution engine；通用 dependency、mutex、root admission 与 task settlement 各自只有一个 owner，Check-scoped cap/ownership 和 scripts-only fields 留在各自 adapter。
- Definition normalization 不构造 built-in runtime binding；Package Run pre-work 只进行一次 runtime resolution，planning 之后不存在为了按 ID 重组同一 Check 而并存的 truth sources。
- 对每个成功冻结的 invocation，同一 canonical Resolved Check 恰好对应一个 Core Check；不存在 `unselected` row、`CheckRun`、`checkRunId`、替代 Check instance ID 或 `.runs` consumer。
- scope 外 Task 不能提交归属于该 Check 的 Record；project user functions 不持有可重复调用的 Check settle port；late capability 不能修改已经冻结的 availability 或 facts。
- direct、TaskPlan、not-applicable、blocked/unavailable、quality failed、execution/protocol/record failure 与 cancellation 都按已确认的 terminal contract 映射；受信内部 invariant failure 与可归入单个 Check 的 unavailable outcome 明确区分。
- Core snapshot 的 entity collections 只有 `checks` 和 `records`；machine v3 不发布 completeness、integrity 或其它 derived lifecycle view，report/console 可读摘要只从 validated model 临时派生。
- machine publication 单版本硬切到 run/record v3；schema、mapper、validator、examples、current output docs 与 structured result 同步，不维护 v2 runtime writer/reader、fallback 或 dual path，且历史 v2 schema identity/bytes 不被改写。
- npm package 继续提供 definition/run authoring 与 structured result；internal Task rows、functions、capabilities 和 scheduler metadata 不进入 public declarations、fingerprint 或 output。
- integrated hard cut 在 Readiness 的行为映射与 consumer inventory 闭合后才开始；cooperative graph cancellation 与 v3 projection contract 均由活动决策和 Design matrix 闭合。

## Affected Owners

- `docs/architecture.md`、`docs/configuration.md`：Definition normalization、Package Run resolution、Task、Check 与 Core 的责任和数据流。
- `src/product/definition/**`、`src/product/run/**`：Check tree、declarative/function separation、canonical runtime resolution、invocation planning、policy、result 与 effects。
- `src/product/task-scheduler/**`：唯一通用 Task engine；Product Check adapter 与 scripts adapter 只消费它的共享 contract。
- `src/product/quality-core/check-record/**`：Core Check、QualityRecord、policy inputs 与 capability settlement。
- `docs/quality-metrics.md`、`docs/scanner-dependencies.md`：quality/execution distinction、policy/reference consumption 与 scanner operational handoff。
- `docs/output.md`、`src/product/quality-core/output/publication-v3/**`、`src/product/quality-core/scan-command/publication-v3.ts`、`docs/schemas/**`、`docs/examples/**`：当前 v3 machine contract、历史 v2 identity 的隔离边界与发布材料。
- `src/product/public-contract/current.ts` 及其 tests：definition/run/result-facing current public contract，不导出 Task/Core internals。
- `scripts/vibe-check-workspace/**`、`docs/script-tooling.md`：scripts-only task authoring 经 adapter 使用 Product Task engine。
- `docs/testing.md`、`docs/testing/case-maintenance.md`、tests 与 `docs/testing/cases/**`：behavior、schema、artifact 与 semantic evidence verification。
- `docs/decisions/configuration/**`、`docs/decisions/product-contract/**`：已确认方向、cooperative cancellation、machine v3 output contract 与实施后 alignment 核对。
- `changes/establish-api-only-npm-product-boundary/**`：只读 downstream handoff。该 Change 必须在 candidate 前自行复核、必要更新并 re-plan；本 Change 不修改其 artifacts。
