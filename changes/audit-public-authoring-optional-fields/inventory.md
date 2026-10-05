# Public authoring optional-field inventory

形成于 2026-10-05 的本 Change 调查证据；这是 Draft 的临时范围资源，不是第二份公共规范。源码位置的行号仅用于复核形成时依据，恢复时优先读取实际文件。判断计数：**新增高置信候选 1 个字段，需设计判断 5 个字段，另列已落实先行项 1 个字段**；不把排除项算成候选。

## 判定标准与覆盖

一个候选必须同时满足：字段处于真实公共 authoring input；类型或 runtime 迫使显式填写；存在不依赖外部猜测的省略语义；省略不绕过有效输入校验、扩大能力或把未配置误当已配置。`[]`/`{}`/固定 literal 只是线索。

| 已读取入口 | 调用输入与当前判断 |
| --- | --- |
| [package root](../../src/index.ts) | public export 路由，区分 authoring、helper、resolved 与 readback。 |
| [ProjectDefinition / defineConfig](../../src/project-definition/project-definition.ts) L119–137、189–221 | 完成态 Definition 必填 apiVersion/checks/outputs/scheduler；`defineConfig` input 已可省略这些字段并物化默认值。不是四个漏设 optional 的字段。changes region 另列。 |
| [RunControls](../../src/project-run/controls/contract.ts) L10–30 | 八个顶层字段全可省略；outputs 为嵌套 Partial。没有新增候选。 |
| [ordinary Check](../../src/check/check.ts) L380–438；[inherit](../../src/check/inherited-collection.ts) L4–7 | identity/displayName 必填，其余 policy 大多 optional；prepared shape 不同才强制 prepare。`inherit` 至少有 add/remove 之一，而另一项已可省略，不必填两份空数组。 |
| [duplicateDetection](../../src/package-checks/duplicate-detection/options.ts)、[fileMetrics](../../src/package-checks/file-metrics/options.ts)、[functionMetrics](../../src/package-checks/function-metrics/options.ts) | 顶层 policy 与嵌套阈值已经 optional；explicit code area 的 files branch 是三个待设计字段。 |
| [secretDetection](../../src/package-checks/secret-detection/options.ts) | files 完整输入授权必填；三个预算及 waivers 已 optional。安全边界保留。 |
| [jsonValidation](../../src/package-checks/json-validation/options.ts)、[jsonSchemaValidation](../../src/package-checks/json-schema-validation/options.ts)、[markdownLint](../../src/package-checks/markdown-lint/options.ts)、[markdownLinkValidation](../../src/package-checks/markdown-link-validation/options.ts) | 顶层领域 options 与 work limits 已 optional；schema source 的固定 catalog 另列。显式 registry/binding/source identities 不是中性填空。 |
| [maintenanceReminders](../../src/package-checks/maintenance-reminders/maintenance-reminders.ts) L38–73、146–168 | entries 是实质政策集合；每项 limits 至少表达一项阈值，mode 已 optional；`MaintenanceReminderOptions.git` 是 constructor 生成的完整值，不是 object constructor input 的必填项。 |
| [commandCheck input](../../src/package-checks/command-check/contract.ts) L83–121 | arguments、environment.variables/overrides、output 与 workingDirectory 已 optional；身份、executable、timeoutMs/outputByteLimit 必填，另列保留理由。 |
| [waiver helper](../../src/package-tools/finding-waivers/reconciliation.ts)、[presentation helper](../../src/package-tools/finding-presentation/finding-presentation.ts) | waiver array 是新增高置信项；presentation 的 limit/hooks 没有 generic 安全默认。 |
| [collectProjectFiles](../../src/package-checks/project-files/public-collection.ts)、[cacheJsonByKey](../../src/package-tools/cache/cache-json-by-key.ts)、[learned strategy](../../src/package-tools/learned-critical-path/strategy.ts) | collector exact exclude 另列；cache/history 的 state 和 semantic identity 保留必填，其数字 knobs 已 optional。 |
| [AdmissionGraphInput](../../src/project-definition/scheduler-policy.ts) L6–12、[Core 数据工具](../../docs/guides/data-boundaries.md) | 模拟器接受已规范化完整 graph 与显式 root budget，不是第二 authoring DSL；snapshot keys 和 canonical values 是检查目标，不默认填充。 |

