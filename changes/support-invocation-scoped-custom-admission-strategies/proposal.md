# Proposal

本 Draft 评审是否以及如何让 package consumer 定义 invocation-scoped custom admission strategy 的 `prepare → decide → complete` 生命周期；它依赖已验证的 private lifecycle seam，但不在 Draft 阶段改变现有 public callback contract。

## Why

当前 public custom admission policy 只有每轮同步 `proposeAdmission(context)`，终态副作用另由 `scheduler.measurementHooks` 配置。它能安全地把 Scheduler 的纯 `select | wait` boundary 暴露给调用方，却不能让一个 custom strategy 在 graph ready 后异步准备 invocation-local model，或在 terminal measurement sealed 后以同一策略实例提交学习状态。

private learned strategy 已需要这三个阶段，但直接把其内部 provider 公开会泄漏 history/storage、Scheduler implementation 或过宽 context，也会混淆当前 custom callback fault 与 measurement-hook output failure。需要独立评审最小公共契约、兼容路径和失败语义，而不能将它们作为 private owner 解耦的附带改动。

## Outcome

在先行 private lifecycle seam 已验收后，项目拥有一份可执行的 public-contract Plan 或明确的不采用结论：

- 若采用，custom author 可以为一次 Run 定义 `prepare once → decide 0..N → complete once`，而 Scheduler 仍只消费同步、受 hard guards 验证的 `decide`。
- public prepare/decide/complete contexts、terminal measurement visibility、错误与 output status、cancellation/policy-fault delivery、fingerprint/compatibility均有最小且可验证的定义。
- 若不采用，继续保留 `proposeAdmission` 加独立 `measurementHooks`，并说明它为何足以覆盖真实 consumer。

## Change Boundary

本 Draft 的唯一 contract owner 是 public custom admission authoring（`src/project-definition/scheduler-policy.ts`、public export 与相邻 consumer documentation）；invocation 只是在候选被采用后运行该 contract，Scheduler 继续唯一拥有 hard guards 和真实执行状态机。

- **进入 Plan 的全部前置**：先有已验收并进入实施基线的 `separate-duration-learning-from-admission-strategy` private seam；再有至少一个真实 consumer 证明现有 `proposeAdmission` 加独立 `measurementHooks` 不足；并闭合 public shape、prepare/complete context、failure/output/cancellation/overlap matrix、Definition normalization/fingerprint、installed-consumer evidence，以及必要的 Decision 演进。未满足任一项时保持 Draft，且不得创建 tasks 或修改 runtime。
- **依赖 / 非依赖**：1A 是 Plan 与 Implementation 的硬前置。simulation 不是本 Change 的语义或 public-contract 前置：它独占 decision-time facade/context 及其 Definition normalization/fingerprint/compatibility，而本 Draft 独占 outer `prepare`/`complete` authoring shape、其 normalization/fingerprint 与 failure/output。若二者都采用，custom contract 必须复用当前已接受的 decision DTO 或 simulation 已稳定的 DTO，不重定义同一 vocabulary；推荐 simulation → custom 的实施顺序只为减少共享 public-owner 返工，不构成硬依赖。invocation path context 也不是默认前置，除非真实 consumer 明确需要其 owner 提供的已授权 writable/cross-Run capability。
- **公共 / 私有**：当前公开且稳定的是 trusted synchronous `proposeAdmission(context) → select | wait` 与独立 `measurementHooks`。private provider、collector metadata、history/storage、score、clock 和 mutable engine state 都不公开；`prepare`/`complete` 只是待审候选，不是已承诺 API。不会新增 `expectedDurationMs`，也不会更改 `admissionPriority` 仅作策略自身排序后的同分 tie-break 语义。
- **Plan / 验收出口**：Plan 必须能选择“采用最小 contract”或“有证据地不采用”；若采用，验证必须覆盖 public compatibility、terminal/failure matrix、per-Run isolation、installed consumer 与 Scheduler hard-guard preservation。模型细节可以可观察，不能仅因可见而成为兼容承诺。
