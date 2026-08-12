# Design

本设计定义从 frozen resolution inputs 到 validated publication set 的唯一正向数据流，并用 CheckManager 与 RecordManager 两个独立事实源重建质量核心。

## Context

本 Change 启动时的已提交基线仍以三个编译期 capability、`QualityMetrics`、warning channels、machine v1 和 JSON semantic config 为主干。该描述只保存设计形成时要替换的 surface，不是现行产品事实。Checkpoint 4 已完成 public hard cut；当前稳定事实只从 `docs/quality-metrics.md`、`docs/output.md`、`docs/cli.md` 和 `src/product/**` 恢复。

设计形成时与当前稳定 owner 共同要求保持 exact-input handoff：Product 统一解释 config glob 并批准 current / baseline exact inputs，adapter 通过 source-scoped measurement 声明 payload 来源，Core 对未批准路径 fail closed，但不读取 payload-specific location 重建领域语义。本 Change 的 Check / Record 迁移保留了这项不变量，没有以通用 Record envelope 放宽 scanner 输入或结果范围。

计划形成时，下列活动未对齐决策确认了目标边界：`use-runtime-resolved-check-and-record-core`、`separate-check-and-record-type-identities`、`use-location-independent-record-identities`、`keep-sensitive-quality-record-material-ephemeral`、`require-explicit-named-comparison-references`、`keep-decision-policies-closed-and-declarative` 与 `limit-tool-neutrality-to-built-in-checks`。本 Change 已按 `tasks.md` 实施这些方向；决策当前状态应从 Decision owner 恢复，不从本段推断。

计划形成时已对齐的 workflow 决策要求按问题形态选择实现模型，并只在触发条件成立时使用预置 TypeScript 能力。本 Change 因而让 manager 的稳定身份和生命周期由明确 state owner 承接，让 closed unions 穷尽表达结果与失败，并让 projection、ordering 与 fingerprint 保持纯转换；没有因预装依赖建立额外 framework 或平行基础原语。

本文只拥有本 Change 的目标设计、迁移约束和实施观察，不是当前稳定事实的第二 owner。实施已按 `tasks.md` 完成；后续审阅先从当前 owner / code / tests 恢复现状，再把本文用于解释形成时选择与迁移证据。若继续修复本 Change 时发现会改变 public behavior、owner、compatibility 或验收的新选择，必须先同步 proposal / design / tasks，而不是在 consumer 或 adapter 中隐式决定。

`establish-check-task-orchestration` 与 `adopt-typescript-project-definition` 不属于本 Change：前者只能消费本设计的 opaque execution seam，后者只能向 resolution 贡献已验证的 public metadata、policy data 与 private bindings。本设计不拥有二者的 authoring 或 scheduler contract，也不证明它们已经实施。

## Goals / Non-Goals

**Goals**

- 为 definition、execution lifecycle、quality verdict、逐条 record、comparison evidence、policy decision 和 publication 建立互不混用的词表与 owner。
- 在任何 work 前验证并冻结完整 Check / record-type catalog、private binding table、selection、applicability、planned domain work、named reference inputs 与 selected policy。
- 保留 runner failure 前已经可信提交的 records 与 acknowledgements，同时使最终 coverage、reference completeness 和 execution failure 如实可见。
- 让 direct execution 与后续静态 TaskPlan 共用一个完整 contribution batch / terminal report seam。
- 先用一个真实 built-in 纵向路径证明 catalog、binding、manager、source scope 与 final Core snapshot 协作，再扩大到其余能力和公共输出。
- 让 policy 只消费 final Core snapshot，让 machine、human、annotation 和 CLI 只从同一个 validated publication model 投影，并一次性退出旧事实源。

**Non-Goals**

- Project Definition / module loading、第三方 provider 或 custom command protocol。
- TaskPlan、DAG、并发、resource、cancellation、timeout、drain、retry 或 runtime registration。
- 任何后续 feature Check 的具体检测算法、专用 record fields 或 policy leaves。
- 重新设计 `scan` / `init` command、现有 flags / profile intent、project-root 语义、显式 baseline prerequisite、`--verification-output` 的 preview-only 作用、process-outcome exit mapping或 `raw/**` scanner diagnostic contract。
- machine v1、legacy warning channel、旧 capability status 或 gate alias 的兼容层。

## Decisions

### 0. 契约词表与事实 owner

下表是本文其余决策的阅读入口；每一行都说明该对象唯一拥有的事实，不要求 TypeScript 实现采用同名 class。

