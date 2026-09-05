# Proposal

本 Plan 以证明 owner 拆分 Scheduler duration model 测试，并保留现有语义证据的连续性。

## Why

`scheduler-duration-model.test.ts` 的 342 code lines 超过 repository file-metrics 的 300 行阈值，且把 recording、storage 和 prediction 的不同可观察边界混在一个测试文件中。

## Outcome

以七个按证明 owner 命名的 Bun test entities 替代原文件：History Case 由五个 recording/storage 节点承接，Prediction Case 由两个 prediction 节点承接。保留全部现有断言和两个现有语义 Case 的身份、Topic、Owner 与 Proves，并将当前 Case 映射闭合到新实体。

## Scope

### Intended Change

- 删除 `src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts`，新增 `scheduler-duration-recording.test.ts`、`scheduler-duration-storage.test.ts` 与 `scheduler-duration-prediction.test.ts`。
- recording 文件包含 bounded admitted samples、unavailable timing、capacity eviction 三个实体；storage 文件包含 round-trip closed digest-only、read/write faults + concurrent writers 两个实体。以上五个实体仅承接 `WB-RUNTIME-SCHEDULER-HISTORY-001` 的 recording/storage proof。
- prediction 文件包含 frozen digest-only summary、learned mean → median prior → cold 两个实体，并且仅承接 `WB-RUNTIME-SCHEDULER-PREDICTION-001` 的 prediction proof；两条既有 invocation entities 继续只映射 History Case，不在本 Change 中迁移。
- 只新增无 Bun test node 的 `scheduler-duration-model.test-support.ts`，其中仅保留具有 authored/flag secret 的 `predictionInputs`。
- 保持既有 `WB-RUNTIME-SCHEDULER-HISTORY-001`、`WB-RUNTIME-SCHEDULER-PREDICTION-001` 的 ID、Owner、Proves 与 Topic，只替换 entities；不新增 Case、不改产品 source。

### Resulting Impacts

- storage 继续拥有 state-directory lifecycle，recording 继续拥有 raw measurement、settlement 和单样本构造；每个文件本地构造自身的 closed history，避免无证明责任的共享 fixture。
- 测试实体新增、删除、正文与 Case 映射均受 `docs/testing.md`、`docs/testing/case-maintenance.md` 和 Test Evidence strict closure 约束。
- Case 文档是范围内唯一受影响的稳定材料，需通过 docs validation；Test Evidence strict closure 证明 current entity key 的发现/映射闭合，目标 Bun tests 证明迁移后的运行断言。完成时必须再通过一次 default Project Gate；它不选择 full `--all` 的 artifact 或 external-consumer acceptance。当前授权允许在 Gate 后 archive 与提交本 Change，但不 push。

## Success Criteria

- 旧 342-line 测试文件不存在，三份新测试文件均不超过 300 code lines，file-metrics 对该路径不再产生超限 Record。
- 七个新 Bun entities 以其直接可观察的 recording、storage 或 prediction 断言证明现有 History/Prediction Cases，没有删除或弱化原断言、没有重复 Case。
- `quality-runtime.md` 中两条既有 Case 的 IDs、Topic、Owner 和 Proves 保持不变；History Case 的五个迁移节点与 Prediction Case 的两个迁移节点均可由 runner 发现。
- active Change artifacts、三个最窄 Bun 测试、Test Evidence strict closure、docs validation、typecheck、lint、format、focused quality 与 default `bun run check` 均通过；complete `bun run check -- --all` 仍未运行。

## Affected Owners

- `docs/testing.md` 和 `docs/testing/case-maintenance.md`：测试层级、semantic Case 及 entity closure 流程。
- `docs/testing/cases/quality-runtime.md`：两个既有 Scheduler history/prediction Case 的当前实体映射。
- `docs/architecture.md#execution-boundary`：两个 Case 不变的行为 owner。
- `src/project-run/scheduler-duration-model/*.test.ts`：recording、storage 和 prediction 的直接可观察证明。
