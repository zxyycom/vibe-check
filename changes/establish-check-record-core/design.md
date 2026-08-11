# Design

本设计以 CheckManager 与 RecordManager 两个独立事实源重建质量核心，并通过冻结输入、受控 ports 和最终 snapshot 连接 execution、policy 与 output。

## Context

当前事实由 `docs/quality-metrics.md`、`docs/output.md`、`docs/cli.md` 和 `src/product/**` 承接：运行时仍以三个编译期 capability、`QualityMetrics`、warning channels、machine v1 和 JSON semantic config 为主干。`src/product/**` 是唯一 runtime owner，scanner command/protocol 保持 adapter-private，comparison reference 必须显式提供，敏感原始材料不得进入公共 artifact。

活动未对齐决策已经确认目标边界：`use-runtime-resolved-check-and-record-core`、`separate-check-and-record-type-identities`、`use-location-independent-record-identities`、`keep-sensitive-quality-record-material-ephemeral` 与 `require-explicit-named-comparison-references`。本 Change 实施这些方向；当前 owner 在实现完成并核对前仍描述现行产品事实。

后续 `establish-check-task-orchestration` 只消费本设计的 opaque execution seam，`adopt-typescript-project-definition` 只向 resolution 贡献已验证的 public metadata、policy data 与 private bindings。本设计不提前拥有二者的 authoring 或 scheduler contract。

## Goals / Non-Goals

**Goals**

- 为 definition、execution、quality verdict、逐条 record 和 policy decision 建立互不混用的稳定词表与 owner。
- 在任何 work 前验证并冻结完整 Check/record-type catalog、private binding table、selection、applicability 和 planned domain work。
- 保留 runner failure 前已经可信提交的 records 与 acknowledgements，同时使最终 coverage 和 failure 如实可见。
- 让 direct execution 与后续静态 TaskPlan 共用一个完整 contribution batch / terminal report seam。
- 让 machine、human、annotation 和 gate 消费同一 final snapshot，并一次性退出旧事实源。

**Non-Goals**

- Project Definition/module loading、第三方 provider 或 custom command protocol。
- TaskPlan、DAG、并发、resource、cancellation、timeout、drain、retry 或 runtime registration。
- 任何后续 feature Check 的具体检测算法或专用字段。
- machine v1、legacy warning channel、旧 capability status 或 gate alias 的兼容层。

## Decisions

### 1. Public catalog 与 private binding 分别冻结

Resolution 产生 canonical、serializable `CheckDefinition[]` 与独立的一对一 `CheckExecutionBinding` table。`CheckDefinition` 拥有稳定 `checkId`、record-type catalog、public result metadata 与 policy-visible fields；不包含 runner、function、Task 或执行状态。Catalog fingerprint 只覆盖 canonical public data。

每个 applicable resolved invocation 由 binding 产生一个 Core 不解释 payload 的 `CheckExecutionContribution`。CheckManager 加入自己的 `checkId`、`checkRunId` 与 invocation correlation 后，把完整 frozen batch 交给 coordinator；coordinator 必须为每项 contribution 返回且只返回一个 closed `returned | unavailable | execution-failed` report。现有 direct runner 只是第一种 private adapter。

### 2. CheckRun 与 CheckResult 使用严格合法组合

`CheckResult.verdict` 的 closed union 是 `passed | failed | not-applicable`。`not-applicable` 只由 Core 在 execution 前的 applicability 判定产生；applicable binding 只能返回 `passed | failed` candidate，返回 `not-applicable` 属于 invalid result。三种合法 result 都表示 run 已完成 lifecycle；quality `failed` 不是 run `failed`，因此不会阻止只要求 lifecycle readiness 的下游 Check。

每个 resolved definition 在 invocation 中恰有一个 `CheckRun`：

| Run status | Result | 含义 |
| --- | --- | --- |
| `skipped` | `null` | Definition 存在但本次未请求，不解析 applicability 或执行。 |
| `completed` | 一个 result | pre-work 得到 `not-applicable`，或 applicable execution 正常返回合法 `passed | failed` verdict。 |
| `failed` | `null` | dependency、execution、protocol、record integrity 或 result validation 未正常完成。 |

Selection 和 applicability 在 contribution building 前冻结。Requested/not-applicable Check 由 Core 直接完成且不进入 coordinator；applicable zero-work Check 仍必须通过 binding 返回领域结果。Core 不从 record 数量、ack 数量或 execution failure 推断领域 verdict，也不接受 execution 把 `not-applicable` 作为 returned candidate。

### 3. Coverage 只由 manager-owned domain work 决定

每个 applicable invocation 拥有 invocation-private opaque domain-work handles。CheckManager 提供增量 ack port：首次合法 ack 完成 owned handle，重复 ack 幂等，unknown/foreign/late ack 是 protocol violation。Coordinator report 不携带自报 coverage 或 record count；Core 从冻结 handles、ack state 与 RecordManager state 形成最终 run snapshot。

