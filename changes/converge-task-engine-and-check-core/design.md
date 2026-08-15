# Design

本 Design 是 `converge-task-engine-and-check-core` 的目标架构 owner。它区分已确认目标、当前实现证据和实现者可自行选择的局部结构，避免把历史类型或 private choice 误当成目标契约。

## Context

- `proposal.md` 定义问题、目标结果和范围；本文件定义目标语义和责任边界；`tasks.md` 定义执行顺序与验证闭合。
- G1–G3 已由用户确认并建立为 `active + unaligned` decisions：方向已经生效为未来演进依据，但源码尚未实现。
- Readiness、现状盘点和 characterization 可以继续；修改 runtime/Core/public output contract 的 Implementation tasks 必须等待 tasks 0.6–0.7 完成，不能跳过现有行为证据和 migration inventory。
- 实施期间若代码、测试或文档与本 Design 冲突，先判断它是 current-state evidence 还是新的产品约束；不得用 compatibility adapter 保留未经确认的旧架构。

### Terminology

| Term | Meaning and owner |
| --- | --- |
| Check Definition | Project Definition 中一个 leaf Check 的稳定声明式身份、显示信息与 Record 类型目录；Definition owner 负责验证。 |
| Resolved Check | Definition normalization 产生的单一内部 planning input，聚合 Check Definition、继承后的 constraints、applicability 和 private execution binding；它不是额外 public/Core entity。 |
| Task | Task engine 调度的私有执行单元；Task identity、拆分与 retry 不进入 policy、machine output 或 npm API。 |
| Check execution scope | 静态 Task graph 中属于一个 Resolved Check 的 ownership boundary。它承载 `checkId`、cap、RecordSink ownership 和 terminal Task 关系，但自身不形成第三种 Core entity。 |
| Core Check | 每个 canonical Resolved Check 的 invocation-scoped 最终事实。它包含 definition projection，以及 `not-applicable`、`completed(passed/failed)` 或 `unavailable(diagnostic)` 中的一个闭合 outcome。 |
| QualityRecord | 由 Check-scoped RecordSink 验证并提交的最终领域记录。Record 保持独立稳定 identity，并以 `checkId`、`recordTypeId` 表达归属；不再依赖 run instance identity。 |

## Goals / Non-Goals

### Goals

- 用一个静态 Task engine 承接全部 Product execution。
- 用 Check execution scope 连接 private Task settlement 与 Core Check/QualityRecord facts。
- 用一个 canonical Resolved Check collection 消除按 ID 重组的平行事实源。
- 保持 npm authoring/result API，同时阻止 Task、capability 和 scheduler internals 泄漏。

### Non-Goals

- 不公开 Task engine internals，不支持动态 Task graph，也不建立第二 scheduler。
- 不让普通 child Task 自动成为 Core Check、policy operand 或 machine entity。
- 不在本 Change 中调整 descriptor carrier 或实施下游 package candidate。

## Decisions

### Data flow

```text
Project Definition Check tree
  -> validation + canonical Resolved Checks
  -> one static planned Task graph
  -> Task engine
       -> Check execution scope
            -> in-scope Tasks submit QualityRecord candidates
            -> trusted root/completion adapter settles one Core Check
  -> frozen Core snapshot { checks, records }
  -> policy -> publication/effects -> Run result
```

Definition normalization and Task planning happen before executable work. Task engine owns admission and execution settlement but does not interpret quality verdicts or Record payloads. Core owns product facts and validation but does not admit, schedule or execute Tasks.

### Task graph and Check scope

Every applicable Resolved Check maps into the same static graph:

- A direct Check uses one executable `kind: "check"` root Task. That Task is both the first admitted Task and the terminal Task for the scope.
- A TaskPlan Check uses one `kind: "check"` graph scope containing its planned child Tasks and one trusted completion Task. The first executable child activates the scope; completion is the terminal Task. The scope is an ownership structure in the same graph, not a second scheduler or public row.
- A not-applicable Resolved Check contributes no executable Task but still produces one `not-applicable` Core Check。不存在于 canonical collection 的 leaf 没有 Task，也没有 `unselected` Core fact。

The graph structurally carries validated scope/cap/ownership metadata. The engine must not receive a second map keyed by task/check ID to reconstruct those relationships. It owns task identity, graph validity, named mutexes, root budget, active Check cap span, deterministic reservation/drain and cooperative cancellation. A normal quality failure is a successfully settled `completed(failed)` outcome；execution、protocol 或 Record failure 形成 `unavailable(diagnostic)`。

### Minimal Core capability contract

