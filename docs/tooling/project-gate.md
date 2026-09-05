# Project Gate

本文拥有 repository Project Gate 的 root entry、candidate binding、aggregation、diagnostics 与 exit mapping。
它不重新定义 Product Run 或 Check contracts。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；项目不提供第二个 Gate root command。Gate 源码按责任保持下面的固定布局：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、aggregate、outputs、scheduler 与 afterGate
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、aggregation、result 与 transcript mechanics
```

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
required/preset membership、Gate 自有的 `observes` 闭合，以及 run-level aggregate、outputs、scheduler 和唯一
project-owned `afterGate`。组合入口可以引用 `checks/**` owner 已定义的普通 Check 对象或闭合对象组；领域
options、scanner protocol、test file partition 和 execution mechanics 留在对应 owner，不为追求物理单文件而
复制。`runtime/**` 不另行拥有 Check membership、领域 policy、`dependsOn` 传播或第二个 Hook 配置面。

一次运行先解析参数并准备 exact local candidate，或在 `--all --release-receipt <path>` 下重验显式 release receipt；之后才动态导入
`runtime/bound-run.ts`。这个分层不是第二个运行入口：`run.ts` 必须先确定 candidate，bound Run 才能通过已解析的
package public entry 构造 Project Definition，并验证该 entry 与 prepared candidate 相同。直接从源码静态导入
package implementation 会绕过这个 candidate 边界，因此不允许。

每次 invocation 先在 `.log/project-gate/<invocation-id>/` 创建 exact evidence root；candidate preparation 仍发生在此之前。bound Run 只把这一次已创建 root 映射为 Product controls，不在 Product 内再建立一层目录：`diagnosticLogging.directory` 为 root、`machinePublication.directory` 为 `machine/`、`progressLogFile` 为 `progress.log`，并只授予 executable Check `checks/` artifact base。因此布局固定为：

```text
<invocation>/
├── gate.log
├── progress.log
├── core-<utc-compact>-<product-uuid>.log
├── scheduler-<utc-compact>-<product-uuid>.log
├── learned-admission-<utc-compact>-<product-uuid>.log  # 仅 learned policy
├── machine/
│   ├── run.json
│   └── records.ndjson
└── checks/
    └── <encoded-check-id>/
        └── process.log
```

这三个 Product filename 共享创建时刻和 Product UUID；其每条 diagnostic observation 还带 Product invocation ID、全局 sequence 与 monotonic elapsed。Gate evidence root 只提供这一次 Gate invocation 的共同目录，不把 Gate、progress 和 Product writer 伪装为同一 writer 或同一 event sequence。所有文件都是本次运行的本地 evidence；不存在 `latest`、retention、quality-only report、根级 `run.json` / `records.ndjson`、旧 `process/<check-id>.log` 或跨 invocation 合并协议。machine files 必须按 [Output](../output.md) 的完整二文件集合读取。

### Prepared candidate data

`checks/prepared-candidate.ts` 将 adapter 已准备的 candidate 重新验证为 typed dependency data；artifact acceptance 只消费其 exact artifact、digest、version 与 staging identity。选择 package acceptance 时，`checks/external-consumer-material.ts` 从同一 dependency 建立 invocation-owned external consumer，并让 types、documentation 与 runtime consumer Checks 只读消费已验证材料。`runtime/bound-run.ts` 在 `finally` 中清理这项 lease；测试故障注入和临时材料仍由各自 fixture 拥有。

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界由 [Package lifecycle 的 formal release receipt](package-lifecycle.md#formal-release-preparation-and-receipt) 拥有。

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

Package supporting、artifact acceptance、三个 external-consumer acceptance、各 Product Check owner、Product runtime、Project tooling、Test Evidence、validation 与 ordinary scripts 分别结算。快速 candidate contract 属于 package supporting；显式 `candidate.integration.ts` 不符合 routine `*.test.ts` 身份，因此不由 `--test` 发现，其正式入口是 `package:candidate:integration`。External-consumer provider 是独立 Check，不伪装成 test lane。

### Selection presets and scheduling

selection 参数只包含 `--typecheck`、`--lint`、`--test`、`--docs`、`--quality`、`--all`，以及必须单独使用的
`-h` / `--help`。无 selection 参数时使用 required；多个 focused preset 取并集并替换 required，重复项被规范化；
`--all` 不能与 focused preset 组合。`--release-receipt <path>` 是 selection 之外的 formal candidate input，只能与
`--all` 组合。help 在 candidate preparation、package import 和 log directory creation 前退出。

- required 是日常完整检查，但不选择高成本 package artifact 与 external-consumer acceptance；`--all` 选择完整 Gate。
- focused preset 只选择相应闭合集：`typecheck`、`lint`、routine `test`、`docs` 或 repository `quality`。`--test` 不隐式加入 package acceptance。
- entry manifest 为每项 Check 投影 Product 原生 `enabledByFlags`，并以 literal `propagateDependsOn: true` 允许命中的下游 Check 启动其 `dependsOn` prerequisite。未选中的 Check 仍保留 `not-applicable / flag-condition-not-matched` fact；被启动的 prerequisite 走普通 Product lifecycle。该 field 的 grammar、默认兼容与“flags 不是权限”边界由 [Configuration](../development/project-definition.md#flag-enabled-checks) 唯一拥有。
- Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 required 与每个 preset 的选择闭合，以保证观察输入可用。Product 不从 `observes` 传播选择。任一 owner 自带 `enabledByFlags` 时仍拒绝组合，避免 Gate 覆盖其原有条件。
- 所有 effective Check status 进入同一个显式 `effective` aggregate（不是 `--all` selection）：它复用同次 Product flag-and-dependency selection，必须全部 `passed`；`failed` 使 aggregate failed，`unavailable` propagate，`not-applicable` fail，空 selection failed。findings、messages、Records 与 final data 不直接参与 aggregate。
- scheduler 的 root `maxParallel` 与跨 owner mutex 名称在 `definition.ts` 声明；Check 固有 timeout/mutex 可由其 owner 对象声明，Gate manifest 保证本地 relation 输入与 `observes` 可读性，Product 则拥有已选 `dependsOn` closure。external-consumer provider 独占 package lifecycle mutex；会读写 checked-in documentation materials 的 validation Checks 共享 documentation mutex。root 并发上限不因本次调整改变。
- 静态 `admissionPriority` 也只由 `definition.ts` 配置。它只在同一 ready 层级内排序，不能越过 dependency、mutex、capacity、lifecycle 或 cancellation hard guard。当前 Gate 不声明非零 priority：成对测量没有同时改善 required 与 complete workload 的 median，因此所有 Check 的 effective priority 都是 `0`。

完整 preset 集合和可执行例子由 `--help` 输出；root `check` script 经 `mise exec` 调用同一个 `run.ts`，
Gate 只为 file metrics 读取 mise-bound SCC command。

### Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们仍是同一
Project Definition 中可逐项审阅和选择的普通 package Checks，不存在父 quality Check、嵌套 Run、第二份运行配置
或独立 quality command。

Gate 对四项显式使用 `blocking` finding policy：未被 owning Check 既有 waiver 或 selection exclusion 消除的 normal Finding 保留完整 final data / Records，并令 owning Check `failed`；安全摘要仍由 owning Check 有上限地输出，超过摘要上限时只追加精确 omitted count。zero Finding 仍令 Check `passed`。external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。完整 finding facts 以 machine Records 为准。

四项都是 required 与 `quality` preset 的成员，故其未豁免 normal Finding 会通过现有 status-only `effective` / `all` aggregate 阻断 required、`--quality` 与 `--all` invocation；`markdown-link-validation` 还是 `docs` preset 成员，因此同样阻断 `--docs`。Gate 不从 Finding、message 或 Record 重算这个结果。此处的 repository-private explicit policy 不改变 package constructor：duplicate detection、file metrics、function metrics 与 Markdown Link 在 consumer 省略 `findingPolicy` 时继续使用 `non-blocking` advisory default。

repository-private scope 只让 TypeScript、current Schemas 和 examples 进入 `duplicate-detection`；Markdown 由 file metrics
与 Markdown link validation 观察，不进入重复检测。`docs/schemas/historical/**` 不进入 duplicate/file maintainability
metrics，但仍由显式 documentation contract 严格验证。repository defaults 还排除 `**/archive/**`；这是本项目配置，不是
package 的公共默认值。

同一 `blocking` policy 适用于 required、`--all` 和正式 release receipt 验证；它不新增 release-only reducer 或 waiver，既有 waiver/exclusion 仍只由 owning Check 解释。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自 owner 阻断。

Gate 只接受 mise 提供的绝对 SCC path；缺失或相对 `VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`，而让 file-metrics owner 按 scanner failure 结算。`functionMetrics` 直接使用内置 analyzer，不读取 scanner command 或环境 binding。三个 metrics Check 的
`product-source` area 都排除 `src/package-checks/function-metrics/analyzer/**`：该目录由 source-aligned port owner 整体维护，不生成
repository duplicate、file 或 function-metric Finding。除此共同边界外，Function metrics 还排除 Product `*.test.ts` 与
`*.test-support.ts`。该差异只移除测试函数的复杂度与密度 Finding；duplicate detection 与 file metrics 仍选择这些测试文件，
以保留重复代码和超长文件对使用体验的证据。配置测试必须同时证明这项差异、共同 analyzer exclusion，以及目录外 Product
implementation 仍被三项选择。该范围不从 provenance ledger 动态生成，也不改变 package Check 的公共默认 selection。

整目录 metrics 排除不影响 analyzer 的 lint、format、typecheck、source identity、oracle/parity、deviation、provenance/license、
import-boundary 或行为测试。边界见 [Check-owned scanner dependencies](../development/scanner-dependencies.md)。

### Process evidence

Native docs、Decision Records 与 semantic Test Evidence Checks 不创建单进程 transcript。它们只能把 producing owner 已批准、已排序的 typed safe diagnostics 投影为 private native adapter 所需的 `{ id, data }`；每项诊断成为一个完整的 Check-local Record。adapter 不从 Record data 推断 ID、字段、顺序或 presentation，只保留独立的 focused command message。Product progress 负责默认 terminal preview：每个 settled block 最多五条 Record，按该 Check 的 canonical local Record ID order；Record 行为 local ID 与 canonical JSON data。每条在 terminal-control escaping 后最多 240 个 Unicode code points（含 `… [truncated]` marker），余项以准确 omitted count 指向完整 Records。预览不改变 Check data、status、aggregate 或 machine Record set。

native adapter 接收到空、重复或不安全 `{ id, data }` diagnostics，或 native operation 抛错时，必须 fail closed 为 `unavailable`，不发布 synthetic failed Record，也不创建 transcript。Decision Records 只发布经 capability 验证的 decision ID、repo-relative source/index path 与 owner-authored classification；不会转交可能含 YAML、schema 或 filesystem detail 的 `errors: string[]`。Test Evidence 只接受封闭 origin/code allowlist，并依 code-specific policy 投影已验证的 repo-relative path/location、Case ID 和 `runner: "bun"`；child output、parser/error message、JUnit target/selector/entity key 与其它自由文本不进入 Record。

每个 external-command Check 只从自己的 `CheckExecutionContext.artifactDirectory` 读取路径能力；未授予时以 `transcript-unavailable` fail closed。已授予时，它在启动 child 前写入 `checks/<encoded-check-id>/process.log` 的 running transcript，并在结算后将同一路径改写为 command、stdout/stderr、exit/signal/timeout 与安全 error summary；startup 写入失败时不得启动 child。process 与 ast-grep rule-test Check 不从 Gate Definition closure 或 invocation root 获取路径，也不能写 sibling Check artifact。

#### Project Gate 的结构化非零 process Records

这套投影只适用于**已经结算为 nonzero exit** 的 Gate process Check；它不是 generic process adapter 按 command、argv 或人读输出猜测工具语义的机制。process base 仍是 child execution、transcript、four-state outcome 与 generic fallback 的唯一 owner；工具 owner 只负责将自己的已验证 stdout 协议转换为完整的 safe Record 集合；Core 继续是唯一的 Record preview owner。

当前的显式选择只有下表三项。没有列在表中的 process Check 不拥有 structured failure protocol。

| Gate Check     | 工具 owner protocol                                                | 接受后发布的 Record data                                                    |
| -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `lint-product` | oxlint `--format=json`；只接受 `src/**` 内的诊断                   | `{ kind: "oxlint-diagnostic", path, location, rule, severity, occurrence }` |
| `lint-scripts` | oxlint `--format=json`；只接受 `scripts/**` 内的诊断               | `{ kind: "oxlint-diagnostic", path, location, rule, severity, occurrence }` |
| `format-check` | oxfmt `--list-different`；只接受 `workspaceFormatTargets` 中的路径 | `{ kind: "oxfmt-difference", path }`                                        |

每次适用的 nonzero result 都按以下固定顺序处理：

1. process base 先成功写入完整 settled `checks/<encoded-check-id>/process.log`；若没有 artifact capability、transcript 不能写入、执行被取消、spawn/error、status 为 null 或 timeout，则结算为既有 `unavailable`，不尝试投影。
2. 只有表中 Gate entry 显式提供的工具 owner projector 才可读取该次 stdout。它必须先构造、排序并验证**整组**候选 Records，之后才可替换 generic Record。
3. 任何候选不完整或不安全、unknown field、JSON/path-list 形状错误、workspace/scope/target escape、重复 identity 或 parser exception 都拒绝整组候选；Check 仍失败，并且只发布一个 generic `command-failure` Record。

oxlint 的 closed JSON schema 要求每个诊断具有 `error` 或 `warning` severity、scope 内 canonical relative path、正 line/column，以及匹配 `/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?(?:\([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?\))?$/` 的 `code`。安装的 oxlint 1.78 允许 label 只有 `{ span }`，所以 `label` 可缺失或为 string，但永不进入 Record。oxfmt 要求输出为完整、非空、无重复的 list-different 路径集合；每一行都必须是已授权 target 内的 canonical relative path。

两种工具 owner 都只能发布由 ASCII 字母、数字、`.`、`_`、`-`、`/` 组成的 workspace-relative path；因此 `:`、`@`、`?`、`#`、`=` 等 credential 或 query 风险字符不能进入 data 或 identity。structured Record 与所有 terminal message 均不得复制 child output、tool message/help/snippet、absolute root、command arguments、credential URL 或 digest。结构化 Records 使用本节前述的 Core 默认 preview；工具 adapter 不控制 preview 的条数、排序、截断或文本格式。

没有成功 structured projection 的 process Check，其 failure Record 和 terminal message 只引用 `checks/<encoded-check-id>/process.log`。generic failure Record 的 `command` 是 basename label，不是可执行文件完整路径；完整 command/args 只保留在私有 transcript。Bun test、tsgo、Git whitespace 与 ast-grep rule-test 没有本 Gate 采用的 stable owner protocol，因此保持 generic command failure；ast-grep version mismatch 仍只发布 expected version、固定 mismatch classification、version exit code 与 invocation-relative log reference。Product diagnostic channel、Gate transcript、progress transcript 与 child transcript 各自记录不同层次，不互相解析或复制。

### Gate result post-processing and exits

`runtime/bound-run.ts` 只在 exact candidate 准备后由 `run.ts` 动态加载；它投影 `resolvedEntryPath`、Product `run` 与 `definition.ts` 配置的唯一 `afterGate`。`run.ts` 必须先验证该 entry 等于 prepared candidate 的 exact entry，随后才运行 Product Run、从同一个 RunResult 形成初步 Gate result，并调用该 Hook。默认 Hook 显式调用 elapsed/per-phase performance observer；只有 workload identity 与 checked-in baseline 匹配时才比较，其结果是 advisory，不能修改 Check facts、aggregate 或 process exit。observer 不读取、解析或归约 Product diagnostic log 的 `scheduler.summary`，也不把它变成新的 warning、budget、autotune 或比较输入。

`afterGate` 是 result post-processing，不是 Check `preflight`：后者是 Product Run 内每项 Check 在 execution 前的 options 准备边界，而前者只在整个 candidate-backed Run 已形成初步 Gate result 后执行。Hook 是受信任的项目 JavaScript/Bun 代码，可同步或异步执行项目授权范围内的工作；它不是 package API、plugin、sandbox 或 registry，也没有 `beforeGate` 对应物。正式配置只在 `definition.ts`，`run.ts` 的 loader、clock 与 transcript injection 仅为 adapter 测试 seam，不能用作另一配置入口。

Hook 必须返回闭合的 `{ status, messages }`，且不能改写 context 或 RunResult；抛错或返回非法 shape 时 fail closed 为 `unavailable`。最终 `passed`、`failed`、`unavailable` 分别映射 exit `0`、`1`、`2`。参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时也映射为 `2`。

#### Gate terminal and transcript

| Channel        | 它包含的事实                                                                                                                           | 它不包含的事实                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `gate.log`     | Gate adapter 的 candidate/selection/aggregation/execution messages、`afterGate` final messages，以及唯一 final directory/result/exit。 | Product progress、Check presentation 与 child output。               |
| terminal       | 一条 candidate/source/selection 启动摘要、Product progress、Gate warning/error、logs path 与最终 result。                              | candidate、aggregation 或 post-processing 的完整 Gate adapter info。 |
| `progress.log` | Product progress owner 生成并与 terminal 双投递的 progress text。                                                                      | Gate adapter transcript 或 child transcript。                        |

Gate 不 patch `console`、`process.stdout` 或 `process.stderr`，也不解析 Product log、machine files、`progress.log` 或 child
transcript 来重建结果。成功关闭时 `gate.log` 追加 invocation directory、唯一最终 result 与 exit；关闭失败时即使 Product Run
已结算，也返回 `unavailable` / exit `2`。
