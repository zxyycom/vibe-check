> **核心句：**本 design 将 Task orchestration 实现为 private `CheckExecutionBinding` 与共享 coordinator adapter；foundation 继续独占 public Check/Record 模型、ports、terminal reports 和 finalization。

## Context

`establish-check-record-core` 已经把可序列化 `CheckDefinition` 与 private `CheckExecutionBinding` 分开。Foundation 先冻结 selection 与 applicability；只为 applicable invocation 创建 invocation-private domain-work handles、bound record sink、incremental acknowledgement port 和 opaque `CheckExecutionContribution` envelope。Execution coordinator 必须为每项 applicable contribution 返回且只返回一个 foundation `ExecutionReport.returned | unavailable | execution-failed`；Core 再按 manager-owned progress、record state 与 report precedence finalize `CheckRun`/`CheckResult`。

本 change 只消费这些 extension points。Task orchestration binding 在 applicability 之后、execution 之前用 foundation-approved planning context 构造 invocation-specific TaskPlan；foundation 只看到 opaque payload 与最终 report。Direct CheckRunner 也通过 private adapter 贡献一个 scheduler-managed function，不再被描述为 public Check 形状。

仓库现有 `scripts/tools/parallel-task-runner` 是开发脚本使用的 private gitlink 原型。它证明 async function、dependency、global concurrency 与 mutex 有实际价值，但现有 `product-runtime` 禁止 `src/product/**` runtime import `scripts/**` 或 toolkit gitlink；报告也表明该原型的 failure isolation、preflight cycle、drain 和 order 语义不满足本 contract，且没有可据此复制源码的授权依据。

## Goals / Non-Goals

**Goals:**

- 在 foundation extension seam 中让 direct 与 TaskPlan bindings 共享一个 invocation scheduler。
- 在任何 function execution 前闭合 requested Check dependencies，并构造、验证、冻结全部 applicable TaskPlans。
- 用最小的 Task `needs`、global slot 与 exclusive resource 契约治理跨 Check 并行。
- 通过 foundation ack/sink/report ports 保留 partial progress 与 records，同时不让 Task 进入 public model。
- 对普通 Task failure 隔离影响，对 scheduler-owned fatal admission failure 执行真实 drain 后报告 Product integrity failure。

**Non-Goals:**

- 修改或复制 `CheckDefinition`、`CheckRun`、`CheckResult`、`QualityRecord`、`DecisionPolicy` 或 `ExecutionReport` 语义 owner。
- caller cancellation、public `AbortSignal`、timeout、hard termination 或 bounded drain。
- 运行中新增 Task、result-driven fan-out 或 dependent Task value passing。
- command runner、worker/process/remote isolation、distributed queue、retry、priority、persistent recovery 或 per-Check budget override。
- 控制 Task/runner 内部自行创建的 Promise、thread、worker 或 subprocess 并发。
- 为 network、jscpd、Markdown 或其它 future Check 固定专用 fan-out contract。

## Data flow and ownership

```text
resolved public CheckDefinitions + private execution bindings/schedule declarations
                               |
              initial request + requiresChecks closure
                               |
                     selection/applicability freeze
                               |
             not-applicable closes in foundation (no contribution)
                               |
                     applicable ResolvedCheckInvocations
                               |
        TaskPlan binding planner receives approved context/work handles
                               |
     direct work + TaskPlans -> validate/freeze one ResolvedExecutionPlan
                               |
                     one invocation SharedScheduler
           slots/resources/needs       records -> foundation sink
                   |                   fulfilled Task -> foundation ack port
                   v
       completion binding reads owning opaque value map
                   |
                   v
     foundation ExecutionReport returned | unavailable | execution-failed
                   |
                   v
       CheckManager/RecordManager finalization -> policy/output
```

