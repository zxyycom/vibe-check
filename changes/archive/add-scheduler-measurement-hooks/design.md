# Design

本设计把 Scheduler 的一阶测量事实与 Hook 的二级投影分开，并沿用现有 output-failure 对 side effect failure 的事实保留语义。

## Context

`src/project-run/task-scheduler/**` 已拥有 Scheduler 状态、clock sample、压力积分和终态 summary；`docs/architecture.md` 明确该 summary 不属于 machine、Check facts 或 public RunResult。`SchedulerPolicy` 是 Project Definition 的 runtime callback 边界，admission policy 已证明 runtime callback 不进入 declarative fingerprint。现有 `output` RunResult 能在 side effect failure 时保留 settled facts。

## Goals / Non-Goals

**Goals**

- 给 Definition 提供有序 sync/async measurement Hook 列表与完整闭合 validation。
- 只在 admission 停止且 started work 已 drain 后创建一次 immutable terminal context；所有 caller Hook 共享同一 object identity，并全部 await settlement。
- Scheduler 保留采样、分类、积分和生命周期一阶事实；内置 Hook 保留既有 summary projection/writer。
- Hook failure 始终由 output status可见；只在正常完成时升级为 `output` 结果，且不改变 Scheduler settlement 或 Check facts。

**Non-Goals**

- 不增加 learned scheduling、历史存储、跨 invocation state、registry、hook ID/version 或 fingerprint identity。
- 不暴露 Task value、error、callback、Scheduler mutable state，或把测量放进 machine/progress/Check facts。
- 不做 streaming event bus 或完整 interval ledger。

## Decisions

### Intended Change

1. `scheduler.measurementHooks` 是 runtime-only readonly function list；`defineConfig` 默认空数组，validation 只接受 exact functions，并在 normalization 创建冻结列表。declarative snapshot 排除 hooks，和 custom admission callback 一样不承诺 source、identity 或 closure。
2. Scheduler 创建 bounded raw terminal measurement：安全 timing availability、shell/slot/capacity/accepted-wait 一阶 accumulations、每个 admission-viable Task 的分类 delay/admission/settlement primary table、peaks 和离散 lifecycle sequence；top-N、tail contributor、ratio、queue aggregate等二级 summary一律由内置 Hook 投影。它不暴露 clock、mutable maps、Task execution values/errors或完整 boundary history。canonical graph 和 execution observation 从 Scheduler 已有 graph/settlement truth snapshot 成 detached deep-frozen ordinary data。
3. Scheduler 在 terminal completion、caller cancellation 或 policy-fault drain 后，先从 raw measurement 形成内置 summary projection，再按数组顺序调用 caller Hooks；sync/async 均逐个 await，单一 caller failure 记录后继续。Hook duration 不进入 raw measurement。
4. 任一 configured **caller** Hook failure 标记 invocation-owned `measurementHooks` output 为 failed；只有没有 cancellation 或 primary execution diagnostic 的正常 completion 才形成既有 `kind: "output"` 和完整 facts。cancellation、admission-policy fault或其它 primary execution failure保留原 kind/diagnostic，由该 status 表示 Hook failure；summary writer仍保持对 logger failure 的 containment。没有 caller Hook 时该 output disabled；只有 diagnostic logging enabled 才为内置 summary 创建 collector。

### Resulting Impacts

- `RunOutputStatuses` 增加 enabled/status-only `measurementHooks` side-effect status与 `scheduler-measurement-hooks-failed` diagnostic code；Run controls 不覆盖 Definition 的 hooks。
- Configuration、architecture 和 API mechanics 要明确 runtime-only fingerprint、context safety、terminal timing与 failure ordering。
- 既有 Scheduler diagnostic Case 需要涵盖 caller Hook context、async settlement、failure isolation及 summary compatibility；Definition Case 需证明 validation/default/fingerprint。

## Risks / Trade-offs

- 把 hook failure映射为 output failure会让一个可选 side effect改变最终 Run kind；这是现有 output contract 的唯一能保留所有 settled facts 且调用方可见的错误通道。
- 原始事实保持有界会限制未来二级分析；需要完整 timeline 的能力必须另建经过审阅的 Change，而非偷偷扩展 context。

## Open Questions

无。
