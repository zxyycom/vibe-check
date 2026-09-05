# Design

以私有 snapshot owner 承接声明 identity 实现，并使 `project-definition.ts` 继续作为唯一 public façade，从而兑现 Proposal 而不改变 Project Definition、Scheduler 或 Run 边界。

## Context

Configuration owner 定义 normalized Check declarations、declarative scheduler projection、callback exclusion、stable fingerprint 与冻结语义。当前 `project-definition.ts` 同时承接 public authoring façade、runtime normalization 和声明快照实现；其 code-lines 为 312，超过 300。既有 fingerprint tests 覆盖 Check callback exclusion、custom strategy kind、measurement hook exclusion、learned `stateDirectory` 和 normalized scheduler projection。

## Goals / Non-Goals

目标是将 snapshot creation、fingerprint serialization/hash 及其私有 helpers 移至 `src/project-definition/declarative-snapshot.ts`，同时保持输入、输出、排序、冻结和 callback 处理。边界目标是：`project-definition.ts` 继续声明 public types/API，并保留 `createDeclarativeFingerprint` 的既有公开 re-export；新文件只作为该 façade 使用的内部实现 owner。非目标是新增 public import path、迁移 public types、修改 Project Definition grammar、验证/规范化时序、Check tree、Scheduler admission、Run 或 tests 的语义，也不执行 full Gate、发布验收或推送；archive 与仅此 Change 的提交在所有验证通过后按后续授权执行。

## Decisions

### Intended Change

`project-definition.ts` 在 runtime normalization 后把 validated Project Definition 和 normalized checks 交给 `createDeclarativeProjectSnapshot`，并继续从原模块导出 `createDeclarativeFingerprint`。`declarative-snapshot.ts` 独占 snapshot construction、declarative scheduler projection、recursive freeze、object-key-stable JSON 与 SHA-256。该私有模块不是新的 public façade；public consumer contract 仍位于 `project-definition.ts`。

### Resulting Impacts

- Snapshot 输入边界只包含 validated definition 与 normalized checks：剥离 Check `execution` / `preflight`，并投影 scheduler admission policy，避免 runtime-only 值成为 declaration identity。
- Identity compatibility 仍要求按 normalized `checkId` 文本排序、object key 排序且 array 保持顺序；保留 learned policy 的 `stateDirectory` 与 custom strategy kind，同时排除 custom strategy callback 和 measurement hooks。
- Runtime normalization 仍创建、保留并冻结 callbacks 的 runtime policy 副本；snapshot 抽取不得改变 callback identity 或其运行时可用性。
- 验证覆盖既有最窄 Project Definition fingerprint test、test-evidence integrity、product type/lint/format、focused quality、一次 default Gate 与 Change check。full Gate、发布验收和外部 consumer integration 不在本 Change 的已证明范围内。

## Risks / Trade-offs

私有抽取若跨越上述边界，callback 剥离、冻结或 canonical serialization 的变化会造成 fingerprint 漂移或 runtime callback identity 丢失。通过移动而非重设既有逻辑、在 façade 保留 public type/export placement，并运行 focused tests 与 quality Check 降低风险。Focused evidence 只能证明仓库内受测边界与 quality 结果；本次 default Gate 补充 required selection 的验证，但仍不能替代 full Gate 或发布 acceptance。

## Open Questions

无。

## Implementation Observations

实施后的 code-lines 为 256；`src/project-definition/declarative-snapshot.ts` 新增 64 code-lines。2026-09-05 的 focused quality 从 36 Records 降至 35，且不再报告 `src/project-definition/project-definition.ts`；其余 35 项为既有、non-blocking maintenance findings。其后一次 default Gate（required selection）通过；full Gate selection 未运行。

已记录通过：product typecheck、focused fingerprint test、完整 `src/project-definition` suite（13 tests / 8 files）、test-evidence integrity（537 entities mapped by 122 Cases across 15 topics）、product lint、workspace format check、focused quality、一次 default Gate 与 Change Plan check。实现中曾补正一次缺失的 type-only import，以上验证在修正后完成。未修改 test body 或 Case，因此复用并运行既有 semantic evidence，而非新增或重写证据。