该 seam 允许后续一个 Task 对应零到多个 handles，但 Task 的数量、身份和拆分不改变公共 coverage。

### 4. RecordManager 独立提交 final domain rows

Runner 通过已绑定当前 check/run 的 sink 提交 record candidate。Producing Check 选择 `recordTypeId`、level、semantic subject、safe message、typed fields、current location 与 comparison relations；RecordManager 添加不可伪造的 owner provenance，按 resolved record-type catalog 验证并提交 immutable `QualityRecord`。

稳定 record ID 只使用 `checkId`、`recordTypeId`、规范化 semantic subject 与 catalog 明确声明的 identity fields；line、column、range、message 和 arrival order 不参与。等价 same-ID replay 幂等；same-ID/different-body 是 arrival-neutral integrity conflict，不能让任一先到值成为可信输出。普通 invalid candidate 或后续 runner failure 不回滚其它已提交记录。

原始 secret bytes、credential URL、可关联 digest 与其它敏感源材料只留在 producing Check 的 bounded invocation memory；公共 ports、diagnostics、identity、cache 和 artifacts 只接收安全身份与必要脱敏证据。

### 5. Policy 是 closed snapshot consumer

`DecisionPolicy` 是经 owner validation 的 closed declarative value，不是第三个 executable extension point。Evaluator 以固定阶段处理 acceptance annotations、named record views 和一个 `blockWhen`，只查询 immutable Check/Record/reference snapshot 中 catalog 允许的 typed operands。任意 function、script、property walk 或未注册 operand 在 work 前拒绝。

Caller 为每个 policy-required named reference 显式提供 input；CLI 在 work 前解析并冻结 reference identity。Producing Check 拥有 matching/comparison relation，RecordManager 验证 relation，policy 只查询已发布事实。Core 不从 branch、history、remote、cache 或 policy 名补猜 reference。

### 6. 三个现有能力一次性迁移为 built-in Checks

保留稳定 Check IDs `file-metrics`、`function-metrics`、`duplicate-detection`。当前五个 semantic check identities 分别成为所属 definition 的 record types：`file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、`function-parameter-count`、`duplicate-code`。Scanner dependencies、native reports 和 backend identities 保持 private。

当前 JSON semantic config 只在本 Change 的迁移边界被解析为 built-in definition inputs、acceptance 与一个 named `regressions` policy；它不成为新 Core model，也不限制后续 `adopt-typescript-project-definition` 对 source selection 与 authoring 的 hard cut。新的 Core owners 不保留 legacy capability/warning aliases。

### 7. Machine v2 只发布最终快照与决策证据

`run.json` 发布 public catalog/fingerprint、每个 final CheckRun/CheckResult、derived coverage summary、named reference metadata、acceptance/view memberships 与一个 GateResult；它不发布 bindings、contributions、ExecutionReports 或 resolved policy body。`records.ndjson` 按 canonical identity order发布 QualityRecords，并要求每条 record 精确引用一个 owning run。`report.md`、console 与 annotation 从相同 validated set 投影。

Producer 在 publication 前验证 definition/run cardinality、run identity/result sum、coverage、record identity conflict、exact ownership 和 policy evidence。Machine v1、warning streams、旧 channel mapper 与 dual readers/writers在同一迁移中删除；失败时不发布看似可信的部分 artifact set。

### 8. 失败优先级由 Core 单点收敛

CheckManager 以 frozen progress、RecordManager integrity state、terminal report 与 returned candidate validation 形成唯一 run diagnostic。Scheduler、runner、output 和 CLI 不复制 primary failure precedence。Policy 只在可信 final snapshot 上运行；产品或 publication integrity failure 不能伪装成质量 `failed` verdict。

## Risks / Trade-offs

- **Hard cut 同时影响所有消费者。** 实施按 model/manager → built-in adapters → policy → output/CLI/consumers 顺序推进，但合并出口要求旧链路全部不可达且 canonical examples 同步。
- **Partial records 容易被误读为完整结果。** 每个 consumer 同时保留 owning CheckRun status 与 coverage；policy 可显式要求 run 完成。
- **Dynamic catalog 可能跨 invocation 漂移。** 每次 invocation 只使用一次 canonical frozen catalog 与 fingerprint；不把 fingerprint 当作 executable attestation。
- **Closed policy 可能演化成通用语言。** 只为已证明的跨 Check decision need 增加 typed operand/reducer，领域算法继续留在 producing Check。
- **同进程 private binding 仍可能 throw 或滥用 port。** Bound provenance、closed reports 与 Core validation 限制可捕获后果；信任与隔离由 Project Definition owner另行说明。
- **迁移期间 current JSON source 与目标 Project Definition 不同。** 本 Change 只建立临时 source-to-core adapter；Project Definition Change 随后删除 JSON selection/schema，不在 Core 中留下双模型。

## Open Questions

无。实现顺序、身份映射、public/private 边界、失败组合、artifact hard cut 与下游 seam 已确定；具体模块拆分遵循 `src/product/**` 当前 owner 和编码规范，不改变本设计。
