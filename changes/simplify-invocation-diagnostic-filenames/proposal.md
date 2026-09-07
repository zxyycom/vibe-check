# Proposal

评审已拥有独立 invocation 目录时采用稳定 diagnostic 文件名的方案，同时保留共享目录的隔离安全。

## Why

用户指出同一个 Gate run 目录里 gate.log/progress.log 是固定名，而 core/scheduler 日志仍带时间与 UUID。目录已提供 invocation identity 时后缀可能重复，但 Product 也允许多个 Run 使用同一个 caller-chosen directory。

## Outcome

确定能简化逐次运行日志定位、且不会在重复或并发 Run 中覆盖文件的命名和目录契约；在实现前明确由 Gate 还是 Product 承接。