| Object | Single owner | Orchestration relationship |
| --- | --- | --- |
| `CheckDefinition` | `quality-checks` public catalog | Orchestration never adds runner、Task、dependency or scheduler payload to it. |
| `CheckExecutionBinding` | Foundation private registry contract | This change supplies a TaskPlan implementation and a direct-runner scheduler adapter. |
| `CheckExecutionContribution` | Foundation correlation envelope | Carries binding-owned opaque payload; scheduler reads only its own payload variant. |
| `ResolvedCheckInvocation` / domain-work handles | Foundation | Planner consumes approved immutable context/handles; handles never enter public Task or machine identity. |
| acknowledgement port / record sink | CheckManager / RecordManager | Task adapter acks static handles only after fulfillment; Tasks submit records through the bound sink. |
| `ExecutionReport` | Foundation closed union | Binding maps execution to an existing variant; scheduler does not extend report shape or self-report coverage. |
| `CheckScheduleDeclaration` | This orchestration resolver | Private `requiresChecks` used only to close requested selection and build lifecycle edges. |
| `TaskPlanFactory` / `TaskPlan` | This orchestration binding | Factory builds invocation-specific immutable plan after applicability and before execution. |
| `TaskDefinition` | Owning TaskPlan | Local ID、`needs`、exclusive resources、0..n ack-on-success handles and native async function. |
| `TaskOutcome` / opaque value map | Shared scheduler | Invocation-private execution data; only owning completion reads values. |
| `DecisionPolicy` / machine output | Foundation owners | Consume final Check/Record snapshots only; Task is not an operand or artifact entity. |

## Decisions

### Decision 1: Task remains a private execution unit

Task is addressed internally by `(checkId, taskId)` for planning、scheduling、diagnostic and completion lookup. It is never inserted into public CheckDefinition catalog、QualityRecord identity、policy selector、comparison or machine artifact. The public product model remains Check plus Record.

**Why:** Parallel decomposition can change without creating a policy or machine compatibility migration. One Check can aggregate private intermediate results while still producing exactly one quality result.

**Rejected:** Modeling each Task as a Check would expose implementation structure、duplicate Check lifecycle semantics and make task split/merge a public contract change.

### Decision 2: TaskPlan is an opaque binding contribution built per applicable invocation

Upstream resolution registers a private TaskPlan `CheckExecutionBinding` with a plan factory；it does not add executable fields to `CheckDefinition`. After foundation freezes an invocation as applicable，the binding invokes its planner with immutable approved planning context and opaque domain-work handles. Planner receives no sink、ack port、manager or output writer and returns TaskPlan data plus native function handles. Foundation wraps that binding-owned payload in its correlation envelope without inspecting it.

The orchestration coordinator collects every applicable payload. Direct binding payloads normalize to one direct work item; TaskPlan payloads remain structured. The coordinator validates and freezes the entire batch before any scheduler-managed function starts. Plan construction failure、foreign handles、unknown edges or cycles abort planning before a trustworthy execution report set exists.

Skipped and not-applicable checks never call the plan factory. Applicable checks always contribute，including zero domain handles. An applicable empty TaskPlan skips directly to its completion binding，which must return passed/failed candidate; scheduler never infers applicability or verdict from emptiness.

**Why:** The planner needs invocation-approved inputs/handles that do not exist at module load, while complete pre-execution validation rules out runner-time registration and partial graph launch.

**Rejected:** A module-load-time frozen plan cannot bind current invocation handles. Letting runner call `tasks.run()` registers work after execution begins and prevents whole-batch validation.

### Decision 3: `requiresChecks` closes selection and depends on valid completion, not quality pass

Each private schedule declaration may list `requiresChecks`. The selection planner expands the initial caller/policy request transitively before applicability. It rejects unknown IDs、self edges and cycles，then freezes selection once. This guarantees every prerequisite is requested rather than silently skipped.

For applicable prerequisites，scheduler unlocks the dependent only after the prerequisite returns a candidate accepted by the foundation-owned `CheckResult` validator. Valid `passed` and `failed` verdicts both satisfy the edge; scheduler never interprets quality. Foundation-preclosed not-applicable is also a valid completed result and satisfies the lifecycle edge without a contribution. If a dependent truly requires domain material，its own applicability resolver must express that input condition.

Prerequisite unavailable、execution-failed or invalid returned result prevents the dependent's functions from starting. Its binding emits foundation `execution-failed` with a dependency diagnostic, preserving exactly one terminal report. This is execution evidence，not a synthetic quality verdict.

**Why:** Check dependency is an execution/lifecycle relationship. Treating `verdict = failed` as an admission failure would move gate policy into scheduler and suppress useful downstream evidence.

**Rejected:** Expanding dependencies after applicability can leave skipped prerequisites or require reopening frozen state. Cross-Check Task edges leak private identity and cannot express whole-Check completion.

### Decision 4: One scheduler owns only the functions it calls

