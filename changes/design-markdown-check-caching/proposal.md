# Proposal

本 Draft 为 Markdown lint Check 独立设计可选结果缓存，并用 Markdown Link 的跨文件依赖约束复用边界。

## Why

Markdown lint 的内置规则由单个文档内容、规则和 parser policy 决定，适合评估逐文件复用。Markdown Link 还依赖目标文件、跨文档标题、目录成员、containment 与本次 I/O 状态，因此源文件指纹不能代表链接结果。

现有 `markdownLinkValidation` 只持久化 exact-content parse facts，并在每次 Run 重新执行 target resolution。新的 cache 方案应保持这一边界，只加速 Markdown lint 拥有的单文档计算。

## Outcome

形成一份可进入 Plan 的 cache contract、性能门槛和采用决定。若决定实施，目标是默认关闭、best-effort 的逐文件 lint-result cache：hit 只复用规范化单文档诊断；Markdown Link 仍依据当前 target 和 filesystem facts 结算，任何 cache 都不重放 Record 或 terminal outcome。
