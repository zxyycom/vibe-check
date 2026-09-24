# Project Gate

维护 Project Gate 时，本文用于定位运行入口与配置、选择检查、查找运行证据，以及核对最终退出码。
Gate 的 candidate 绑定、aggregation 和诊断接线在此定义；Product Run 与 Check 契约仍由各自 owner 定义。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；Gate 源码按责任保持下面的固定布局：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、outputs、scheduler 与 resultContributor
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、result 与 transcript mechanics
```

### 组合配置与 candidate 绑定

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
required/preset membership、Gate 自有的 `observes` 闭合，以及 run-level outputs、scheduler、Product 默认聚合的使用和唯一
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

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

测试按证明责任分别结算：package supporting/artifact/external-consumer、各 Product Check owner 与 runtime、Project Gate selection 与其余 tooling、admission workbench、Test Evidence、repository layout、package-tools/Core 闭包、machine artifacts、其余 material validation，以及 ordinary scripts。拆分依据是各 lane 的输入和证明义务，不是增加并行度。

几项容易混淆的默认 required test lane 各有自己的输入和证明边界：

- **Project Gate selection：** 对 Gate region 数据运行轻量路径矩阵，使用与 Product config-glob 相同的 `minimatch` 选项；选择规则、Definition、lane registry 或 Product 变更选择机制变化时运行。真实 Git changed-path、rename 和 unavailable fallback 由 Product tests 证明。
- **Repository layout：** 扫描当前 `src/**` / `scripts/**` 源文件的结构、import 与 package-tools 边界；任何源码变化均选择它。
- **Package-tools/Core 闭包：** 使用独立 fixture；验证器、共享 fixture、依赖或运行配置变化时选择。
- **Machine artifacts：** 实际材料、生成器、validator、Product Definition 输入或该 lane 测试文件变化时选择；其测试文件变化不启动其余 material tests。

显式 `--test` 和 `--all` 运行全部 test lane；缺少可信 Git evidence 时保守选择。两组材料测试与 schema/example validators 共享 mutex，避免对 checked-in 材料的测试改写与验证并发。快速 candidate contract 属于 package supporting；`candidate.integration.ts` 的正式入口是 `package:candidate:integration`，不属于 routine `*.test.ts`。External-consumer provider 是独立 Check。

### Selection presets and scheduling

#### 选择参数

selection 参数只包含 `--typecheck`、`--lint`、`--test`、`--materials`、`--quality`、`--all`，以及必须单独使用的
`-h` / `--help`。无 selection 参数时使用 required；多个 focused preset 取并集并替换 required，重复项被规范化；
`--all` 不能与 focused preset 组合。`--release-receipt <path>` 是 selection 之外的 formal candidate input，只能与
`--all` 组合。help 在 candidate preparation、package import 和 log directory creation 前退出。

- required 是按 Git 变更 region 选择的日常增量检查；`--all` 强制选择完整 Gate（含 package acceptance）。没有可信 Git 变更证据时，changeFlag 按保守路径选择相应 Checks，而不是当作零变更。
- focused preset 只选择相应闭合集：`typecheck`、`lint`、routine `test`、repository `materials` 或 `quality`。`--test` 不隐式加入 package acceptance。

#### 依赖选择与关系闭合

entry manifest 为每项 Gate Check 投影 Product 的 `{ when, propagateDependsOn? }` enablement。Gate 的 `when` 使用公开的
string-leaf AST，且对每个投影写入 literal `propagateDependsOn: true`，因此命中的 downstream Check 可启动其
`dependsOn` prerequisite；Product 保留未选 Check 的 `not-applicable / flag-condition-not-matched` fact，并按普通 lifecycle
运行被带入的 prerequisite。公开 grammar 与默认 selection 由[Check authoring 指南](../guides/extending-check-lifecycle.md#按-flag-选择-check)拥有；
Gate 只拥有 manifest projection 与其验证。

默认 required 的 typecheck、lint、format、test lanes、质量扫描、Decision 与 Test Evidence 各按自己的保守输入 region 选择，映射由 `runtime/eligibility.ts` 维护。Git snapshot 取本地 `HEAD~1...HEAD` 的最近一次提交（merge commit 的第一父链），并合并 staged、unstaged 与 untracked 变化；它不依赖远端分支同步状态。缺少可解析的本地父提交或其它 Git 证据时，走保守选择。

共享 material source 可选择多个实际消费者。package supporting lane 由已登记随包材料及其生成/构建输入选择，不由调查或决策文档选择。Test Evidence 对 Case 账本及当前行为 owner 所在的文档目录保守选择，同目录内的非 owner 文档仍可能唤起它；新增 owner 路径须由 selection 测试闭合。调查和决策文档不是行为 owner。

`prepared-package-candidate`、repository material links 与 Git diff whitespace 始终属于 required。Markdown link validation 在任意文件变更时扫描完整 corpus，覆盖 region 外链接目标的反向依赖。focused preset 和 `--all` 是不依赖 change flag 的强制路径；发布前运行 `--all`。

材料 JSON、Schema、Schema publication 与 machine example Checks 各自使用 `(required AND changeFlag(<own-input>)) OR materials OR all`。`markdown-lint` 使用自己的 docs/changes Markdown input，并额外由 `quality` focused path 强制执行。schema-publication 的输入包含发布 schema 与 v4 schema source；machine example 的生成读取完整 Product 执行与输出模型，因此它保守覆盖 Product 非测试 `src/**`，但普通 scripts 或无关 docs 不会启动它。具体 region 由 `runtime/eligibility.ts` 声明；可信零匹配时 Check 保留 not-applicable，Git unavailable 时 Product 注入 flag 并保守执行。

`materials-links-validator` 始终属于 required，因为 Markdown 链接可引用任意 region 外 target。Markdown link validation 也可由 focused `materials` / `quality` 与 `--all` 强制运行。

Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 required 与
每个 preset 的选择闭合，以保证观察输入可用。`observes` 不传播选择。任一 owner 自带 `enabledByFlags` 时 Gate 拒绝组合，
避免覆盖 owner 的 condition。

#### 聚合结果

bound Run 不传入 aggregation policy，而使用 Product 的默认 strict-all aggregate。它复用同次 flag-and-dependency effective selection（不是 `--all` selection），要求每项均为 `passed`；任何其它终态或空 selection 都使 aggregate failed。findings、messages、Records 与 final data 不直接参与 aggregate。

#### 并发与优先级

scheduler 的 root `maxParallel`、named-resource budget 与跨 owner mutex 名称在 `definition.ts` 声明；Check 固有 timeout/mutex 可由其 owner 对象声明，Gate manifest 保证本地 relation 输入与 `observes` 可读性，Product 则拥有已选 `dependsOn` closure。external-consumer provider 独占 package lifecycle mutex；会读写 checked-in repository material 的 validation Checks 共享 repository-material mutex。

Gate 保留 root `maxParallel: 3`，并使用两个**逻辑** named-resource budget；unit 既不是 CPU core、内存量，也不是实测竞争系数：

| Resource ID                     | Capacity / unit              | Claiming Checks                                                                                                      | 静态分类理由                                                                                                                             |
| ------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `project-gate-bun-test-runners` | 2 个并发 `bun test` runner   | 所有 `tests-*` test-lane Check，各 claim `1`                                                                         | 每个 lane 都启动一个 Bun test child runner。预算限制这一同类 runner 最多占用两个 root slot，而不保证某一异类 Check 一定获准入。          |
| `project-gate-repository-scans` | 2 个并发递归 repository scan | `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-lint`、`markdown-link-validation`，各 claim `1` | 五项都会递归收集或读取 repository inputs；前三项还会运行 scanner 或 worker。预算避免让三项以上同类全树读取重叠，同时不把五项全部串行化。 |

typecheck、lint、format、candidate provider、external-consumer provider 与 native repository-material/governance Checks 不声明 named-resource claim：它们不属于以上同类工作预算；已有 package-lifecycle/repository-material mutex 仍单独表达各自的独占关系。新声明必须先有同样可从 owner 恢复的共享工作特征和逻辑单位；不得因单次时长、高方差或“所有 Check 都用 CPU”扩大这些 budget。Product 继续验证 capacity/claim 合法性并原子持有/释放 units；模拟器可读取版本化映射，但必须自行定义竞争减速，不得从该表推断物理竞争或性能收益。

静态 `admissionPriority` 也只由 `definition.ts` 配置。它只在同一 ready 层级内排序，不能越过 dependency、mutex、capacity、lifecycle 或 cancellation hard guard。当前 Gate 不声明非零 priority：成对测量没有同时改善 required 与 complete workload 的 median，因此所有 Check 的 effective priority 都是 `0`。

完整 preset 集合和可执行例子由 `--help` 输出；root `check` script 经 `mise exec` 调用同一个 `run.ts`，
Gate 只为 file metrics 读取 mise-bound SCC command。

### Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-lint` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们是同一 Project Definition 中可逐项审阅和选择的普通 package Checks，没有独立 quality command 或嵌套 Run。

#### Finding 与状态

Gate 对 duplicate/file/function/Markdown Link 四项显式使用 `blocking` finding policy：

- 未被 owning Check 既有 waiver 或 selection exclusion 消除的 normal Finding 保留完整 final data / Records，并令 owning Check `failed`。
- zero Finding 仍令 Check `passed`。
- external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。

安全摘要由 owning Check 有上限地输出，超过摘要上限时只追加精确 omitted count。完整 Finding facts 以 machine Records 为准。

这四项都是 required 与 `quality` preset 的成员，故其未豁免 normal Finding 会由 owning Check 结算为 failed，并通过默认 strict-all aggregate 阻断 required、`--quality` 与 `--all` invocation；`markdown-link-validation` 还是 `materials` preset 成员，因此同样阻断 `--materials`。Gate 不从 Finding、message 或 Record 重算这个结果。此处的 repository-private blocking policy 不改变 package constructor：duplicate detection、file metrics、function metrics 与 Markdown Link 在 consumer 省略 `findingPolicy` 时继续使用 `non-blocking` advisory default。

`markdown-lint` 是第五个、独立的 docs/changes Check，属于 required、`materials` 与 `quality`。它固定八项默认规则而不启用 `link-fragments`，并显式保持 `non-blocking`：lint Finding 以 owning Check 的 Records、消息和 final data 输出，不使 owning Check 或 aggregate failed。空输入和 source/backend failure 仍按 package 的 `not-applicable` / `unavailable` 语义结算。

将 `markdown-lint` 改为 blocking 前，须按届时的仓库 Markdown corpus 审查其 Finding 与 rejected input；当前配置保持 non-blocking。

同一 `blocking` policy 适用于 required、`--all` 和正式 release receipt 验证；它不新增 release-only reducer 或 waiver，既有 waiver/exclusion 仍只由 owning Check 解释。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自 owner 阻断。

#### Gate manifest 的函数行数 Finding

`createProjectGateEntries` 保持一份顺序完整的声明清单，使 Check 顺序、selection metadata 和资源声明可以沿同一阅读路径恢复。该函数的 `function-code-density` Finding 来自清单行数，而非条件分支或失败恢复；把清单拆成组装函数会遮蔽这些关系。

`scripts/project/gate/checks/repository-quality.ts` 为这一 Finding 配置精确 waiver，identity 限定路径、函数名、起始行和指标。`functionMetrics` 仍发布原 Finding Record，并标记为非阻断；其它函数和指标继续按 `blocking` policy 结算。起始行变化或 Finding 消失时，Check 会发布 unused-waiver audit Record 和 warning，维护者据此重审 identity 与理由；该 audit 本身不使 Check 失败。

#### 仓库选择范围

repository-private scope 只让 TypeScript、current Schemas 和 examples 进入 `duplicate-detection`；Markdown 由 file metrics
与 Markdown link validation 观察，不进入重复检测。`docs/schemas/historical/**` 不进入 duplicate/file maintainability
metrics，但仍由显式 documentation contract 严格验证。repository defaults 还排除 `**/archive/**`；这是本项目配置，不是
package 的公共默认值。

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
- stdout/stderr 的上限固定为 `64 MiB`；当前 Gate command entry 不向各 invocation 暴露另一套 output limit 配置。
- 未单独配置 timeout 的 Gate 单命令使用 `120_000 ms`；package acceptance 与 `lint-product` 保持 `30_000 ms`。
  这个默认值是新增 bounded policy，不等价于旧 adapter 的无 timeout 行为。
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

默认 performance contributor 对 required / `--all` 应用本机手动配置的总耗时硬阈值。Gate 启动前必须存在
`.cache/vibe-check/project-gate/performance-baseline.json`，其 `baselines` 中须有当前 selection 与
`platform` / `architecture` / Bun version 对应的记录；缺失或无效时在 candidate preparation 前失败。
记录还必须与本次 Product Run 的 `declarativeFingerprint` 精确匹配，匹配失败或
`elapsed-to-initial-result` 超过 `maxElapsedMs` 时最终 Gate `failed`。focused preset 不受总耗时门禁约束。
文件是被 Git 忽略的本机配置，只能由维护者手动写入或更新；Gate 不学习运行时数据、不自动重置阈值。
阈值由各工作区的本机配置决定，不随仓库同步。下例只展示首次建立 required 记录的结构：runtime 和
`20000` ms 是示例值，fingerprint 是临时全零值。实际配置须填写本机 runtime 与人工选定的阈值；
`--all` 也须单独确定。后续改变阈值须重新作出人工决定并修改本机文件：

```json
{
  "schemaVersion": 1,
  "baselines": [
    {
      "profile": "required",
      "runtime": { "platform": "linux", "architecture": "x64", "bunVersion": "1.3.14" },
      "declarativeFingerprint": "0000000000000000000000000000000000000000000000000000000000000000",
      "maxElapsedMs": 20000
    }
  ]
}
```

运行工作负载、工具链或 Definition 变化后，维护者需核对实际 fingerprint 和测量，再明确决定是否更新本机记录；不能把
`no matching baseline` 当作放行。observer 不解析 Product diagnostic log，也不将并行 Check 耗时相加为墙钟耗时。
首次建立时，维护者先手工写入当前 runtime、profile、明确选定的 `maxElapsedMs` 和示例中的临时零 fingerprint
（64 个 `0` 字符；正式值必须是 64 个小写十六进制字符）；
随后运行标准 Gate。Checks 全部通过时，`no matching local performance baseline` 错误会打印本次真实 fingerprint；
维护者核对本次耗时后手工替换临时值，再运行标准 Gate 验证。focused preset 不评估总耗时，也不提供这种匹配诊断。

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

参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时，也映射为 `2`。

#### Gate terminal and transcript

`gate.log` 保存 adapter 与 `resultContributor` 的最终事实，`progress.log` 保存 Product progress，child 输出留在各 Check 的 transcript。
通道完整边界见[Gate 诊断](gate-diagnostics.md#gate-terminal-and-transcript)。Gate 不解析这些文件来重建结果。
成功关闭时 `gate.log` 追加 invocation directory、唯一最终 result 与 exit；关闭失败仍返回 `unavailable` / exit `2`。