`SchedulerPolicy.maxParallel` is resolved once as a positive integer. Direct adapter functions、explicit Tasks and completion functions each consume one slot while unsettled. The scheduler does not inspect or count Promises、threads、workers or subprocesses started inside one admitted function; documentation and diagnostics state this limitation directly.

Task `resources` is a set of invocation-global ASCII lower-kebab exclusive names. All claimed resources are acquired atomically at admission and released at settlement，preventing hold-and-wait. There is no first-version capacity、quantity、reader/writer mode、priority or per-Check limit.

Ready functions are considered by a canonical discriminated key containing Check ID、work kind and Task ID where applicable. A resource-blocked earlier candidate does not prevent later compatible work from filling a slot.

**Why:** One explicit scheduler budget prevents accidental cross-Check oversubscription for declared work without making false claims about arbitrary code internals.

**Rejected:** Per-Check schedulers multiply concurrency. Sequential lock acquisition risks deadlock. Pretending a function slot controls its child processes provides an unenforceable performance guarantee.

### Decision 5: Task values go only to completion; records bypass scheduler

Task `needs` means successful fulfillment and carries no data. A dependent Task never receives predecessor values. Scheduler stores fulfilled return values by local Task ID，invocation-only，and exposes a readonly map exclusively to the owning completion binding after all Tasks fulfill. It never parses、serializes、hashes、caches、cross-Check shares or evaluates those values.

Tasks receive the foundation-bound execution context and record sink，not managers or the ack port. RecordManager remains the only record validation/identity owner. Byte-equivalent replays remain idempotent; same-ID different-body submissions remain an arrival-neutral integrity conflict that prevents trustworthy publication. Scheduler never selects first arrival.

**Why:** Completion can aggregate parallel calculations without inventing a universal Task result protocol，while record concurrency retains one canonical integrity boundary.

**Rejected:** Passing values along Task dependencies turns the scheduler into a dataflow runtime. Using records as a Task result bus exposes private intermediate data and conflates evidence with control flow.

### Decision 6: Task adapter acks incrementally and maps failures to foundation reports

Each Task statically owns zero or more foundation domain-work handles. After its function fulfills，the adapter calls the foundation acknowledgement port for every associated handle. Throw or dependency-block does not ack. Accepted acks remain manager-owned if a later Task or completion fails. Task count、identity、settlement and completion are never converted to public coverage counts.

All Tasks fulfilled causes the completion function to run with the readonly opaque value map. Normal return creates foundation `ExecutionReport.returned(candidate)`; foundation remains the only candidate validator/finalizer. Task throw、Task dependency-block and completion throw/rejection produce `ExecutionReport.execution-failed`. A binding dependency unavailable before admission may use foundation `unavailable`. Invalid candidate remains a returned candidate that foundation finalizes as invalid-result; scheduler does not create a second validation model.

Failure is isolated：the scheduler continues independent Task and Check functions，but downstream Task/Check lifecycle edges become blocked. Every applicable contribution still yields exactly one terminal report. Existing valid records and acks survive. Missing/duplicate/unknown report、ack protocol violation and record identity conflict keep their foundation-owned integrity/finalization precedence.

**Why:** Incremental ports preserve trustworthy partial progress，and exhaustive report mapping lets Core recover one Check terminal state without teaching it Task semantics.

**Rejected:** Rejecting the batch on the first Task throw loses unrelated evidence. Converting execution failure into `CheckResult.failed` hides infrastructure failure as a domain judgment. Carrying counts in reports can contradict foundation managers.

### Decision 7: Only scheduler-owned fatal admission failure stops and drains

First version has no caller cancellation、public `AbortSignal`、timeout or hard termination. Ordinary Task/Check failure follows dependency rules and does not stop unrelated admission.

If the scheduler itself detects a fatal invariant/admission failure after starting functions，it stops admitting new functions and waits every scheduler-started function to actually settle. It then returns Product execution-integrity failure；it does not synthesize cancelled Task states or a partial trusted `ExecutionReport` set. A never-settling same-process function can keep this drain pending，so no bounded-latency guarantee exists.

**Why:** Waiting prevents Product from publishing while scheduler-owned code still mutates state，without introducing an unowned cancellation surface that foundation/CLI cannot represent.

**Rejected:** Returning immediately leaves background work racing record/output publication. `Promise.race` timeout does not terminate the losing function and would create false completion.

### Decision 8: Live events are observational; final identity stays foundation-owned

