# Design

本设计以现有行为 owner 为边界拆分测试，不改动 Scheduler duration model 产品实现。

## Context

`docs/testing.md` 要求 history/model tests 分别证明 local state 读取、闭合 parser、prediction、record 与 atomic write 的失败边界；`docs/testing/case-maintenance.md` 要求 rename、split 和 delete 保持语义 Case 连续性。当前单一测试文件以 342 code lines 触发 file-metrics Record，超过 `docs/checks/file-metrics.md` 设定的 300 行 source 阈值。

## Goals / Non-Goals

目标是让 recording、storage 和 prediction 的断言由各自的测试文件直接拥有，且 Case 仍引用真实 Bun entities。非目标是修改产品 source、改变 Scheduler history/prediction 行为、增加 Case 或调整 Case 的 Owner/Proves。

## Decisions

### Intended Change

1. **按直接证明边界拆分。** recording 证明可接受 interval、timing unavailable 与 series capacity；storage 证明 closed digest-only round trip、读写 fault containment 和并发 writer 的完整状态；prediction 证明冻结的 digest-only summary 和 learned/median/cold 选择。
2. **保留最小局部构造。** `predictionInputs` 是唯一跨文件的构造，因为它刻意承载 authored/flag secret；storage 保留 `withStateDirectory`，recording 保留 measurement、settled、recordOneSample。各测试文件以其直接需要的 digest/history 形状本地构造 closed history。
3. **保持 Case 语义并显式映射 proof split。** `WB-RUNTIME-SCHEDULER-HISTORY-001` 关联三个 recording 与两个 storage 新实体，以及不受影响的 invocation entities；它不吸收 prediction 节点。`WB-RUNTIME-SCHEDULER-PREDICTION-001` 只关联两个 prediction 实体。此分配以直接可观察的 recording/storage 或 prediction 结果为准，不按原聚合文件或节点数量划分；ID、Topic、Owner、Proves 不变。
4. **完成、Gate、归档与提交。** 局部验证完成后，当前授权要求恰好一次 default `bun run check`；Gate 通过后归档该 Change，并以一个范围精确的提交保存。不得运行 full `--all` 或 push。

### Resulting Impacts

- 删除原测试节点后必须在同一编辑中更新所有旧 entity keys，否则 strict Test Evidence 会报 unknown entity 和未映射新实体。
- 分拆后的每个文件应落在 300 code-line 限制内；focused quality 结果必须确认原超限 Record 已消除，且不引入新的 Record。
- docs validator 只验证 Case 文档格式与链接边界；Test Evidence strict closure 只验证 current entity discovery/mapping。三个目标 Bun tests 证明迁移后断言仍可执行，focused quality 证明已记录的 file-metrics 结果；这些证据分别交付，均不以 Gate 代替全 Project Gate 验收。

## Risks / Trade-offs

- 局部 closed-history 构造会有少量可见重复；这是让每个测试直接表达它的 proof context 的成本，低于建立没有稳定行为 owner 的共享 test helper 的风险。
- 将原聚合实体拆成七个节点会扩大 Case entity lists，但它们仍归属两个既有 owner-level Case；不能因节点数增加而新增 Case。
- focused quality 的准确命令需按现有 script capability 核对；它只能证明该次直接 repository-quality invocation 的结果。default Gate 补充 required aggregation 证据，但不选择 full `--all` 的 artifact 或 external-consumer acceptance。

## Open Questions

无。

## Implementation Observations

- 2026-09-05：已删除 342-line 聚合测试，新增 recording 3 节点、storage 2 节点、prediction 2 节点及只含 `predictionInputs` 的 support；三个 test file 分别为 193、135、103 行。
- 2026-09-05：Test Evidence strict closure 由 538 entities 更新为 541 entities，仍由 122 个现有 semantic Cases 覆盖；History Case 当前映射三个 recording、两个 storage 和两个未迁移 invocation entities，Prediction Case 当前映射两个 prediction entities。两个 Scheduler Case 的 ID、Topic、Owner 与 Proves 未改变。
- 2026-09-05：direct Product repository-quality invocation（不经 Project Gate）得到 aggregate `passed`、29 个 Records：file-metrics 5、duplicate 1、function-metrics 23、Markdown Link 0；旧 `scheduler-duration-model.test.ts` code-lines Record 不存在。任务给定的基线为 30 个 Records，因此当前结果是 30→29。
- 2026-09-05：唯一一次 default `bun run check` 通过：required selection 的 36 checks 中 31 passed，5 个 package artifact/external-consumer acceptance checks 因未选择而 not applicable；未运行 `bun run check -- --all`。Gate log：`.log/project-gate/2026-09-05T04-27-55.884Z-1900047-aa77f6bf-cb2f-4086-bfec-32d45e23e857`。
