# Proposal

本 Change 已以 `scripts/project/gate/definition.ts` 为唯一中央 Gate config owner，按真实职责分组其 entries，消除了 `createProjectGateEntries` 的单一 function-code-density Record，且不改变 Gate 行为。

## Why

`createProjectGateEntries` 曾有 162 行函数代码密度，超过 repository-quality 的 150 行阈值。一个函数同时内联 development verification、candidate/test、repository quality、documentation/governance 与 whitespace entries，使中央 manifest 的职责分组不易审阅；超限不是保留该局部结构问题的理由。

## Outcome

中央 entry factory 只保留 invocation-local prerequisite 的创建和既有总顺序组合。四个私有、按职责命名的 entry-group helper 返回既有 entry definitions；单项 whitespace entry 作为中央 factory 的可见尾部保持原样；focused quality evidence 从 46 条 advisory Record 变为 45 条，唯一消失的稳定 ID 是 `createProjectGateEntries` 的 function-code-density，且没有新增 Record。

## Scope

### Intended Change

- `scripts/project/gate/definition.ts` 继续是唯一完整 Gate composition manifest 和唯一 config owner；不创建第二份 config、新模块、generic builder 或额外运行模型。
- 在该文件内使用四个私有 entry-group helper 组织 development verification、candidate and test、repository quality、documentation and governance；单项 whitespace entry 保持为中央 factory 的最终显式 group，不为单项建立 wrapper。
- `createProjectGateEntries(runtime)` 仍在每次调用时创建同一组 `testLanes`、`preparedCandidate`、`repositoryQuality` 与 `externalConsumer`，再按原有顺序展开 groups。helper 只接收这些已经创建的 dependencies；不得创建、缓存或替换 invocation-local value。
- 不修改 threshold、waiver、selection exclusion、其它 quality Record、Gate aggregation、outputs、scheduler、`afterGate` 或 public exports。

### Resulting Impacts

- entry 列表、`expectedCheckIds` 总顺序、required/preset markers、mutex、relation input、factory input 和 object identity/creation timing 必须保持不变。
- candidate、external-consumer 与 test group 继续消费同一 lanes、definitions、candidate、external consumer 和 repository root；quality group 继续消费同一次 repository-quality owner result。
- 现有 `definition.test.ts` 的中央 composition golden assertions 是行为保护 owner。没有新的可观察行为时，不新增测试或 Case；Test Evidence Case mapping 只在实际 test entity 改动时同步。
- 质量验收以同一 focused `quality` Gate 的完整 stable Record set 比较，而不只检查“目标 ID 缺席”。

## Success Criteria

1. `createProjectGateEntries` 不再产生 `function-code-density` Record，`definition.ts` 也不产生 file-metrics Record。
2. focused quality 从 46 条 advisory Record 变为 45 条；目标 stable ID 消失，且没有新增 stable ID。
3. Gate definition test、scripts typecheck/lint/format 与前后 Test Evidence closure 通过。
4. Gate config、outputs、scheduler、aggregation、`afterGate`、public exports 与 invocation-local construction 生命周期不变。
5. 没有 waiver、threshold 调整或新增/扩大 selection exclusion。focused quality 与默认 `bun run check` 分别提供质量闭集和 required workspace evidence，二者不能相互推断或替代。

## Affected Owners

- `docs/script-tooling.md#project-gate`：Gate composition、selection、quality 与 verification 的稳定 owner；它说明 `definition.ts` 是完整 manifest，`run.ts` 是唯一 process entry。
- `docs/coding-style.md`：局部职责和 helper 边界的通用规则。
- `scripts/project/gate/definition.ts` 及 `scripts/project/gate/definition.test.ts`：唯一 config implementation owner 及其 composition golden evidence。

## Focused Quality Evidence

- 基线：`.log/project-gate/2026-09-04T16-06-34.619Z-1189781-31f012ab-f817-40cf-a6a7-6d579dc84ed6/machine/records.ndjson`，46 条 Record（duplicate 1、file 11、function 34）。
- 验收运行：`.log/project-gate/2026-09-04T16-10-04.271Z-1198203-8b16e5cf-1176-4bdf-987c-5092c64aeab2/machine/records.ndjson`，focused `quality` Gate 通过，45 条 Record（duplicate 1、file 11、function 33）。
- 两集合按 stable ID 比较：仅 `function:{"file":"scripts/project/gate/definition.ts","name":"createProjectGateEntries"}:function-code-density` 消失；没有新增 ID。
- 默认 workspace 验收：`.log/project-gate/2026-09-04T16-15-26.375Z-1206873-9d81809f-7d61-4490-a1a2-9676f289cc44` 的 `bun run check` 通过，31 个 Check `passed`、5 个 `not-applicable`、零 `failed`/`unavailable`。
