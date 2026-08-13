# Tasks

先建立可审计的 source-lift 基线并迁移现有 consumers，再增加 closed Check adapter；只有产物和对应证据实际完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已确认目标是把 pinned runner source/tests 机械迁入 `src/product/task-orchestration/**`，以迁入源码作为唯一 scheduler implementation，再做独立 integration adjustments。
- [x] 0.2 已核对 gitlink revision、完整 source/test tree、workspace verifier imports、root scripts、pnpm workspace/lockfile、Script Tooling owner、repository-tooling Cases 与 `src/product/README.md` source-lift precedent。
- [x] 0.3 已确认迁入后只有一个 implementation owner：script tooling 与 Check orchestration 都消费 `src/product/task-orchestration/**`；旧 gitlink、旧 imports 与旧 workspace importer 必须退出。
- [x] 0.4 已把 contract 分为三层：Task/work-handle/ack/settlement 是 invocation-private；CheckRun/coverage/integrity/completeness 是 existing stable run/snapshot facts；QualityRecord content 不增加 orchestration fields。
- [x] 0.5 已确认 dependency semantics：合法 `passed | failed | not-applicable` 都是可信 prerequisite completion；execution/result/record/ack failure使 dependent unavailable，且由 adapter gating而不是 scheduler解释领域 value。
- [x] 0.6 已确认 orchestrator 只接收唯一 private `SchedulerPolicy.maxParallel`：repository composition 显式提供 `4`；本 Change 不预埋尚未实施的 Project Definition public scheduler contract，不存在隐式 default、第二预算或 blocking Open Question。

## Implementation

- [x] 1.1 在移动或修改 runner tests、Product tests 与 semantic Cases 前运行 `bun run test-evidence:check`，按 `test-evidence-review` 维护 repository-tooling 与 quality-runtime Case/Owner/Proves 关系。
- [x] 1.2 从 revision `025af7350e2d624eeded23784f411bec5f4a1473` 的 git object 机械提取 runner `src/**` 与 `test/**` 到 `src/product/task-orchestration/**`；在 `src/product/README.md` 记录 pinned provenance、byte-preserved set 与明确的 integration-adjustment categories。
- [x] 1.3 完成 source-owner hard cut：把 foundation/test configuration接入 Product boundary，把 `scripts/vibe-check-workspace/**` imports切到新 owner，更新 target verification entries；随后移除旧 gitlink、`.gitmodules` entry、pnpm workspace/lockfile importer和过时 toolkit scripts，focused search 不得留下 live old-path consumer。
- [x] 1.4 在 Check/Record 相邻 owner 实现 closed schedule/binding/`SchedulerPolicy` 与 TaskPlan validator：完成 `requiresChecks` closure、selection/applicability、canonical synchronous factory calls、unique/known/acyclic graph、group expansion、exactly-one Check-level `complete(outcomes)`、exact work partition、detached copy/freeze，并保证 planning failure时 user-managed function zero calls。
- [x] 1.5 实现单一 runner adapter：direct binding映射为single task，TaskPlan leaves映射为普通 tasks，exactly-one completion映射为依赖全部owning leaves的synthetic task；leaf failed/blocked时不调用completion，Check dependency只连接foundation settled availability；所有variants共享同一 invocation task list和`maxParallel` budget。
- [x] 1.6 实现 function-scoped record sinks、leaf acknowledgement、owning-only opaque outcome与foundation-owned per-Check settlement：settlement冻结private record/ack/result facts并返回与eventual CheckRun一致的availability，global finalize仍单点生成canonical integrity/CheckRuns；late ports拒绝且不改变事实，ordinary failure不reject generic scheduler，duplicate/unknown/missing settlement与其它trusted invariant在drain后拒绝trusted publication。
- [x] 1.7 让 repository built-in direct bindings通过同一 runner执行，由`current-composition.ts`显式传入frozen private `SchedulerPolicy` `{ maxParallel: 4 }`；不拆分其内部fan-out，不增加public/config scheduler default或第二并发预算。
- [x] 1.8 同步 Architecture、Quality Metrics、Script Tooling、Testing、source provenance与semantic Cases，明确唯一 source owner、原 runner preserved contract、Product adapter delta、`requiresChecks` availability，以及 QualityRecord / run-snapshot / private execution 三层边界。

## Verification

- [x] 2.1 对 pinned revision 与迁入 tree 运行逐文件 provenance comparison，证明声明为byte-preserved的source/tests完全一致；逐项审阅并记录其余expected integration deltas，focused search确认旧 gitlink、old-path imports和第二scheduler实现均不存在。
- [x] 2.2 在新路径运行迁入的原 runner tests，覆盖nested groups、完整parent metadata继承、group dependency、validation、dependency order、parallelism、concurrency、mutex与opaque lifecycle completion；同时运行workspace verifier的normalization/runner acceptance，证明script consumer没有行为回归。
- [x] 2.3 运行Product planning target tests，覆盖closed shape、selection closure、applicability/factory zero-call、full cycle prevalidation、mutation isolation、group expansion、ID namespace、exactly-one completion、exact work partition与planning-failure zero execution。
- [x] 2.4 运行Product orchestration target tests，覆盖唯一global slot budget、mutex utilization、direct/task/completion normalization、leaf failure不调用completion、opaque values、settlement races、ordinary failure isolation、transitive unavailable、unrelated continuation，以及duplicate/unknown/missing settlement fatal drain。
- [x] 2.5 运行foundation integration和publication parity tests，证明settled availability与eventual CheckRun严格一致、合法quality `failed` prerequisite继续、execution/result/record/ack failure阻止dependent user function、settled后late ports不改变事实、valid records保留、settlement/arrival order不改变canonical snapshot、coverage只含aggregate counts、integrity只作为snapshot fact，且遵守port lifetime的等价direct execution machine/readable bytes不变。
- [x] 2.6 在全部test/Case移动和修改后运行`bun run test-evidence:check`；运行`bun run typecheck:product`、`bun run lint:product`、`bun run test:product`、`bun run typecheck:scripts`与`bun run lint:scripts`。
- [x] 2.7 运行Product import/dependency boundary、`bun run decisions:check`、`bun run validate`、本Change的`change-plan -- check`、`bun run verify:vibe-check-workspace:required`与full verifier；最后运行formal Product CLI dogfood，确认迁移后的workspace verifier和Product runtime都走新owner。
