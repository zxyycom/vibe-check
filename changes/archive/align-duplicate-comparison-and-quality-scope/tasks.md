# Tasks

先固定长期语义与当前证据，再实现 area 过滤和项目范围，最后同步文档、测试账本并完成跨 owner 验证。

## Readiness

- [x] 0.1 恢复 duplicate、file selection、Project Gate、Decision 与测试证据 owner，并确认起点 Case 全树闭合。
- [x] 0.2 固定共同 area 交集算法、historical 完整性边界与 advisory 发布政策，确认没有剩余开放问题。

## Implementation

- [x] 1.1 建立三项长期 Decision 的未对齐 successor，并保持关系与索引完整。
- [x] 1.2 修改 duplicate area policy 与直接测试，使互斥 area 隔离、共同 area 保留、自我匹配被拒绝且 scanner 仍只运行一次。
- [x] 1.3 修改 Project Gate quality scope 和配置测试，移除 Markdown CPD、historical metrics 与历史 waiver。
- [x] 1.4 同步 duplicate/scan-scope/Gate owner、发布政策说明和语义 Case。

## Verification

- [x] 2.1 运行 duplicate 与 Project Gate repository-quality 最窄测试并审查行为证据。
- [x] 2.2 运行 test-evidence、Decision、Change Plan、文档投影/验证、typecheck 与 lint。
- [x] 2.3 运行 required workspace verification，审阅完整 diff 后将已实施 Decision 标记 aligned。
