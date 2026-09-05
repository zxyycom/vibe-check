# Proposal

将 admission core 的私有 selection/index 生命周期、standalone 不可信输入解析和公开投影从单一巨型 facade 拆出，同时保持既有 Scheduler 与 public API 行为不变。

## Why

`src/project-run/task-scheduler/admission-core.ts` 同时承载 public facade、input boundary、projection 和 dense immutable selection reducer。拆分前的 focused repository-quality 基线中，该文件恰有五项相关 finding：一项 file-metrics，以及 `buildSemanticSelection`、`transitionIndexedSelection` 各一项 cyclomatic-complexity 和 function-code-density。现有性能语义依赖于持久 `Immutable.List`、逆向 occurrence index 与 persistent forced heap，不能以机械拆分破坏。

## Outcome

在本 Change 的 admission-core 差分范围内，facade 小于 300 source lines；selection/index lifecycle、untrusted standalone input parser 和 public catalog/inspection projection 分别有真实且无 public barrel 的 private owner。相对上述五项 admission-core 基线 finding，`bun run check -- --quality` 的 focused 复核不再产生这五项 Records（5 → 0）。既有 admission 行为、immutable successor/effect sequence、lazy catalog 和仅沿 changed reverse fanout 更新的 delta path 仍由差分与直接行为证据覆盖。

这不是整个 repository finding 已清零、运行时更快，或 default/complete Project Gate 已通过的声明；这些范围不属于本 Outcome 的已得证结果。

## Scope

### Intended Change

在 `src/project-run/task-scheduler/**` 内建立无 public barrel 的 private module family：selection lifecycle owner 持有 indexed state、计数、heap、seed、transition 与 queries；input owner 解析 exact standalone graph input；projection owner 延迟生成 catalog/inspection。`admission-core.ts` 只保留 public/core action composition、opaque `AdmissionGraph` wrapper 和 Scheduler-facing contract。只在既有直接证据不能证明结构性不变量时新增最小 test entity/Case。

### Resulting Impacts

- public `AdmissionGraph`、`AdmissionState`、`AdmissionCoreState` consumers、Scheduler shell、compiled graph 和 callback hard revalidation 不改变。
- selection family 必须继续私有化 Immutable.List / heap / reverse occurrence，实现 predecessor 不变性、每个 effect 的精确 post-state、duplicate/order 语义与 scoped/global capacity precedence。
- parser/projection 只依赖各自实际需要的 private contract；不得形成 core↔projection↔lifecycle cycle；catalog 继续按需 materialize。
- focused quality 的 5 → 0 只比较该 baseline 中归属于 `admission-core.ts` 的五个 Records；它不为其它路径的 finding、全仓库 quality 状态或任何 Project Gate preset 背书。
- 活动的 fail-fast 与 named-resource-capacity drafts 不进入本 Change；不声明 runtime timing 改善或引入 benchmark。

## Success Criteria

1. `admission-core.ts` 真实小于 300 source lines；focused quality 中拆分前归属于它的五个 Records 均消失，且不会把此结果外推为全仓 finding 清零。
2. direct admission tests 与 `HEAD` 对当前 worktree 的差分比较共同证明 public rejection precedence/payload、duplicate relation/mutex order、forced effect/effect-state order、scope lifecycle/capacity、legacy seed 和 Scheduler hard guard 没有行为漂移。
3. 新 state/effect state 使用新的 immutable values，旧 state 未变；catalog 只有 getter 读取时投影，核心 candidates/validation 不 materialize catalog；delta 保持仅触及 changed reverse fanout。
4. focused quality、最窄 admission tests、test-evidence、product typecheck/lint/format、文档验证和 Change check 通过。test-evidence 只证明本次当前树的 entity/Case closure，不替代测试正文执行或行为差分。
5. default Gate 只在明确授权后运行，并且其原始结果不能由 focused quality 推断。最终授权下恰运行一次 `bun run check`：file/function metrics 通过且未重现本 Change 的五项 quality Records，但 aggregate 因 package calculation 的 public-API JSDoc assertion 失败而未通过，并产生一项 `command-failure` Record。已恢复该中文 JSDoc 并以 Gate 的原 package test command 验证 22 pass；为遵守“恰一次 default Gate”限制，未重跑 aggregate。`bun run check -- --all` 仍未运行。

## Affected Owners

- `src/project-run/task-scheduler/admission-core.ts`：core facade、public opaque wrapper 与 Scheduler-facing composition。
- 新增同目录 private selection/input/projection modules：dense immutable indexes、boundary parser 与 lazy DTO projection。
- `src/project-run/task-scheduler/admission-*.test.ts` 和 `docs/testing/cases/**`：仅在新增或变更 test entity 时维护 Case evidence；本次没有改动这些 stable materials。
- `docs/architecture.md`、`docs/coding-style.md`、`docs/testing.md` 和 repository-quality owner：读取其稳定约束与验证入口；本次没有把 Change 的实现观察写入 stable documentation。
