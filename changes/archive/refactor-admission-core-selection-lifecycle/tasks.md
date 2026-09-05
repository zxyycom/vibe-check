# Tasks

按先锁定语义，再拆分私有 owner，最后以最窄行为和质量验证收口的顺序执行。

## Readiness

- [x] 0.1 复核 architecture、coding style、testing/test-evidence owner、direct admission tests、现有 quality Records和工作区状态；确认不混入 active fail-fast/named-capacity Change。
  - 起点为 `admission-core.ts` 的五项 finding：1 项 file-metrics，以及 `buildSemanticSelection`、`transitionIndexedSelection` 各 1 项 cyclomatic-complexity 与 function-code-density。active fail-fast/named-capacity 仅列为相邻风险，未读写其 artifacts 或实现。
- [x] 0.2 明确 lifecycle/input/projection 的无环依赖与 immutable/reverse-fanout/forced-effect/scope-mutex不变量，并确定是否实际需要新 test entity/Cases。
  - 现有 Case `WB-RUNTIME-ADMISSION-GRAPH-001` 的直接 entities 已证明 predecessor、duplicate、legacy mutex、cascade/effect-state 与 lazy opaque public boundary；本次没有改变 test entity 或 Case。

## Implementation

- [x] 1.1 提取 exact standalone input parser 为 private owner，保持所有 runtime validation、payload和静态 compile顺序。
  - `admission-core-input.ts` 保留 exact-record、task-first/scopes-second parse和一次 prepared compile；它不拥有 selection state 或 public projection。
- [x] 1.2 提取 selection/index lifecycle：persistent stores、seed、staged transition delta、heap、status/blocker/capacity/scope accessors，保持 predecessor/effect-state和 occurrence ordering。
  - index、seed、transition、query 与 lifecycle modules 保留 `Immutable.List`、leftist max-heap、reverse occurrence delta与 scope roots；transition 明确分为 running/mutex、settled relation/frontier、scope lifecycle stages。selection representation 留在 private family 内。
- [x] 1.3 提取 lazy catalog/inspection projection，并把 facade 收敛至小于 300 lines 的 public/core action composition。
  - `admission-core.ts` 为 282 physical lines；catalog 仍只在 public getter 调用 projection，Scheduler candidates/validation 直读 indexed query。
- [x] 1.4 仅当现有证据未直接覆盖结构性风险时，补最小 direct tests并同步 semantic Case evidence。
  - 审阅后未新增或改写测试：既有 80×80 cascade、duplicate payload、retained predecessor、opaque getter和 shell effect replay已经直接覆盖本次结构风险；没有为内部文件移动制造名义 Case。

## Verification

- [x] 2.1 运行最窄 admission/task-scheduler tests，审阅 diff并核对 API/shell/compiled graph未扩大。
  - `bun test src/project-run/task-scheduler/admission-*.test.ts src/project-run/task-scheduler/task-engine.admission*.test.ts src/project-run/task-scheduler/task-engine.scope-capacity.test.ts src/project-run/task-scheduler/task-engine.settlement.test.ts`：33 pass、0 fail（13 files）；`git diff --check` 通过，`src/index.ts`、`scheduler-policy.ts`、`scheduler.ts` 与 `admission-core-compiled-graph.ts` 无 diff。
  - `HEAD` 与当前 worktree 的差分比较共 28,855 个可观察投影，覆盖 parser/error corpus、120×120 randomized traces、legacy mutex/scope cases与保留 predecessor 的 80×80 forced cascade。比较对象为 parser/error、catalog、inspection、selection validation、effects及每个 effect post-state；它不替代未生成输入、实时并发时序、性能或 memory 的验证。
- [x] 2.2 若测试实体变更，运行 `bun run test-evidence -- check --root .` 并审阅 affected Cases；无实体变更仍运行同一完整性检查。
  - 未改动 test entity 或 Case；完整性检查通过：544 current Bun entities，544 均映射至 123 semantic Cases / 15 topics。
  - test-evidence 是当前 checkout 全树的 static/JUnit identity closure：它不执行测试正文，也不证明行为差分。该命令的 registration report 是 invocation-private 临时材料，完成后删除；不把 report、cache 或曾观察到但未复现的 `static-only` 诊断写入 Case、稳定 docs 或本 Change 的长期事实。
- [x] 2.3 运行 product typecheck、lint、format、focused quality、文档验证与 Change check；default/full Gate 只在最终明确授权后处理。
  - `bun run typecheck -- product`、`bun run lint -- product`、`bun run format -- check` 均通过。focused `bun run check -- --quality` 通过（4/4 selected repository-quality Checks，0 failed）；拆分前归属于 `admission-core.ts` 的五项 Records 在此复核为 0。该 5 → 0 只说明该五项 quality scope，不能外推至其它 finding 或未选 Check。
  - `bun run validate -- docs`、`bun run test-evidence -- check --root .`、`bun run change-plan -- check changes/refactor-admission-core-selection-lifecycle` 与 `git diff --check` 在本次文档收口后再次运行；结果见当前交付验证。
  - 初始验证没有运行 default/complete Gate；最终明确授权下恰运行一次 `bun run check`（日志 `/workspace/vibe-check/.log/project-gate/2026-09-05T08-32-42.891Z-2153837-e5ec02c1-051b-4bab-b405-fba7b8b1d68e`）。其 file/function metrics 通过且无本 Change 的五项 quality Records，但 aggregate 因 `createAdmissionGraph` 的中文 public JSDoc 被本 Change 误改为英文，导致 package calculation 失败并产生一个 `command-failure` Record。已恢复原中文 JSDoc，并重跑 Gate transcript 的完整 package test command：22 pass、0 fail。为遵守“恰一次 default Gate”，未重跑 aggregate；`bun run check -- --all` 未运行。
- [x] 2.4 基于实际命令记录结构/性能不变量的证明边界、未验证项和后续归档/提交所需的明确授权。
  - 源码审阅确认 reducer 仍只对 changed task 的 compiled reverse fanout 做 persistent delta，所有 state/effect-state 均为 successor；这是结构性审阅证据，不声明 timing 或 memory 改善。
  - 最终明确授权已允许 archive 与一笔 task-scoped commit；不 push。修复后 aggregate default Gate 仍是未执行验证，complete Gate 仍需另行授权。
