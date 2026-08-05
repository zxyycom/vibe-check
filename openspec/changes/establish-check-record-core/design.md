> **核心句：**本 design 以 CheckManager 与 RecordManager 两个独立事实源重建质量核心，并让执行协调、决策和输出只通过冻结输入与最终快照连接它们。

## Context

See [proposal.md](proposal.md) for motivation. Current runtime 以 file/function/duplicate capability results 为主干，再由 Quality Core 生成 warnings、overall completeness 和 fixed gate channels。该结构既把 runner execution 与质量结论混在一起，也要求每种新检查继续修改 Core。与此同时，后续 TypeScript project definition 需要在 execution 前贡献 checks，后续 task orchestration 需要统一安排这些 checks 内部的 domain work；foundation 必须为两者提供接缝，但不能预先拥有 module loading 或 scheduler 协议。

本 change 仍受以下当前边界约束：`src/product/**` 是唯一 runtime owner；built-in scanner dependency 保持 tool-neutral/private；named comparison reference 必须由 caller 显式提供；敏感原始材料不能进入 public artifacts；产品尚未发布，因此选择单次 hard cut 而非兼容层。

## Goals / Non-Goals

**Goals:**

- 让 AI 与实现者能从一个稳定词表唯一恢复 definition、execution、quality result 和 record data 的 owner 及合法组合。
- 允许完整 CheckDefinition set 在 resolution 阶段由多个来源组合，并在任何 work 前冻结和验证。
- 让已有 valid records 在后续 execution failure 时继续作为可见证据，同时保持 coverage 诚实。
- 让顺序执行与后续静态 task orchestration 共用一个 batch coordinator boundary。
- 让 machine、human、annotation 和 gate 消费同一 final snapshot，不保留第二套 warning/completeness 事实源。

**Non-Goals:**

- 加载、发现或信任 TypeScript project definition、第三方 module、命令或 remote provider。
- 定义 TaskPlan、check/task dependency、concurrency、mutex、resource、cancellation、drain、retry 或执行中动态注册。
- 实现 Markdown、JSON、schema、path、secret 或 network checks，或替它们固定 record fields 和算法。
- 定义后续 public TS policy/check authoring API；本 change 只固定其 normalized target contract。
- 提供 machine v1、legacy warning/channel、old capability result 或 alias compatibility。

## Data flow and owners

```text
built-in/upstream resolution
       |                 |
       v                 v
public CheckDefinitions  private CheckExecutionBindings
       |                 |
       +--------+--------+
                v
 selection + applicability + domain-work handles
                |
                v
 opaque CheckExecutionContribution[] (one frozen batch)
                |
                v
        execution coordinator
          |              |
 terminal reports   ack/record ports
          |              |
          v              v
     CheckManager    RecordManager
                  |               |
                  +-------+-------+
                          v
          immutable checks + records snapshot
                          |
                          v
       selected DecisionPolicy -> GateResult
                          |
                          v
             run.json / records.ndjson / report
```

| Term | Single owner | Exact responsibility |
| --- | --- | --- |
| `CheckDefinition` | Resolved public catalog | Serializable stable `checkId` and public result/record contract; contains no executable binding or run state. |
| `CheckExecutionBinding` | Private execution registry | Produces one opaque contribution for an applicable resolved invocation; direct CheckRunner is one adapter. |
| `CheckExecutionContribution` | Execution coordinator boundary | Foundation-owned correlation envelope with opaque execution payload; Core does not inspect runner or Task semantics. |
| `ExecutionReport` | Binding/coordinator returns; CheckManager consumes | Exhaustive terminal `returned | unavailable | execution-failed` outcome for one applicable checkRunId; does not own coverage or records. |
| acknowledgement port | CheckManager | Incrementally and idempotently marks frozen domain-work handles finished after complete success. |
| `CheckRunner` | Current direct binding adapter | Consumes immutable context/ports, emits 0..n record candidates, acknowledges completed domain work and returns one CheckResult candidate. |
| `CheckRun` | CheckManager | Canonical execution status, domain-work coverage, diagnostic, committed record count and nullable final result for one invocation/check. |
| `CheckResult` | Applicability resolution or execution binding; Core validates | Final domain verdict and safe summary; only pre-execution applicability yields `not-applicable`, while applicable execution yields `passed | failed`. |
| `QualityRecord` | Producing execution; RecordManager validates/commits | One immutable final domain data row with sink-bound owner provenance; it is not a check result or execution diagnostic. |
| `DecisionPolicy` | Resolver authors; Core validates/evaluates | Closed declarative query over immutable Check/Record snapshots; it is a consumer, not a third managed state object. |
| `GateResult` | Policy evaluator | Disabled or evaluated pass/fail plus selected policy identity and canonical evidence references. |

## Decisions

### Decision 1: Check and Record use independent managers