Scheduler may emit start/settlement events in observed order for live progress. Private outcomes remain keyed by frozen canonical work keys. Event or completion order never enters Task identity、Check identity、record identity、coverage or artifact order; foundation remains the canonical output/integrity owner.

**Why:** Users can see prompt progress without making normal concurrency races change stable evidence.

**Rejected:** Persisting arrival sequence makes identical work produce different machine output. Sorting live events would delay or falsify progress.

### Decision 9: Rebuild the minimal Product boundary instead of importing the scripts gitlink

Implementation lives under `src/product/**` behind the private execution/coordinator boundary. It may cite the existing runner only as provenance for demonstrated requirements. It does not runtime import、vendor、copy or publish the gitlink. The first implementation contains only selection closure、plan validation、bounded scheduler、exclusive resources、ack mapping、report mapping and fatal internal drain.

**Why:** Product already owns its runtime and requires different preflight、failure and integrity semantics. The available report also does not establish reusable source licensing.

**Rejected:** Wrapping the current script API preserves immediate reject、late cycle and no-drain behavior while violating Product dependency direction.

### Decision 10: Public coverage follows foundation domain work, not Task decomposition

`ResolvedCheckInvocation` remains the source of planned domain-work handles. A TaskPlan assigns each handle to exactly one Task as its ack-on-success owner；one Task can own 0..n handles. Fulfillment triggers incremental acks；throw or dependency-block triggers none，even if the Task already emitted valid records. Authors may split Tasks when finer coverage is worth additional scheduling overhead.

Direct runner adapter continues to use foundation progress ports；its single scheduler work identity never means `planned = 1`. Completion and lifecycle events own no handles. Core alone derives planned/finished/unprocessed from frozen handles and manager ack state.

**Why:** Coverage describes the Check's promised domain work，not an internal parallelization shape. Static handle association maps execution to foundation progress without interpreting opaque values.

**Rejected:** Counting Tasks makes split/merge refactors alter public evidence. Returning self-reported counts in Task values or ExecutionReport violates the opaque-value and manager-owned progress boundaries.

## Risks / Trade-offs

- **[Same-process function can hang or mutate globals]** → State the trusted execution boundary in the TS project-definition owner；this change offers no sandbox、cancel or hard deadline.
- **[Deterministic admission cannot make arbitrary side effects deterministic]** → Guarantee only scheduler selection；Check authors declare shared exclusive resources and own external-system semantics.
- **[An admitted function can fan out beyond `maxParallel`]** → Document that the limit counts scheduler-managed functions only；use explicit Tasks for governed work.
- **[Opaque Task values retain memory until completion]** → Keep them invocation-only、owner-only and release references after the binding returns report.
- **[A coarse Task can partially process several domain units before throw]** → Keep its valid records but ack none of its assigned handles；split the plan when finer coverage is needed.
- **[Success-only `needs` cannot express cleanup-after-failure]** → Keep cleanup inside started function `try/finally`；add a distinct lifecycle primitive only after a real consumer demonstrates need.
- **[Global resource names can collide]** → Collision safely serializes work；do not silently namespace by Check because that would defeat cross-Check exclusion.

## Migration Plan

1. Complete all blocking tasks and require `establish-check-record-core` implementation/spec synchronization before Product edits.
2. Add private schedule declarations、selection-closure validation、TaskPlan binding/factory types and full pre-execution plan validator under `src/product/**`.
3. Implement one shared scheduler，direct adapter normalization，Task `needs`、slots、resources、canonical keys and opaque completion values.
4. Integrate foundation record sink、incremental ack port、result validator and exhaustive `ExecutionReport` mapping；prove partial records/progress and identity conflicts retain foundation semantics.
5. Migrate current direct execution through the scheduler adapter without changing public catalog、CheckRun/Result/Record or machine output.
6. Expose only stable binding/schedule authoring types for `adopt-typescript-project-definition`，then run targeted tests、dependency checks、workspace verification and dogfood.

Before downstream TS Project Definitions adopt TaskPlan，rollback removes the orchestration binding/coordinator adapter and restores foundation direct coordination. After adoption，rollback first projects each Task-based Check to one direct private binding；Task identities carry no public compatibility obligation.

## Open Questions

无未回答开放问题，可以进入实现前审计。Public authoring 与 Product-owned `maxParallel` default 由 `adopt-typescript-project-definition` 及其 runtime owner 承接，不改变本 change 的 normalized scheduler semantics。
