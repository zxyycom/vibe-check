# Tasks

**当前状态：暂停。** 下列 checkbox 保留形成时 Plan；已勾选的 0.1–0.3 只是当时的 Readiness 事实。不得开始、勾选或以任何方式推进未完成的 Implementation/Verification 任务。当前 handoff owner 是[新 Draft](../unify-check-values-and-inherited-configuration/design.md)，恢复条件见旧 Change 的 proposal/design。

本 Change 形成时计划先闭合测试证据与 downstream handoff，再按“Definition → generic Task relation → Product scope projection → owners”实施；只有全部行为、文档和 workspace 证据通过后才核对决策对齐。

## Readiness

- [x] 0.1 已运行 `bun run decisions:list`，建立四条 `active + unaligned` successor decisions，替代或修订 authoring-only Group、closure Check scope、group/leaf cap 与旧 public tree names，并通过 `bun run decisions:check`。
- [x] 0.2 已核对当前 Check parser/normalization、Resolved Check、Task graph/scheduler、Check execution adapter、Core/output 与 built-in adjustments，确认 recursive authoring 可规范化到一张静态 graph且无需第二 scheduler。
- [x] 0.3 已确认每个 parent/child Check 都正常执行并独立产生 outcome/Records；`childrenOrder` 为 `parallel | self-first | children-first` 且默认 parallel，pure settled order不传播 unavailable，显式 `dependsOn` 才传播 blocking。
- [ ] 0.4 实施前读取 `docs/coding-style.md` 与相邻 source/tests，并使用 `test-evidence-review` 恢复 Definition、Task engine、Run/Core、cap、public contract Cases；确定旧 group evidence 的 rename/split/merge 与新增 settled-order证明责任。
- [ ] 0.5 复审 `changes/establish-api-only-npm-product-boundary` 的 public `CheckGroup`、mixed tree 与 group/leaf cap assumptions，记录本 Change 完成后的 re-plan targets；不得在递归 runtime 未验收时开始 package Implementation。
- [ ] 0.6 暂停/交接门禁：在任何旧 Plan Implementation 前，先取得旧 Change 处置与范围交接的明确授权，读取新 Draft、其七条当前 direction owners 与当前实现，重写或转移不再适用的 tasks，完成新的 Readiness 并运行 Change Plan 的 `plan` 命令刷新基线；勾选本项本身不授权开始 Implementation。

## Implementation

- [ ] 1.1 将 Product Check authoring hard cut 为 recursive executable `CheckNode`：built-in/custom node 可带非空 `checks` 与 `childrenOrder`，移除 `CheckGroup`、group-only identity/parser/reference expansion，并在 full Definition validation 前保持 trusted functions 私有。
- [ ] 1.2 实现 deterministic recursive normalization：每个 node 一次 Normalized Check、global identity、ancestor `dependsOn`/`mutex`、nearest `maxParallel`、derived settled-order identities、combined cycle validation 与 canonical fingerprint；拒绝空 children、orphan order、旧 group和歧义 shape。
- [ ] 1.3 扩展 generic Task graph 与 scheduler 的 settled-order relation，闭合 known/self/cycle、readiness、blocked sweep timing、failed/blocked/`cancelled-before-start` target、两类 edge 的 scope-terminal reachability、mutex、cap、admission 与 Abort semantics；非 Abort blocked settlement必须等两类 targets 均 terminal且只归因非 completed dependencies，TaskPlan native completion 仍用 success dependency，scripts adapter 不获得 Product Check fields或未经需要的 authoring变化。
- [ ] 1.4 让 Run resolution 和 Product adapter 为每个 recursive node 建立独立 Resolved Check/Core slot/scope与私有 closure terminal：全部 direct/TaskPlan/zero-leaf entry work承接 external relations，closure 在 native terminal 任一 settlement后可信关闭并镜像 availability，self-first/children-first 与显式 dependency 都指向 closure；保持 not-applicable omission、contained failure、cancellation drain 与 exact-once settlement。
- [ ] 1.5 更新 BuiltInCheck/CustomCheck/CheckNode inference、adjustment preservation 与 `src/product/public-contract/current.ts`；`replace`/`append` 不接受 composition patches但不得丢失已有 `checks`/`childrenOrder`，并删除 Product `CheckGroup` public inventory。
- [ ] 1.6 同步 Architecture、Configuration、Quality Metrics、Testing、examples与 semantic Cases；审阅 Output、navigation 与 Core contract，只在发现失效 claim 时修改 owner或生产代码。增加 parent/child policy operands 与 machine v3 flat Checks/Records Cases。清理范围只包含 current Product source、stable docs、examples、current contracts/tests；decision records 与 `changes/archive/**` 可保留形成时 `CheckGroup` 文本。
- [ ] 1.7 迁移 `scripts/quality/project-definition.ts`：移除 `repository-quality` group，把三个 built-in Checks 作为真实 top-level Checks，并把原 effective cap 2 下放到 former children、保留 `fileMetrics` cap 1；运行 Project Run dogfood aliases，禁止创建无 execution binding 的假 parent。`scripts/vibe-check-workspace/**` 的 scripts-only groups 仍非目标。
- [ ] 1.8 按新稳定 owner 更新 `establish-api-only-npm-product-boundary` 的 dependency handoff、public types、mixed recursive tree与 cap acceptance；不在本 Change 实现 package build、host、tarball 或 publish。

## Verification

- [ ] 2.1 运行最窄 Definition/adjustment tests，覆盖 recursive built-in/custom parents、all order values/default、invalid/legacy shapes、identity/reference/inheritance、cross-kind cycles、fingerprint 与 composition preservation。
- [ ] 2.2 运行 generic Task engine tests，证明 `dependsOn` 与 settled order 的 completed/failed/blocked/`cancelled-before-start` matrix、combined cycle、closure terminal reachability、mutex/cap、reservation/drain 与 cancellation admission cutoff；增加 unavailable dependency + slow settled-order target 的交叉 Case，证明 consumer 与 scope terminal 在 order target settlement 前保持 pending、之后才 blocked，且 blocked reason 只含 dependency；Abort 后即使 order target 已 settlement，consumer 仍不得 admission。
- [ ] 2.3 运行 Package Run/Core tests，覆盖 direct/TaskPlan/zero-leaf closure、parallel/self-first/children-first、not-applicable、explicit unavailable dependency、pure-order unavailable、independent Records/outcomes、exact-once closure 与 retained cancellation facts；用 failed TaskPlan + retained reporter 的对称 Cases 证明前一 Check RecordSink 已关闭后后一侧才开始。
- [ ] 2.4 运行 policy、machine v3、public-contract、docs/examples、repository dogfood、downstream handoff 与 test-evidence检查；证明 parent/child 是独立 policy operands 和 flat output facts，并用限定 current surface 的 focused search 证明 Product 不再包含 group-only parser/reference或 parent aggregate output，不扫描 decision/history archives 作为清理目标。
- [ ] 2.5 运行 `bun run test:product`、`bun run typecheck:product`、`bun run lint:product`、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate`、`bun run change-plan -- check changes/enable-recursive-executable-checks` 与 `bun run change-plan -- check changes/establish-api-only-npm-product-boundary`。
- [ ] 2.6 运行 `bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full`；完成代码规范与 AI-ready docs 复审，处理所有 P0-P2 后再核对四条 successor decisions 是否可标记 aligned。
