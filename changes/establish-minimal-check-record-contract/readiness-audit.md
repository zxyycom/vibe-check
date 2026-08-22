# Readiness Audit

本审计在实施前闭合`establish-minimal-check-record-contract`的范围、owner、消费者、长期Decision与验证入口。它证明Plan可以直接进入Implementation，不证明目标产品contract已经实现。其 baseline、Decision lifecycle状态与验证计数是形成时记录；实现后的 current facts、successor状态和实际验证见 [`acceptance-audit.md`](acceptance-audit.md)。

**Current convergence supplement (not audit evidence).** Final code convergence completed 63 focused tests across
9 suites; strict Test Evidence closure now maps 140 current entities to 44 Cases / 10 Topics, including the
publication candidate-write and first canonical-rename failure real-I/O tests. Both workspace Gates passed: `required` ran 20 checks (14
passed, 6 profile-excluded not-applicable, 0 failed/unavailable) and `full` ran 20 (19 passed, 1
profile-excluded not-applicable, 0 failed/unavailable). Typecheck, lint, global format checking (267 files), docs
validation, and target Change plan check (30/30) passed. The current strict Decision snapshot is 134 records: 46
active, 33 aligned, 13 unaligned, 88 archived, and 0 candidates. The two required successor/predecessor lifecycle
transactions are complete, so they no longer block final Change acceptance; see [`acceptance-audit.md`](acceptance-audit.md)
for their exact revision relations. The historical counts below remain the planning-audit snapshot.

## Audit Basis

- 审计基线：Git`08b44ae069646fa4b61db2bee1b8008eb558d6a2`。
- 当前事实来源：`src/product/**`、`scripts/project-gate/**`、`scripts/quality/project-gate/**`、稳定owner docs与active Decisions。
- 目标事实来源：本Change的`proposal.md`、`design.md`与`tasks.md`。
- 下游边界：typed dependency、repository Gate optimization与presentation分别由相邻Draft承接；它们不阻塞本Plan。
- 当前实现仍使用`completed + verdict`、Record catalog、DecisionPolicy/GateResult与machine v3。以下目标只在Implementation完成并验证后成为当前事实。

## Direct-Action Conclusion

Readiness已闭合，没有剩余主设计或迁移owner问题。实施按以下不可倒置顺序推进：

1. 实现四态CheckResult、final data、minimal Record与共同canonical safety。
2. 更新Core/Run raw facts，并在`RunControls.checkAggregation`下实现optional aggregate。
3. 迁移repository`required/full`到package-owned aggregate并通过focused acceptance。
4. 删除legacy comparison/reference、DecisionPolicy、GateResult与decision evidence。
5. 完成machine v4、direct consumers、stable docs与完整验证。

第3步通过前不得执行第4步。Typed dependency getter、Gate catalog optimization与presentation API不在该顺序中，也不形成实施依赖。

## Readiness Gates

### 0.1 Public contract and package probe

目标public contract已经固定：

- `CheckResult`为`passed(data) | failed(data) | not-applicable(reason?) | unavailable(reason)`。
- Final data与Record data的write boundary均为`object`；runtime canonical validation是acceptance authority。
- Record reporter为`records.report({ id }, data)`；reporter helper types不默认增加top-level exports。
- Completed/effect Run facts保存generic canonical Check final data与Records。

现有probe入口可直接扩展，不需要新增测试工具：

| Obligation                                                        | Existing probe owner                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Contextual authoring、Definition normalization与plain composition | `src/product/definition/project.test.ts`              |
| Public runtime/type inventory                                     | `src/product/public-contract/current.test.ts`         |
| Declaration emit与physical candidate                              | `scripts/package-candidate/index.test.ts`             |
| Ancestry-external installed consumer                              | `scripts/package-candidate/isolated-consumer.test.ts` |

当前基线已运行上述四个入口；目标Implementation在同一入口增加new-result、two-argument report、readonly local interface、primitive rejection、generic readback与no-catalog assertions。

### 0.2 Canonical safety and settlement matrix

Final data与Record data共用design Decision 5的descriptor-based canonicalizer。Settlement必须满足：