| Term | Owner 与唯一含义 |
| --- | --- |
| Frozen resolution inputs | Resolution 在 work 前验证并冻结的 public catalog、private binding table、selection、applicability、domain-work handles、named reference identities 与 selected policy。执行期间不能追加、替换或重新解析。 |
| `CheckDefinition` / record-type definition | 可序列化 public metadata。前者标识执行与结果语义；后者标识所属 Check 可产生的 record 语义、closed field validation、identity fields、policy-visible operands 与 comparison relation shape。它们不含 executable 或运行状态。 |
| `CheckExecutionBinding` | 与一个 resolved Check 一对一的 private executable binding。它只能经 bound record / acknowledgement ports 与一个 terminal execution report影响 Core。 |
| `CheckRun` / `CheckResult` | CheckManager 拥有的 execution lifecycle、coverage、diagnostic 与独立领域 verdict；quality `failed` result 不是 execution failure。 |
| `QualityRecord` | RecordManager 拥有的 immutable final domain row，包含 Core-bound provenance、stable `recordId`、record-type fields 与 current location；comparison relations 属于独立的 named reference facts。 |
| Terminal execution report | Coordinator 对每个 applicable contribution 恰好返回一个的 private `returned | unavailable | execution-failed` report；它不是 `report.md`，也不携带自报 coverage 或 record count。 |
| Final Core snapshot | 冻结 catalog、final CheckRuns / nullable CheckResults、manager-derived coverage 与 committed immutable records 的只读集合。Named reference identities / facts 是 policy 与 publication 的独立输入，不属于该 snapshot；snapshot 也不含 policy acceptance annotations、policy body、GateResult 或 output DTO。 |
| Named reference identities / facts | Caller 在 work 前冻结的 safe reference identities，以及 producing Checks 提供的 per-Check evidence status 和 comparison relations。它们不伪造第二个 public run，也不进入 `QualityRecord` body。 |
| Decision evidence | Closed `DecisionPolicy` 从 final Core snapshot 与 named reference facts 产生的 acceptance / view memberships、readiness evaluation、deterministic typed evidence refs 与一个 `GateResult`；policy 不修改输入事实，也不复制 Record / Run body。 |
| Validated publication model | Output 将 final Core snapshot、named reference identities / facts 与 decision evidence 组合并验证后得到的唯一发布模型。Machine two-file set、report、console 与 annotation 共享业务事实，但保留各自 transport / readable contract。 |

目标数据流只有一个方向：

```text
frozen resolution inputs
  -> private bindings / coordinator
  -> CheckManager + RecordManager finalization
  -> final Core snapshot + named reference identities / facts
  -> DecisionPolicy evaluation
  -> decision evidence + GateResult
  -> Output validation / publication
  -> machine, report, console, annotation, CLI outcome
```

### 1. Public catalog 与 private binding 分别冻结

Resolution 产生 canonical、serializable `CheckDefinition[]` 与独立的一对一 `CheckExecutionBinding` table。`CheckDefinition` 拥有稳定 `checkId`、record-type catalog、public result metadata 与 policy-visible declarations；不包含 runner、function、Task、scanner identity 或执行状态。每个 record-type definition 使用稳定 `recordTypeId`，并由 foundation-owned closed descriptor 声明 fields、identity subset、policy operand subset 与 comparison relation validation；consumer 不从 message、location 或任意 property walk 重建这些语义。

Catalog validation 在 work 前拒绝 unknown / duplicate / cross-owner identity、非法 descriptor 和 missing / extra binding。Catalog fingerprint 只覆盖 canonical public catalog data；private function、module graph、selection、host path、environment 与 executable identity 均不进入。Fingerprint 是同一 public definition snapshot 的 opaque equality evidence，不是 executable attestation、cache key 或跨版本兼容承诺。

每个 applicable resolved invocation 由 binding 产生一个 Core 不解释 payload 的 `CheckExecutionContribution`。CheckManager 加入自己的 `checkId`、invocation-scoped opaque `checkRunId` 与 correlation 后，把完整 frozen batch 交给 coordinator；coordinator 必须为每项 contribution 返回且只返回一个 terminal report。`checkRunId` 只在本 invocation / publication set 内关联 ownership，不进入跨 invocation 稳定 `recordId`。现有 direct runner 只是第一种 private adapter。

### 2. CheckRun 与 CheckResult 使用严格合法组合

`CheckResult.verdict` 的 closed union 是 `passed | failed | not-applicable`。`not-applicable` 只由 Core 在 execution 前的 applicability 判定产生；applicable binding 只能返回 `passed | failed` candidate，返回 `not-applicable` 属于 invalid result。三种合法 result 都表示 run 已完成 lifecycle；quality `failed` 不会阻止只要求 lifecycle readiness 的下游 Check。

每个 resolved definition 在 invocation 中恰有一个 `CheckRun`：

| Run status | Result | 含义 |
| --- | --- | --- |
| `skipped` | `null` | Definition 存在但本次未请求；不解析 applicability、不创建 domain work、不调用 binding，也不产生 records。 |
| `completed` | 一个 result | Pre-work 得到 `not-applicable`，或 applicable execution 正常返回合法 `passed | failed` verdict。Not-applicable run 不调用 binding，也不产生 records。 |
| `failed` | `null` | Dependency、execution、protocol、record integrity 或 returned-result validation 未正常完成；此前独立有效的 records 可以保留。 |

Selection 和 applicability 在 contribution building 前冻结。Applicable zero-work Check 仍必须通过 binding 返回领域结果。Core 不从 record 数量、ack 数量、reference evidence 或 execution failure推断领域 verdict。

### 3. Coverage 只由 manager-owned domain work 决定

每个 applicable invocation 拥有 invocation-private opaque domain-work handles。CheckManager 提供增量 acknowledgement port：首次合法 ack 完成 owned handle，重复 ack 幂等，unknown / foreign / late ack 是 protocol violation。Coordinator report 不携带自报 coverage 或 record count；Core 从 frozen handles 与 ack state形成 final run coverage。

