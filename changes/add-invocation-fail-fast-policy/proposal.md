# Proposal

本 Draft 评审一种显式 invocation fail-fast policy，使调用方能在已结算 Check 触发停止条件后停止新的独立 Check admission，同时保留已启动工作与既有事实。

## Why

当前 Run 会在依赖、互斥和容量允许时继续调度全部 eligible Checks；最终 aggregation 只在所有 terminal facts形成后计算。对于后续 Check成本高、且首个确定失败已经足以否定本次调用目标的场景，继续启动无关工作会浪费时间与资源。

Fail-fast 不能直接复用 cancellation：取消来自 caller `AbortSignal`，而 fail-fast来自 Product 已观察到的 Check outcome；已启动的同 runtime author functions不能安全抢占。它也不能隐式采用某个 aggregation policy、跳过失败观察者或把未启动 Check伪装成已运行结果。

## Outcome

在真实 workload证明收益且 terminal semantics闭合后，调用方可以显式选择 fail-fast。触发后唯一 Task engine停止新的 admission、drain 已启动 Tasks并保留全部已形成 facts；未启动 Checks获得可区分于 caller cancellation和dependency blocking的受控结果。默认 Run继续收集完整 eligible Check facts，且本能力不引入条件图、回滚或进程强杀。