| Input/event                              | Owning Check result                                  | Accepted Records                 | Other Checks                |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------- | --------------------------- |
| Valid passed/failed final data           | Author status + canonical final data                 | 保留                             | 不受影响                    |
| Invalid final data                       | Product-controlled unavailable                       | 保留                             | 不受影响                    |
| Invalid Record identity/data或duplicate  | Product-controlled unavailable，覆盖callback result  | 违规前已接受Records保留          | 不受影响                    |
| Callback throw或Product protocol failure | Product-controlled unavailable                       | 已接受Records保留                | 不受影响                    |
| Cancellation                             | Product-controlled unavailable/cancelled Run mapping | 已接受facts按现有containment保留 | 未开始Checks按Run owner处理 |
| Reporter在callback关闭后写入             | 抛closed-reporter error，不修改Core                  | 不变                             | 不受影响                    |

Public reasons只使用受控reason types；arbitrary error text不得进入Core/machine facts。

### 0.3 Core, Run and aggregation target

- Core每个resolved Check恰有一个四态outcome；passed/failed带canonical final data。
- Core Record只含`{ checkId, id, data }`；snapshot entity collections仍只有`checks`与`records`。
- Run lifecycle继续由`kind`表达；raw Core facts不依赖aggregate。
- `RunControls.checkAggregation`是唯一入口，配置缺失时`RunResultFacts.aggregate === null`。
- `CheckAggregate`是`passed | failed | not-applicable | unavailable`字符串，不复制evidence。
- Config的`checks`在work前验证；aggregation只消费selected settled statuses。

### 0.4 Direct-consumer migration map

| Removed/changed surface                  | Direct implementation owners                                                                                   | Migration                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `completed + verdict`                    | `src/product/definition/custom-check.ts`、Check callback validation、Core settlement、progress/readable status | 改为四态status；passed/failed canonicalize final data。                |
| Record catalog/fields/identity extractor | Definition check tree、`src/product/quality-core/check-record/**`、三个default Checks                          | 删除declaration/catalog；producer直接提供local ID/data。               |
| `reportReference`与comparison context    | `custom-check.ts`、Run controls/project context、default Checks、reference submission                          | 删除common input/reporter；领域comparison回到producing Check。         |
| DecisionPolicy/GateResult                | Project Definition validation、`src/product/run/policy.ts`/`publication.ts`、policy evaluator/model            | 在Gate aggregate cutover后删除。                                       |
| Decision/reference machine evidence      | publication-v3 mapper/model/schema/invariants、docs validators/examples/readable output                        | machine v4不发布这些字段。                                             |
| Project Gate snapshot closure            | `scripts/project-gate/index.ts`、`scripts/quality/project-gate/**`                                             | Selection提供eligible IDs；Run求值aggregate；adapter不再遍历snapshot。 |
| Public package surface                   | `scripts/package-candidate/**`、public-contract inventory                                                      | 删除DecisionPolicy/Record catalog types，保留唯一Run与必要new types。  |
| Stable docs/Test Cases                   | Architecture、Configuration、Quality Metrics、Output、Script Tooling与semantic Case owners                     | 在实现证据形成后同步当前facts与Case映射。                              |

Source audit已用`rg`分别追踪`status === "completed"`、`.verdict`、`recordTypes`、`reportReference`、`DecisionPolicy`、`GateResult`、`referenceFacts`、`decision.gate`与comparison inputs；没有发现需要建立第四个下游能力owner的直接consumer。

### 0.5 Aggregation and repository Gate cutover

Aggregation属于本Plan的次级迁移，而不是repository Gate optimization Draft的前置能力：

1. `RunControls.checkAggregation`在normalization/work前完成closed-shape与Check-ID validation。
2. Core settlement完成后，Run按配置从raw Check statuses计算`CheckAggregate`。
3. Project Gate从同一profile/tag selection得到eligible IDs；excluded Checks继续保留exact not-applicable raw facts。
4. Required/full显式配置`mode: "all"`，included not-applicable与unavailable均不能静默通过；exact值由Implementation fixture固定。
5. Adapter继续映射configuration/run/effect/warning facts与aggregate到`0/1/2`，但不遍历Checks重算quality summary。
6. Focused Gate tests通过后才删除`result.decision.gate`。

