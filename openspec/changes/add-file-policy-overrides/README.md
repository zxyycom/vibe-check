# add-file-policy-overrides

> **核心句：**本 change 保留一个未来方向：TypeScript Project Definition 可以用声明式纯数据为不同文件选择 Check 自有政策，同时不改变项目的全局输入范围。

## 当前状态

这是尚未排期、未实施且未通过实现前审计的 intent-level OpenSpec change。它只记录长期产品结果和责任边界，不足以直接指导实现；`tasks.md` 1.1 完成前不得执行后续任务。

## 直接依赖

Artifact 可以先用于核对 Project Definition 是否预留了 authoring seam；实际实现必须等待以下三个基础 change 已实施或与本 change 同步到可依赖状态：

- `establish-check-record-core`
- `establish-check-task-orchestration`
- `adopt-typescript-project-definition`

## 阅读顺序

1. `proposal.md`
2. `specs/file-policy-resolution/spec.md`
3. `design.md`
4. `tasks.md` 1.1