CheckManager exclusively creates run IDs, owns run lifecycle and finalizes CheckRun/CheckResult relationships. RecordManager exclusively validates the common record envelope/catalog, commits records and establishes final identity/order. Runner sees neither manager; its bound context exposes only stable ports and a sink already associated with the current check/run.

**Why:** A check can fail with zero records, pass with warning records, or fail execution after committing records. One aggregate result cannot represent these legal states without implicit inference.

**Rejected:** Treating each record as a check result loses execution/zero-record semantics. Treating records as children owned transactionally by a run would revoke useful evidence after later failure.

### Decision 2: Public definition metadata and private execution bindings freeze separately

Foundation validates serializable `CheckDefinition[]` and a separate one-to-one private binding table supplied by resolution. Built-in registration is one source; a later trusted project-definition loader can be another. Core canonicalizes definitions by check ID、computes a fingerprint from public metadata only and freezes both tables before execution. `CheckExecutionBinding` turns an applicable resolved invocation into binding-owned opaque payload；CheckManager wraps it in a `CheckExecutionContribution` correlation envelope with Core-issued checkId/checkRunId. The coordinator consumes the whole batch and returns `ExecutionReport[]`. Current direct `CheckRunner` is an adapter, not the universal definition shape.

**Why:** This allows dynamic composition and future TaskPlan contributions without serializing executable state, forcing every provider into one function shape, or teaching foundation about Task semantics.

**Rejected:** A compile-time-only capability registry blocks the product direction. Putting runner on CheckDefinition leaks private execution into machine catalog. Requiring every invocation to carry a direct runner leaves no legitimate scheduler extension seam. Execution-time registration prevents complete validation and stable ordering.

### Decision 3: CheckRun status and CheckResult verdict form a strict product sum

Final run states are:

| CheckRun status | Result | Meaning |
| --- | --- | --- |
| `skipped` | null | Definition existed but the resolved plan did not request it; no runner work occurred. |
| `completed` | exactly one result | Pre-execution applicability was not-applicable, or applicable execution returned a valid passed/failed result. |
| `failed` | null | Execution, dependency, result validation or record protocol did not end normally. |

Selection and applicability freeze before contribution building. Skipped definitions do not resolve applicability. Requested/not-applicable definitions never enter the coordinator and Core closes them as completed/not-applicable. Requested/applicable definitions always contribute execution, including applicable checks with zero domain-work handles. Core never derives applicability or result verdict from work/record counts. Failed execution uses a closed diagnostic and cannot be disguised as domain failed.

**Why:** Callers and policies need to distinguish “the check judged the project bad” from “the check could not judge it.”

**Rejected:** A single passed/failed state makes infrastructure errors look like quality outcomes. Keeping `no-input` as an execution status conflates applicability with execution completion.

### Decision 4: Manager-owned acknowledgements and terminal reports finalize execution

Each applicable `ResolvedCheckInvocation` owns invocation-private opaque domain-work handles. CheckManager exposes an incremental acknowledgement port: a first valid ack atomically finishes an owned handle, a duplicate is idempotent, and an unknown/foreign/late ack is a protocol violation. Bindings acknowledge only after complete domain-work success. This state remains manager-owned even when runner later throws.

The coordinator receives the full frozen contribution batch before any execution and returns exactly one terminal report per applicable checkRunId. Direct adapter maps normal return、throw/rejection and dependency unavailable to the exhaustive report union. Reports do not carry self-declared coverage or record counts; Core derives them from frozen handles、ack state and RecordManager sink state. Missing/duplicate/unknown reports invalidate the Product snapshot.

A later scheduler may statically associate Tasks with zero or more handles and call the same ack port only after fulfilled Task success. Task count、identity、partial settlement and completion work remain private and do not change public coverage.

**Why:** Coverage is a product statement about intended checking, whereas tasks are implementation units that may split, merge or add finalization work.

**Rejected:** One Task equals one coverage unit would make harmless scheduler refactors change public evidence. Waiting until runner return to report all progress loses completed work on throw. A runner/report-provided public count could contradict the frozen plan.

### Decision 5: Record submission is final domain semantics plus Core-bound provenance

Runner chooses record type, level, subject, message, typed fields, related paths and comparison relations. The bound sink adds manager-owned checkId/checkRunId provenance, validates against that CheckDefinition's record catalog and computes stable record ID. CheckRun IDs are immutable and invocation-unique; final set validation requires each record pair to reference exactly one owning run.

First valid ID/body commits immediately. A byte-equivalent same-ID replay is idempotent. Same ID with different canonical public body is an arrival-neutral identity-integrity conflict: neither first body wins, and no trustworthy final artifact may be published. Other ordinary invalid submissions or later execution failure mark the run failed without rolling back unrelated valid records. Final ordering uses semantic catalog/identity order, never arrival order.

**Why:** Downstream code receives one genuinely standard row while ownership and identity cannot be forged by a runner.

**Rejected:** Letting runner set run provenance permits cross-check corruption. First-arrival-wins duplicate handling makes concurrency change public bytes. Letting Core interpret domain data recreates feature branches. Atomic batches erase valid partial evidence.

