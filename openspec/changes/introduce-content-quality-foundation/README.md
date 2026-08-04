# introduce-content-quality-foundation

建立 capability-specific 内容检查输入、通用 finding 与可扩展完整性和机器输出基础契约

## 当前状态

这是临时且未审计的 OpenSpec change。`tasks.md` 的 1.1 仍未完成；它完成前不得实现、修改长期 owner 或把本方案视为已批准。

## 阅读顺序

1. `tasks.md` 1.1：先恢复阻塞审计范围。
2. `proposal.md`：确认目标、能力与影响面。
3. `design.md`：审阅编号 decisions、迁移和取舍。
4. `specs/**/spec.md`：核对最终可观察契约。

## 直接依赖

- 无新的上游实现 change。
- 实现前必须确认已完成的 `stabilize-quality-comparison` 已归档/同步长期 spec，或由 1.1 明确承接其“只接受显式 baseline”delta。