覆盖九项固定身份构造器、command constructor、Definition/Controls、ordinary Check 的配置面与常用 tools；未逐一审计所有 callback return grammar、每个输出 DTO、历史 release declarations 或外部 wrapper。

## A：新增高置信候选

### A1 — `reconcileFindingWaivers(input).waivers`

- **准确类型**：[ReconcileFindingWaiversOptions](../../src/package-tools/finding-waivers/reconciliation.ts) L59–65，`readonly waivers: readonly FindingWaiver<Identity>[]` 必填。public export 在 [index](../../src/index.ts) L158–167。
- **Runtime**：同文件 L82–86 无默认直接 `materializeWaivers(options.waivers)`；L127–134 canonicalize 后强制 array。省略传入 `undefined`，得到 `TypeError`。显式 `[]` 经过同一算法，findings 全部 actionable、waiverAudits 为空；findings 的 identify/canonical identity 仍被验证。
- **拟议自然默认**：`[]`，表示没有配置任何豁免。own `undefined` 推荐同 omission；`null` 或其它非法显式值不应 fallback。默认无豁免不等于默认无 findings。
- **收益/责任**：自定义 Check 可以始终调用同一 reconciliation pipeline，不必在无例外时附一份 `waivers: []`。由 package tool 输入/materialization boundary 拥有默认，不由 Check、Run 或调用者 wrapper 补偿。
- **安全/歧义**：不会增加 waiver、丢 Finding 或跳过 identity 校验；不改变完整 finding 集合要求、过宽 waiver 处置、duplicate/reason/hostile-array 拒绝。不可顺带把 findings 或 identify 设默认。
- **兼容/identity**：现有 explicit `[]` 和非空 waiver array 应保持相同输出。named options 类型的 indexed-access consumers 会新增 `undefined` 分支，需审查声明影响；helper 不拥有 Definition fingerprint 或持久 cache，不创造新 schema 字段。
- **owner/Decision**：[Finding waiver 指南](../../docs/guides/finding-waivers.md)、[工具内部 owner](../../docs/development/package-tools.md)、[活动 waiver Decision](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md)。Decision 要求完整 candidates 与审计，未要求通过强制空数组表达“无 waiver”。因此这是新增高置信候选，不是完成的产品变更。
- **未来证明**：omitted/undefined/explicit-empty 的类型与输出等价；非空 waiver 审计不变；非法显式 arrays/identity/reason 仍失败；代表性 installed consumer 与用户指南同步。

## B：需设计判断的字段

### B1 — `duplicateDetection(options).codeAreas.<id>.files`

[authoring 类型](../../src/package-checks/duplicate-detection/options.ts) L53–61 强制 `files: ProjectFileSelectionOptions`；[runtime resolution](../../src/package-checks/duplicate-detection/options-resolution.ts) L93–114 强制 required files 后解析；省略拒绝，`files: {}` 已采用通用 `defaultProjectFileSelection`（默认 source、include、exclude）。

可拟议省略为 `{}`，保留 explicit area 并采用该 Check 默认 selection。收益是只定制 threshold/findingPolicy 时免填空对象。但遗漏 files 可能让本应局部的比较区域默认为整个 baseline；多个重叠区域会形成共同比较域并改变 strict policy。必须先明确此收益是否大于误配置成本，保留 unknown/malformed files 拒绝，并证明 omission 与 `{}` 的 resolved、snapshot/cache identity 等价。[当前 area guide](../../docs/checks/duplicate-detection.md) 有意要求 files；[活动共同区域 Decision](../../docs/decisions/compare-duplicates-only-within-common-code-areas.md) 强调 explicit 共同区域，不引入隐式 global area。暂不批准 optional。

### B2 — `fileMetrics(options).codeAreas.<id>.files`

