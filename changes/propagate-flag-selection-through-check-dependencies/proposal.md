# Proposal

探索并形成由 flag 选择下游 Check 时显式传递启动其依赖闭包的 Product 能力。

## Why

当前 `enabledByFlags` 独立结算每个 executable Check。调用方若通过 flag 选择一个具有
`dependsOn` 的 Check，必须为全部传递依赖手工配置相同 flag；遗漏时依赖先结算为
`not-applicable`，下游再结算为 `unavailable`。这对低层条件控制是闭合行为，但不足以方便地承接
项目级局部 Check 选择，并迫使每个调用方重复维护依赖闭包和 aggregate selection。

## Outcome

Product 提供边界明确、可观察且兼容现有行为的 flag 依赖传递模型，使选择下游 Check 的调用方可以
显式请求其 `dependsOn` 传递闭包参与同次运行，而不自动选择 `observes`，也不产生第二套项目私有传播算法。