该 seam 允许后续一个 Task 对应零到多个 handles，但 Task 的数量、身份和拆分不改变公共 coverage。Record submission 与 acknowledgement 是独立动作：record 已提交不表示对应 work 已完成，ack 已接收也不表示产生 record 或 verdict `passed`。

### 4. RecordManager 独立提交 final domain rows

Runner 通过已绑定当前 check / run 的 sink 提交 record candidate。Producing Check 选择 `recordTypeId`、level、semantic subject、safe message、typed fields 与 current location；RecordManager 添加不可伪造的 owner provenance，按 resolved record-type definition 验证并提交 immutable `QualityRecord`。Producing Check 另行产生绑定 committed `recordId` 的 comparison relations，由 named reference facts 边界验证，不进入 `QualityRecord` body。

稳定 `recordId` 只使用 `checkId`、`recordTypeId`、规范化 semantic subject 与 catalog 明确声明的 identity fields；line、column、range、byte offset、message、arrival order 和 `checkRunId` 不参与。等价 same-ID replay 幂等；same-ID / different-body 是 arrival-neutral integrity conflict，不能让任一先到值成为可信输出。普通 invalid candidate 被拒绝并使 owning run 进入 integrity failure；identity conflict 还使 publication set 不可信。两者都不回滚其它此前已由 RecordManager 独立验证并提交的 records，且最终 ordering 不依赖 arrival。

原始 secret bytes、credential URL、可关联 digest 与其它敏感源材料只留在 producing Check 的 bounded invocation memory；公共 ports、diagnostics、identity、cache 和 artifacts 只接收安全身份与必要脱敏证据。

### 5. Named reference identity、reference evidence 与 current run 分离

Caller 为每个 selected policy / Check 要求的 named reference 显式提供 input；CLI 在 work 前把每个 input 解析一次并冻结 safe reference identity。Core 不从 branch、history、remote、cache 或 policy name补猜 reference。迁移期 `--baseline <revision>` 只为 current `changed` / `regressions` intent 提供 named baseline reference；missing / invalid input继续是 pre-work usage failure。

每个 public `CheckRun` 只表达 current-side execution。Reference-side materialization、measurement 与 matching 保持 producing Check private；Check 把 safe per-reference evidence status 与 validated comparison relations交给 Core，但不为同一 definition伪造第二个 public run，也不把 reference-side scanner payload发布为 QualityRecords。Reference input 已冻结后发生 materialization、measurement 或 comparison failure时，current run / records若本身完整仍可保持可信，相关 reference evidence明确标为 unavailable / incomplete；selected policy只有在自己的 ordered readiness中声明需要该 evidence时才产生 `not-evaluated`，否则可以把 evidence status作为普通 closed operand处理。Core不应用全局 comparison all-or-nothing规则，也不把 current execution重写为 failed。

Producing Check 拥有 matching 与 comparison relation 的领域语义；record-type definition 验证 relation shape，policy只查询已发布 evidence。没有 reference 的 current-only invocation不制造空 comparison，也不从 previous run推断关系。

### 6. Policy 是 closed final-Core-snapshot consumer

`DecisionPolicy` 是经 owner validation 的 stable named、closed typed、serializable value，不是第三个 executable extension point。Policy catalog、named-reference declarations、selectors、operand types、ordered readiness clauses和唯一 `blockWhen`在 work 前验证并冻结；任意 function、script、dynamic property walk 或未注册 operand直接拒绝。

Evaluator 在 final Core snapshot上按固定阶段执行：先解析不改写 record的 acceptance annotations，再形成 named record / run / reference views，然后按声明顺序评价 closed readiness clauses，最后在 ready时评价唯一 boolean `blockWhen`。省略 policy得到 `disabled`；首个不满足的 readiness clause得到 `not-evaluated`及 clause声明的 closed reason code；readiness全部满足后，`blockWhen = false`得到 `passed`，`true`得到 `failed`。Evaluator同时从实际读取的 named view、run、record和 reference operands产生 canonical typed evidence refs；refs只指向 snapshot identity或 named view，不复制 body或解析 message。Policy可以把 run failure、partial coverage、record count / level或 reference status放进 readiness或 `blockWhen`，Core不替 policy增加 global prerequisite。Output与 CLI不重新选择 view、过滤 acceptance、评价 readiness或计算 gate。

当前 JSON semantic config和 CLI只在本 Change的迁移边界按下表单向投影；目标 Core不反向读取 legacy spelling，也不把映射提升为 alias catalog：

| Current input | Target owner / mapping |
| --- | --- |
| `checks.files`、`checks.functions`、`checks.duplication`与 code-area policy | Config adapter投影为三个 built-in definitions各自拥有的 serializable policy inputs；scanner / backend fields仍不进入 public catalog。 |
| `acceptedWarnings[].checkId`的五个 current values | 尽管 legacy field名为 `checkId`，其值分别 exhaustive映射到同名 `recordTypeId`；acceptance selector显式携带 owning Check ID与 record-type ID，Core不把两层 identity互当别名。 |
| `acceptedWarnings[]`的 `codeArea`、`messageIncludes`、`metric`、`path`、`suggestionIncludes`、`value` filters | Config adapter只编译为对应 built-in record-type catalog明确允许的 closed predicates；不开放 arbitrary property walk，也不使未来 record type自动暴露 message或 sensitive fields。 |
| Omitted `--gate` | 产生 disabled request；不选择 hidden default policy。 |
| `--gate all | changed | regressions` | 选择迁移 adapter构造的三个 ordinary named policies。三者用 readiness保持 current scan-incomplete / no-eligible-input语义；`changed` / `regressions`另要求 comparison evidence；`blockWhen`检查对应 unaccepted record view是否非空，并以 canonical record refs保留 current blocking order。名称不在 evaluator中触发 feature-specific reducer。 |
| `--baseline <revision>` | 在 work前解析并冻结迁移期 named reference input；只有声明需要 comparison evidence的 policy / Check消费它。 |

