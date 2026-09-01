# Proposal

本 Change 在已受约束的 private admission-selection policy 边界上开放最小 trusted custom policy authoring contract；它能表达同一 select/wait/reservation strategy，但不能取得 Scheduler 的硬合法性或 execution 控制。

## Why

项目可能拥有 Product 无法统一解释的调度偏好，例如已知后续、外部成本或项目自有的 immutable 预测模型。把这些偏好伪装成 Definition 顺序或 dependency 会污染静态图语义；但直接把 Scheduler 状态机公开给 caller 又会破坏 dependency、mutex、capacity、cancellation 与 settlement 的唯一 owner。

已确认的 private boundary 以完整 immutable Task graph（Task 内置 `admissionPriority`）交接 topology，以 relation/mutex eligible candidates 和 capacity facts 交接本轮动态事实。public custom contract 必须适配这个 select/wait/reservation boundary；它不能退化成只选 ID、不能另设 priority 或 topology side channel。

## Outcome

项目可经 package-root authoring helper 或等价 inline Definition value 声明 custom admission policy。Product 将其 trusted synchronous callback 适配为 private closed `select | wait` decision；两种结果均携带 reservation update。callback 可利用 Product 投影的 immutable full-graph 和动态 view 选择或等待，但不能启动、取消、命令式等待或结算 Task，不能重定义 readiness/mutex/capacity，也不能将图外 priority 输入带入 Scheduler。

Scheduler 继续在 adapter 之后守闭合 shape、candidate membership、selected Task 的当前 capacity、reservation `set` target 与可 drain wait。reservation 的保留、clear、替换以及公平/防饥饿语义属于 custom policy；Scheduler 不把 default static policy 的 sticky behavior 作为公开策略的额外硬规则。

## Scope

### Intended Change

- 从 package root 提供最小 custom policy authoring value、helper 和 supporting types，并把 `ProjectDefinition.scheduler.admissionPolicy` 扩展为 closed static/custom union。custom identity 的 declarative projection 与 callback identity 的边界由该 Change 的 Decision/Configuration owner 在实施前闭合。
- 在 static graph 和 prepared Check collection 闭合后，投影 deep-frozen public view：完整 normalized graph（含 Task-owned priority、relations、scope 和 canonical order）、relation/mutex eligible candidates、每项 capacity fact、以及调用 custom strategy 必需的 invocation-local inspection facts。它不暴露 Check options/functions、final data、Records、messages、logger、clock、signal 或 mutable Scheduler state。
- 将 public callback 的 closed select/wait/reservation result 适配到 private `AdmissionPolicyDecision`。`select` 与 reservation `set` 都只能指向本轮 candidate；Scheduler 仅在 select 后验证当前 capacity，wait 必须有 running work 可 drain。adapter 不能形成 public `SchedulerDecision`、imperative callback、dynamic Task API 或第二状态机。
- 维持 caller-runtime trusted-function 边界：callback 不被 Product sandbox、timeout 或隔离。具体 fault containment、console capture、diagnostic fields 和 timing presentation 尚未由本 Change 决定；实施前必须由相应 owner 形成明确 contract，不能把临时实现细节写成 public promise。

### Resulting Impacts

- `extract-scheduler-admission-selection-policy`必须已归档，并提供完整 graph / graph-owned priority、select/wait/reservation 与 Scheduler guard 的 private contract；本 Change 只适配它，不复制或公开 private engine types。
- Project Definition validation、normalization、fingerprint、public declarations、Configuration、API mechanics、Architecture、examples 和 installed consumer 需要共同证明 public authoring 与 private execution boundary 一致。
- Scheduler tests 需要证明 custom select/wait/reservation 都不能越过 relation/mutex candidate、selected-capacity、wait-drain 或 execution guards；default static trace 仍由 private policy owner 证明。
- custom 与 learned-critical-path 都是 closed policy variants，可共享 private policy boundary 和完整 graph 事实，但本 Change 不建立 composition chain、registry 或公开 learned history contract。

## Success Criteria

- public custom policy 可表达 private closed select/wait/reservation strategy；Task graph 是唯一静态 topology/priority 交接单元，未建立 priority map/list 或局部 topology side channel。
- custom policy 只读取 documented immutable view。它不能直接启动、等待、取消或结算 Task，也不能决定 readiness、mutex、capacity、blocked settlement 或 lifecycle cutoff。
- Scheduler 在 adapter 后拒绝 malformed result、非 candidate selection、当前 capacity 不可 admission 的 selection、非 candidate reservation `set` 与无 running work 的 wait；policy-owned reservation/fairness语义不被 Scheduler 重演。
- public package exports 不泄漏 `SchedulerDecision`、`SchedulerInspection`、`PlannedTask`、execution state、imperative callback 或 logger/clock handoff；Project Definition 与 package consumer 可使用该 closed authoring contract。
- 具体 custom fault、console capture、diagnostic 和 timing contract 仅在相应 owner 决定后纳入实现和验收；本 Change 不凭计划文本虚构其 outcome、fallback 或 output 行为。
- 实现不增加 async selector、plugin discovery、policy composition framework、dynamic Task API、lifecycle hook 或 custom Scheduler state owner。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：custom policy authoring、identity、input/output 和默认值。
- [`docs/architecture.md`](../../docs/architecture.md)：public adapter、private Scheduler guard 与 execution responsibility。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：public callback usage and trusted-host boundary。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Definition、Scheduler 与 installed consumer evidence。
- `src/project-definition/**`、`src/index.ts`：closed policy grammar、normalization、fingerprint 与 public export。
- `src/project-run/task-scheduler/**`：private policy adapter、candidate/capacity/wait guard 与 static default。
- `scripts/docs/package-api/**`、package examples：public inventory、declaration 和 consumer materials。
- `docs/decisions/**`：trusted callback、identity、fault/console/diagnostic（如纳入）与 public-policy 长期边界。
