# Design

本设计以 public custom strategy 的 Run 数据流、terminal output contract 和 failure matrix 落实 Proposal 的 Outcome。现行稳定事实由对应 owner 承接；下表的实施前基线只解释本 Plan 的变更边界。

## Context

| 范围 | 实施前基线 | 本 Plan 交付的契约 |
| --- | --- | --- |
| public authoring | custom policy 使用同步 `proposeAdmission(context)`；callback 不进入 declarative fingerprint。 | custom policy 使用 simple 或 prepared strategy；strategy kind 进入 declarative fingerprint，callback identity/source/closure 留在 runtime state。 |
| Invocation 与 Scheduler | private provider 在 graph ready 后形成 frozen `AdmissionSelectionPolicy`；Scheduler 同步 `decide` 并拥有 execution state machine。 | Invocation 为每个 Run 管理 public `prepare`/`complete`；Scheduler 继续只接收 frozen synchronous policy 并拥有 execution state machine。 |
| terminal delivery | Scheduler terminal runner 交付 internal summary 和 generic measurement Hooks；Invocation 随后单独调用 private `complete`。 | Scheduler 继续运行 existing summary/generic Hook runner；Invocation/orchestration 在其返回后调用 prepared `complete`，并统一结算既有 `outputs.measurementHooks` aggregate。 |

稳定 owner：Scheduler 拥有 graph legality、relation/mutex/capacity/cancellation、Task start/settlement/drain、raw measurement seal 及 existing summary/generic Hook runner；Invocation/orchestration 拥有 strategy lifecycle、跨该 runner 的 sequence 与 aggregate mapping；terminal context 是 frozen graph、kind-only execution 与 raw measurement 的 DTO。

## Goals / Non-Goals

### Goals

- 让 simple 和 prepared 成为清晰、可验证的 public custom strategy forms，并使 TypeScript、runtime validation、normalization、fingerprint 和 package declaration 表达同一 contract。
- 为每个 Run 建立独立的 prepared closure，以同步 result-only `decide` 接入现有 Scheduler hard guards。
- 使 sealed terminal facts 通过一条 ordered side-effect pipeline 交付，并由既有 `outputs.measurementHooks` 结算参与状态和 failure。
- 为 preparation、decision、terminal delivery、primary result 与 overlap 提供唯一 owner 和可测试的结果矩阵。

### Non-Goals and boundaries

- public authoring 只有 simple/prepared 两种 form；compatibility hard cut 拒绝 retired `proposeAdmission`、async/thenable `decide` 和 unknown authoring fields，并由 public validation 与 consumer evidence 证明。
- trusted host callback 自行持有 host capability；Product context 不扩展为 state directory、filesystem/persistence service、clock、logger、mutable Scheduler inspection 或 imperative Task control。
- Simulation、algorithm/preset research、registry、generic model API 和 machine v4/schema revision 不属于本 Plan。`docs/output.md` 只验证 machine boundary，RunResult output 继续由 API mechanics、types 与 package documentation owner 承接。

## Decisions

### Intended Change

#### Public contract and declarative representation

```ts
type CustomAdmissionStrategy =
  | Readonly<{
      readonly kind: "simple";
      readonly decide: (this: void, context: AdmissionPolicyContext) => AdmissionProposal;
    }>
  | Readonly<{
      readonly kind: "prepared";
      readonly prepare: (
        this: void,
        context: CustomAdmissionPreparationContext,
      ) => PreparedCustomAdmissionStrategy | Promise<PreparedCustomAdmissionStrategy>;
    }>;

type PreparedCustomAdmissionStrategy = Readonly<{
  readonly decide: (this: void, context: AdmissionPolicyContext) => AdmissionProposal;
  readonly complete?: (
    this: void,
    context: SchedulerMeasurementContext,
  ) => void | Promise<void>;
}>;

type CustomAdmissionPreparationContext = Readonly<{
  readonly graph: SchedulerGraphSnapshot;
}>;

// AdmissionPolicy custom branch
Readonly<{ readonly kind: "custom"; readonly strategy: CustomAdmissionStrategy }>;
```

`CustomAdmissionPreparationContext.graph` 是 frozen graph-ready fact；`AdmissionPolicyContext` 仍是 exact decision DTO；`SchedulerMeasurementContext` 仍是 sealed terminal DTO。exact validation、normalization 和 declaration projection 共同验证 own-key/function shape。outer policy/strategy frozen 后，declarative snapshot 只记录 `{ kind: "custom", strategy: { kind: "simple" | "prepared" } }`。

#### Per-Run strategy lifecycle and Scheduler handoff

```text
static graph validation
  → Invocation resolves strategy for this Run
  → simple closure | await prepared prepare(graph-ready context)
  → frozen synchronous AdmissionSelectionPolicy.decide
  → Scheduler decides, enforces guards, starts/settles/drains Tasks
  → Scheduler seals terminal measurement when a terminal context exists
```

simple strategy 形成委托其 `decide` 的 Run-local closure。prepared strategy 在每个 graph-ready、未在 pre-work/planning cancel 的 Invocation 中执行一次 `prepare`，并只使用该次返回的 object；overlapping Runs 的 closure 与 Product-owned mutable state 相互隔离。Scheduler-facing `decide` 始终同步且 result-only。trusted callback 可使用调用方 closure 已捕获的 host capability；Product 通过上述 DTO 和 handoff 保持执行边界。

