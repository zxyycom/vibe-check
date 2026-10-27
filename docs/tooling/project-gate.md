# Project Gate

维护 Project Gate 时，本文用于定位运行入口与配置、选择检查、查找运行证据，以及核对最终退出码。
Gate 的 candidate 绑定、aggregation 和诊断接线在此定义；Product Run 与 Check 契约仍由各自 owner 定义。

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；下面是当前 Gate 源码的责任导航，不作为目录形状的机械约束：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、outputs、scheduler 与 resultContributor
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、result 与 transcript mechanics
```

## Selection presets and scheduling

### 选择参数

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

### 按任务范围追加检查

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

### 自动与显式义务

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

### 依赖选择与关系闭合

entry manifest 为每项 Gate Check 投影 Product 的 `{ when, propagateDependsOn? }` enablement。Gate 的 `when` 使用公开的
string-leaf AST，且对每个投影写入 literal `propagateDependsOn: true`，因此命中的 downstream Check 可启动其
`dependsOn` prerequisite；Product 保留未选 Check 的 `not-applicable / flag-condition-not-matched` fact，并按普通 lifecycle
运行被带入的 prerequisite。公开 grammar 与默认 selection 由[Check authoring 指南](../guides/extending-check-lifecycle.md#按-flag-选择-check)拥有；
Gate 只拥有 manifest projection 与其验证。

fast 与 changed 使用同一保守输入 region，fast 另外要求资格；changed 覆盖完整 routine manifest。映射与 scope 词汇由 `runtime/change-regions.ts` 维护，manifest 声明各条目的 region，`runtime/eligibility.ts` 投影原生条件。Git snapshot 取本地 `HEAD~1...HEAD` 的最近一次提交（merge commit 的第一父链），并合并 staged、unstaged 与 untracked 变化；它不依赖远端分支同步状态。缺少可信 Git 证据时，changed 保守选择全部 routine Checks，不当作零变更；未分类根路径同样选择全部 routine Checks。已知目录家族下的新模块由其保守 owner region 承接，例如 project 新子 owner 归 ordinary scripts，validation 新实现/helper/测试归 validation lane。

共享 material source 可选择多个实际消费者。package tooling lane 由已登记随包材料及其生成/构建输入选择，包含受管示例的 `docs/examples/package-api-support/**` 验收支持源，不由调查或决策文档选择。Test Evidence 对 Case 账本及当前行为 owner 所在的文档目录保守选择，同目录内的非 owner 文档仍可能唤起它；新增 owner 路径须由 selection 测试闭合。调查和决策文档不是行为 owner。

`prepared-package-candidate`、Git diff whitespace 在 fast/changed 固定选择；repository material links 在 changed 任意文件变更时选择。changed 的 package artifact、external-consumer provider 与 installed docs/runtime consumer 共用完整 package 输入 region，包含 Product、注册随包材料、构建脚本与依赖配置；不以“只改正文”漏掉真实发布输入。Markdown link validation 在 changed 任意文件变更时扫描完整 corpus，覆盖 region 外链接目标的反向依赖。对应 scope、focused preset 和 `--all` 可不依赖 change flag 强制选择其成员。

Markdown lint 与 Markdown Link 保持完整 corpus，并使用各自缓存；具体配置及安全边界见 [Gate repository quality](gate-repository-quality.md#仓库选择范围)。

材料 JSON、Schema、Schema publication 与 machine example Checks 各自按 changed 与其输入 region 选择，也可由对应 scope、materials preset 或 all 强制选择。`markdown-lint` 使用自己的 docs/changes Markdown input，并属于 `quality` preset。schema-publication 的输入包含发布 schema 与 v4 schema source；machine example 的生成读取完整 Product 执行与输出模型，因此它保守覆盖 Product 非测试 `src/**`，但普通 scripts 或无关 docs 不会命中其 region。具体映射由 `runtime/change-regions.ts` 声明；可信零匹配不触发 change 条件，Git unavailable 时 changed 保守执行全部 routine，scoped 仍保持 fast 加指定范围的边界。

Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 selection policy、fast 资格、适用的 change region 与
每个 preset / scope 的选择闭合，以保证观察输入可用。`observes` 不传播选择。任一 owner 自带 `enabledByFlags` 时 Gate 拒绝组合，
避免覆盖 owner 的 condition。

### 聚合结果

bound Run 不传入 aggregation policy，而使用 Product 的默认 strict-all aggregate。它复用同次 flag-and-dependency effective selection（不是 `--all` selection），要求每项均为 `passed`；任何其它终态或空 selection 都使 aggregate failed。findings、messages、Records 与 final data 不直接参与 aggregate。

### 并发与优先级

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

## 组合配置与 candidate 绑定

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
fast 资格、change region、preset membership、Gate 自有的 `observes` 闭合，以及 run-level outputs、scheduler、Product 默认聚合的使用和唯一
project-owned `resultContributor`。组合入口可以引用 `checks/**` owner 已定义的普通 Check 对象或闭合对象组；领域
options、scanner protocol、test file partition 和 execution mechanics 留在对应 owner，不为追求物理单文件而
复制。`runtime/**` 不另行拥有 Check membership、领域 policy、`dependsOn` 传播或第二个 result-contributor 配置面。

一次运行先解析参数并准备 exact local candidate，或在 `--all --release-receipt <path>` 下重验显式 release receipt；之后才动态导入
`runtime/bound-run.ts`。`run.ts` 必须先确定 candidate，bound Run 才能通过已解析的
package public entry 构造 Project Definition，并验证该 entry 与 prepared candidate 相同。直接从源码静态导入
package implementation 会绕过这个 candidate 边界，因此不允许。

## 每次运行的证据目录

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

## Prepared candidate data

已准备的 candidate 按以下责任传给验收 Checks：

1. `checks/prepared-candidate.ts` 将 adapter 已准备的 candidate 重新验证为 typed dependency data；artifact acceptance 只消费其 exact artifact、digest、version 与 staging identity。
2. 选择 package acceptance 时，`checks/external-consumer-material.ts` 从同一 dependency 建立本次 invocation 拥有的 external consumer。types、documentation 与 runtime consumer Checks 只读消费已验证材料。
3. `runtime/bound-run.ts` 在 `finally` 中清理这项 lease；测试故障注入和临时材料仍由各自 fixture 拥有。

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界由 [Package release 的收据契约](package-release.md#受控路径与收据内容) 拥有。

候选包验收输入的验证与 direct-target 按需准备边界由 [Package lifecycle](package-lifecycle.md#local-candidate-lifecycle) 拥有。

## Test execution partition

测试按证明责任划分为互斥、非空 lanes，每个测试文件恰好属于一条；未知 Product owner 在测试启动前失败。各 lane 随 Gate selection 进入 Run，完整分区、输入消费者、region 矩阵和验证见 [Gate test execution](gate-test-execution.md#test-execution-partition)。

## Direct repository-quality Checks

五项直接仓库质量 Check 是同一 Definition 中独立选择和结算的普通 Check。duplicate、file、function 和 Markdown Link 的未豁免 normal Finding 为 blocking，经默认 strict-all aggregate 阻断所选 invocation；Markdown lint 保持 non-blocking。完整 policy、精确 waiver、选择排除和 scanner failure 见 [Gate repository quality](gate-repository-quality.md#direct-repository-quality-checks)。

## Process evidence

单命令进程、completion callback 与唯一多步骤 workflow 例外的完整边界由[Gate 诊断与进程证据](gate-diagnostics.md#单命令与多步骤-workflow)拥有。Gate 使用以下配置：

- environment 继承宿主环境并叠加 Product plain-text/no-color variables；依赖数据只能作为显式 overrides 进入 child。
- 普通 command entry 的 stdout/stderr 文本缓冲限额各为 64 MiB；`lint-product` 各为 1 MiB，external-consumer provider 各为 64 KiB。计量与回收沿用[commandCheck 输出策略](../guides/command-check.md#输出)。
- 未单独配置 timeout 的 Gate 单命令使用 `120_000 ms`；package acceptance 与 `lint-product` 保持 `30_000 ms`。

维护字段投影、失败降级或终端预览时见[Gate 诊断与进程证据](gate-diagnostics.md#process-evidence)。

## Gate result post-processing and exits

### 调用顺序与性能观察

1. exact candidate 准备后，`run.ts` 动态加载 `runtime/bound-run.ts`，取得它投影的 `resolvedEntryPath`、Product `run` 和 `definition.ts` 配置的唯一 `resultContributor`。
2. `run.ts` 验证该 entry 等于 prepared candidate 的 exact entry，再运行 Product Run。
3. 从同一个 RunResult 形成初步 Gate result，然后调用 `resultContributor`。

### 性能预算与 Check 耗时分布

默认 performance contributor 对 fast / changed / all 评估总反馈时间、Check 均值和 P95 三项阻断预算；严格超标将初步 passed 降为 failed / exit 1，等于预算达标。focused preset 与 fast 加 scope 不评估标准预算，初步非 passed 不提升。完整三档数值、统计口径、失败证据及配置边界见[Gate 性能预算](gate-performance.md)。

### Result-contributor 边界与退出码

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

### Gate terminal and transcript

`gate.log` 保存 adapter 与 `resultContributor` 的最终事实，`progress.log` 保存 Product progress，child 输出留在各 Check 的 transcript。
通道完整边界见[Gate 诊断](gate-diagnostics.md#gate-terminal-and-transcript)。Gate 不解析这些文件来重建结果。
成功关闭时 `gate.log` 追加 invocation directory、唯一最终 result 与 exit；关闭失败仍返回 `unavailable` / exit `2`。
