# Design

本设计把 custom policy 限为对 private select/wait/reservation 策略的 trusted public adapter；它扩展选择偏好，不扩展 Scheduler 的合法性或 execution 权限。

## Context

当前 private admission policy 每轮读取同一 frozen complete `PlannedTaskGraph`、immutable inspection、relation/mutex eligible candidates 与 per-candidate capacity facts。Task-owned `admissionPriority`、relations、scope 和 canonical order 都在 graph 内；policy 可以因 capacity facts 返回可 drain 的 wait。Scheduler 只在 policy 后验证 result shape、candidate membership、selected Task capacity、reservation `set` target 与 wait-drain，并独占 state transition、imperative execution 和 settlement。

public custom authoring 必须映射到这个 contract，而不能把 caller callback 限制为 Task-ID-only selection，也不能把 private engine types 直接作为 package API。已确定的长期边界只包括 select/wait/reservation、full-graph handoff、graph-owned priority 和 Scheduler guards；custom fault、console、diagnostic 与 timing protocol 尚未决定。

## Goals / Non-Goals

**Goals**

- 让项目以 trusted synchronous callback 选择或等待，并能按自身策略更新 reservation。
- 让 callback 获得足够的 immutable full-graph、candidate 和 capacity facts，以使用后继或全貌而不重建 topology。
- 保持 Scheduler 对 hard legality、capacity guard、progress drain 和 imperative execution 的唯一责任。

**Non-Goals**

- 不公开 private `SchedulerDecision`、inspection、planned Task、execution state 或 imperative capability。
- 不让 callback 重定义 dependency/observation readiness、mutex、capacity、cancellation、blocked settlement、scope lifecycle 或 terminal aggregation。
- 不增加 async/lifecycle hook、plugin discovery、composition DSL、dynamic Task、priority side map/list、public history owner 或第二状态机。
- 不预先承诺 custom fault fallback、console capture、diagnostic event、timing field或 output behavior。

## Decisions

### Intended Change

#### 1. Public value adapts the closed private decision

`defineAdmissionPolicy(...)` and equivalent inline authoring create a closed custom variant in `ProjectDefinition.scheduler.admissionPolicy`. Its trusted synchronous callback receives a documented deep-frozen public view and returns a documented closed public projection of `select | wait`, each with reservation update. The adapter maps that projection to the private `AdmissionPolicyDecision`; no public value is a `SchedulerDecision` or imperative command.

The final public field names, identity projection and invalid-result handling are deferred to the Change’s Readiness Decision work. They must preserve the confirmed result capability; a later implementation may not replace it with Task-ID-only selection or prohibit wait/reservation update without a new explicit decision.

#### 2. The view has one static handoff and bounded dynamic facts

The public graph view is a deep-frozen projection of the full normalized Task graph. Task metadata remains the sole source of priority and topology. The dynamic view contains the Scheduler-formed relation/mutex eligible candidates and their current capacity facts, plus only the immutable invocation-local inspection facts needed to interpret them. It excludes functions, options, data, Records, messages, logger, clock, signal and mutable collections.

Candidates are not capacity-filtered: a custom policy may choose a legal `wait` while running work drains. It must not use a capacity-inadmissible candidate as `select`.

#### 3. Scheduler guards effects without repeating policy

After adapting the callback result, Scheduler verifies closed shape. It admits only a selected current candidate that is currently capacity-admissible; it accepts reservation `set` only for a current candidate; and it accepts wait only while running work can drain. It does not require a reservation to stay sticky, preserve a default order, or implement fairness/anti-starvation: custom policy owns clear/replace/reservation preference, while default static policy retains its own existing trace.

#### 4. Deferred contracts remain explicitly deferred

Fault handling, diagnostics, console attribution and timing may affect public output and trusted-host behavior. This Change does not choose them by analogy to Check callbacks. Before implementation tasks that depend on them run, their owner must add a decision and corresponding Configuration/API/testing contract; until then no example or success criterion asserts a fallback, console routing or telemetry shape.

### Resulting Impacts

- Definition must preserve trusted callback identity for invocation while declarative fingerprinting retains only the explicitly decided declarative identity projection.
- A public adapter must project/freeze data without leaking private types or mutable state; pure private policy tests and adapter/imperative tests remain separately owned.
- learned-critical-path remains a separate closed Product-owned variant. Both downstream Changes share full-graph/priority facts and private result capability, not a public composition protocol.

## Risks / Trade-offs

- A trusted synchronous callback can block or mutate its caller runtime; freezing input and guarding results protect Product state but do not sandbox host code.
- Exposing a full graph freezes an intentionally bounded public projection. New fields require a demonstrated consumer rather than mirroring every private field.
- Deferring fault/console/diagnostic details avoids false public commitments but blocks related implementation until their owners decide the behavior.

## Open Questions

- Before implementation, which public discriminated result shape and declarative identity fields provide the smallest stable custom authoring contract?
- Before fault/console/diagnostic/timing implementation, what are their owned result, output and testing boundaries?
