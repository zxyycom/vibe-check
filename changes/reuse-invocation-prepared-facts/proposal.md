# Proposal

在一次 Run 中保留并交接已验证的 Definition 与 prepared graph，减少重复构造；本文是本轮实施计划。

## Why

实施前 Definition validation 已解析声明并求解继承，成功后却重新物化 authoring，随后 normalization 再处理。
完整 Run 的多个阶段也重复 plan/prepare 同一静态图。问题是阶段间成果未被交接，不是缺少跨 Run 缓存。

## Outcome

一次 Run 的已验证声明和 prepared graph 由明确 owner 持有并向下游复用，保持公开结果、失败优先级和回调时序。

## Scope

### Intended Change

- 在 Definition 私有边界保留已解析/解析继承后的成果，避免成功路径回到原始 grammar 重新处理。
- Invocation 在既有 pre-Git 验证时保留 prepared graph，后续 strategy、execution 与 Scheduler 复用。
- 保留 raw/private standalone 入口的完整验证，不按 caller Definition 对象 identity 跨 Run 缓存。

### Resulting Impacts

- Definition/Invocation/Check execution/Scheduler 的私有类型与交接变化，需证明图、root cap 和声明来源一致。
- 保留 cancellation、Git acquisition、strategy preparation、flag-control 和 drain 的阶段顺序。
- 更新内部 owner；公开 API 与用户用法不变时说明无须迁移的依据，测试与 Case 按实际证明变化维护。

## Success Criteria

- 正常公开 Run 不重复解析已验证 Check tree，不重复准备同一静态图；通过有界计数或等价直接证据核对。
- invalid Definition/Controls、invalid graph、取消、prepare 失败、正常/custom Run 和 standalone 的行为回归通过。
- 性能对照保留小图绝对成本和大图趋势，不要求所有样本更快；类型、lint、依赖、Case 和组合 Gate 通过。

## Affected Owners

- [Project Definition](../../docs/development/project-definition.md)
- [Project Run](../../docs/development/project-run.md)
- [Scheduler](../../docs/development/scheduler.md)
- `src/project-definition/declarative-snapshot.ts`、`src/project-run/invocation/creation.ts` 与 `outputs/configuration.ts` 的私有 inputs；`task-scheduler/graph.ts`、`execution-state.ts` 与 `scheduler-terminal-measurement.ts` 的 prepared/raw 接口分离。
- [测试策略](../../docs/testing/strategy.md)
