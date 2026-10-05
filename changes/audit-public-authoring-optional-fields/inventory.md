# 公共 authoring 可省略字段审计

本清单保存 2026-10-05 Draft 阶段的范围判断与形成时证据，供本 Change 复核；现行 API 契约由各行为 owner 定义。

## 当前结果与阅读路径

- **已采纳并实施：** `reconcileFindingWaivers(...).waivers` 省略或显式 `undefined` 等同于 `[]`，仍完整验证 Finding identity。当前契约见[Finding waiver](../../docs/guides/finding-waivers.md#输入与默认值)，实施与验证记录见 [design](design.md)，进度见 [tasks](tasks.md)。
- **本次保留现状：** collector 的 `selection.exclude`、三个 Check 的 area `files`、bundled schema source 的 `catalog` 共五个字段。下文记录各自待判断的范围、授权或 pin 问题，不是后续实施承诺。
- **已交付的先行项：** `changes.flags.<id>.exclude` 不重复实施；省略默认与显式 `undefined` 拒绝规则由 [API 机制](../../docs/api-mechanics.md#按文件变化选择-check)拥有。

下文的 required 声明和 probe 结果均是**实施前观察**，尤其 waiver 省略得到 `TypeError` 的结果已经被本次实现替代。源码位置随实施变化，复核时读取链接中的实际文件；清单不维护第二套现行签名。

## 形成时的判定标准与覆盖

候选须处于真实公共 authoring input，且当时的类型或 runtime 迫使调用方填写；省略须有不依赖外部猜测的语义，并保留输入校验与授权范围。`[]`、`{}` 或固定 literal 只是审阅线索，不足以推导默认值。

| 已审阅入口 | 形成时判断 |
| --- | --- |
| [package root](../../src/index.ts)、[Definition](../../src/project-definition/project-definition.ts)、[Controls](../../src/project-run/controls/contract.ts) | 区分 authoring、resolved 和 readback；defineConfig 已默认化完成态 Definition 的字段，Controls 八个顶层字段均可省略。 |
| [ordinary Check](../../src/check/check.ts)、[inherit](../../src/check/inherited-collection.ts) | 身份与名称必填，policy 大多可省略；prepared shape 要求 prepare，inherit 至少有 add/remove 之一。 |
| [duplicateDetection](../../src/package-checks/duplicate-detection/options.ts)、[fileMetrics](../../src/package-checks/file-metrics/options.ts)、[functionMetrics](../../src/package-checks/function-metrics/options.ts) | 顶层 policy 与阈值已可省略；三个 explicit area 的 files 留待设计判断。 |
| [secretDetection](../../src/package-checks/secret-detection/options.ts)、[JSON](../../src/package-checks/json-validation/options.ts)、[Schema](../../src/package-checks/json-schema-validation/options.ts)、[Markdown lint](../../src/package-checks/markdown-lint/options.ts)、[Markdown links](../../src/package-checks/markdown-link-validation/options.ts) | 领域 policy 与预算多已可省略；完整 secret selection、registry/binding/source identity 保留。bundled catalog 单列。 |
| [reminders](../../src/package-checks/maintenance-reminders/maintenance-reminders.ts)、[commandCheck](../../src/package-checks/command-check/contract.ts) | 实质 entries/limits 与执行目标/预算由调用方决定；command arguments、environment、output、workingDirectory 已可省略。MaintenanceReminderOptions.git 是 constructor 生成值。 |
| [waiver](../../src/package-tools/finding-waivers/reconciliation.ts)、[presentation](../../src/package-tools/finding-presentation/finding-presentation.ts)、[collector](../../src/package-checks/project-files/public-collection.ts)、[cache](../../src/package-tools/cache/cache-json-by-key.ts)、[learned strategy](../../src/package-tools/learned-critical-path/strategy.ts) | waiver 是高置信候选，collector exclude 单列；呈现政策、持久状态与语义 identity 由调用方决定。 |
| [AdmissionGraphInput](../../src/project-definition/scheduler-policy.ts)、[Core 数据工具](../../docs/guides/data-boundaries.md) | 完整 normalized graph、root budget、snapshot keys 与 canonical values 是输入或检查对象，不是第二套 authoring 默认配置。 |

覆盖九项固定身份构造器、command constructor、Definition/Controls、ordinary Check 与常用 tools 的配置面；未逐项审计 callback return grammar、全部输出 DTO、历史 release declarations 或外部 wrapper。形成时为一个高置信候选、五个待设计字段，另列一个已落实先行项。

## 已采纳项的形成时依据：waivers

- **原始输入与结果：** [ReconcileFindingWaiversOptions 与 materialization](../../src/package-tools/finding-waivers/reconciliation.ts) 当时要求 `readonly waivers: readonly FindingWaiver<Identity>[]`；省略将 undefined 送入 canonical array validation 并抛出 `TypeError`。显式 `[]` 返回全部 actionable Finding 和空 audit，同时验证 identity。
- **采纳理由：** 空数组表达“没有配置豁免”，让自定义 Check 始终使用同一 reconciliation pipeline。默认由 helper 的 materialization 边界拥有，Check、Run 与 caller wrapper 无需补偿。
- **保留约束与影响：** 完整候选集、identity 校验、原引用、audit 与非法数组/reason 拒绝均保留；findings/identify 仍必填，null 不 fallback。读取 named options 的 waivers 字段时新增 undefined 分支；无新增输出 schema 或持久 identity。
- **判断依据与证明出口：** [指南](../../docs/guides/finding-waivers.md)、[内部 owner](../../docs/development/package-tools.md)与[waiver Decision](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md)要求完整候选集与审计，未要求必填空数组。本次 Plan 已承接类型、runtime、Case 与安装后验收，结果入口在本文首节。

## 本次保留现状的五个候选

以下拟议默认值只记录调查时的选项；本次不改变这些字段或其 owner/Decision。

### duplicateDetection 的 `codeAreas.<id>.files`

[authoring](../../src/package-checks/duplicate-detection/options.ts) 与 [resolution](../../src/package-checks/duplicate-detection/options-resolution.ts) 当时要求 files；`files: {}` 使用通用 selection baseline，省略拒绝。拟议省略为 `{}` 可简化 threshold/policy-only area，但会让局部比较采用整个 baseline，区域重叠影响共同比较域与 strict policy。

后续判断须对齐[指南](../../docs/checks/duplicate-detection.md)与[共同区域 Decision](../../docs/decisions/compare-duplicates-only-within-common-code-areas.md)的 explicit 共同区域约束，并证明与 `{}` 的 resolved、snapshot/cache identity 等价及 malformed 输入拒绝。

### fileMetrics 的 `codeAreas.<id>.files`

[authoring](../../src/package-checks/file-metrics/options.ts) 与 [resolution](../../src/package-checks/file-metrics/options-resolution.ts) 当时要求 files；`{}` 采用通用 baseline，省略拒绝。拟议省略为 `{}` 可简化 codeLines-only area，但可能扩大 SCC exact-input 并集，重叠区域仍取最严格上限。

后续判断须处理[files/threshold Decision](../../docs/decisions/let-file-metrics-areas-own-files-and-thresholds.md)及[指南](../../docs/checks/file-metrics.md)的 explicit files 约束，保留完整 resolved shape、等价 identity 与非法输入拒绝。

### functionMetrics 的 `codeAreas.<id>.files`

[authoring](../../src/package-checks/function-metrics/options.ts) 与 [resolution](../../src/package-checks/function-metrics/options-resolution.ts) 当时要求 files；`{}` 使用 Check-specific `DEFAULT_FILES`，include 是支持语言的 globs 而非通用 `**/*`，省略拒绝。拟议省略为 `{}` 可简化 threshold-only area，但可能扩大 analyzer input，影响重叠区域的 strict limit/blocking policy。

后续判断须对齐[defaulted-area Decision](../../docs/decisions/construct-function-metrics-from-defaulted-area-policy.md)与[指南](../../docs/checks/function-metrics.md)的 explicit files 条件，保留该 Check 的默认值、explicit overrides 和 identity。

### collectProjectFiles 的 `selection.exclude`

[collector façade](../../src/package-checks/project-files/public-collection.ts) 当时接受完整 [ProjectFileSelection](../../src/package-checks/project-files/configuration.ts)，exact-key 校验 source/include/exclude，缺 exclude 拒绝。拟议默认 `[]` 表示不追加排除，与 package baseline 的常见排除不同。

后续判断须对齐[collector Decision](../../docs/decisions/provide-synchronous-single-selection-file-collection.md)和[完整 selection 指南](../../docs/guides/collecting-project-files.md)，保留 source/include 显式授权与拼错字段拒绝。若接受 partial authoring，应独立于供 secretDetection/内部 execution 使用的完整 selection type；不能扩大 filesystem/Git selection 授权。

### jsonSchemaValidation 的 `referenceResolution.sources[].catalog`（bundled branch）

[authoring](../../src/package-checks/json-schema-validation/options.ts) 与 [validator](../../src/package-checks/json-schema-validation/options-validation.ts) 当时要求 exact `{ kind: "bundled", catalog: "json-schema-2020-12" }`，缺 catalog 拒绝。拟议默认固定 catalog 可省去唯一 literal，但未来演进可能改变 explicit pin 与 engine identity。

后续判断须对齐[指南](../../docs/checks/json-schema-validation.md)和[引用来源 Decision](../../docs/decisions/allow-explicitly-controlled-json-schema-reference-sources.md)：若采用默认，需决定长期固定策略，保留 normalized catalog 与非法值拒绝；bundled 的省略语义不提供 HTTPS 授权。

## 保留必填的代表字段与理由

本表保存调查判断；精确签名和规则继续读取所链接的行为 owner。

| 字段 | 保留理由与依据 |
| --- | --- |
| `Check.checkId/displayName` | 身份和人读名称是内容；普通 Check 没有固定构造器的 package-owned 默认。见[Definition](../../docs/development/project-definition.md)。 |
| `changes.source.compareWith`、`changes.flags`、region `include` | revision、至少一个 region 和 include 决定选择政策；include `[]` 是明确不命中。见[Definition](../../docs/development/project-definition.md)。 |
| `secretDetection.files` 与完整 selection | 完整 selection 是唯一输入授权，没有隐式全仓 fallback。见[安全指南](../../docs/checks/secret-detection.md)与[Decision](../../docs/decisions/add-secret-detection-to-package-check-contract.md)。 |
| `commandCheck.executable/timeoutMs/outputByteLimit` | 行动目标与资源预算由调用方确定，跨工具没有安全通用值。见[command 指南](../../docs/guides/command-check.md)。 |
| `cacheJsonByKey.directory/key/namespace/version/parse/compute` | 写入授权、缓存 identity 和 payload 语义由调用方拥有，猜测版本可能复用陈旧结果。见[cache 指南](../../docs/guides/cache-results.md)。 |
| learned strategy `stateDirectory/identityForTask` | 持久状态位置与时长可比性需要显式政策，taskId-only identity 不足。见[learned 指南](../../docs/guides/learned-scheduling.md)。 |
| presentation `limit/message/omittedMessage/findings` | producing Check 决定安全字段、上限与完整明细；findings 是待呈现数据。见[presentation 指南](../../docs/guides/presenting-findings.md)。 |
| schema registration/binding/HTTPS source 的 identities 与 scopes | 显式本地绑定和精确网络 scope 不能由环境 registry、文件发现或 URL 猜测。见[Schema 指南](../../docs/checks/json-schema-validation.md)。 |
| reminder `entries` 与 `id/baseCommit/limits/message` | 实际复核基线、阈值和提示正文由维护者决定。见[reminder 指南](../../docs/checks/maintenance-reminders.md)。 |
| admission graph 的完整 DTO 与 `maxParallel` | normalized 静态图与容量决定模拟结果。见[模拟指南](../../docs/guides/simulating-admission.md)。 |

## 形成时 probe 与证据边界

调查时仅通过 package-root API 调用 constructor/纯 helper；未 Run Check、启动 scanner/child、枚举项目、建立 cache/history/产物或请求网络。

| 实施前 probe 输入 | 当时结果 |
| --- | --- |
| waiver helper 显式 `waivers: []` | accepted；同原 Finding 引用的 actionable item，audit 为空。 |
| waiver helper 省略 waivers，以 `Reflect.apply` 绕过必填类型 | `TypeError`；此旧结果已由本次实现替代。 |
| 三个质量 constructor 的 `codeAreas: { custom: { files: {} } }` | 全部 accepted。 |
| 三个质量 constructor 的 `codeAreas: { custom: {} }` | 全部 `TypeError`。 |
| schema allowlisted bundled source 显式 catalog `json-schema-2020-12` | accepted。 |
| 同 bundled source 省略 catalog，以 `Reflect.apply` 传入 | `TypeError`。 |

collector 与保留必填项主要依据声明、validation source 和 owner，未逐项运行 probe。调查阶段未运行产品回归、authoring typecheck、全 Gate、build 或 installed consumer；这些不限制后来 waiver Plan 已完成的验证，也不证明五个未采纳候选的拟议行为。

先行 exclude 与指南曾通过 candidate `0.0.0-local.d0c87bf2967e` 的全 Gate 43/43、670 entities / 161 Cases 闭合，只覆盖当时已交付内容。waiver 实施的优化前证据另见 [design](design.md#文档优化前的实施与验证记录)，优化后需重新验证；上述本地 candidate 验收均不表示正式发布。
