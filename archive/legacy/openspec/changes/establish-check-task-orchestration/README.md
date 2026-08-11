# establish-check-task-orchestration

通过 foundation private execution binding，为 applicable Check 建立调用期静态 `TaskPlan` 与共享 scheduler。

## 当前状态

这是三项基础 change 的第二项，尚未实施。它只消费 Check/Record foundation 已声明的 opaque execution seam，
不把 Task 提升为新的产品对象，也不修改公共 Check、Record 或 policy contract。`tasks.md` 1.x 完成前不得修改
产品实现。

## 依赖顺序

必须先实现并验收 `establish-check-record-core`，再实施本 change。完成本 change 后，
`adopt-typescript-project-definition` 才能把 project-authored task factory 接入该 orchestration boundary。

## 阅读顺序

1. `proposal.md`
2. `design.md`
3. `specs/check-execution-orchestration/spec.md`
4. `tasks.md`
