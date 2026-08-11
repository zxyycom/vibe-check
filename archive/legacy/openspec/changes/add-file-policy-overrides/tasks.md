> **核心句：**本 change 当前只保存 future intent；必须先重新基线并细化为可实施契约，才能开始任何实现任务。

## 1. 实施前阻塞审计

- [ ] 1.1 **BLOCKING：当前 intent-level artifacts 不能直接实施。** 等 `establish-check-record-core`、`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 已实施或同步到可依赖状态后，依据届时主规范、源码、活动决策和实际 public seams 重新基线；补齐并审计唯一可实施的 authoring、Check-owned validation/resolution、scope/reference/provenance 契约及必要测试证据；同步重写 proposal、design、delta spec 与后续 tasks，确认 capability ID、临时未批准状态、依赖方向和 Open Questions 正确，并通过 strict OpenSpec validation。此项完成前不得执行 2.1 或任何后续任务。

## 2. 文件政策能力

- [ ] 2.1 在 1.1 产出的已审计契约下，实现 Project Definition 的声明式文件政策 authoring、公共 ordered resolver 与 producing Check-owned validation/resolution，并补充届时确定的最窄行为测试。
- [ ] 2.2 将 frozen resolved policy 接入全局 inventory 之后的 Check input planning、current/reference 工作与可解释性入口，证明文件政策不能扩大 inventory 且两侧使用同一解析值。

## 3. 同步与验证

- [ ] 3.1 同步届时实际 owner docs 和必要测试证据，运行受影响模块的目标检查、项目声明的 OpenSpec/docs 验证及与改动风险相称的 workspace verification，并审计最终 diff 未引入 feature-local resolver 或未声明公共契约。
