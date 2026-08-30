# Tasks

任务先关闭 owner 与证据边界，再实施 Product/Gate 两层输出，最后以目标测试和 workspace 门禁闭合。

## Readiness

- [x] 0.1 恢复 Product output、Project Gate、编码规范、测试策略、Case 账本与相关长期决策，确认本 Change 不替代 machine v4 或 Check-owned facts。
- [x] 0.2 用实际 full Gate 日志审计事件数量、字节占比和根目录布局，并关闭标签、Gate transcript、process 子目录及兼容边界选择。

## Implementation

- [x] 1.1 实现 Product diagnostic observation 的筛选标签、紧凑主行和有界续行，并同步所有 core 事实 owner 与目标测试。
- [x] 1.2 实现 Gate-owned `gate.log` transcript 生命周期，覆盖 Gate console、direct stdout/stderr plain tee、最终 result、exit mapping 与失败处理。
- [x] 1.3 将所有 Check-owned process transcripts 硬切到 `process/<check-id>.log`，同步引用、fixture 和测试。
- [x] 1.4 更新 Product/Gate 稳定 owner、长期决策和语义 Case，使人读输出职责与当前布局可恢复。

## Verification

- [x] 2.1 运行 diagnostic logger、Project Run、scheduler、Gate process/project-run/run 的最窄 Bun tests，并审查实际生成日志。
- [x] 2.2 运行 typecheck、lint、文档验证、Decision/Change 检查和 Test Evidence 全树闭合。
- [x] 2.3 运行 `bun run verify:vibe-check-workspace:required`，确认新 invocation 的 `gate.log`、core timeline、machine files 与 `process/` inventory。