[authoring 类型](../../src/package-checks/file-metrics/options.ts) L35–41 必填；[runtime resolution](../../src/package-checks/file-metrics/options-resolution.ts) L107–121 使用 required files；`{}` 得到通用 baseline，省略拒绝。拟议 omission 为 `{}` 允许仅定制 codeLines，但会扩大 SCC exact-input 并集，区域重叠时最严格上限生效。原显式输入无需迁移；若批准，要保持 complete resolved shape 和与 `{}` 等价身份、拒绝 malformed explicit files。必须处理[活动 files/threshold Decision](../../docs/decisions/let-file-metrics-areas-own-files-and-thresholds.md) 明确“每个 area 必须声明 files branch”的约束与[用户指南](../../docs/checks/file-metrics.md)。暂不批准 optional。

### B3 — `functionMetrics(options).codeAreas.<id>.files`

[authoring 类型](../../src/package-checks/function-metrics/options.ts) L39–45 必填；[runtime resolution](../../src/package-checks/function-metrics/options-resolution.ts) L77–91 强制 files。`{}` 采用同文件 L30–34 的 `DEFAULT_FILES`，其 include 为支持语言 globs，不是通用 `**/*`；省略拒绝。拟议 omission 为 `{}` 可免填 threshold-only area 的空对象，但可能扩大 analyzer input、引入重叠区域 strict limit/blocking policy。若批准，省略必须保留 Check-specific default，不改变 explicit overrides/identity；先处理[活动 defaulted-area Decision](../../docs/decisions/construct-function-metrics-from-defaulted-area-policy.md) 的 explicit-files 条件和[用户指南](../../docs/checks/function-metrics.md)。暂不批准 optional。

### B4 — `collectProjectFiles(options).selection.exclude`

[类型](../../src/package-checks/project-files/public-collection.ts) L14–18 要求完整 `ProjectFileSelection`，其[定义](../../src/package-checks/project-files/configuration.ts) L24–28 必填 exclude/include/source；runtime façade L70–80 exact-key 校验三字段，缺 exclude 拒绝。`[]` 已表示不追加排除。潜在 default 为 `[]`；不能偷偷换成 default baseline 的常见排除，否则“无排除”与“使用 package baseline”两种语义混淆。

source/include 仍显式时，optional exclude 有减轻空数组负担的价值，但 current collector 有意不推断 Check defaults；省略拼错的排除字段仍须报错，不能扩大 filesystem/Git selection 授权。已有完整 selection consumers 不需迁移；新的 partial input 需要独立 authoring type，不能放宽同时供 secretDetection/内部 execution 使用的 `ProjectFileSelection`。处理[活动 collector Decision](../../docs/decisions/provide-synchronous-single-selection-file-collection.md) 和[完整 selection 指南](../../docs/guides/collecting-project-files.md) 后再判断，当前暂保留。

### B5 — `jsonSchemaValidation(options).referenceResolution.sources[].catalog`（`kind: "bundled"` branch）

[类型](../../src/package-checks/json-schema-validation/options.ts) L23–35 的 bundled branch 要求唯一 literal `catalog: "json-schema-2020-12"`；[runtime validator](../../src/package-checks/json-schema-validation/options-validation.ts) L85–97 要求 exact `{ kind, catalog }` 且匹配该 literal。source catalog 显式正确时可构造，缺 catalog 拒绝。

拟议 omission default 为固定 2020-12，可避免在唯一 catalog 下复写 literal；`kind: "bundled"` 仍需明确，不能因 omission 变 HTTPS 读授权。风险是未来增加 catalog 时默认迁移或更新会抹掉 explicit pin，改变 schema validation/engine identity；若批准，默认必须长期固定，完整 normalized catalog 继续进入 options，invalid explicit catalog 不 fallback。当前[指南](../../docs/checks/json-schema-validation.md) 要求完整 discriminated branch，[活动引用来源 Decision](../../docs/decisions/allow-explicitly-controlled-json-schema-reference-sources.md) 要求 package 固化、可验证 catalog。是否要保留显式 pin 属于设计判断，不当作机械冗余删除。

## C：应保留必填的代表字段

