# port-lizard-function-metrics-to-typescript

> **核心句：**本 change 保留一个已延期的未来方向：将 function metrics 的 Python/Lizard backend 替换为 Product-owned TypeScript 实现，同时保持恢复实施时确认的产品行为。

## 当前状态

这是尚未排期、未实施且不能直接执行的 intent-level OpenSpec change。早期审计曾确认当时产品仍通过外部 Python/Lizard 处理 TypeScript/Rust 输入，且尚无 translated runtime；该观测只描述历史背景，不是当前实现契约或迁移基线。

`tasks.md` 1.1 是阻塞门禁。它完成前不得开始 parser port、runtime switch 或旧 backend 删除。

## 恢复前置

实际实施必须等待以下基础 change 已实施或同步到可依赖状态，并由当前产品优先级明确恢复：

- `establish-check-record-core`
- `establish-check-task-orchestration`
- `adopt-typescript-project-definition`

恢复后必须重新读取届时的主规范、源码与活动决策，采集 current behavior baseline，再细化 parser、identity、performance、license 和测试契约。

## 阅读顺序

1. `proposal.md`
2. `specs/structural-scanning/spec.md`
3. `design.md`
4. `tasks.md` 1.1
