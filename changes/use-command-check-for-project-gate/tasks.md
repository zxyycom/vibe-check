# Tasks

先固定单命令范围，再完成接入、证据与文档，最后用真实 Gate 验收。

## Readiness

- [x] 0.1 核对现有 consumer、Product contract、Gate owner 和单命令 / 多步骤边界。
- [x] 0.2 固定继承环境、plain-text、输出 budget、timeout 与失败码取舍。

## Implementation

- [x] 1.1 将剩余 22 个单命令 entry 接到 commandCheck，保留 catalog 与调度 metadata。
- [x] 1.2 迁移 typed dependency resolver 与安全 failure projection，清除通用私有执行残留。
- [x] 1.3 补齐真实 child 与失败边界测试，同步 semantic Cases。
- [x] 1.4 更新稳定 owner 文档和 Decision，以实际接入发现校准说明。

## Verification

- [x] 2.1 运行最窄测试、类型、lint、format、Case、文档、Decision 与 Change 检查。
- [x] 2.2 完成独立正确性审计及最终代码规范、AI-ready 文档优化。
- [x] 2.3 运行完整 Project Gate --all 并核对全部验收标准。
