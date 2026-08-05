# add-secret-detection

在项目批准的内容中检测疑似秘密，并只发布安全、脱敏的结果。

## 当前状态

这是仅保存未来方向的临时 OpenSpec change。它尚未按新的 Check/Record 与 Project Definition 契约完成安全重基线，`tasks.md` 1.1 完成前不得实施。

## 阅读顺序

1. `proposal.md`；2. `specs/secret-detection/spec.md`；3. `design.md`；4. `tasks.md`。

## 直接依赖

- `establish-check-record-core`
- `adopt-typescript-project-definition`
- `establish-check-task-orchestration`（仅在实施方案需要并行任务时）
