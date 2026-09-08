# Project Gate

维护 Project Gate 时，本文用于定位运行入口与配置、选择检查、查找运行证据，以及核对最终退出码。
Gate 的 candidate 绑定、aggregation 和诊断接线在此定义；Product Run 与 Check 契约仍由各自 owner 定义。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；Gate 源码按责任保持下面的固定布局：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、aggregate、outputs、scheduler 与 afterGate
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、aggregation、result 与 transcript mechanics
```

### 组合配置与 candidate 绑定

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
required/preset membership、Gate 自有的 `observes` 闭合，以及 run-level aggregate、outputs、scheduler 和唯一
project-owned `afterGate`。组合入口可以引用 `checks/**` owner 已定义的普通 Check 对象或闭合对象组；领域
options、scanner protocol、test file partition 和 execution mechanics 留在对应 owner，不为追求物理单文件而
复制。`runtime/**` 不另行拥有 Check membership、领域 policy、`dependsOn` 传播或第二个 Hook 配置面。

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

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界由 [Package lifecycle 的 formal release receipt](package-lifecycle.md#formal-release-preparation-and-receipt) 拥有。

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

Package supporting、artifact acceptance、三个 external-consumer acceptance、各 Product Check owner、Product runtime、Project tooling、Test Evidence、validation 与 ordinary scripts 分别结算。快速 candidate contract 属于 package supporting；显式 `candidate.integration.ts` 不符合 routine `*.test.ts` 身份，因此不由 `--test` 发现，其正式入口是 `package:candidate:integration`。External-consumer provider 是独立 Check，不伪装成 test lane。

### Selection presets and scheduling

#### 选择参数

selection 参数只包含 `--typecheck`、`--lint`、`--test`、`--docs`、`--quality`、`--all`，以及必须单独使用的
`-h` / `--help`。无 selection 参数时使用 required；多个 focused preset 取并集并替换 required，重复项被规范化；
`--all` 不能与 focused preset 组合。`--release-receipt <path>` 是 selection 之外的 formal candidate input，只能与
`--all` 组合。help 在 candidate preparation、package import 和 log directory creation 前退出。

- required 是日常完整检查，但不选择高成本 package artifact 与 external-consumer acceptance；`--all` 选择完整 Gate。
- focused preset 只选择相应闭合集：`typecheck`、`lint`、routine `test`、`docs` 或 repository `quality`。`--test` 不隐式加入 package acceptance。

#### 依赖选择与关系闭合

entry manifest 为每项 Check 投影 Product 原生 `enabledByFlags`，并以 literal `propagateDependsOn: true` 允许命中的下游 Check 启动其 `dependsOn` prerequisite。未选中的 Check 仍保留 `not-applicable / flag-condition-not-matched` fact；被启动的 prerequisite 走普通 Product lifecycle。该 field 的公开 grammar、默认选择与“flags 不是权限”边界由[Check authoring 指南](../guides/extending-check-lifecycle.md#按-flag-选择-check)拥有；内部 validation/normalization 见 [Project Definition](../development/project-definition.md#flag-enabled-checks)。

Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 required 与每个 preset 的选择闭合，以保证观察输入可用。Product 不从 `observes` 传播选择。任一 owner 自带 `enabledByFlags` 时仍拒绝组合，避免 Gate 覆盖其原有条件。

#### 聚合结果

所有 effective Check status 进入同一个显式 `effective` aggregate（不是 `--all` selection）：它复用同次 Product flag-and-dependency selection，必须全部 `passed`；`failed` 使 aggregate failed，`unavailable` propagate，`not-applicable` fail，空 selection failed。findings、messages、Records 与 final data 不直接参与 aggregate。

#### 并发与优先级

scheduler 的 root `maxParallel`、named-resource budget 与跨 owner mutex 名称在 `definition.ts` 声明；Check 固有 timeout/mutex 可由其 owner 对象声明，Gate manifest 保证本地 relation 输入与 `observes` 可读性，Product 则拥有已选 `dependsOn` closure。external-consumer provider 独占 package lifecycle mutex；会读写 checked-in documentation materials 的 validation Checks 共享 documentation mutex。

Gate 保留 root `maxParallel: 3`，并使用两个**逻辑** named-resource budget；unit 既不是 CPU core、内存量，也不是实测竞争系数：

| Resource ID                     | Capacity / unit              | Claiming Checks                                                                                     | 静态分类理由                                                                                                                             |
| ------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `project-gate-bun-test-runners` | 2 个并发 `bun test` runner   | 所有 `tests-*` test-lane Check，各 claim `1`                                                        | 每个 lane 都启动一个 Bun test child runner。预算限制这一同类 runner 最多占用两个 root slot，而不保证某一异类 Check 一定获准入。          |
| `project-gate-repository-scans` | 2 个并发递归 repository scan | `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-link-validation`，各 claim `1` | 四项都会递归收集或读取 repository inputs；前三项还会运行 scanner 或 worker。预算避免让三项以上同类全树读取重叠，同时不把四项全部串行化。 |

typecheck、lint、format、candidate provider、external-consumer provider 与 native documentation/governance Checks 不声明 named-resource claim：它们不属于以上同类工作预算；已有 package-lifecycle/documentation mutex 仍单独表达各自的独占关系。新声明必须先有同样可从 owner 恢复的共享工作特征和逻辑单位；不得因单次时长、高方差或“所有 Check 都用 CPU”扩大这些 budget。Product 继续验证 capacity/claim 合法性并原子持有/释放 units；模拟器可读取版本化映射，但必须自行定义竞争减速，不得从该表推断物理竞争或性能收益。

静态 `admissionPriority` 也只由 `definition.ts` 配置。它只在同一 ready 层级内排序，不能越过 dependency、mutex、capacity、lifecycle 或 cancellation hard guard。当前 Gate 不声明非零 priority：成对测量没有同时改善 required 与 complete workload 的 median，因此所有 Check 的 effective priority 都是 `0`。

完整 preset 集合和可执行例子由 `--help` 输出；root `check` script 经 `mise exec` 调用同一个 `run.ts`，
Gate 只为 file metrics 读取 mise-bound SCC command。

### Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们是同一 Project Definition 中可逐项审阅和选择的普通 package Checks，没有独立 quality command 或嵌套 Run。

#### Finding 与状态

Gate 对四项显式使用 `blocking` finding policy：

- 未被 owning Check 既有 waiver 或 selection exclusion 消除的 normal Finding 保留完整 final data / Records，并令 owning Check `failed`。
- zero Finding 仍令 Check `passed`。
- external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。

安全摘要由 owning Check 有上限地输出，超过摘要上限时只追加精确 omitted count。完整 Finding facts 以 machine Records 为准。

四项都是 required 与 `quality` preset 的成员，故其未豁免 normal Finding 会通过现有 status-only `effective` / `all` aggregate 阻断 required、`--quality` 与 `--all` invocation；`markdown-link-validation` 还是 `docs` preset 成员，因此同样阻断 `--docs`。Gate 不从 Finding、message 或 Record 重算这个结果。此处的 repository-private explicit policy 不改变 package constructor：duplicate detection、file metrics、function metrics 与 Markdown Link 在 consumer 省略 `findingPolicy` 时继续使用 `non-blocking` advisory default。

同一 `blocking` policy 适用于 required、`--all` 和正式 release receipt 验证；它不新增 release-only reducer 或 waiver，既有 waiver/exclusion 仍只由 owning Check 解释。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自 owner 阻断。

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

外部命令将完整过程写入其 Check artifact 的 `process.log`；native Checks 发布 typed safe Records。
维护字段投影、失败降级或终端预览时见[Gate 诊断与进程证据](gate-diagnostics.md#process-evidence)。

### Gate result post-processing and exits

#### 调用顺序与性能观察

1. exact candidate 准备后，`run.ts` 动态加载 `runtime/bound-run.ts`，取得它投影的 `resolvedEntryPath`、Product `run` 和 `definition.ts` 配置的唯一 `afterGate`。
2. `run.ts` 验证该 entry 等于 prepared candidate 的 exact entry，再运行 Product Run。
3. 从同一个 RunResult 形成初步 Gate result，然后调用 `afterGate`。

默认 Hook 显式调用 elapsed/per-phase performance observer。只有 workload identity 与 checked-in baseline 匹配时才比较；
结果是 advisory，不能修改 Check facts、aggregate 或 process exit。observer 不读取、解析或归约 Product diagnostic log 的
`scheduler.summary`，也不把它变成新的 warning、budget、autotune 或比较输入。

#### Hook 边界与退出码

`afterGate` 是 result post-processing，不是 Check `preflight`：后者是 Product Run 内每项 Check 在 execution 前的 options 准备边界，而前者只在整个 candidate-backed Run 已形成初步 Gate result 后执行。Hook 是受信任的项目 JavaScript/Bun 代码，可同步或异步执行项目授权范围内的工作；它不是 package API、plugin、sandbox 或 registry，也没有 `beforeGate` 对应物。正式配置只在 `definition.ts`，`run.ts` 的 loader、clock 与 transcript injection 仅为 adapter 测试 seam，不能用作另一配置入口。

Hook 必须返回闭合的 `{ status, messages }`，且不能改写 context 或 RunResult；抛错或返回非法 shape 时 fail closed 为 `unavailable`。

| 最终状态      | process exit |
| ------------- | ------------ |
| `passed`      | `0`          |
| `failed`      | `1`          |
| `unavailable` | `2`          |

参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时，也映射为 `2`。

#### Gate terminal and transcript

`gate.log` 保存 adapter 与 `afterGate` 的最终事实，`progress.log` 保存 Product progress，child 输出留在各 Check 的 transcript。
通道完整边界见[Gate 诊断](gate-diagnostics.md#gate-terminal-and-transcript)。Gate 不解析这些文件来重建结果。
成功关闭时 `gate.log` 追加 invocation directory、唯一最终 result 与 exit；关闭失败仍返回 `unavailable` / exit `2`。
