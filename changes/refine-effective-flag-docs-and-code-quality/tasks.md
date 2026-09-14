# Tasks

先建立文档消费契约和编码规范审查基线，再分别收敛文档与代码，最后以独立复审和完整 Gate 退出。

## Readiness

- [x] 0.1 固定 feature diff、相关 owner、公开投影与验收范围。
- [x] 0.2 完整读取 `ai-ready-docs` 与项目编码规范，明确其为文档/代码裁决源。
- [x] 0.3 确认本 Change 不重新设计产品契约，只实施有具体语义依据的收敛。

## Implementation

- [x] 1.1 按 AI 消费契约审查公开指南、API 机制、实现 owner、示例、changelog、Decision 与 Cases。
- [x] 1.2 收敛文档重心、负向描述、迁移残留、重复、篇幅与 Markdown 样式，保持 owner 和投影边界。
- [x] 1.3 以完整编码规范审查 feature diff 代码及直接影响范围，不把相邻代码当作规范。
- [x] 1.4 对具体语义障碍做最小代码修改，并同步必要测试或 Case 证明。

## Verification

- [x] 2.1 运行文档投影、文档校验、format 和关键词/链接审计。
- [x] 2.2 运行 Definition、Run、Git、Gate 与 package 消费方最窄验证，以及 typecheck、lint 与 Test Evidence。
- [x] 2.3 由非实施代理基于实际 diff 复审文档可恢复性、编码规范符合与行为不变。
- [x] 2.4 运行 `bun run check -- --all`，核对实际 diff，并确认 Change 具备完成与 Git 归档条件。