后续[`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/)只优化assurance catalog、native capability、CLI/process与profile结构。

### 0.6 Downstream handoffs

- [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/)已把upstream final data设为single primary source，并把supplemental Record getter保留为需真实consumer证明的可选variant。
- [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/)已把final data与supplemental Records视为不同structured sources，并要求explicit projection。
- [`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/)已移除aggregation ownership，只消费本Plan迁移后的raw facts与package aggregate。

三个下游Change仍为Draft，因为各自主要设计尚有独立开放问题；这些问题不反向阻塞本Plan。

### 0.7 Decision evolution map

| Current Decision                                                                     | Required action when target facts land                                                               |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `report-check-owned-record-data-with-local-identities.md` (`active + unaligned`)     | 实现完整Record方向后mark aligned。                                                                   |
| `keep-comparison-semantics-inside-producing-checks.md` (`active + unaligned`)        | common comparison/reference删除并迁移producer后mark aligned。                                        |
| `use-direct-check-execution-with-minimal-record-reporting.md` (`active + unaligned`) | 建立successor，保留direct execution并将旧`completed + verdict`修订为四态final data；归档前序。       |
| `use-core-check-and-record-facts-from-run-resolution.md` (`active + aligned`)        | 建立successor，保留two-entity Core并修订Check outcome/Record shape；实现后对齐successor并归档前序。  |
| `evaluate-decision-policies-from-core-facts.md` (`active + aligned`)                 | 由explicit RunControls aggregation与Check-owned semantics的successor替代；Gate cutover后归档前序。   |
| `use-user-owned-definition-for-observation-and-gates.md` (`active + unaligned`)      | 建立successor：Project仍显式绑定Definition/Run，但Gate绑定Run aggregation而非named DecisionPolicy。  |
| `publish-fingerprint-bound-check-record-machine-v3.md` (`active + aligned`)          | 建立machine v4 successor，保留two-file/fingerprint trust boundary并替换Check/Record/evidence shape。 |
| `expose-recursive-check-authoring-and-run-surface.md` (`active + aligned`)           | 建立public-surface successor，保留唯一Check/Run并删除DecisionPolicy/Record catalog roots。           |

Successor在方向确认时建立为`active + unaligned`；只有完整实现与owner验证通过后mark aligned。Plan文本不代替这些Decision lifecycle动作。

### 0.8 Test Evidence impact map

修改任何native test前的strict check已通过：193个Bun test entities全部由45个Cases/10个Topics映射。

| Semantic owner                                 | Required Case action                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `quality-runtime.md`                           | 更新Check outcome、Record manager、Core session与execution Cases；保留“Records独立、不由Record推断status”的Proves。           |
| `scan-configuration.md`                        | 更新public authoring、removed policy/comparison inputs与effects facts。                                                       |
| `quality-gate.md`                              | 删除DecisionPolicy-specific Case或将仍有独立证明价值的部分迁移到explicit aggregation Case。                                   |
| `report-output.md`                             | 将machine v3 Cases硬切为v4，保留two-file/fingerprint/lifecycle evidence；移除decision/reference/readable Record assumptions。 |
| `repository-tooling.md`                        | 更新Project Gate Definition/adapter Cases，证明aggregate consumption、eligible-ID selection与`0/1/2`closure。                 |
| `scanner-adapters.md`、`warning-generation.md` | 更新default Check final data/Records与删除DecisionPolicy consumer描述。                                                       |

原生test实体的rename/split/merge必须同步Case Owner/Proves；实施前后均运行`bun run test-evidence -- check --root .`和最窄目标tests。

## Audit Verification

审计阶段实际运行：

- `bun run test-evidence -- check --root .`：通过，193/193 entities mapped。
- `bun test src/product/definition/project.test.ts src/product/public-contract/current.test.ts src/product/quality-core/check-record/model.test.ts src/product/quality-core/check-record/core-session.test.ts scripts/project-gate/index.test.ts scripts/package-candidate/index.test.ts scripts/package-candidate/isolated-consumer.test.ts`：通过，25 tests。
- `bun run decisions -- show <decision-id>`：已读取0.7列出的8条active Decisions及其alignment/relations。
- Targeted `rg` consumer audit：已覆盖0.4列出的旧surface。

这些命令证明当前基线与未来验证入口可用；目标contract行为仍由Implementation与Verification tasks证明。
