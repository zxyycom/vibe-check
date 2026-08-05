> **核心句：**本design将内置quality capability定义为final record与execution summary producer，将Core定义为planning、record validation、run finalization和decision evaluation owner。

## Context

See [proposal.md](proposal.md) for motivation. Current runtime把三个measurement capabilities、warning generation、overall completeness、fixed channels和machine v1连接成一条feature-shaped pipeline；一个在途config change与七个feature changes会继续扩大该耦合。新设计必须同时承载现有metrics与后续非数值检查，并保持tool-neutral config、explicit references、project-relative identity和sensitive-material边界。

## Goals / Non-Goals

**Goals:**

- 新增capability时只扩展registry descriptor、`CapabilityPolicyProjection`、runner和catalog，不修改Core领域判断。
- 让单条record有效性、capability coverage与最终decision分别可观察。
- 为built-in和后续project-defined policy提供一个closed normalized evaluation boundary。
- 让run/record machine artifacts足够消费和追踪结果，但不要求consumer实现第二个policy evaluator。

**Non-Goals:**

- 第三方capability、runtime plugin loading或project executable。
- 在本change实现Markdown、JSON、schema、link、path、secret或network checks。
- 定义public config v2的完整JSON authoring shape或file override grammar。
- 保留machine v1、dual writer、old warning DTO或fixed-channel compatibility mode。

## Data flow

```text
selected config + explicit references
                  |
                  v
 normalized inventory + capability settings + DecisionPolicy catalog
                  |
                  v
      compile-time capability registry / work DAG
                  |
        emit QualityRecord *     execution summary
                  |                    |
                  v                    v
          committed record set + CapabilityRun[]
                  |
                  v
      selected policy: acceptance -> named views -> blockWhen
                  |
                  v
        gate result/evidence + run/record/report
```

## Contract vocabulary and ownership

下表是本change跨artifact术语的唯一架构定义；字段级约束仍由对应delta spec拥有。

| Term | Owner | Meaning |
| --- | --- | --- |
| `Capability` | Product compile-time registry | 内置质量能力边界；不表示第三方或runtime plugin。 |
| `CapabilityDescriptor` | Registry | 声明stable ID、inventory selector、runner、record catalog、named-reference contract和internal dependencies。 |
| `CapabilityRunner` | Producing capability | 只消费exact work与声明的services；逐条emit final records，并返回internal execution summary与finished-work acknowledgements。 |
| `CapabilityPolicyProjection` | Config resolver；producing capability consumes | 只包含某项capability的领域设置，例如enablement、targets、threshold或parser options；它决定work/record语义，不执行cross-capability gate。 |
| `QualityRecord` | Producing capability；Core validates | 已完成领域判断的immutable数据条；level、message、typed fields与comparison relations在emit前已经是final semantics。 |
| `ExecutionSummary` | Producing capability；internal only | Runner对执行进度和failure的报告；不是public coverage或`CapabilityRun`。 |
| `CapabilityRun` | Core | Core根据resolved plan、work acknowledgements、record sink与execution summary形成的唯一public status/coverage记录。 |
| `NamedReference` / `ComparisonRelation` | Caller resolves reference；capability owns comparison | Reference是调用者显式提供的immutable比较输入；relation是capability绑定到该reference的final领域比较结果。 |
| `DecisionPolicy` | Config projects；Core validates/evaluates | Resolved catalog中的named policy；声明required inputs、acceptance、views和唯一`blockWhen`，`--gate`直接选择其`policyId`。 |
| `GateResult` | Core | `disabled`，或selected policy计算得到的`passed | failed`及policy identity/evidence；不包含policy body。 |
| `MachineRunV2` / `MachineQualityRecordV2` | Output | 对final Core model的机械投影；consumer只验证和消费，不重新执行policy。 |

## Canonical behavior example

以下示例只帮助恢复跨owner关系；字段与合法值仍以delta specs为准。

1. Secret capability完成1个work unit并commit record `r-secret-1`，随后dependency failure；Core finalize该run为`failed`，coverage为`planned=3`、`finished=1`、`unprocessed=2`、`committedRecordCount=1`。
2. `r-secret-1`继续出现在record stream；run failure不删除或改写它。
3. Policy `errors-only`的`blockWhen`只查询error-level records，因此同一records/runs可得到`passed`。
4. Policy `complete-security`的`blockWhen`查询secret run的failed/unprocessed状态，因此同一records/runs得到`failed`，evidence引用该capability ID。
5. 省略`--gate`时仍发布records/runs，但gate result为`disabled`，policy identity、acceptance annotations、views和evidence为空。

这个例子说明三类事实彼此独立：record是否committed、capability是否完整、selected policy是否阻断。

## Decisions

### Decision 1: Capability registry is compile-time and closed

Product owns one descriptor registry. Descriptor selectors receive the normalized inventory and produce exact work; runners receive only approved handles, `CapabilityPolicyProjection`, named-reference material and declared internal services. Dependencies form a validated DAG.

**Why:** This creates an explicit extension boundary without implying runtime plugins or letting adapters rediscover project scope.

**Rejected:** Runtime module discovery and project executables introduce an authorization, compatibility and security product that is not required here. Public records as an execution bus would expose private handoff data and hide ordering dependencies.

### Decision 2: Capability emits final domain semantics

Capability determines check identity, level, message, typed data and comparison relation before `emit`. Core validates the common envelope and producing catalog but never interprets Markdown, JSON, HTTP, secret or metric-specific values.

**Why:** A standard record is useful only if downstream code can consume it without recreating each capability's domain rules.

**Rejected:** Neutral measurements followed by Core warning generation preserve the current coupling. Separate metric/content/security record unions only move the branching into a public type hierarchy.