### Decision 6: Policy is a closed consumer, not another execution extension point

Core evaluates one normalized catalog of named DecisionPolicy values. Acceptance annotations, named record views and exactly one `blockWhen` execute in fixed phases over immutable snapshots. Predicates and reducers are closed and typed; arbitrary function/script/property access is rejected before work. Run operands include status/coverage/diagnostic and nullable result verdict; record operands include only catalog-approved semantic fields.

The existing semantic config is adapted to one built-in `regressions` entry required by repository dogfood. Public TS authoring later compiles to this model; it does not cause Core to evaluate project functions as policy.

**Why:** Check implementation benefits from executable TypeScript, but gates require deterministic validation and review before running potentially expensive checks.

**Rejected:** Fixed channels cannot combine new checks and independent coverage conditions. Arbitrary policy functions create a second unrestricted runtime and prevent preflight validation.

### Decision 7: Comparison stays with the producing check and explicit reference

Caller resolves every policy-required named reference once before work. Producing checks own matching and relation meaning regardless of execution binding；RecordManager validates emitted catalog relations, and policy only queries them. `baseline`, `changed` and `regression` are ordinary IDs, not Core semantics.

**Why:** Metric delta, missing link and secret occurrence require different matching/domain interpretations.

**Rejected:** A global baseline/comparison reducer forces unrelated checks into one algorithm and makes partial evidence globally not-evaluated.

### Decision 8: Machine v2 publishes final snapshots and decision evidence

`run.json` embeds only the public CheckDefinition catalog/fingerprint, every final CheckRun/CheckResult, a lossless derived invocation coverage summary, named reference metadata, acceptance/view memberships and one GateResult. It never serializes bindings、contributions or ExecutionReports. `records.ndjson` contains canonical QualityRecords with exact checkId/checkRunId ownership. `report.md`, console and annotations project the same validated model. Run output omits resolved policy body and references records rather than copying them.

Producer validates definition/run cardinality、run ID uniqueness、run/result sum、coverage、record identity conflicts、exact record ownership and decision references before trusted publication. Consumer validators prove the same schema/catalog/set integrity but do not rerun checks or policy. Machine v1 and warning streams are deleted in the same migration.

**Why:** Consumers need records, execution context and auditable decision evidence, not a second evaluator or dual protocol.

**Rejected:** Embedding executable/config policy source freezes authoring details. Publishing only a bare pass/fail loses traceability.

### Decision 9: Existing metrics migrate as three built-in checks in one hard cut

`file-metrics`, `function-metrics` and `duplicate-detection` remain stable check IDs. Their five existing semantic check identities become recordType IDs under the owning CheckDefinition. Current semantic config is adapted to their runner settings and normalized acceptance/policy inputs; scanner dependencies remain private. All producer, schema, output, CLI, annotation and fixture consumers move together, with no legacy alias or dual writer.

**Why:** The product is unreleased, and compatibility paths would double validation and obscure the new owners.

## Risks / Trade-offs

- **In-process runners can throw or misuse stable ports.** → Bound sinks prevent cross-run provenance; Core catches runner failures. Authorization/isolation for future project modules belongs to that loader change and is not claimed here.
- **Private execution adapters can fail after partial work.** → Incremental ack and record ports are manager-owned; the exhaustive terminal report only seals outcome and cannot erase progress.
- **Two producers can claim one record identity.** → Equivalent replays are idempotent; conflicting bodies invalidate the final set rather than selecting arrival order.
- **Partial records may be mistaken for complete evidence.** → Every output retains owning CheckRun status/coverage; policy can explicitly require completion.
- **A dynamic catalog may drift between invocations.** → Freeze one canonical catalog and fingerprint per invocation; machine records bind to it.
- **Closed policy could grow into a language.** → Add operations only for demonstrated shared decision needs; keep domain algorithms in checks.
- **Hard cut touches every consumer.** → Migrate model, schemas, output, CLI, annotations and fixtures in dependency order and reject legacy artifacts.

## Migration Plan

1. Introduce public definition/private binding resolution、CheckManager/RecordManager、opaque contributions、direct-runner adapter and exhaustive ExecutionReports.
2. Introduce normalized policy evaluation and the current-config `regressions` adapter.
3. Hard cut machine schemas, DTOs, publication, report, console, CLI and annotation consumer to Check/Record v2.
4. Replace old overall completeness with the derived terminal-run/coverage summary; delete capability result、warning/channel and machine-v1 paths; regenerate canonical examples and close acceptance evidence.
5. Rebase `establish-check-task-orchestration` and TypeScript project-definition changes on the frozen coordinator/catalog boundaries; re-audit other feature changes before their own implementation.

Rollback is a full change revert. No runtime switch, dual schema or compatibility alias is retained.

## Open Questions

无未回答开放问题，可以进入实现前阻塞审计。
