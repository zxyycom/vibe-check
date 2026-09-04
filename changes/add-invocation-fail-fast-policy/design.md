# Design

本设计把 fail-fast限定为 invocation admission policy，不把它扩张为 Check relation、状态路由或取消协议。

## Context

- 当前 caller cancellation在 Task admission commit前观察 `AbortSignal`，停止新 admission并 drain 已启动 Tasks；pending Tasks使用 private `cancelled-before-start` settlement。
- Check aggregation是可选 RunControls policy，只在全部 selected terminal outcomes形成后计算，不是执行期控制器。
- author callback可能忽略 signal，Product不能安全抢占、回滚 Records或从普通 Error推断协作取消。
- success dependency与outcome observation由独立 Change 负责；无论该 Change 是否先落地，fail-fast都只面向一次 invocation 中仍可admit的pending Checks，不改变direct relation本身。
- admission priority、capacity hard guard、mutex与`maxParallel`已经共同约束下一运行选项；fail-fast必须在同一 Scheduler内形成唯一 cutoff。

## Goals / Non-Goals

**Goals**

- 用代表性长运行 workload证明停止后续 admission的实际延迟收益。
- 明确 trigger、cutoff、running drain、pending settlement、observer和最终 aggregate语义。
- 让 diagnostics解释哪个 Check outcome触发了 cutoff以及哪些 Checks没有启动。
- 保持默认完整执行和caller cancellation的现有行为。

**Non-Goals**

- 不强杀已启动 author work，不回滚 Check/Record/output facts，也不自动重试或恢复。
- 不增加 status-expression DSL、per-edge failure handler、conditional Check、scope-local workflow或发布编排。
- 不用 fail-fast代替 dependency、mutex、resource capacity、priority或最终 aggregation。

## Decisions

### Intended Change

以下方向在 Plan 前仍需由性能与结果模型证据确认：

1. fail-fast只能由显式 RunControls启用，默认关闭；Definition是否允许默认值留待consumer与fingerprint审计。
2. 触发器只读取已可信结算的 Check outcome，不读取Records、messages、duration或presentation。Draft优先评审`failed`与`unavailable`，不预设`not-applicable`是否触发。
3. 触发后停止新的 Task admission并 drain已启动 Tasks，不向running work伪造abort，也不改变已经完成或随后完成的outcome。
4. pending Check必须形成独立于`execution-cancelled`、`dependency-not-passed`的Product-owned未运行原因，并保留duration `null`；具体四态映射在Plan前闭合。
5. fail-fast不提供observer例外列表或条件表达式。若失败审计必须运行，优先由afterGate或RunResult consumer处理；是否允许已经ready的observer继续 admission是Plan前必须明确的单一全局规则。
6. final aggregation仍从最终闭合snapshot计算；fail-fast只是减少实际启动的work，不直接写aggregate。

触发链路必须保持单向且没有回调到图配置：

```text
trusted Check settlement
  -> evaluate one invocation fail-fast policy
  -> stop later admission
  -> drain already admitted Tasks
  -> close pending Check facts
  -> calculate the existing final aggregate
```

### Resulting Impacts

- RunControls validation、Task scheduler cutoff、Check finalization、diagnostics、progress、aggregation和machine publication都会受影响。
- cancellation Decision需要明确区分caller abort与outcome-triggered cutoff；priority与无状态 hard-guard Decision需要固定trigger观察与admission commit之间的竞态顺序。
- Tests需要覆盖并发settlement、同tick admission、已启动drain、pending facts、dependency descendants、observers、outputs和disabled默认兼容性。
- README/API只能在trigger和pending outcome闭合后公开，不能用“立即停止”暗示抢占running work。

## Risks / Trade-offs

- fail-fast会减少本次Run的诊断完整性；用户可能只看到第一个触发结果，而失去其它独立失败证据。
- 并发Task可能在trigger被观察前已经admitted，实际节省取决于并行度和Check时长，不能承诺只运行一个失败Check。
- 若pending Check使用`unavailable`闭合，它可能反过来影响aggregation；若使用`not-applicable`，又可能掩盖原本eligible但未运行的事实。
- 为observer、scope或status增加例外会迅速形成workflow DSL，因此本Draft宁可保持一个全局规则。

## Open Questions

- 哪些terminal statuses触发fail-fast：仅`failed`，还是`failed | unavailable`；`not-applicable`是否永不触发？
- pending Checks应结算为`unavailable / fail-fast-not-started`，还是需要其它现有四态表达？
- fail-fast触发后，尚未admit的`observes` Check是否同样停止，还是observer被定义为唯一固定例外？
- policy只属于RunControls，还是Definition也可提供默认；若两者都支持，override和fingerprint如何表达？
- 哪个代表性 complete `--all` Gate workload与延迟预算足以证明收益超过诊断损失和Scheduler复杂度？
