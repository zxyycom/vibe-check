# Project Gate

维护 Project Gate 时，本文用于定位运行入口与配置、选择检查、查找运行证据，以及核对最终退出码。
Gate 的 candidate 绑定、aggregation 和诊断接线在此定义；Product Run 与 Check 契约仍由各自 owner 定义。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；下面是当前 Gate 源码的责任导航，不作为目录形状的机械约束：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、outputs、scheduler 与 resultContributor
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、result 与 transcript mechanics
```

### Selection presets and scheduling

#### 选择参数

selection 参数包含可重复的 `--scope <范围>`、`--changed`、`--all`，以及 focused presets：`--typecheck`、`--lint`、`--test`、`--materials`、`--quality`、`--consumer-types`、`--admission-workbench`。
`-h` / `--help` 必须单独使用。多个 focused preset 取并集并替换默认选择，重复项被规范化；
scope 只与其它 scope 取并集，不与 preset、changed 或 all 混用。`--changed` 与 `--all` 各自独占选择，不能与彼此或 focused preset 组合。`--release-receipt <path>` 是 selection 之外的 formal candidate input，只能与
`--all` 组合；该组合额外选择发布前 consumer types，沿用 all 性能预算。help 在 candidate preparation、package import 和 log directory creation 前退出。

| 调用 | 用途与选择 |
| --- | --- |
| `bun run check` | 默认 fast：快速工程反馈，仅选择有 fast 资格且受输入变化影响的 Check，加上固定 provider/whitespace。 |
| `bun run check -- --scope <范围>` | 默认 fast 加指定范围的 routine Checks 与必要依赖；范围可重复、去重并按名称排序，属于局部验收。 |
| `bun run check -- --changed` | 工作区整体受影响验收：按完整输入 region 选择全部相关 routine 行为、质量、材料与 artifact / installed docs/runtime acceptance；不识别任务归属。 |
| `bun run check -- --all` | 显式完整 routine 验收：不依赖变更命中选择全部 routine Checks，用于需要整体证据的任务及选择规则兜底。 |
| `bun run check -- --all --release-receipt <path>` | 同一正式 tarball 的完整发布验收：routine 全集加 installed consumer types，不选 workbench。 |
| `bun run check -- --test` | 强制执行全部 routine test lanes；不含 package artifact、installed acceptance 或 workbench。 |
| `bun run check -- --consumer-types` | 明确的 installed types 诊断，依赖传播带入 external consumer 与 prepared candidate provider。 |
| `bun run check -- --admission-workbench` | 明确运行 workbench tests，不选择其它测试或安装验收。 |

#### 按任务范围追加检查

日常需要相关 Gate 证据时，在一次调用中组合默认快速反馈与自己的范围：

```bash
bun run check -- --scope project-tests
bun run check -- --scope product-markdown-tests --scope any-change
```

scope 复用 manifest 的 `changeRegion` 名称，不再维护第二套 Check 分组；完整名称由 `bun run check -- --help` 从同一数据列出。常见范围如下，具体成员仍由 manifest 拥有：

| 范围 | 追加的工作 |
| --- | --- |
| `product-source` / `script-source` | 对应 scope 的 typecheck 与 lint，不等于全部行为测试。 |
| `product-markdown-tests`、`product-json-tests` 等 | 对应 Product 测试 lane。 |
| `project-selection-tests` / `project-tests` | Gate 选择规则 / Gate 本体测试。 |
| `any-change` | 两项完整文档链接检查，不表示所有 routine Checks。 |
| `material-json-input`、`material-schema-input` 等 | 相应材料检查。 |
| `decision-input` / `test-surface` | Decision / 完整 Test Evidence 检查。 |
| `package-tests` | package tooling、artifact 及 installed docs/runtime 的 routine 验收和依赖；不含 release-only types。 |

范围 token 是普通 `project-gate:scope=<名称>`，显式命中对应 routine Check，不需要 Git 证明该范围有变化；它不伪造受保护的 `changeFlag`，也不自动证明改动归属。未知范围（含自动回退专用的 `unclassified-input`）在 candidate preparation 前拒绝。

fast 基线仍读取整个 Git snapshot，只选择 fast-qualified 项；其它人的变化可能带入基础快速检查，但不会因此额外打开未指定的慢项。Git 不可用时同样保留这个 fast 边界。所选 Check 的内部扫描范围、真实产物义务与依赖传播保持，scope 不是文件读取过滤器；Gate 的 `observes` 关系须在 scope 路径闭合，Product 仍只传播 `dependsOn`。

启动摘要明确标为 `selection=scoped; base=fast; scopes=…; acceptance=partial`。scoped 与 focused 一样不套 fast/changed/all 的标准 workload 性能预算；原有标准档位的预算不变。changed/all 留作明确需要整体证据时的兜底，正式发布保留同 receipt 的完整验收。

#### 自动与显式义务

Gate 私有 manifest 的 `selectionPolicy` 定义自动选择的范围：

| `selectionPolicy` | 自动选择 | 显式选择 |
| --- | --- | --- |
| `routine`（默认） | fast 按资格与输入；changed 按输入；all 全部选择 | 对应 scope 加 fast，或 focused preset |
| `release-only` | 正式 receipt + all | `--consumer-types` |
| `explicit-only` | 无 | `--admission-workbench` |

当前 manifest 共 43 项：routine all 选择 41 项，正式 receipt + all 选择 42 项，workbench 为剩余的显式项。
非 routine entry 不声明 fast 资格或 change region；未知输入与 Git 不可用回退只扩大 routine 集合。
策略只属于 Gate，不扩展 Product API 或增加 runner。types 与 workbench 的缺陷分别可能延迟至发布前或显式运行才被发现；
这是验收频率取舍，不是同 workload 加速。

fast 资格固定为 Product/scripts 两 scope 的 typecheck 与 lint、format、prepared candidate、Project Gate selection 与 package-tools/Core 闭包两条现有测试 lane，以及 Git diff whitespace。其中 candidate 与 whitespace 固定选择，其余按各自输入 region；资格来自明确工程职责，不从单次运行快慢自动推断。全仓指标扫描、完整 Markdown 引用图、Case 审计、其余 routine 行为测试与安装后 docs/runtime 可由对应 scope 或 changed/all 选择。

**fast 通过仅表示快速反馈通过。** 日常优先使用 fast 加显式 scope，或 owner 的最窄独立入口；何时扩到 changed/all 由[交付验证](../navigation.md#交付验证)定义，不因进入交付阶段自动升级。启动摘要区分反馈档位和验收范围；定向通过不替代明确要求的完整验收，发布仍走正式 receipt+all。

#### 依赖选择与关系闭合

entry manifest 为每项 Gate Check 投影 Product 的 `{ when, propagateDependsOn? }` enablement。Gate 的 `when` 使用公开的
string-leaf AST，且对每个投影写入 literal `propagateDependsOn: true`，因此命中的 downstream Check 可启动其
`dependsOn` prerequisite；Product 保留未选 Check 的 `not-applicable / flag-condition-not-matched` fact，并按普通 lifecycle
运行被带入的 prerequisite。公开 grammar 与默认 selection 由[Check authoring 指南](../guides/extending-check-lifecycle.md#按-flag-选择-check)拥有；
Gate 只拥有 manifest projection 与其验证。

fast 与 changed 使用同一保守输入 region，fast 另外要求资格；changed 覆盖完整 routine manifest。映射与 scope 词汇由 `runtime/change-regions.ts` 维护，manifest 声明各条目的 region，`runtime/eligibility.ts` 投影原生条件。Git snapshot 取本地 `HEAD~1...HEAD` 的最近一次提交（merge commit 的第一父链），并合并 staged、unstaged 与 untracked 变化；它不依赖远端分支同步状态。缺少可信 Git 证据时，changed 保守选择全部 routine Checks，不当作零变更；未分类根路径同样选择全部 routine Checks。已知目录家族下的新模块由其保守 owner region 承接，例如 project 新子 owner 归 ordinary scripts，validation 新实现/helper/测试归 validation lane。

共享 material source 可选择多个实际消费者。package tooling lane 由已登记随包材料及其生成/构建输入选择，包含受管示例的 `docs/examples/package-api-support/**` 验收支持源，不由调查或决策文档选择。Test Evidence 对 Case 账本及当前行为 owner 所在的文档目录保守选择，同目录内的非 owner 文档仍可能唤起它；新增 owner 路径须由 selection 测试闭合。调查和决策文档不是行为 owner。

`prepared-package-candidate`、Git diff whitespace 在 fast/changed 固定选择；repository material links 在 changed 任意文件变更时选择。changed 的 package artifact、external-consumer provider 与 installed docs/runtime consumer 共用完整 package 输入 region，包含 Product、注册随包材料、构建脚本与依赖配置；不以“只改正文”漏掉真实发布输入。Markdown link validation 在 changed 任意文件变更时扫描完整 corpus，覆盖 region 外链接目标的反向依赖。对应 scope、focused preset 和 `--all` 可不依赖 change flag 强制选择其成员。

Markdown lint 保持完整 corpus 与现有 non-blocking policy；Gate 显式启用 Product 的逐文件 findings 缓存，目录为本地可删除的 `.cache/vibe-check/markdown-lint-findings/`。当前 bytes、选择与终态每次重新核对；冷态可能增加缓存写入成本，缓存命中不是跳过 Check 的依据。

Markdown Link 显式启用[parse-facts cache](../checks/markdown-link-validation.md#parse-facts-cache)，目录为
`.cache/vibe-check/markdown-link-parse-facts/`。每次仍读取当前源文件、核对内容 identity 并验证链接目标；
命中只省去重复解析。缓存可能保存链接地址、标题 slug 和位置，由本地维护者管理或删除，默认 16 MiB 容量提醒沿用 Product 配置。

材料 JSON、Schema、Schema publication 与 machine example Checks 各自按 changed 与其输入 region 选择，也可由对应 scope、materials preset 或 all 强制选择。`markdown-lint` 使用自己的 docs/changes Markdown input，并属于 `quality` preset。schema-publication 的输入包含发布 schema 与 v4 schema source；machine example 的生成读取完整 Product 执行与输出模型，因此它保守覆盖 Product 非测试 `src/**`，但普通 scripts 或无关 docs 不会命中其 region。具体映射由 `runtime/change-regions.ts` 声明；可信零匹配不触发 change 条件，Git unavailable 时 changed 保守执行全部 routine，scoped 仍保持 fast 加指定范围的边界。

Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 selection policy、fast 资格、适用的 change region 与
每个 preset / scope 的选择闭合，以保证观察输入可用。`observes` 不传播选择。任一 owner 自带 `enabledByFlags` 时 Gate 拒绝组合，
避免覆盖 owner 的 condition。

#### 聚合结果

bound Run 不传入 aggregation policy，而使用 Product 的默认 strict-all aggregate。它复用同次 flag-and-dependency effective selection（不是 `--all` selection），要求每项均为 `passed`；任何其它终态或空 selection 都使 aggregate failed。findings、messages、Records 与 final data 不直接参与 aggregate。

#### 并发与优先级

scheduler 的 root `maxParallel`、named-resource budget 与跨 owner mutex 名称在 `definition.ts` 声明；Check 固有 timeout/mutex 可由其 owner 对象声明，Gate manifest 保证本地 relation 输入与 `observes` 可读性，Product 则拥有已选 `dependsOn` closure。external-consumer provider 独占 package lifecycle mutex；会读写 checked-in repository material 的 validation Checks 共享 repository-material mutex。

`lint-product` 与 `lint-scripts` 共享 `project-gate-type-aware-lint` mutex，同一 Run 中至多执行一个 type-aware lint。
两者仍独立选择和结算，不建立相互依赖或固定顺序；该 mutex 不限制 typecheck 等其它工作，也不改变 lint 的输入、规则或后端线程配置。
这一约束避免两份类型后端重叠，依据见[lint 耗时调查](../investigations/diagnose-fast-gate-lint-amplification.md)；
它不承诺所有 workload 更快，性能仍按本次完整 Gate 结果和既定预算判定。

Gate 保留 root `maxParallel: 3`，并使用两个**逻辑** named-resource budget；unit 既不是 CPU core、内存量，也不是实测竞争系数：

| Resource ID                     | Capacity / unit              | Claiming Checks                                                                                                      | 静态分类理由                                                                                                                             |
| ------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `project-gate-bun-test-runners` | 2 个并发 `bun test` runner   | 所有行为测试和 acceptance test-lane Check，各 claim `1`                                                                         | 每个 lane 都启动一个 Bun test child runner。预算限制这一同类 runner 最多占用两个 root slot，而不保证某一异类 Check 一定获准入。          |
| `project-gate-repository-scans` | 2 个并发递归 repository scan | `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-lint`、`markdown-link-validation`，各 claim `1` | 五项都会递归收集或读取 repository inputs；前三项还会运行 scanner 或 worker。预算避免让三项以上同类全树读取重叠，同时不把五项全部串行化。 |

typecheck、lint、format、candidate provider、external-consumer provider 与 native repository-material/governance Checks 不声明 named-resource claim：它们不属于以上同类工作预算；已有 package-lifecycle/repository-material mutex 仍单独表达各自的独占关系。新声明必须先有同样可从 owner 恢复的共享工作特征和逻辑单位；不得因单次时长、高方差或“所有 Check 都用 CPU”扩大这些 budget。Product 继续验证 capacity/claim 合法性并原子持有/释放 units；模拟器可读取版本化映射，但必须自行定义竞争减速，不得从该表推断物理竞争或性能收益。

静态 `admissionPriority` 也只由 `definition.ts` 配置。它只在同一 ready 层级内排序，不能越过 dependency、mutex、capacity、lifecycle 或 cancellation hard guard。当前 Gate 不声明非零 priority：此前成对测量没有同时改善当时日常与完整 workload 的 median，因此所有 Check 的 effective priority 都是 `0`。

完整 preset 集合和可执行例子由 `--help` 输出；root `check` script 经 `mise exec` 调用同一个 `run.ts`，
Gate 只为 file metrics 读取 mise-bound SCC command。

### 组合配置与 candidate 绑定

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
fast 资格、change region、preset membership、Gate 自有的 `observes` 闭合，以及 run-level outputs、scheduler、Product 默认聚合的使用和唯一
project-owned `resultContributor`。组合入口可以引用 `checks/**` owner 已定义的普通 Check 对象或闭合对象组；领域
options、scanner protocol、test file partition 和 execution mechanics 留在对应 owner，不为追求物理单文件而
复制。`runtime/**` 不另行拥有 Check membership、领域 policy、`dependsOn` 传播或第二个 result-contributor 配置面。

一次运行先解析参数并准备 exact local candidate，或在 `--all --release-receipt <path>` 下重验显式 release receipt；之后才动态导入
`runtime/bound-run.ts`。`run.ts` 必须先确定 candidate，bound Run 才能通过已解析的
package public entry 构造 Project Definition，并验证该 entry 与 prepared candidate 相同。直接从源码静态导入
package implementation 会绕过这个 candidate 边界，因此不允许。

### 每次运行的证据目录

candidate preparation 完成后，每次 invocation 在 `.log/project-gate/<invocation-id>/` 创建自己的 evidence root。
bound Run 将这个已创建的目录映射为 Product controls，不在 Product 内再建立一层目录：

| 配置或能力                     | Gate 选择                  |
| ------------------------------ | -------------------------- |
| `diagnosticLogFileNaming`      | `channel`                  |
| `diagnosticLogging.directory`  | 本次 evidence root         |
| `machinePublication.directory` | root 下的 `machine/`       |
| `progressLogFile`              | root 下的 `progress.log`   |
| executable Check artifact base | 只授予 root 下的 `checks/` |

因此布局固定为：

```text
<invocation>/
├── gate.log
├── progress.log
├── core.log
├── scheduler.log
├── machine/
│   ├── run.json
│   └── records.ndjson
└── checks/
    └── <encoded-check-id>/
        └── process.log
```

Gate 通过正式 RunControls 选择固定 channel basename；Product 默认仍保留 UTC 与 UUID 唯一命名。每条 diagnostic observation 还带 Product invocation ID、全局 sequence 与 monotonic elapsed。Gate、progress 和 Product writers 各自拥有输出过程，共同写入本次 Gate invocation 的 evidence root。文件发现以本次 invocation 路径和 output readback 为准，目录保留与清理由调用方管理。machine files 必须按 [Output](../output.md) 的完整二文件集合读取。

### Prepared candidate data

已准备的 candidate 按以下责任传给验收 Checks：

1. `checks/prepared-candidate.ts` 将 adapter 已准备的 candidate 重新验证为 typed dependency data；artifact acceptance 只消费其 exact artifact、digest、version 与 staging identity。
2. 选择 package acceptance 时，`checks/external-consumer-material.ts` 从同一 dependency 建立本次 invocation 拥有的 external consumer。types、documentation 与 runtime consumer Checks 只读消费已验证材料。
3. `runtime/bound-run.ts` 在 `finally` 中清理这项 lease；测试故障注入和临时材料仍由各自 fixture 拥有。

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界由 [Package release 的收据契约](package-release.md#受控路径与收据内容) 拥有。

候选包验收输入的验证与 direct-target 按需准备边界由 [Package lifecycle](package-lifecycle.md#local-candidate-lifecycle) 拥有。

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

测试按证明责任分别结算：package tooling/artifact/installed-consumer、各 Product Check owner 与 Core/package-tools、Project Gate selection 与其余 tooling、admission workbench、Test Evidence、repository layout、package-tools/Core 闭包、machine artifacts、其余 material validation，以及 ordinary scripts。拆分依据是各 lane 的输入和证明义务，不是增加并行度。

仓库扫描的 displayName 明确标记 `Repository scan`，与 `tests-product-*` 功能测试及 `acceptance-installed-package-*` 安装验收区分。Markdown 功能 lane 同时拥有 lint 与 links；Core-and-tools lane 包含 Core 与 package-tools；package-tooling lane 是仓库包工具测试，不是 installed acceptance。Gate 私有 ID 也是本地 learned-history 的 task identity；更名后旧缓存不迁移，历史 workbench fixture 保留形成时 identity。

几项容易混淆的 test lane 各有自己的输入和证明边界：

- **Project Gate selection：** 对 Gate region 数据运行轻量路径矩阵，使用与 Product config-glob 相同的 `micromatch` 完整列表选项；选择规则、Definition、lane registry 或 Product 变更选择机制变化时运行。真实 Git changed-path、rename 和 unavailable fallback 由 Product tests 证明。
- **Repository layout：** 扫描当前 `src/**` / `scripts/**` 源文件的结构、import 与 package-tools 边界；任何源码变化均选择它。
- **Package-tools/Core 闭包：** 使用独立 fixture；验证器、共享 fixture、依赖或运行配置变化时选择。
- **Machine artifacts：** 实际材料、生成器、validator、Product Definition 输入或该 lane 测试文件变化时选择；其测试文件变化不启动其余 material tests。

Product test lanes 的 changed 输入由 `runtime/product-test-regions.ts` 声明，从完整 Product source 与 runner/工具链输入出发，按实际消费者收窄已知私有输入：

| 输入 | 选择边界 |
| --- | --- |
| 已知 Check 私有实现、helper、fixture | 选择所属组。file metrics 还消费 JSON validation/document 的实现、helper 和 fixture；Markdown lint 与 links 同组。 |
| 已知 owner 的 `*.test.ts` 正文 | 选择自身 Product lane 及扫描其正文的组。host-environment/project-files 测试属于 supporting Checks；Core/package-tools 测试正文由 Core-and-tools lane 承接。 |
| 根导出、Core/runtime、package tools、共用 Check helper、project-files、host-environment 的实现与 helper | 保守选择全部七个 Check 组。 |
| 尚未分类的新模块，包括测试正文 | 保持共享输入回退，直到确认消费者。 |

function metrics 的 source-identity 审计与行为测试仍在同一 lane。审计读取全部 `src/**` 与 Lizard provenance，因此该组保留完整输入范围。

package tooling、Gate 本体与普通 tooling 三个 routine 脚本组依赖 Product 实现、helper、fixture 和未知 owner 路径；已知 Product 测试正文由其 owning lane 承接。包源码/JSDoc 扫描本身排除测试正文，Gate 读取的完整测试文件清单则由每次启动的 lane 分区校验承接。layout、质量扫描与 Test Evidence 按各自实际的正文输入选择。

维护 region 时同时核对 import 和直接文件读取，并同步新增消费者。路径矩阵验证跨 owner 输入、正文/helper 区别及删除或重命名后的路径；完整 lane 清单验证每个测试文件触发自身。Git evidence 不可用时保守选择，显式 preset 提供强制路径。

各 lane 按[选择参数](#选择参数)进入本次 Run。两组材料测试与 schema/example validators 共享 repository-material mutex；machine drift 测试使用私有材料，隔离与证明分工见[输出维护](../development/output-maintenance.md#package-材料的维护与验证)。快速 candidate contract 属于 package tooling；`candidate.integration.ts` 的正式入口是 `package:candidate:integration`，不属于 routine `*.test.ts`。External-consumer provider 是独立 Check。

### Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-lint` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们是同一 Project Definition 中可逐项审阅和选择的普通 package Checks，没有独立 quality command 或嵌套 Run。

#### Finding 与状态

Gate 对 duplicate/file/function/Markdown Link 四项显式使用 `blocking` finding policy：

- 未被 owning Check 既有 waiver 或 selection exclusion 消除的 normal Finding 保留完整 final data / Records，并令 owning Check `failed`。
- zero Finding 仍令 Check `passed`。
- external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。

安全摘要由 owning Check 有上限地输出，超过摘要上限时只追加精确 omitted count。完整 Finding facts 以 machine Records 为准。

这四项按 changed 输入选择，也属于 `quality` preset，故其未豁免 normal Finding 会由 owning Check 结算为 failed，并通过默认 strict-all aggregate 阻断已选择它们的 invocation；`markdown-link-validation` 还是 `materials` preset 成员，因此同样阻断 `--materials`。Gate 不从 Finding、message 或 Record 重算这个结果。此处的 repository-private blocking policy 不改变 package constructor：duplicate detection、file metrics、function metrics 与 Markdown Link 在 consumer 省略 `findingPolicy` 时继续使用 `non-blocking` advisory default。

`markdown-lint` 是第五个、独立的 docs/changes Check，按 changed 输入选择，并属于 `materials` 与 `quality`。它固定八项默认规则而不启用 `link-fragments`，并显式保持 `non-blocking`：lint Finding 以 owning Check 的 Records、消息和 final data 输出，不使 owning Check 或 aggregate failed。空输入和 source/backend failure 仍按 package 的 `not-applicable` / `unavailable` 语义结算。

将 `markdown-lint` 改为 blocking 前，须按届时的仓库 Markdown corpus 审查其 Finding 与 rejected input；当前配置保持 non-blocking。

同一 `blocking` policy 适用于 changed、`--all` 和正式 release receipt 验证；它不新增 release-only reducer 或 waiver，既有 waiver/exclusion 仍只由 owning Check 解释。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自 owner 阻断。

#### Gate manifest 的函数行数 Finding

`createProjectGateEntries` 保持一份顺序完整的声明清单，使 Check 顺序、selection metadata 和资源声明可以沿同一阅读路径恢复。该函数的 `function-code-density` Finding 来自清单行数，而非条件分支或失败恢复；把清单拆成组装函数会遮蔽这些关系。

`scripts/project/gate/checks/repository-quality.ts` 为这一 Finding 配置精确 waiver，identity 限定路径、函数名、起始行和指标。`functionMetrics` 仍发布原 Finding Record，并标记为非阻断；其它函数和指标继续按 `blocking` policy 结算。起始行变化或 Finding 消失时，Check 会发布 unused-waiver audit Record 和 warning，维护者据此重审 identity 与理由；该 audit 本身不使 Check 失败。

#### 单页 Gate 指南的文件行数 Finding

用户确认将[构建项目 Gate](../guides/building-project-gate.md)保留为单页九场景教程；十个独立受管片段与相邻的适用条件、预期结果和安全边界共同承接阅读路径，不为满足行数门限而压缩代码或删减说明。

`fileMetrics` 只为 `docs/guides/building-project-gate.md` 的 `code-lines` 配置一项精确 waiver，不排除该文件，也不提高全仓阈值。Check 继续发布实际行数、上限与原 Finding，并标记为非阻断；其它文件或指标仍按原 policy 结算。该例外不授权其它长文档自动豁免；后续扩展仍需审查是否保持同一任务边界。

#### 仓库选择范围

repository-private scope 只让 TypeScript、current Schemas 和 examples 进入 `duplicate-detection`；Markdown 由 file metrics
与 Markdown link validation 观察，不进入重复检测。`docs/schemas/historical/**` 不进入 duplicate/file maintainability
metrics，但仍由显式 documentation contract 严格验证。repository defaults 还排除 `**/archive/**`；这是本项目配置，不是
package 的公共默认值。

Markdown Link 保留完整的 `docs/**/*.md` / `changes/**/*.md` 正/负选择与既有安全边界；Gate 显式将
`limits.maxOccurrences` 和 `limits.maxTargetReads` 设为 `false`，不以总量预算阻断增长的完整文档。
节点观察在本次引用图内复用，每条引用仍独立判断与计数；Product 默认总量预算与单文件字节边界不变。
关闭总量预算不提供进程级资源隔离，源/目标失败与协作取消仍 unavailable，不降级放行。

三个 metrics Check 的 `product-source` area 具有一个共同排除范围和一项差异：

- **共同排除：** `src/package-checks/function-metrics/analyzer/**` 由 source-aligned port owner 整体维护，不生成 repository duplicate、file 或 function-metric Finding。
- **Function metrics 额外排除：** Product `*.test.ts` 与 `*.test-support.ts`。这只移除测试函数的复杂度与密度 Finding；duplicate detection 和 file metrics 仍选择这些文件，保留重复代码和超长文件的证据。

配置测试必须同时证明上述差异、共同 analyzer exclusion，以及目录外 Product implementation 仍被三项选择。
该范围不从 provenance ledger 动态生成，也不改变 package Check 的公共默认 selection。

#### 分析器与环境绑定

Gate 只接受 mise 提供的绝对 SCC path；缺失或相对 `VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`，而让 file-metrics owner 按 scanner failure 结算。
`functionMetrics` 直接使用内置 analyzer，不读取 scanner command 或环境 binding。

整目录 metrics 排除不影响 analyzer 的 lint、format、typecheck、source identity、oracle/parity、deviation、provenance/license、
import-boundary 或行为测试。边界见 [Check-owned scanner dependencies](../development/scanner-dependencies.md)。

### Process evidence

所有单一、无 shell 外部命令都由 Product `commandCheck` 启动并将完整过程写入其 Check artifact 的 `process.log`；Gate
只通过 `resolveEnvironment` 派生依赖环境，并通过 `afterCommand` 完成工具领域结算。Gate 的 selection、依赖关系、
safe failure projector、`gate.log` 与最终退出码仍由 Gate owner 维护。native Checks 不创建单进程 transcript，只发布
typed safe Records。

Gate command 的进程边界固定为：

- environment 使用继承宿主环境并叠加 Product plain-text/no-color variables；依赖数据只能作为显式 overrides 进入 child。
- 普通 command entry 的 stdout/stderr 文本缓冲限额各为 64 MiB；`lint-product` 各为 1 MiB，external-consumer provider 各为 64 KiB。各值都是近似文本缓冲限额，计量与回收边界沿用[commandCheck 输出策略](../guides/command-check.md#输出)。
- 未单独配置 timeout 的 Gate 单命令使用 `120_000 ms`；package acceptance 与 `lint-product` 保持 `30_000 ms`。
- Product 在最终 transcript 写入成功后，才调用 Gate completion callback；resolver、取消、timeout、output limit、signal
  和 transcript failure 使用 Product reason code，不由 Gate 复制一套 process reason code。

`test-evidence-rule-tests` 是唯一多步骤 process workflow 例外：它在一个 Check 中运行 ast-grep version 与 rule-tests，
保留专有 transcript 和版本不匹配 Record，不通过 shell、pipeline 或通用 process adapter 表达。

维护字段投影、失败降级或终端预览时见[Gate 诊断与进程证据](gate-diagnostics.md#process-evidence)。

### Gate result post-processing and exits

#### 调用顺序与性能观察

1. exact candidate 准备后，`run.ts` 动态加载 `runtime/bound-run.ts`，取得它投影的 `resolvedEntryPath`、Product `run` 和 `definition.ts` 配置的唯一 `resultContributor`。
2. `run.ts` 验证该 entry 等于 prepared candidate 的 exact entry，再运行 Product Run。
3. 从同一个 RunResult 形成初步 Gate result，然后调用 `resultContributor`。

#### 性能预算与 Check 耗时分布

默认 performance contributor 对 fast / changed / all 使用三项**阻断预算**：总反馈时间、Check 平均执行时间和
Check P95 执行时间。它们表达先验架构要求，不是从历史样本学习的性能基线；多数 Check 应保持轻量，
少数重项可以存在，预算需为进程启动、I/O 和并发竞争留余量。任一项严格超标都追加 `error`，
把初步 passed 的 Gate 降为 failed / exit 1；等于预算视为达标。Product Checks 全部通过与最终 Gate
通过是不同事实。Gate 只执行同次 preparation/load/Run，不自动重试超标运行。

版本控制内的 `runtime/performance-policy.ts` 是预算唯一来源，所有机器使用相同策略：

| 档位 | `maxElapsedMs` | `maxMeanCheckMs` | `maxP95CheckMs` |
| --- | ---: | ---: | ---: |
| fast | 30000 | 2000 | 5000 |
| changed | 30000 | 2000 | 5000 |
| all | 90000 | 2000 | 5000 |

三个字段均为正 safe integer 毫秒数。标准调用在 candidate preparation 前校验完整三档策略，缺失、非法或读取 seam 抛错均返回 failed / exit 1，不按省略猜默认值。`maxElapsedMs` 包含启动至初步结果的 candidate preparation、adapter/setup 与 Product Run，不包含 contributor 自身耗时。

策略不接受本机缓存文件、环境或命令参数覆盖；runtime 只进入诊断，不参与预算选择。`run.ts` 的同步 loader 仅为 adapter 测试 seam，不是配置入口。预算变更按普通源码审查和验证，不按运行结果自动调整。focused preset 与 fast 加 scope 都属于局部 workload，不评估这些标准预算；help 在策略预检、candidate 与日志之前退出。

各档分别报告自己的选择和预算结果。fast 选择更少的工作不是 all 的性能优化证明；不能以快检达标消除完整验收的性能失败。

Check 分布直接读取同次 `RunResult.checkDurations`：

- 只计 `durationMs !== null` 的实际 execution，真实零耗时仍计入；未执行项不按零稀释。
  这不是排队、Check preparation、整次 Gate 时间或 CPU 用量，不能把工作移到这些阶段来宣称单项优化。
- 均值为执行耗时之和除以执行数量 `N`；P95 使用升序第 `ceil(0.95 × N)` 项（nearest-rank），不插值。
  它描述本次完整集合，不要求历史样本；`N < 20` 时 P95 等于最大值。空集合显示 `mean=n/a`、`p95=n/a`，
  不评估 Check 预算，总耗时仍评估。
- 每次有效评估都输出 `N`、累计执行耗时、均值与 P95 的预算对照，以及最慢的最多三项；同耗时按 Check ID 排序。
  累计值不是墙钟，帮助区分数量增长与单项变重；均值和 P95 分别判断，任一超标即生成分布 error 并阻断。
- 不通过拆分、合并或跳过 Check 改善指标；Check 粒度仍服从行为 owner 和独立验收责任。
  总耗时、分布、准备阶段共同解释结果，不能仅凭分布达标认定 Gate 足够快。

每次有效评估生成两条独立消息：一条包含总耗时及三个连续阶段，另一条包含 Check 分布。
两条消息分别按总耗时预算和 Check 分布预算决定 info/error；info 留在 Gate transcript，error 同时在终端可见。
任一超标时另在 `gate.log` 留存 `project-gate-performance-failure-context` JSON 消息，包含：

- 本次 profile/runtime、三个实际预算、分阶段原始 timing，以及未舍入的均值/P95（空集合为 null）。
- candidate version、artifact SHA-256、candidate inputFingerprint、实际 preparationAction/reason 与 Definition declarativeFingerprint。
- 同次已验证的全部 `checkDurations`：非 null 为实际执行项，null 为未执行项；不把它们反推为变更选择理由。
- 同一 invocation 的目录及 Gate/progress/machine、命令型 Check transcript 路径约定；具体可用证据由各输出 owner 决定。

终端保留超标对照、最慢三项（分布超标时）及日志目录，完整现场仅在 Gate transcript，安全边界见
[Gate diagnostics](gate-diagnostics.md#gate-terminal-and-transcript)。指纹分别标识包输入和 Definition 声明，
不是整个工作区的 source snapshot，也不证明机器负载或性能根因；现场采集不新增 Git/重跑进程或全仓哈希。
性能消息不改变 Product facts、aggregate 或 machine publication。
无效 timing、不完整或重复的 Check duration facts、不可表示的累计值仍阻断初步 passed，不输出伪统计；
初步结果非 passed 时不评估性能，也不提升已有结果。observer 不解析 Product diagnostic log、不读历史调整预算。

#### Result-contributor 边界与退出码

`resultContributor` 是 result post-processing，不是 Check preparation：后者是 Product Run 内每项 Check 在 execution 前的 options 准备边界，而前者只在整个 candidate-backed Run 已形成初步 Gate result 后执行。它是受信任的项目 JavaScript/Bun 函数，可同步或异步执行项目授权范围内的工作；不是 package API、plugin、sandbox 或 registry，也没有 `beforeGate` 对应物。正式配置只在 `definition.ts`，`run.ts` 的 loader、clock 与 transcript injection 仅为 adapter 测试 seam，不能用作另一配置入口。

`resultContributor` 接收 frozen 的初步 Gate result 与 invocation context，只能同步或异步返回闭合的
`{ blocks, messages }`。adapter 按顺序追加已验证消息，且只能将初步 `passed` 降为 `failed`；不能提升失败、改写
context、RunResult、Check facts 或 Product aggregate。抛错、reject、非法贡献、非法 message 或 hostile terminal text
都会 fail closed 为 `unavailable`，并仅记录 `result-contributor-failed` 或
`result-contributor-invalid-result` 诊断。

| 最终状态      | process exit |
| ------------- | ------------ |
| `passed`      | `0`          |
| `failed`      | `1`          |
| `unavailable` | `2`          |

性能策略预检失败按前述规则返回 `1`。其它参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时映射为 `2`。

#### Gate terminal and transcript

`gate.log` 保存 adapter 与 `resultContributor` 的最终事实，`progress.log` 保存 Product progress，child 输出留在各 Check 的 transcript。
通道完整边界见[Gate 诊断](gate-diagnostics.md#gate-terminal-and-transcript)。Gate 不解析这些文件来重建结果。
成功关闭时 `gate.log` 追加 invocation directory、唯一最终 result 与 exit；关闭失败仍返回 `unavailable` / exit `2`。