Core must provide the following semantics; they do not require four public classes or methods:

1. Establish exactly one Check scope for a Resolved Check and bind its stable `checkId` and allowed Record types.
2. Give in-scope Tasks a `RecordSink` that accepts domain Record candidates without allowing callers to forge `checkId` ownership.
3. Give only the trusted direct wrapper or TaskPlan completion adapter a single-use settle capability that closes the Check and its RecordSink before availability is returned.
4. Freeze and expose a snapshot whose entity collections are exactly `checks` and `records`.

Project-authored functions may receive the scoped RecordSink through their Check execution context, but never receive a repeatable Core Check settle port. Records accepted before an ordinary later failure remain committed. Scope-external, duplicate-settle and late calls fail closed and cannot revise frozen facts or prerequisite availability.

### Canonical normalization

Definition normalization produces one deterministically ordered `ResolvedCheck[]` or an equivalent single collection. Each entry owns:

- its validated Check Definition;
- inherited and leaf-local dependency, mutex and `maxParallel` constraints;
- built-in options or custom authoring data where applicable;
- applicability information needed for planning;
- its private execution binding.

Planning consumes this collection once to create the static Task graph. Declarative fingerprint/output projections explicitly select serializable fields; functions, capabilities and Task metadata never serialize. No owner may persist independent definitions, schedules, mutexes, options, bindings or caps merely to rejoin them by ID later.

### Public and package boundary

Definition-owned `CustomCheck` and TaskPlan authoring types give package consumers contextual typing without exporting scheduler-private `TaskDefinition`, TaskRun or worker types. Package work remains downstream. `establish-api-only-npm-product-boundary` must consume the final authoring/result contract only after this Change closes and must then perform its own semantic review and re-plan.

The existing `catalogFingerprint` remains a fingerprint of the declarative Check catalog. This Change does not silently add full policy definitions to that fingerprint. If a future consumer needs a whole-Project-Definition fingerprint, that is a separate contract owned outside this migration.

### Accepted Contract Decisions

The following choices are adopted. Their decision records are active and unaligned until implementation and verification complete。

| ID | Adopted direction | Reason |
| --- | --- | --- |
| G1 Core Check population and outcome | `checks` contains exactly one Core Check per canonical Resolved Check。Check tree leaf presence already means selected, so absent leaves produce no `unselected` row。Closed outcomes are `not-applicable`、`completed(passed/failed)` and `unavailable(diagnostic)`。 | This unifies definition and invocation fact without definitions/runs dual projection. |
| G2 Execution accounting | Remove `workHandles`、acknowledgement ports and planned/acknowledged coverage from Core/public output。Task settlement is the only execution accounting；domain evidence is QualityRecord，transient progress comes from Task events。 | A second acknowledgement protocol would duplicate the static Task graph lifecycle. |
| G3 Machine schema migration | Hard cut to one active run/record v3 contract。Remove v2 runtime writer/reader and all compatibility paths；do not rewrite the historical v2 URN/bytes。 | A version bump truthfully identifies the breaking shape without creating backward compatibility. |

The authoritative future-direction records are:

- `product-contract/use-core-check-and-quality-record-facts` owns G1 and replaces the parallel Core/CheckRun identity model。
- `product-contract/execute-check-scopes-through-one-task-graph` owns G2、static execution and settlement-before-availability。
- `configuration/carry-check-parallel-limit-in-task-scope` preserves cap behavior while moving metadata into the planned graph scope。
- `product-contract/hard-cut-prestable-machine-contracts` owns G3 and the pre-stable no-compatibility rule。

### Implementation-Local Choices

No additional product decision is required for private type names, module splits, whether scope metadata uses a discriminated union or private object, or the exact function names used to create/close capabilities. These choices are acceptable only when they preserve the confirmed data flow, do not create a second truth source, and remain absent from package/public output.

## Risks / Trade-offs

- Central lifecycle replacement can regress cancellation, blocked dependency, zero-task, partial-record and cap-drain behavior. Characterization Cases must exist before deleting current owners.
- A leaked settle capability would break one-Check-one-settlement. Types and runtime closure checks must both enforce ownership.
- A canonical collection still needs explicit declarative projection. Blind serialization could leak functions or omit policy-relevant Check fields.
- The hard cut is intentionally integration-sized; completing only half of it would leave dual Core or scheduler truth sources. Transitional adapters may exist only within one bounded implementation step and must be removed before that task is marked complete.

## Open Questions

当前没有未决产品契约。正式稳定版本开始后的 compatibility policy 不由本 Change 推断；届时必须由产品 owner 另行决定。