| 字段路径 | 类型 + runtime/owner 依据 | 为什么不选择默认值 |
| --- | --- | --- |
| `Check.checkId`、`Check.displayName` | [CheckBase](../../src/check/check.ts) L380–384；[Definition owner](../../docs/development/project-definition.md) 全树唯一/nonempty 校验。 | identity 与人读名称是内容，不是填空；普通 Check 不像固定身份 constructor 有 package-owned 默认。 |
| `changes.source.compareWith`、`changes.flags`、`changes.flags.<id>.include` | [changes parser](../../src/project-definition/project-changes.ts) 的 parseSource/parseFlags/parseRegion；[Run/Definition owner](../../docs/development/project-definition.md)。 | comparison revision、至少一个 region 与 include 决定实际选取，默认分支或全量 include 都会猜测项目政策；include `[]` 是明确不命中，不能把缺省悄然解释为“不检查”。 |
| `secretDetection(options).files` 及 `files.source/include/exclude` | [类型](../../src/package-checks/secret-detection/options.ts) L9–10；[runtime](../../src/package-checks/secret-detection/options-resolution.ts) L20–24 + validProjectFileSelection exact shape；[安全指南](../../docs/checks/secret-detection.md) 与[活动 Decision](../../docs/decisions/add-secret-detection-to-package-check-contract.md)。 | 完整 selection 是唯一输入授权，没有隐式全仓 fallback。即使 exclude `[]` 看似中性，也不自动抹掉此完整授权声明。 |
| `commandCheck(input).executable/timeoutMs/outputByteLimit` | [类型](../../src/package-checks/command-check/contract.ts) L87–91；[runtime](../../src/package-checks/command-check/options.ts) L31–37、148–162；[command 指南](../../docs/guides/command-check.md)。 | executable 是行动目标；timeout 与 byte ceiling 是 caller 明确的 resource budget，无跨工具安全通用值。arguments 已默认 `[]`，不需改这些字段来免填空数组。 |
| `cacheJsonByKey(options).directory/key/namespace/version/parse/compute` | [类型及 exact parser](../../src/package-tools/cache/cache-json-by-key.ts) L25–38、115–168；[cache 指南](../../docs/guides/cache-results.md)。 | directory 授权本地写入，semantic identity 和 payload parser/compute 由 caller 拥有；默认 `version: "1"` 只是猜测，可能复用陈旧结果。 |
| `createLearnedCriticalPathStrategy(options).stateDirectory/identityForTask` | [类型/runtime](../../src/package-tools/learned-critical-path/strategy.ts) L29–41、64–85、135–159；[learned 指南](../../docs/guides/learned-scheduling.md)。 | 默认目录产生隐式持久状态；taskId-only identity 不能覆盖时长可比性，降级 static 不说明缺失政策是合法输入。 |
| `presentCheckFindings(input).limit/message/omittedMessage/findings` | [类型/runtime](../../src/package-tools/finding-presentation/finding-presentation.ts) L22–49；[presentation 指南](../../docs/guides/presenting-findings.md)。 | producing Check 决定安全字段、上限和完整明细位置；没有 generic omitted-message 文案/默认无限 limit。findings 是待呈现的数据，不 default 成无结果。 |
| `RegisteredJsonSchema.id/path`、binding `id/instancePath/schemaId`、HTTPS source `id/origin/pathPrefix` | [类型](../../src/package-checks/json-schema-validation/options.ts) L26–64；[runtime](../../src/package-checks/json-schema-validation/options-validation.ts) L99–159；[指南](../../docs/checks/json-schema-validation.md)。 | identity、显式本地绑定和精确网络 scope，不能由 URL、文件发现、root pathPrefix 或 ambient registry 代替。 |
| `MaintenanceReminder.id/baseCommit/limits/message`、constructor `entries` | [类型](../../src/package-checks/maintenance-reminders/maintenance-reminders.ts) L38–73；[entry validator](../../src/package-checks/maintenance-reminders/options-validation.ts)；[指南](../../docs/checks/maintenance-reminders.md)。 | 真实复核基线、阈值与提示正文由维护者决定；缺 limits 不是一个中性提醒政策。entries 是调用工具的实质输入，非强制默认配置。 |
| `AdmissionGraphInput.graph/maxParallel` 及其 `graph` 内完整 DTO 字段 | [类型](../../src/project-definition/scheduler-policy.ts) L6–12；[standalone input validator](../../src/project-run/task-scheduler/admission-core/input.ts)；[模拟指南](../../docs/guides/simulating-admission.md)。 | 输入是已 normalized 的静态图，不是便捷 authoring tree；guess capacity/依赖集合会改变模拟。可直接采用 callback graph，不能因为 DTO 中有空数组就计作 ordinary API 漏设 optional。 |

