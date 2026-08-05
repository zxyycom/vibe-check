# establish-check-record-core

建立独立的 Check 与 Record 核心契约，并让统一决策和输出只消费其最终快照。

## 当前状态

这是三项基础 change 的第一项，尚未实施。`tasks.md` 1.x 是实现前阻塞门禁；完成前不得修改产品实现。
本 change 只建立运行时解析目标与 execution extension seam，不加载 TypeScript Project Definition，也不定义
`TaskPlan` 或 scheduler。

## 依赖顺序

本 change 没有同组 OpenSpec 前置。后续按以下顺序实施并同步主 spec：

1. `establish-check-record-core`
2. `establish-check-task-orchestration`
3. `adopt-typescript-project-definition`

## 阅读顺序

1. `proposal.md`
2. `design.md`
3. `specs/**`
4. `tasks.md`
