# Tasks

先冻结基线，再串行修改共享 owner，最后独立复核和完整验收。

## Readiness

- [x] 0.1 核对规则、已有改动、Case 起点和设计边界，保存前测输入与结果。

## Implementation

- [x] 1.1 Worker 负向矩阵改为独立最小 fixture，保留生产 audit 和拒绝证明。
- [x] 1.2 将 exact exports 验收收敛到最终产物，保留 declaration/JSDoc/consumer 义务。
- [x] 1.3 复用同次文档预期材料，移除重复实仓正向自测，同步 Case 与 owner。

## Verification

- [x] 2.1 独立代码/文档/证据审查完成，最窄测试与工程、材料、Case 校验通过。
- [ ] 2.2 测量前后同款负载并执行一次完整 Gate，保留原预算/覆盖及全部失败现场，不自动重试。

## Evidence

起点完整 Case 检查通过：778 个当前实体映射到 192 个 Case。前测使用 pinned 工具链和 current candidate，
执行 `mise exec -- bun run check -- --all`：43 项功能通过，mean 2770.3 ms / P95 7492.1 ms 超出原预算，
Gate 按预期阻断。wall 48.043 s；期间未观察到外部重负载，源码、工具链和候选 hash 前后相同。
原始日志、进程采样、输入快照与修改前文件留在 `.log/package-acceptance-consolidation-20261023/`。

gpt-6.1-sol 实施代理完成三项修改，另一 gpt-6.1-sol 代理独立审查通过。目标 42 tests、独立 Worker
负向 1 test 和 waiver 行号同步后的 4 tests 通过；scripts typecheck/lint、完整 validate、format check、
Decision/Change 检查和 diff whitespace 通过。Case 闭合为 780 entities / 192 Cases / 16 topics。
完整真实 candidate、external types/docs/runtime 验收由最后的 all Gate 执行。

最后一次 all Gate 已执行，43 项 Check 全通过，但 mean 2687.8 ms / P95 9127.8 ms 仍超原预算，
整体 Gate exit 1；没有重试。2.2 保持未勾选以显式保留性能验收未闭合状态。
前后数据、收益边界、独立候选准备成本和完整证据入口见[验证与测量](verification.md)。