### Decision 3: Record commit and capability run are independent

Each successful `emit` commits one immutable record. Runner reports execution progress; Core combines the resolved plan, finished-work acknowledgements and sink count into one final `CapabilityRun`. Later failure keeps earlier records and exposes incomplete coverage.

**Why:** A completed work unit remains useful evidence even if another work unit fails. Coverage must remain visible so partial data is not mistaken for a complete scan.

**Rejected:** Atomic capability bundles discard valid evidence. Letting capability produce its own public coverage lets it contradict the planner or sink.

### Decision 4: Core evaluates one closed normalized policy model

Core resolves a catalog of named `DecisionPolicy` values. Each selected policy declares required capabilities/references、acceptance、views and exactly one `blockWhen`. Core supports registered record/run predicates, `and/or/not`, and `any/all/none/count` reducers. Acceptance, views and `blockWhen` evaluation are ordered phases over immutable data. Capability/run states have no implicit blocking meaning.

`add-file-policy-overrides` owns public config v2 and compiles it into this model. During contract migration, one Product-owned adapter maps current semantic config and the confirmed built-in policy entries to the same boundary; it is not a second evaluator. The temporary built-in catalog is the only unresolved choice listed in `Open Questions`.

**Why:** The product problem is configurable composition, not a new scripting platform. One normalized model keeps evaluation deterministic and lets config syntax evolve separately.

**Rejected:** Fixed channels cannot express independent references or coverage policy. Arbitrary scripts/dynamic properties cannot be validated before work and would leak backend/runtime concerns into project policy.

### Decision 5: Comparison meaning stays with the capability

Every comparison uses a caller-supplied named reference resolved once per invocation. Capability owns identity matching and relation semantics; Core only validates and queries emitted relations. Names such as `changed`, `new` or `regression` are ordinary relation/view IDs.

**Why:** Different capabilities and views can compare different references and fields. Core lacks the domain information to decide whether a metric delta, missing link or secret occurrence is a regression.

**Rejected:** A global baseline and `regressions ⊆ changed` rule conflate two independently configurable comparisons. Automatic Git/history fallback makes results depend on local repository shape.

### Decision 6: Machine output publishes decisions, not policy source

Machine v2 consists of `run.json` and `records.ndjson`. Run summary contains registry catalog/fingerprint, capability runs, annotations, views and one gate result. The gate result is the only owner of status-specific policy ID/fingerprint and evidence references. Run summary does not contain the resolved policy body. The producer validates evaluation before projection. Machine validators prove schema, catalog and reference integrity but do not re-execute business policy.

**Why:** Consumers need trustworthy records and the decision/evidence, not a second evaluator. Keeping policy source in project config or explicit resolution output avoids copying config and freezing the internal normalized AST as a public serialization contract.

**Rejected:** Embedding the full policy makes every machine consumer depend on policy AST evolution and duplicates the source configuration. Publishing only a bare pass/fail loses traceability, so stable policy identity and evidence references remain required.

### Decision 7: Migration is a single record/run hard cut

Existing file/function/duplicate capabilities migrate first, followed by policy evaluation and machine/CLI consumers. Current warning streams, metric/content/security variants and overall reducer are removed in the same revision. Feature changes only register capabilities after their artifacts are rebased to this contract.

**Why:** Dual protocols would double mapper, validator, publication and test ownership. The product has not been released, so a clean cut is cheaper and clearer than compatibility machinery.

## Risks / Trade-offs

- **Capability-owned levels may drift across checks.** → Shared level meanings, catalog review and capability contract tests provide consistency; Core does not override domain judgment.
- **Partial records may be read as complete results.** → Every output surface pairs records with producing run/coverage; policy can require completion.
- **Closed policy may grow into a programming language.** → Add operations only for demonstrated cross-capability composition; keep scripts, arbitrary access and backend values outside the model.
- **Policy fingerprint cannot reproduce policy by itself.** → It identifies the exact resolved policy; full reproduction requires retained config or explicit resolution output by design.
- **Hard cut affects every current consumer.** → Migrate producer, schemas, examples, report, annotation and wrappers as one ordered implementation; do not maintain dual readers/writers.

## Migration Plan

1. Implement registry, record catalog/sink and `CapabilityRun`; migrate existing metric capabilities.
2. Implement normalized decision model and current-config/built-in-policy adapter.
3. Hard cut machine output, report, CLI and annotation consumer to run/record v2.
4. Delete old warning/channel/completeness types and validate schemas, examples, consumers and dogfood.
5. Rebase `add-file-policy-overrides` first, then the remaining seven feature changes; rebaseline the deferred Lizard change before resuming it.

Rollback is a full change revert. No runtime switch or dual output is retained.

## Open Questions

### Built-in policy catalog before public config v2

在`add-file-policy-overrides`提供public policy authoring前，本change必须确定resolved catalog中预装哪些`DecisionPolicy` IDs。这个选择会改变`scan --help`、`--gate`合法输入、dogfood wrapper与acceptance tests，不能留给实现阶段临时决定。

- **推荐：**只提供`regressions`。它维持仓库`quality:gate`所需的full-regressions门禁，同时不继续承担`all`与`changed`的旧CLI语义。
- **备选：**把`all`、`changed`与`regressions`都保留为普通declarative catalog entries；Core仍不赋予这些名字特殊语义。
- **备选：**暂不提供built-in policy；在public config v2完成前，`--gate`没有合法policy ID，当前`quality:gate`必须同时暂停或改造。

确认后必须更新Decision 4、`cli-contract`、tasks 4.4/6.1与acceptance matrix；在此之前task 1.1保持未完成。
