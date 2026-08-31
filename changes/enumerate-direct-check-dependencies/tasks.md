# Tasks

任务先固定公共枚举契约，再实现同一 dependency owner中的列表读取，最后用package消费者证明能力可用且不扩大授权。

## Readiness

- [ ] 0.1 使用 Decision Records记录direct dependency enumeration继续服从显式provider与静态graph，不建立ambient executed-Check registry。
- [ ] 0.2 复核dependency normalization、scheduler settlement、Core outcome ownership、public declaration与手工context fixtures，确认稳定顺序和最小 supporting type。

## Implementation

- [ ] 1.1 扩展`CheckDependencies`与相邻类型，增加冻结、稳定排序的`list()`四态outcome枚举，并保留`get()`全部现有行为。
- [ ] 1.2 更新dependency runtime与有界diagnostic observation，确保只读direct dependencies、不暴露transitive/undeclared或settlement时序。
- [ ] 1.3 更新README/API机制/Configuration、package声明材料、external consumer示例与语义 Cases，明确consumer只能执行自己的后续逻辑且仍需provider parser。

## Verification

- [ ] 2.1 运行最窄dependency tests与Test Evidence closure，覆盖空列表、多个依赖、继承、四态、稳定顺序、冻结、重复调用和transitive排除。
- [ ] 2.2 运行typecheck、lint、format、docs validation及package candidate types/runtime acceptance，审查没有registry、query DSL或上游mutation能力。
- [ ] 2.3 运行`bun run verify:vibe-check-workspace:required`，证明public API、machine facts、scheduler与现有dependency consumers保持闭合。
