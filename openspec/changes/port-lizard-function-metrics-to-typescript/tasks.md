> **核心句：**本 port 当前只保存 future intent；必须先重新基线并细化为可实施契约，才能开始 parser 或 runtime 工作。

## 1. 实施前阻塞审计

- [ ] 1.1 **BLOCKING：当前 intent-level artifacts 不能直接实施。** 仅在产品优先级明确恢复，且 `establish-check-record-core`、`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 已实施或同步到可依赖状态后，重新读取届时主规范、源码、活动决策和运行行为；采集 current supported inputs、Check/Record identity、measurement/order、failure、parser edge、performance、source/license 与 test evidence baseline；据此重写 proposal、design、delta spec 和后续 tasks 到唯一可实施、可验证状态，完成依赖/范围/Open Questions 审计并通过 strict OpenSpec validation。此项完成前不得执行 2.1 或任何后续任务。

## 2. TypeScript backend replacement

- [ ] 2.1 在 1.1 形成的已审计契约下，实现最小 Product-owned TypeScript structural-analysis backend，并以届时确定的 parser、provenance、license、compatibility 和 performance evidence证明行为。
- [ ] 2.2 将 `function-metrics` Check 切换到该 backend；按审计后的迁移方案退出 formal Python/Lizard runtime，并证明 CheckResult、QualityRecord、supported inputs 与 failure behavior满足 fresh baseline。

## 3. 同步与验证

- [ ] 3.1 同步届时实际 structural-scanning owner docs 与必要测试证据，运行目标 parser/Check/Record/performance 验证、项目声明的质量检查和严格 OpenSpec/workspace verification，并审计最终 diff 没有扩展 public contract 或遗留 formal Python/Lizard execution path。
