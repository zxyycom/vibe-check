# Design

本设计定义从 frozen resolution inputs 到 validated publication set 的唯一正向数据流，并用 CheckManager 与 RecordManager 两个独立事实源重建质量核心。

## Context

当前事实由 `docs/quality-metrics.md`、`docs/output.md`、`docs/cli.md` 和 `src/product/**` 承接：运行时仍以三个编译期 capability、`QualityMetrics`、warning channels、machine v1 和 JSON semantic config 为主干。`src/product/**` 是唯一 runtime owner，scanner command / protocol 保持 adapter-private，comparison reference 必须显式提供，敏感原始材料不得进入公共 artifact。

当前 Scan Scope 与 Scanner Dependency owner 固定 exact-input handoff：Product 统一解释 config glob 并批准 current / baseline exact inputs，adapter 通过 source-scoped measurement 声明 payload 来源，Core 对未批准路径 fail closed，但不读取 payload-specific location 重建领域语义。Check / Record 迁移必须保留这项不变量，不能以通用 Record envelope 重新放宽 scanner 输入或结果范围。

活动未对齐决策已经确认目标边界：`use-runtime-resolved-check-and-record-core`、`separate-check-and-record-type-identities`、`use-location-independent-record-identities`、`keep-sensitive-quality-record-material-ephemeral`、`require-explicit-named-comparison-references`、`keep-decision-policies-closed-and-declarative` 与 `limit-tool-neutrality-to-built-in-checks`。本 Change 实施这些方向；当前 owner 在实现完成并核对前仍描述现行产品事实。

活动已对齐 workflow 决策要求按问题形态选择实现模型并只在触发条件成立时使用预置 TypeScript 能力。实现应让 manager 的稳定身份和生命周期由明确 state owner 承接，让 closed unions 穷尽表达结果与失败，并让 projection、ordering 与 fingerprint 保持纯转换；不得因预装依赖而建立额外 framework 或平行基础原语。

本文拥有本 Change 的目标状态与迁移约束。实施代理先以当前 owner / code / tests 恢复 baseline，再以本文 Decisions 解释将被替换的 surface，并按 `tasks.md` 推进；当前 legacy 实现与目标设计不同不是自行扩大范围的理由。若实施发现本文没有覆盖、且会改变 public behavior、owner、compatibility 或验收的选择，必须先更新 proposal / design / tasks，而不是在 consumer 或 adapter 中隐式决定。

后续 `establish-check-task-orchestration` 只消费本设计的 opaque execution seam，`adopt-typescript-project-definition` 只向 resolution 贡献已验证的 public metadata、policy data 与 private bindings。本设计不提前拥有二者的 authoring 或 scheduler contract。

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
| `QualityRecord` | RecordManager 拥有的 immutable final domain row，包含 Core-bound provenance、stable `recordId`、record-type fields、current location 与可验证 comparison relations。 |
| Terminal execution report | Coordinator 对每个 applicable contribution 恰好返回一个的 private `returned | unavailable | execution-failed` report；它不是 `report.md`，也不携带自报 coverage 或 record count。 |
| Final Core snapshot | 冻结 catalog、final CheckRuns / nullable CheckResults、manager-derived coverage、committed immutable records、reference metadata / evidence status 的只读集合。它不含 policy acceptance annotations、policy body、GateResult 或 output DTO。 |
| Decision evidence | Closed `DecisionPolicy` 从 final Core snapshot 产生的 acceptance / view memberships、readiness evaluation、deterministic typed evidence refs 与一个 `GateResult`；policy 不修改 Core facts，也不复制 Record / Run body。 |
| Validated publication set | Output 将 final Core snapshot 与 decision evidence 投影、schema / relationship validation 后得到的唯一发布模型。Machine files、report、console 与 annotation 共享业务事实，但保留各自 transport / readable contract。 |

目标数据流只有一个方向：

```text
frozen resolution inputs
  -> private bindings / coordinator
  -> CheckManager + RecordManager finalization
  -> final Core snapshot
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

Runner 通过已绑定当前 check / run 的 sink 提交 record candidate。Producing Check 选择 `recordTypeId`、level、semantic subject、safe message、typed fields、current location 与 comparison relations；RecordManager 添加不可伪造的 owner provenance，按 resolved record-type definition 验证并提交 immutable `QualityRecord`。

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
