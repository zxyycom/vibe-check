# Design

以三个私有 owner 收拢 admission core 的输入、selection lifecycle 和公开投影，使 facade 只组合既有 action/effect contract。

## Context

架构将 task scheduler 定位为 Project Run 的 private child；standalone `createAdmissionGraph` 与 custom callback state 共享 compiled graph、immutable dynamic node/reducer 与 canonical effects，shell 继续独占 execution、diagnostics、measurement、cancellation 和 callback proposal hard guard。前序 selection-index Change 已选定 `Immutable.List` dense stores、native reverse indexes 和 project-owned persistent leftist max-heap。当前 `admission-core.ts` 仍混合三种责任，且拆分前 focused quality 在该文件报告一项 file-size 与两个 reducer 各一项 CC/density（共五项）finding。

## Goals / Non-Goals

### Goals

- 将 persistent index state、seed stages、event delta reducers、forced queue 和 index accessors作为一个 private lifecycle owner。
- 将 exact untrusted public graph parsing与 public catalog/inspection DTO projection各放入直接 owner。
- 保持 opaque/frozen public state、lazy catalog、all immutable state/effect-state、reverse-fanout delta 和 exact visible ordering。
- 让后续阅读者能从 Change artifacts 区分结构/行为证据、focused quality 证据、test-evidence closure 与未运行的 Gate preset。

### Non-Goals

不改 Scheduler shell、compiled graph contract、public package root、static selection algorithm、capacity/rejection semantics或运行时复杂度；不引入 fail-fast/named-capacity draft 内容、benchmark 或 push。archive/commit 不是实施步骤，只在最终明确授权后执行。此次不修改 stable docs、tests 或 semantic Case；Change artifacts 也不把其点时实现观察提升为 stable contract。

## Decisions

### Intended Change

`admission-core-selection.ts` 是 selection/index lifecycle family 面向 core facade 的窄入口；selection/index 类型只在同目录 private module family 内流动，不从 public package root re-export。`admission-core-input.ts` 是 exact standalone `AdmissionGraphInput` 的 untrusted boundary，负责 exact-record validation、field conversion 和一次 prepared compile。`admission-core-projection.ts` 是 public catalog/inspection 的 read-only lazy DTO owner，只通过 core-owned accessors读取 opaque state。facade 仅管理 public actions、effects、state wrapping 和调用这些 owner。

### Resulting Impacts

- **Selection representation:** 每次 indexed update 返回新 store/index/state；没有 in-place List、heap或 array mutation。reverse relation occurrence 保持编译期顺序，只有 changed task 的 reverse fanout 执行 delta；rejection payload 只在 query/projection 边界构造。
- **Forced effects:** frontier 按最大 task slot pop；enqueued task 不重复；relation payload保留 declaration duplicate/order；direct effect 初始 state 与每个 forced post-state 精确对应。
- **Scope/mutex:** seed 分别合成 legacy external mutex 与 dynamic holders；settlement 仅删自身 dynamic occurrence。active scopes 保持 cap/id sorted，scope capacity先于 root，activation/terminal close 按原 lifecycle。
- **Projection boundary:** catalog 按 task public order/Unicode lexical rule产生，validation/candidates 不调用它；projection 不重算或持有 mutable selection。
- **Module graph:** parser 只依赖 graph compiler/input types；lifecycle 依赖 compiled graph 与 private core types；projection 依赖 lifecycle accessors 与 public DTO types；facade 依赖三者。private imports 的方向单向，避免 core↔projection↔lifecycle cycle。
- **Quality-evidence scope:** `5 → 0` 的分子只包括拆分前 `admission-core.ts` 的一项 file-metrics 与 `buildSemanticSelection`、`transitionIndexedSelection` 各自的 CC/density Records。后续 focused quality 复核选择四个 repository-quality Checks；它证明该五项不再出现，不证明其它 finding 或未选 Gate Check 的状态。

## Risks / Trade-offs

最大的风险是提取时引入重复 legality logic、意外 eager catalog 或从 persistent state 降级为 mutable arrays。通过不迁移算法、保持 reducer loop/operation 顺序、直接行为测试及差分比较降低风险。模块变多会增加内部 imports，但每个模块有单一、可复核 owner，且不扩展 public API。

差分比较覆盖 `HEAD` 与当前 worktree 的 28,855 个可观察投影：parser/error corpus、120×120 randomized traces、legacy mutex/scope cases，以及保留 predecessor 的 80×80 forced cascade。它比较 parser/error、catalog、inspection、selection validation、effects 与每个 effect 的 post-state；它不证明未生成输入、实时并发时序、性能、memory 或 default/complete Gate。

## Open Questions

无阻塞范围或方案的开放问题。是否需要新增 Case 仅由新增/修改 test entity 的实际结果决定，并遵循 test-evidence owner；最终授权下 default required Gate 已恰运行一次但未 aggregate 通过（package public-API JSDoc assertion 已由其原 target command 22 pass 修复），因此该 Gate 的修复后 aggregate 仍未被再次执行；complete Gate 未运行。

## Implementation Observations

本节记录当前 Change 的实现和验证观察，不是稳定行为 owner。

| Private owner | 责任与禁止外泄的内容 |
| --- | --- |
| `admission-core-input.ts` | 在 standalone boundary 验证 exact input、转为 scheduler graph 并只编译一次；不承接 selection state 或 public DTO projection。 |
| `admission-core-selection-index.ts`、`-seed.ts`、`-transition.ts`、`-query.ts`、`-selection.ts` | 共同组成 lifecycle family：index 保存 persistent `Immutable.List` stores 与 leftist max-heap；seed 构造初始/legacy snapshot；transition 依序应用 running/mutex、settled relation/forced frontier、scope lifecycle delta；query 只读地回答 legality/candidate/status/capacity/scope；family facade 组合它们。selection representation 不导出为 public API。 |
| `admission-core-projection.ts` | 只在 public getter 读取时以 accessors 产生 catalog/inspection；不得让 candidate/validation 为取 DTO 而 materialize catalog。 |
| `admission-core.ts` | 保留 public action/effect composition、frozen opaque wrapper 与 Scheduler-facing contract；当前物理行数为 282，低于 300 行阈值。 |

差分的实现不改 Scheduler shell、compiled graph 或 package root。源码审阅确认 settlement 只沿 changed task 的 compiled reverse occurrences 应用 persistent counter delta；这保留原结构，但不构成 timing 或 memory benchmark。