#### Terminal measurement side-effect pipeline

只有 Scheduler seal 出 terminal context 时，跨 owner 的 coordinator 形成以下 single semantic pipeline：

```text
sealed terminal measurement
  → Scheduler: internal default summary + configured generic measurement Hooks
  → Invocation/orchestration: prepared complete for this Run, once when present
  → Invocation/orchestration: aggregate outputs.measurementHooks status and Run output mapping
```

Scheduler 在 sealed context 上运行既有 summary/generic Hook runner；它返回后，Invocation/orchestration 才交付该 Run 的 prepared `complete`，再结算 aggregate。internal summary writer 留在其 containment wrapper，generic runner 保持配置顺序并让全部 generic Hooks 获得调用机会。

`outputs.measurementHooks` 的 closed state 由实际 participants 决定：

| 条件 | `enabled` / `status` |
| --- | --- |
| Definition 的 generic Hook list 非空，或 successful prepared result 实际包含 `complete` | `enabled: true`。 |
| 两者均无 | `enabled: false`（`disabled`）。 |
| enabled Run 没有形成 sealed terminal sequence | `not-run`。 |
| terminal sequence 形成，且全部实际 generic Hooks 与 `complete`（如存在）成功 | `succeeded`。 |
| terminal sequence 形成，任一 actual generic Hook 或 `complete` throw/reject | `failed`。 |

因此，prepare failure 且没有 generic Hooks 时为 `disabled`；prepare failure 且存在 generic Hooks 时为 enabled/`not-run`。没有 generic Hooks 且 successful prepared result 没有 `complete` 时为 `disabled`；没有 generic Hooks、prepared result 包含 `complete`、但随后没有 sealed context 时为 enabled/`not-run`。

#### Failure matrix

| 触发点 | owner 与处理 | 可观察结果 |
| --- | --- | --- |
| `prepare` throw/reject | Invocation 在 Scheduler start 前结束该 Run。 | primary `execution` diagnostic `admission-strategy-preparation-failed`；没有 terminal context 或 completion delivery；output state 按 generic Hook list 决定 `disabled` 或 enabled/`not-run`。 |
| `decide` throw、thenable、malformed proposal、非法 `select` 或 undrainable `wait` | Scheduler 执行既有 policy-fault handling：停止新 admission、cancel pending、drain started work。 | `admission-policy-failed`；drain 后若 seal 出 context，prepared `complete` 交付一次。 |
| pre-terminal task-engine failure | task engine 形成 primary execution result。 | 不生成 terminal context；enabled output 保持 `not-run`。 |
| generic Hook 或 `complete` throw/reject | Scheduler generic runner 保证之后的 generic Hooks 获得调用机会；Invocation/orchestration 汇总 failure。 | `outputs.measurementHooks.status: "failed"`；normal completed Run 映射为 facts-preserving `kind: "output"` / `scheduler-measurement-hooks-failed`。 |
| cancellation 或其他 primary execution result | Run result mapping 保留已选择的 primary outcome。 | aggregate status 可见 terminal side-effect failure；sealed Task/Check/aggregation facts 保持原值。 |
| normal terminal sequence | all participants settle successfully。 | `outputs.measurementHooks.status: "succeeded"`，并保留 normal result。 |

#### Documentation and evidence contract

Stable owner docs 在实施前标明 current fact 与 Plan contract，实施后以落地行为替换目标说明。package docs、JSDoc、examples 和 installed-consumer fixture 展示两种 strategy form、frozen context、trusted-host boundary、terminal order 与 RunResult field。runtime tests 与 Test Evidence 分别证明 public grammar、hard guards、lifecycle order、failure facts 和 package surface。

### Resulting Impacts

| owner | 必须交付的结果 | 主要证据 |
| --- | --- | --- |
| public scheduler policy、Project Definition、fingerprint、exports | definition、exact validation、normalization 和 declaration 对同一 strategy grammar 达成一致。 | targeted type/runtime tests、declaration projection、installed-consumer type acceptance。 |
| provider、Invocation、terminal measurement、RunResult mapping | per-Run preparation、single terminal sequence、aggregate status 和 primary-result mapping 使用明确 handoff。 | lifecycle/terminal tests 与 failure matrix assertions。 |
| stable documentation、package material、Test Evidence | public contract、runtime facts 和 Case ownership 一致且可定位。 | docs validation、Case closure、package candidate evidence。 |
| shared Scheduler/public API owners | 以 stable private seam 为 implementation baseline，并按协调顺序处理交叉 owner。 | Change coordination review 与 required/full workspace verification。 |

## Risks / Trade-offs

- authoring replacement 需要在一次 implementation 中同步 public declaration、validation、documentation 与 installed-consumer evidence；分散变更会造成 consumer contract 不一致。
- terminal delivery 重构跨越 Scheduler 与 Invocation owner；sequence 的责任划分和 sealed snapshot 保留必须由 targeted behavior tests 审计。
- preparation context 保持最小化能维护 Product control boundary；需要外部 capability 的 consumer 通过 trusted closure 持有它。

## Open Questions

无。public grammar、compatibility boundary、context minimum、terminal order、existing output mapping、failure matrix、Simulation non-dependency 与 Decision lifecycle 已确认；局部 naming 或 module placement 仅可在保持这些契约的前提下选择。
