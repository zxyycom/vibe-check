> **核心句：**本 design 只固定 Network Link Check 的授权、handoff、调度和安全责任，不提前锁定 HTTP state machine、cache 或结果字段。

## Context

外部链接验证同时涉及内容owner、网络副作用、并发资源和不稳定远端状态。新的Project Definition可以承载显式声明式授权，Check task orchestration可以提供共享并发控制，而Check/Record foundation可以分别表达领域结果与执行完整性。本feature应组合这些边界，不复制它们。

## Goals / Non-Goals

**Goals:**

- 只有经过验证的显式 Project Definition policy 才能授权联网。
- 复用 Markdown link classification，保持一个解析和分类 owner。
- 通过共享 scheduler 的 slots 与 resources 协调外部 HTTP(S) 验证工作。
- 阻止 SSRF 和ambient credential传播，并确保公开结果不泄露敏感URL材料。
- 将正常完成后得到的领域不确定结果与真正的执行失败分开表达。

**Non-Goals:**

- 不实现通用 crawler、浏览器渲染、登录、认证链接检查或任意协议客户端。
- 不在当前阶段固定 HTTP method、status分类、redirect/retry/cache算法、并发数值或record identity。
- 不重新解析 Markdown，不为 shared scheduler 或 Core 增加 network-specific 语义。

## Decisions

### Decision 1: Network access requires validated declarative opt-in

Project Definition 的结构化policy是唯一联网授权来源；禁用、缺失或未通过验证的policy不得触发DNS、socket或其它network work。Gate、profile、check发现或环境变量不能隐式扩大授权。具体authoring shape在实现前与已落地Project Definition对齐。

### Decision 2: Markdown owns classification; Network owns reachability

`add-markdown-link-validation`负责解析source并分类出可交接的external link candidates；Network Link Check只消费该handoff并判断联网结果。两者不得为同一职责分别维护parser、URL classification或source occurrence模型。

### Decision 3: Safe transport is a required feature boundary

私有network boundary必须在实际连接及任何重定向前执行SSRF-safe目标验证，不得自动携带ambient cookies、credentials、authorization或未经声明的proxy状态。原始URL中的敏感材料只能在执行所需的受限内存中使用，公开records、diagnostics与artifacts必须脱敏。若当前runtime无法兑现这些目标，应安全失败而不是降级为普通fetch。

### Decision 4: Parallel work uses the shared check scheduler

Network Check通过`establish-check-task-orchestration`贡献静态检查任务，并只复用其invocation级function slots、named exclusive resources与单项Task失败隔离。Feature不创建独立全局pool，也不让task成为第三套公共质量结果。

该scheduler不为本feature提供caller cancellation、public `AbortSignal`、Task timeout、hard termination或bounded drain。任何request-specific budget属于Network Check私有transport契约，不能被描述为scheduler已经约束了Task内部自行创建的网络操作。

### Decision 5: Remote uncertainty is not a confirmed content defect

只有实现时定义并取得充分证据的稳定结果才能产生确认的质量record。若全部required work正常settle且completion正常返回，producing Check可以在自己声明的QualityRecord与CheckResult contract中表达仍无法确定的远端状态，并返回合法CheckResult；其CheckRun是`completed`。这里的`indeterminate`只是领域数据，不是新的foundation verdict或run status。

若Task、transport或completion throw/reject，dependency阻断，或binding以其它方式返回execution-failed report，则foundation只能finalize `failed` CheckRun与`result = null`，同时保留此前已提交的valid records与coverage acknowledgements。Feature不得为同一执行事实再伪造`indeterminate` CheckResult或synthetic record。具体领域分类与HTTP策略在实施前安全审计中确定。

## Risks / Trade-offs

- SSRF防护依赖runtime能控制解析、连接和redirect；实现前必须证明该能力，无法证明则不得启用联网。
- 外部状态天然不稳定；保守区分确认问题、领域不确定结果与执行失败会减少误报，但需要producer明确每种事实的owner。
- URL可能携带token或userinfo；安全设计必须覆盖请求材料、日志、records、diagnostics和测试失败输出。
- 共享scheduler简化全局并发，但具体task拆分只有在handoff与transport契约落地后才能确定。

## Open Questions

当前没有需要提前决定的产品方向问题。HTTP策略、cache、结果catalog和并发预算均有意留待实现前阻塞审计，不能据此开始实现或执行真实网络请求。