## D：已落实先行项

`changes.flags.<id>.exclude` 已落实为[可省略的 authoring 字段](../../docs/api-mechanics.md#按文件变化选择-check)；[当前类型与 parser](../../src/project-definition/project-changes.ts) L15–35、84–103 与[Definition owner](../../docs/development/project-definition.md)一致：省略补齐冻结 `[]`，include 仍必填，自有 `undefined`、`null` 和非法数组仍拒绝；Run 与 snapshot 消费必含 exclude 的完整 normalized region，省略与显式 `[]` 的 effective selection/fingerprint 等价。该项不属于本 Draft 的新增候选、待决或重复实施范围。

形成时最初观察到的 required/exact 两键声明已被同轮先行实施替代。[Definition 边界证据](../../src/project-definition/project-changes.test.ts)覆盖 omission、explicit-empty、normalized/fingerprint 和 malformed input；当时主线程交接确认 25 项 Definition/Git/lifecycle/API-inventory tests、Product/scripts 类型检查、lint 与 669 entities/161 Cases 完整性检查通过，非实施 review 无阻断。后续指南交付已通过 exact local candidate `0.0.0-local.d0c87bf2967e` 的完整 Gate 43/43 及 670 entities/161 Cases 闭合，含安装后验收；该证据只覆盖已落实先行项与指南，不证明本 Draft 的待议可选行为，也不表示正式发布。

## 验证证据与复核边界

已执行 constructor/纯 helper probes，输入均通过 package-root API，**不 run Check、不启动 scanner/child、不枚举项目、不建立 cache/history 或产物、不请求网络**：

| Probe | 实际结果 |
| --- | --- |
| `reconcileFindingWaivers({ findings: [{ id: "finding" }], identify: f => f.id, waivers: [] })` | accepted；结果为同原 finding reference 的 actionable item，`waiverAudits: []`。 |
| 同 helper 省略 waivers，以 `Reflect.apply` 绕过静态必填限制 | `TypeError`。这是当前 runtime 证据，不是 proposed optional 类型证明。 |
| 三个质量 constructor，`codeAreas: { custom: { files: {} } }` | 全部 accepted。 |
| 三个质量 constructor，`codeAreas: { custom: {} }` | 全部 `TypeError`。 |
| schema constructor，`referenceResolution: { mode: "allowlisted", sources: [{ kind: "bundled", catalog: "json-schema-2020-12" }] }` | accepted。 |
| 同 schema source 省略 catalog，以 `Reflect.apply` 传入 | `TypeError`。 |

可在仓库根复核 A1 的最小命令（仅现行 runtime，不改变代码）：

```sh
bun -e 'import { reconcileFindingWaivers as reconcile } from "./src/index.ts"; const base = { findings: [{ id: "finding" }], identify: (f: { id: string }) => f.id }; console.log(reconcile({ ...base, waivers: [] })); try { Reflect.apply(reconcile, undefined, [base]); } catch (error) { console.log(error instanceof TypeError ? "TypeError" : "unexpected"); }'
```

collector 排除项与保留项主要依据 declaration、runtime validation source 和 owner，不声称已逐项运行 probe。未执行产品回归、tsc authoring 验收、完整 Gate、package build 或 installed consumer，因为本轮没有实施这些边界；未来 optional 行为是否正确仍未证明。Draft 与局部材料的实际校验结果由本轮交付记录，不以机械通过替代候选语义审阅。
