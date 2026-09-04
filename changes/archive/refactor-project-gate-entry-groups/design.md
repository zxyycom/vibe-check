# Design

以 `definition.ts` 内的私有职责分组收敛中央 composition manifest；不迁移唯一 config owner，也不改变一次 Gate invocation 的构造、配置或运行模型。

## Context

- `docs/script-tooling.md#project-gate` 是 Gate composition/selection/quality 的稳定规则 owner：`scripts/project/gate/definition.ts` 是完整 manifest，`scripts/project/gate/run.ts` 是唯一 process entry。
- 改动前 `createProjectGateEntries` 在一次 invocation 内创建 `testLanes`、`preparedCandidate`、`repositoryQuality` 与 `externalConsumer`，再内联构造完整有序 entry list；其 function-code-density 为 162，超过 150。
- `definition.test.ts` 已对完整 Check ID 顺序、selection membership、mutex、dependencies、quality advisory policy、outputs、scheduler 与 aggregation 做中央 composition golden assertions。
- focused quality 的 46 条基线与 45 条验收运行按完整 stable ID 集合比较：仅 `createProjectGateEntries` 的 function-code-density ID 消失，零新增 ID。精确日志路径由 `proposal.md#focused-quality-evidence` 拥有。

## Goals / Non-Goals

**Goals**

- 使 `createProjectGateEntries` 只呈现 invocation-local prerequisites 与既有 group composition，按真实 Gate 职责恢复局部可读性。
- 消除目标 162>150 function-code-density Record，同时保留完整 Gate config 和运行不变量。
- 用既有 golden assertions、Test Evidence closure 和完整 focused Record-set comparison 证明行为与质量结果。

**Non-Goals**

- 不改变 Check、entry order、selection、relations、runtime-local dependency 生命周期、outputs、scheduler、aggregation、`afterGate` 或 public API。
- 不创建第二份 config、generic builder、新模块、缓存或另一运行模型。
- 不修改 quality threshold、waiver、selection exclusion 或其它 Record；不把 focused quality 结果表述为默认 `bun run check` evidence。

## Decisions

### Intended Change

1. 保留 `createProjectGateEntries(runtime)` 为唯一中央组合入口。它在每次调用时创建 `testLanes`、`preparedCandidate`、`repositoryQuality` 与 `externalConsumer`，并按既有顺序展开四个 helpers 与最终 whitespace entry。
2. 在同一文件内引入四个私有 group helper：development verification；candidate and test；repository quality；documentation and governance。每个 helper 只承接一个可命名 Gate 职责，接收已创建 dependencies，并返回原有 `ProjectGateEntry` definitions。单项 whitespace entry 保持为中央 factory 的最终显式 entry，避免为单项建立无意义 wrapper。
3. helper 不创建或缓存 invocation-local value。原 factory、input、object identity、调用次数、Check order、flags、relation、mutex、output、scheduler 与 aggregate policy 保持不变。

### Resulting Impacts

- existing `expectedCheckIds`、required/preset markers、mutex 和 relation input 保持精确总顺序；中央 golden test 继续证明投影后的可观察 configuration。
- candidate、external-consumer、test 与 repository-quality group 继续使用同一次 prerequisites/owner result，不能因分组改变 construction timing 或依赖对象身份。
- documentation、governance、whitespace group 保留原 factories、mutex、process invocation 与 flags metadata。
- 没有 test entity 语义变化时，不变更 Test Evidence Case mapping；完整性 wrapper 前后继续验证 536 entities / 122 Cases。
- focused quality 必须比较完整 stable Record set：目标 ID 消失且没有新增 ID；不得以 waiver、threshold 或 selection exclusion 达成该结果。

## Risks / Trade-offs

- 按物理行数拆分会产生无意义 wrapper，或改变 object construction timing。仅按独立 Gate 职责分组，并由 existing golden test 保护外部 configuration。
- 新 helper 会增加文件物理行数；实施必须使 `definition.ts` 保持在 file-metrics 300 行阈值内，而不是用新增 exclusion 规避指标。
- focused `quality` Gate 只覆盖质量闭集；它不能替代默认 required Gate。默认 workspace evidence 已由任务 2.5 的通过运行独立提供。

## Open Questions

无。focused quality 与默认 `bun run check` 的分层验证均已完成。
