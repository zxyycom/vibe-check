# Tasks

本 Change 先固定 AI consumption contract 与编码规范审查结论，再实施行为中性的文档、命名和边界优化，最后完成跨 package 验证。

## Readiness

- [x] 0.1 读取 `ai-ready-docs`、完整编码规范、文档导航、行为 owner、测试策略与 Case 维护规则。
- [x] 0.2 建立 AI consumption contract，确认手写 Check guide、Configuration、scanner owner 与 generated README 的责任边界。
- [x] 0.3 运行目标测试、product typecheck/lint/format 与完整 Test Evidence 起点检查。
- [x] 0.4 将本 Change 固化为 Plan 并检查 artifacts。

## Implementation

- [x] 1.1 重构 `fileMetrics` 指南，使配置关系、defaults、effective maximum、overlap、result 与 failure mapping 可从局部文本直接恢复。
- [x] 1.2 收敛 Configuration 重复 contract，并移除 scanner verification 对旧测试文件名的依赖。
- [x] 1.3 将 file-metrics constructor 实现和测试改为职责明确的文件名，并同步 package export 与 Case entity path。
- [x] 1.4 优化边界类型、领域命名、Record conversion、穷尽失败映射和 typed process error handling。
- [x] 1.5 审查受影响测试的 owner、证明信号、可靠性和 Case 语义连续性。

## Verification

- [x] 2.1 运行目标测试、完整 Test Evidence 与 target format/lint。
- [x] 2.2 运行 product/full typecheck、文档 projection/check、links 与 workspace validation。
- [x] 2.3 重建并验证 package candidate 与外部 consumer。
- [x] 2.4 运行 repository quality 和 required workspace Gate。
- [x] 2.5 审查局部 diff、Change/Decision 状态与未验证边界，只保留本 Change 可归因改动。