`all`、`changed`、`regressions`只是当前 adapter生成的 closed policy data，不在 Core中保留固定 warning channels或 feature-specific reducer。Quick / full、baseline prerequisite、`--skip-baseline` conflict、quality / process outcome和 exit mapping保持当前 owner语义。后续 `adopt-typescript-project-definition` hard-cut替换 authoring source时，不需要修改 evaluator contract或删除 identity alias。

Human output继续从同一 final Core snapshot与 decision evidence派生 `QualityCheckStatus = passed | warning | failed`，但该状态不是新的 Core事实或 machine-v2必需字段：incomplete current snapshot为 `failed`；没有 eligible current work或任一 completed CheckResult的 quality verdict为 `failed`时，普通 `Quality check status`为 `warning`；其余为 `passed`。`--verification-output`只把 warning判定与 preview切换为 acceptance之后的 `all` view，全部相关 records已接受时可显示 `Quality verification status: passed`；它不改变 CheckResult、records、publication bytes、GateResult、completion message或 process outcome。

### 7. 三个现有能力迁移为 built-in Checks

保留稳定 Check IDs `file-metrics`、`function-metrics`、`duplicate-detection`。当前五个 semantic check identities分别成为所属 definition 的 record types：`file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、`function-parameter-count`、`duplicate-code`。Scanner dependencies、native reports 和 backend identities保持 private。

现有 source-scoped acceptance继续位于 scanner payload 与可信领域数据之间。每个 scanner-backed Check只获得本次 current / reference invocation 的 approved exact inputs；adapter / producing Check从构造 payload 的同一 locations声明 source identity，任一越界路径使对应 adapter result batch在转换为 Records或comparison evidence前整体 fail closed。Core只验证 source identity与 exact-input membership，不解析 file / function / duplicate私有 payload来恢复 location语义，也不把 `ScopedMeasurement` 提升为 public Record contract。

Batch rejection不产生该 batch 的部分 Records / relations，但不撤销更早已经由 RecordManager独立验证并提交的 Records。Current-side batch failure使 owning CheckRun failed且 `result = null`；reference-side batch failure按 Decision 5形成 incomplete reference evidence。三个 adapters继续各自拥有 payload、failure与 cache / backend identity，不抽出 generic scanner / provider hierarchy。

### 8. Machine v2 只发布 validated Core 与 decision facts

Canonical machine set 由 `run.json` 与 `records.ndjson`组成。`run.json` 发布 safe invocation metadata、public catalog / fingerprint、每个 final CheckRun / nullable CheckResult、derived coverage、named reference metadata / evidence status、acceptance / view memberships、readiness evidence与一个 GateResult；它不发布 bindings、contributions、terminal reports、resolved policy body、scanner payload或 absolute private source。`records.ndjson` 按 canonical record identity order发布 QualityRecords，并要求每条 record精确引用一个 owning run。`report.md` 与 console是 readable projections，`raw/**` 仍是 scanner-private diagnostic material，二者都不属于 machine-v2 set；annotation只通过 public shallow validator消费 validated machine records。

Two-file set validator是 machine consumer的 all-or-nothing入口。除各自 schema与 byte grammar外，它还验证：catalog identity / fingerprint一致且每个 definition恰有一个 run；run identity / result / coverage组合合法；每条 record的 check / run / record-type ownership精确匹配且 stable identity无冲突；acceptance、view、readiness与 policy evidence refs全部指向 set内存在且类型匹配的 identity；GateResult与 readiness / `blockWhen` evidence一致；全部 record与 evidence arrays保持 canonical order。任一 dangling / duplicate / mismatched ref或 relationship failure拒绝整个 set，不返回 valid prefix。

Machine v2 是 intentional breaking、single-active replacement。开始 mapper / serializer迁移前，Output owner必须用 runtime schemas、schema-derived DTO、serializer / validator tests固定 exact schema / instance identities、required / nullable fields、closed enums、array ordering、JSON / NDJSON byte grammar、artifact-set invariants、readable labels与 error / exit mapping。Checked-in schemas、canonical examples、report / console fixtures、annotation fixtures与 consumer tests在同一 hard cut同步；Change不提供 machine-v1 fallback、dual reader / writer或 runtime rollback path。

Publication继续保持 fail-closed顺序：验证 final Core snapshot与 decision evidence，从一个 publication model序列化完整 in-memory machine candidates并渲染 readable report candidate，整体校验 machine set，然后清理 selected artifact directory中的 prior v2 canonical files、prior `report.md`、product-owned temps与退休的 `metrics.json` / `warnings.ndjson` / `warnings-all.ndjson`；两个 machine files与 report都先写 same-directory owned temps，再完成 canonical rename，最后才打印 trusted paths并发布 process outcome。

Artifact work开始后的 handled Core / decision / candidate validation、cleanup、temp write、rename或 report failure会 best-effort移除 v2 canonical files、`report.md`与 owned temps，并以 process `failed`覆盖 computed gate。Pre-work validation在 artifact work开始前失败时保持 zero output I/O，不删除调用者可能指定的旧 artifact directory。`raw/**`可以保留本次 scanner-private diagnostic材料，但不被列为 trusted public output。这仍不是 multi-file transaction；abrupt termination可能留下 residual files，任何 canonical file仍需结合 producing CLI outcome才是 current-run evidence。

### 9. 失败优先级由 owning layer 单点收敛

Pre-work catalog / binding / reference / policy validation failure由 resolution拒绝整个 invocation，任何 binding zero calls。Execution期间，CheckManager以 frozen progress、RecordManager integrity state、ack protocol、terminal report set与 returned candidate validation形成唯一 run diagnostic；runner、scheduler、Output和 CLI不复制或覆盖该 precedence。多个同类问题使用 frozen canonical identity选择 primary diagnostic，不使用 arrival / completion timing。

Foundation contract lock必须在 manager实现前固定 stable diagnostic categories与同一 run内的 exact precedence，至少覆盖 invalid record、record conflict、unknown / foreign / late ack、missing / duplicate / unknown report、invalid returned candidate、unavailable和 throw / rejection组合。无论 primary diagnostic为何，已验证 records / acks的 retention事实保持，failed run的 `result = null`保持。Failed run仍属于 final Core snapshot中的真实事实且 snapshot如实携带 integrity / completeness状态；当前迁移 adapter生成的 requested policies通过自身 readiness将其映射为 `not-evaluated`，其它 policy可显式选择不同处理，omitted gate仍保持 `disabled`。Publication failure不改写 Core facts，但在 process layer优先于 gate-failed outcome。

### 10. 三道 contract lock 与四个检查点控制实施

Exact public / internal grammar只在对应 owner中维护，Change不复制第二份 field inventory。实施先完成下列 contract locks，再进入依赖它们的代码：

1. **Foundation contract lock**：固定 `CheckDefinition` / record-type descriptor / `QualityRecord` normalized grammar、public / private identity边界、canonical identity bytes、`recordId` / catalog fingerprint / diagnostic grammar、failure precedence与 final Core snapshot integrity / completeness状态；由目标 model tests和 runtime validators承接。
2. **Policy / reference contract lock**：固定 named reference evidence statuses、comparison relation envelope、normalized policy grammar、acceptance / views / ordered readiness / boolean `blockWhen` evaluation、typed evidence-ref grammar与 ordering、GateResult shapes / reason codes、human quality / verification status projection及 current `all | changed | regressions` mapping；由 policy / reference tests承接。
3. **Publication contract lock**：固定 machine-v2 schema / instance identities、exact field inventory、ordering、byte grammar、set invariants、stale-v1 / report cleanup、owned temp lifecycle、readable labels / previews、annotation handoff和 error / exit mapping；runtime schemas是唯一 field owner，published materials只是消费视图。

实施使用四个有序检查点：

| Checkpoint | 进入条件 | 必需内部结果 | 放行证据 |
| --- | --- | --- | --- |
| 1. Contract foundation | Foundation contract lock已由失败测试固定。 | Catalog / binding、CheckManager、RecordManager与 direct coordinator在 synthetic runner上形成 final Core snapshot。 | 状态矩阵、identity、ack、record retention / conflict、terminal report与 deterministic diagnostic目标测试通过；局部 diff审阅无 consumer补偿层。 |
| 2. `file-metrics` walking skeleton | Checkpoint 1通过；Policy / reference contract lock已固定；现有 exact-input / source-scope owner已恢复。 | `file-metrics`从 approved inputs经 private adapter、source acceptance与 managers到达 in-memory final Core snapshot。 | 真实 scanner-backed current / reference、越界 batch rejection与 prior-record retention测试通过；没有 public flag、dual output或 compatibility adapter。 |
| 3. Built-ins and policy | Checkpoint 2通过。 | `function-metrics`、`duplicate-detection`、current config adapter、named references与 closed policies共同产生完整 final Core snapshot和 decision evidence。 | 三个 adapters的领域 / cache / source边界、三种 current gate intent、acceptance、comparison incomplete与 GateResult tests通过。 |
| 4. Public hard cut | Checkpoint 3通过；Publication contract lock及 schema / example candidates已固定。 | 唯一 validated publication model驱动 machine v2、report、console、annotation、CLI outcome与 dogfood；旧 paths / readers / facts不可达。 | Output / publication / readable / CLI / consumer tests、migration matrix、owner同步、legacy-path search与 workspace验证通过。 |

前三个检查点只是同一 implementation中的风险控制点，不构成可发布、可归档或长期兼容的中间产品。不得为让检查点独立运行而新增 public feature flag、双写、legacy adapter hierarchy或第二套 schema owner。若任一 contract lock或检查点推翻 stable identity、run / result状态矩阵、reference semantics、source-scope、policy semantics或 output set假设，先更新本设计与后续 tasks并重新确认 plan，不把补偿逻辑扩散到 consumer。

## Risks / Trade-offs

- **Hard cut 同时影响所有消费者。** 内部检查点降低实现风险，但合并出口要求 runtime schemas、machine / readable surfaces、annotation、dogfood和 owners原子同步。
- **Contract lock 可能被误作“边做边定”。** 每道 lock必须先形成可失败的 contract tests / runtime validation artifact；依赖代码不能反向定义 public contract。
- **内部检查点可能被误当成可交付兼容层。** 检查点只提供局部证据，不新增 public selection、双写或长期 adapter；只有 public hard cut完成后才满足 Change outcome。
- **Partial records 容易被误读为完整结果。** 每个 consumer同时保留 owning CheckRun status、coverage与 reference evidence；需要完整性的 policy在 ordered readiness中显式要求，Core不从 records推断成功。
- **Reference failure 与 current failure容易被合并。** Current run只表达 current-side execution；reference evidence单独暴露 unavailable / incomplete，避免丢失可信 current facts。
- **Dynamic catalog 可能跨 invocation漂移。** 每次 invocation只使用一次 canonical frozen catalog与 fingerprint；fingerprint不代表 executable code或 cache validity。
- **Closed policy 可能演化成通用语言。** 只为已证明的跨 Check decision need增加 typed operand / reducer，领域算法继续留在 producing Check。
- **同进程 private binding 仍可能 throw或滥用 port。** Bound provenance、closed reports与 Core validation限制可捕获后果；信任与隔离由 Project Definition owner另行说明。
- **Stale public files可能被误认成 current output。** Artifact work开始后，V2 publication显式清理同一 selected artifact directory中的 prior v2、retired v1与 `report.md` canonical names；pre-work zero-I/O与 abrupt termination仍意味着 consumer必须结合 current CLI outcome判断 evidence。
- **迁移期 JSON source 与目标 Project Definition不同。** 本 Change只建立 source-to-core adapter；Project Definition Change随后删除 JSON selection / schema，不在 Core中留下双模型。

## Open Questions

无。

## Implementation Observations

### 迁移盘点的基线与使用方式

本矩阵记录 Implementation 1.1 开始时的已提交基线，以及 public hard cut 完成时用于
审计的替换和删除证据。`Pre-cut evidence` 指向本 Change 开始时的已提交 product
owner、直接 consumer 和现有语义 Case；它不把 `src/product/quality-core/**` 中并行实施
的未提交内容当作基线。`Target owner` 只指向本文已经决定的 Check / Record / policy /
publication 责任，不复制其字段契约。矩阵第一列和其中的 `Current` 字样均是形成时
快照，不得用于恢复现行 runtime；现行事实只看稳定 owner、代码与测试。每一行的删除
证据已与迁移后的测试和 owner 同时核对；只删除旧名而没有新 owner 的可观察证明不构成
hard cut。

下列术语用于审查，不增加另一套 runtime contract：

- **删除 production path** 表示旧类型、mapper、validator、writer 或 consumer 不再能由
  正式 `scan` 触达。
- **保留退休名清理** 只允许 machine-v2 publication 的同目录 stale-file cleanup 使用
  `metrics.json`、`warnings.ndjson` 和 `warnings-all.ndjson` 这些旧 canonical 名；它不
  允许 reader、writer、schema、DTO 或 annotation fallback 继续使用它们。
- **目标测试 / Case 迁移** 表示更新现有能证明该行为的测试实体及其 Case owner / Proves，
  不把历史 Case 当作当前 coverage，也不为旧实现保留平行 Case。

### Pre-cut-to-target hard-cut matrix

| Pre-cut surface and evidence | Target owner after the cut | Migration and deletion evidence required during implementation |
| --- | --- | --- |
| **Capability invocation.** `runQualityScan` calls `runCurrentRevisionScan`; the latter assembles the fixed `file-metrics`, `function-metrics`, and `duplicate-detection` `CapabilityResult[]` in `src/product/quality-core/src/engine.ts` and `src/product/quality-core/src/measurement/current-revision/index.ts`. Current result grammar and direct failure tests are owned by `model/scan-completeness.ts`, `measurement/current-revision/*.ts`, and `docs/testing/cases/quality-runtime.md`. | Resolved built-in `CheckDefinition`s, one private binding per definition, and CheckManager-owned `CheckRun` / nullable `CheckResult`; scanner adapters remain private producers of records and reference evidence. | Migrate all three built-ins through the frozen binding/coordinator seam. Remove `CapabilityResult`, its fixed-array assembly, and any public/current-run dependence on capability status; prove run/result legality, private adapter failure, and each built-in's source-scoped path with target tests. The Case entries for runtime capability results must instead identify the new manager or built-in owner and observable result. |
| **Completeness and current failure conclusion.** `reduceScanCompleteness` reduces `skipped | no-input | succeeded | failed` into `empty | complete | failed`; `metrics.scanCompleteness` drives validation, report/console labels, incomplete stderr, and process failure in `engine.ts`, `model/scan-completeness.ts`, `engine/scan-finisher.ts`, and `scan-command/command-output*.ts`. Formal CLI coverage is in `configured-project-completeness.test.ts` and the runtime Cases. | Final Core snapshot integrity/completeness derived by CheckManager from frozen work handles, acknowledgements, terminal reports, and final runs; readable status is an Output projection of that snapshot. | Replace reducer and `scanCompleteness` projection rather than translating its result into a second legacy field. Target tests must distinguish pre-work not-applicable, skipped, completed quality failure, execution/integrity failure, zero eligible work, and retained earlier records. Remove legacy completeness validation, report/console branches, and Case Proves after the corresponding final-Core and readable-output evidence exists. |
| **Warnings and accepted-warning channels.** `generateScanWarnings` writes `warnings.all`, `warnings.changed`, and `warnings.regressions`; `output/warnings/**` owns generation, channel ordering, acceptance annotation, and current warning records. `QualityMetrics` embeds the channels, while `qualityCheckStatus` and `qualityVerificationStatus` read `warnings.all`. The five current semantic checks are the consumer-visible warning identities. | RecordManager-owned `QualityRecord`s for the five record types under the three built-in Checks; closed DecisionPolicy owns acceptance, views, readiness, and blocking selection. Human quality / verification status is projected from final Core plus decision evidence. | Convert file, function, and duplicate warnings to records before policy evaluation. Delete the legacy channel generator/reducer and `WarningChannels` as a Core/public publication dependency; do not recreate `all | changed | regressions` as stored channel arrays. Target policy tests must show acceptance, ordered view membership, current blocking order, and `--verification-output` preview-only behavior. Retire warning-channel Cases only when their replacement proves the same caller-visible intent. |
| **Gate mode and result.** `evaluateGate` consumes one of `all | changed | regressions`, completeness, comparison status, and a selected warning channel; `GateResult` is embedded in `QualityMetrics`. `args.ts`, `scan.ts`, `gate-policy.ts`, `model/gate-evaluator.ts`, CLI acceptance tests, and `docs/testing/cases/quality-gate.md` are the direct current owner/consumer set. | Closed named `DecisionPolicy` evaluator and decision evidence over the final Core snapshot, producing the retained public `GateResult` semantics without a fixed warning-channel reducer. The CLI only maps normalized request intent and process outcome. | Keep the three spellings as one-way adapter input to ordinary named policies, with explicit baseline reference handoff; remove `evaluateGate`, channel-selected descriptors, and any Core switch on legacy gate names. Target policy/CLI tests must prove disabled, evaluated, and not-evaluated outcomes; explicit-baseline pre-work failure; accepted-record blocking behavior; and exit `0 | 1 | 2 | 3` mapping. Update gate Cases and CLI help from channel language to policy/publication evidence. |
| **Machine-v1 publication.** `MachineMetricsV1` / `MachineWarningV1` schemas, mappers, serializers, validators, shallow exports, and three-file publication live in `src/product/quality-core/src/output/machine/**` and `src/product/machine-output.ts`. `writeArtifacts` emits `metrics.json`, `warnings.ndjson`, and `warnings-all.ndjson`; their schema/example/fixture and byte-set evidence is owned by `docs/output.md`, `docs/schemas/**`, `docs/examples/**`, and machine tests. | Output-owned validated publication model and machine-v2 runtime schemas that publish only `run.json` and `records.ndjson`; a two-file validator is the shallow machine-consumer boundary. | Replace every v1 mapper/serializer/validator/DTO/export/schema/example/fixture and all three canonical writes with v2 equivalents. Target publication tests must prove candidate validation before writes, two-file relationships, canonical ordering, and no partial trusted set. `metrics.json`, `warnings.ndjson`, and `warnings-all.ndjson` may remain only in explicit stale-v1 cleanup code and cleanup tests; no v1 reader, writer, schema, validator, DTO, or fallback path may remain. |
| **Report and console.** `generateMarkdownReport(metrics, ...)`, `printSummary`, `printGateStatus`, `printWarningStatus`, and `finishScan` project one `QualityMetrics` value into `report.md`, stdout/stderr, completion text, and process outcome. Current report, output, engine, and omitted-gate acceptance tests assert those projections. | Output-readable projections from the same validated publication model used for machine-v2, with CLI owning only the established outcome-to-exit mapping. | Rebuild report/console inputs around final Core and decision evidence, not a compatibility `QualityMetrics` projection. Target fixtures must prove status labels, accepted-record preview, policy evidence/order, artifact-work failure priority, and the unchanged preview-only effect of `--verification-output`. Delete report/console imports and assertions that consume legacy metrics, completeness, warning channels, or v1 DTOs once their replacement projections are covered. |
| **Formal CLI.** `src/product/cli.ts` invokes `runScan`; `scan.ts` resolves config, baseline, dependencies, and options before calling the quality core. `args.ts` advertises the three machine-v1 files. CLI acceptance and omitted-gate suites read the v1 set directly and assert CLI exit behavior. | `scan` remains the formal public entry; it validates/freezes requested policy/reference inputs before work, receives the publication outcome, and preserves process/usage exit mapping. Machine-v2 paths and labels are owned by Output, not by a CLI-side DTO adapter. | Update CLI help, artifact readers, fixtures, and formal acceptance to `run.json` / `records.ndjson` and the validated publication boundary. Preserve zero-output-I/O pre-work failures, raw diagnostic separation, `scan` / `init` routing, flags/profile intent, and exit mapping. Remove imports of `Machine*V1`, direct reads of the three old files, and any CLI-level legacy projection. |
| **Annotation consumer.** `scripts/quality/annotate.ts` defaults to `warnings-all.ndjson`, calls the shallow v1 warning-stream validator, filters `info`, and renders `MachineWarningV1` in `annotate/github.ts`; direct and producer-to-consumer acceptance tests cover it. | `scripts/quality/**` consumes the validated machine-v2 record boundary through the product's shallow v2 validator and renders only annotation-safe record fields. | Change the default artifact/path, validator, renderer input, help/documentation, and direct/producer acceptance together. Prove malformed bytes fail before any annotation and that valid non-empty and zero-record v2 outputs pass. Remove `MachineWarningV1`, `validateMachineWarningStreamV1`, and `warnings-all.ndjson` from the consumer; no annotation fallback to v1 is permitted. |
| **Dogfood wrappers and stable owners.** `scripts/quality/scan.ts` is the one-way Product CLI wrapper; `quality:check`, `quality:full-check`, `quality:gate`, `quality:scan`, and `quality:annotate` expose the dogfood paths. Current stable facts are documented in `docs/architecture.md`, `docs/quality-metrics.md`, `docs/output.md`, `docs/cli.md`, `docs/script-tooling.md`, and the linked testing Cases. | Product runtime continues to own Check / Record / policy / publication facts; dogfood wrappers either call the formal CLI or consume its validated machine-v2 set. Stable docs, schemas, examples, fixtures, and semantic Cases describe only that current contract. | Keep scan wrappers free of independent business logic and migrate annotation as the only machine consumer. At checkpoint 4, update the listed stable owners and their schema/example/Case links, then run a scoped legacy search across `src/product`, `scripts/quality`, current docs/schemas/examples/fixtures, and relevant test support. The search must find no reachable v1 or capability/channel path, except explicit stale-v1 cleanup assertions; a passing consumer acceptance test is required in addition to a clean search. |

### Hard-cut review order

Use the matrix in this order: first establish Check / Record foundation, then move the three
built-ins and policy semantics, then lock machine-v2 publication, and only then replace all
readable, CLI, annotation, and dogfood consumers in one public cut. A consumer may not be
marked migrated merely because a new type exists: its old input path must be unreachable and
its target test must consume the validated new owner. Conversely, stale-v1 cleanup is removal
evidence, not a compatibility exception, and must not reintroduce a reader or writer.

### Checkpoint evidence

- **Checkpoint 1 — Contract foundation:** contract与manager tests通过46项，Test Evidence闭合268个实体；Product typecheck、lint和required workspace verifier通过。Catalog fingerprint覆盖record-type policy surface；unknown boundary在任何field读取前拒绝accessor / Proxy并脱敏；invalid-record evidence按manager-owned safe facts确定性去重。两名未参与对应修复的代理分别重放这三项集成P1反例，均确认清除。`check-record/**`未接入legacy engine、public export、output双轨或scheduler抽象。
- **Checkpoint 2 — `file-metrics` walking skeleton:** 真实受控SCC current / reference exact inputs经`ScopedMeasurement`整批验收后进入private binding、Check / Record managers、safe reference evidence与in-memory policy evaluation。Focused scanner / baseline / scope测试19项、完整`check-record`测试51项及Test Evidence闭合273个实体；Product typecheck、lint通过。独立审查确认越界batch零partial records、current failure为failed/null、reference不伪造第二run或改写current facts、prior records保留且location不进入identity；未接入public flag、output双写或compatibility path。
- **Checkpoint 3 — Built-ins and policy:** current config、scanner dependencies、approved exact inputs、selection与显式baseline通过单一内部composition连接三个built-in Checks、五个record types、validated reference facts、closed policy decision与human projection；`all | changed | regressions`、omitted gate acceptance observation及reference incomplete均由目标测试覆盖。完整`check-record`测试75项通过；独立reviewer重放32项相关测试后确认无P0/P1，function / duplicate多实例identity保持location-independent，changed scope、source-scope与jscpd cache/backend边界无回归。Checkpoint 3 形成时该路径尚未接入正式engine或public output，因此不构成dual path；Checkpoint 4 随后从这一composition和publication contract执行了唯一一次hard cut。
- **Checkpoint 4 — Public hard cut:** 正式engine、CLI、report / console、annotation与dogfood只消费final Core snapshot、decision evidence及同一validated publication model；current machine set固定为`run.json`与`records.ndjson`，runtime schema、五组示例和独立docs validator同步。旧capability / completeness、warning-channel与machine-v1实现和只证明旧路径的测试已删除；retired artifact names仅保留于publication cleanup及对应测试。独立验收审查暴露并关闭了runner terminal boundary、report configuration、human-status单一事实源、mandatory cleanup及watchlist exact-path五项P1，最终复核无剩余P0/P1。目标publication / CLI / annotation tests、Product全套210项、Test Evidence 238/238实体、controlled CLI smoke、owner / Case legacy search、required / full workspace verifier与full dogfood均通过；两个workspace profile各有一个既有quality warning、零failed，最小范围审查确认没有dual-consumer或额外framework。
