# 变更日志

本页随包提供版本变化与升级影响，按版本组织；具体行为规范由链接的用户指南拥有。

## 0.0.4

本节记录 `0.0.4` 相对 `0.0.3`（源码边界为 `v0.0.3` tag `4a830ef3`）的净变化与升级影响。
Node `>=24.18` 与包根程序化入口保持不变；纯说明补全和不改变公开行为的内部重构不单列为新 API。

### Flag 未命中展示

flag 未命中的 Check 改为默认显示数量与原因摘要。新增 `outputs.progressRendering.flagMismatchPreviewLimit`，
可按需预览前 N 个名称；完整结果与汇总计数保持。配置及 RunControls 覆盖见[Flag 未命中摘要](./guides/run-outputs.md#flag-未命中摘要)。

### 声明式 callback context 迁移

本次是一次 breaking 切换，不保留旧 helper、旧字段或运行时兼容层。
Check callback 统一为 `prepare(options, context)` / `execute(options, context)`，options 不再属于 context。
从正式 `0.0.3` 升级时，逐项核对以下签名和字段：

| 原用法 | 新用法与升级影响 |
| --- | --- |
| callback function 隐式取得该阶段的框架字段 | 默认零需求，仍调用并传冻结空对象；需要字段用 `defineContextCallback(phase, { contextNeeds, callback })`。 |
| `measurement.cumulative` / `measurementCount` / `measurementAt` | decision 分别声明 `cumulative` / `actionHistory`；prefix reader 位于 actionHistory 下，只有需要 history 才维护。 |
| terminal `rawMeasurement` | 按任务分别声明 `runMeasurement`（原 Run facts，去除 admissions）和 `taskTimings`（独立 timing availability 与可用 admissions）。 |
| `AdmissionPolicyMeasurement` / `SchedulerRawMeasurement` 类型 | 分别改用 `SchedulerActionHistory` / `SchedulerRunMeasurement`；admissions 从独立 `SchedulerTaskTimings` 读取。 |
| command resolver 单 context、completion 把 command/options 混入 context | environment 改为 `(options, context)`；completion 改为 `({ options, command }, context)`，各自声明所需框架字段。 |

迁移后，每个 callback context 只有自身声明的 own data fields，冻结且无跨消费者外层 identity 保证；
同 Run 的冻结底层事实可复用。直接调用具体 learned/command descriptor 时，使用 `.callback` 并自行提供
input/context；广义槽位先收窄，不绕过 raw descriptor 的 never 边界。

**使用过开发期 API 时：** tag 后曾出现的 `defineSchedulerContextCallback` 不属于正式 `0.0.3`。
若使用了该 helper 及 preparation/decision/terminal phase，改为通用 `defineContextCallback` 与
`scheduler.prepare` / `scheduler.decide` / `scheduler.terminal`；Check 和 command 使用各自的 phase。

terminal effect 在 sealed terminal boundary 交付，零需求 effect 到达该边界也会调用；未到该边界仍不保证调用，资源释放不能依赖它。

运行项目类型检查及实际安装包的 TS/JS consumer，并执行代表性 Run，特别核对旧 closure 的隐式字段读取；
TypeScript 无法发现全部 JavaScript/closure 依赖。顺序、取消、direct dependency/artifact 权限、终态失败优先级和旧快照隔离保持。
需要恢复旧版本时，同时恢复旧包和匹配的调用方代码/声明；不要把新 helper/签名与旧包混用。
完整规则见[共同声明](./api-mechanics.md#声明式-callback-context)、[Check](./guides/extending-check-lifecycle.md)、
[Scheduler](./guides/scheduling.md)与[command](./guides/command-check.md)。

### 文件收集范围迁移

项目文件选择统一为纯磁盘 `{ patterns, useDefaultExcludes? }`。升级时按以下顺序复核：

1. 移除旧 `source`、`include`、`exclude` 字段及 `ProjectFileSource` 类型的用法；closed validation 拒绝旧字段，没有 alias、双读或隐式映射。正 include 与用户排除写在同一列表，如 `["src/**", "!src/fixtures/**"]`。
2. 确认默认排除范围。默认层固定且默认启用，只有 `useDefaultExcludes: false` 关闭；用户列表不能绕过它。需选择依赖、build 或 vendor 路径时显式关闭，再自行给出用户负规则。
3. 复核实际候选、后缀 eligibility 与内容安全。旧 Git 来源没有等价替代开关：被 Git 忽略的普通文件和子仓库目录可能进入范围，链接不入选，不能只机械替换字段。
4. Run 的 Git 变更选择仍使用独立的 `changes`，其中 regions 改为 `{ patterns }`，不应用扫描默认排除。

收集保持同步、冻结排序去重，并区分非法输入、必要 I/O 失败和合法无匹配。完整现行规则见[选择与收集项目文件](./guides/collecting-project-files.md)。

包根新增 `DEFAULT_PROJECT_FILE_EXCLUDES`，用于显式读取固定排除基线；`defaultProjectFileSelection` 继续提供可组合的默认选择。

### 调度状态与测量

Scheduler 以同源增量变化维护成员、选择视图和已请求的统计；该内部重构不另改上节 context 契约、选择约束或 immutable 分支。
积分与分类等待改用精确累计、最终一次舍入，保留采样归属和单位；最后几位可能变化，不能依赖旧逐次浮点加法结果。
旧快照和 timing availability 不受后续执行或字段读取顺序影响。消费边界见[调度统计](./guides/scheduling.md#在线选择时读取-observation-prefix)。

修正两项既有错误：pre-admission 依赖已终态但未满足的 Task 不再被错误计入 viable peaks/delay；
取消 pending 依赖链后不再残留重复 forced settlement，已启动 work 仍按原规则 drain。无需更改配置或回调声明。

### 文件索引与 change flag 调试

- **新增 [Core 文件—区域索引](./guides/file-region-index.md)**：`createProjectFileRegionIndex` 接收多份纯值文件/区域来源，
  提供冻结排序的双向关系，区分已知空与未知；`appendSources` 合并已接收值后重建新视图，旧视图不变。
  规则使用共同完整 patterns，实际成员保持来源筛选；构造、查询与追加无 I/O，不应用扫描默认排除。
- **新增 [change flag 调试工具](./guides/debugging-change-flags.md)**：`debugChangeFlags` 显式接收 root、selection 和当前 regions，
  重新收集当前文件全集，保留零/单/多命中，返回范围元数据、token 双向查询与命中数。
  `formatChangeFlagDebugReport` 按需返回文本，不自动输出或分享；不替代实际 Git evidence、effective flags 或 Check 覆盖证明。

### 函数指标：结果变化与读取优化

[`functionMetrics`](checks/function-metrics.md) 的四项指标、默认 limits、27 readers / 55 suffixes、配置与公共 API 保持不变，不提供 Cognitive Complexity。本次变化分为结果准确性和读取让步两部分。

#### 结果变化

- 内置源码基线升级到 Lizard `1.24.1`，改善 regex 和 TS/TSX template 后的函数边界、Python PEP 695 泛型名、Kotlin expression/when 函数、PHP trait method 结束位置和 Rust match arm CCN。Rust 真实 arm 贡献与 Kotlin 正文位置按既有产品结果承诺局部校正。
- 独立于来源升级，修正 TypeScript 显式返回类型后的函数边界，尾随控制流不再进入该函数的位置或指标。
- TS/JS、TSX/JSX 与 Vue 的真实 `??` 按单 token、每项 CCN +1 和完整贡献处理，ND 沿用现有短路状态路径，空白不再改变结果。

#### 升级复核

同一源文件可能出现新增函数、不同名称/位置或指标，也可能移除原有误报，从而改变 Finding 及 blocking 结果。
升级后请复核 Records 与精确 waiver；旧函数 identity 可能产生 unused audit。Records 的结构与结算语义不变。

#### 读取效率与取消边界

对每个非空读取块使用 `setImmediate` 替代 timer 等待，
减少读取准入的额外等待，保留同线程协作取消、实际输入资源上限与完整批次结果。
同步 I/O 仍不可抢占，不新增毫秒响应或 Gate 加速承诺。

### Markdown 引用图、预算与缓存提醒

[`markdownLinkValidation`](./checks/markdown-link-validation.md) 改为完整读取所选 sources、建立私有引用图，再按首次引用顺序观察目标、逐边结算。
同一授权域与归一化逻辑路径的节点复用首次取得的事实，包括缺失与目录结果；下一次 Run 才重新观察变化，
不是文件系统原子快照。逐 occurrence 的位置、Finding 和计数仍独立；`targetReadCount` 及其预算仍按 logical occurrence 而非物理 I/O 计费。
全部源阶段先于目标观察，因此多故障首错顺序可能改变；新增阶段/批次让步改善协作取消，不提供同步解析抢占保证。

`limits.maxOccurrences` 与 `maxTargetReads` 现在接受 `false`，关闭对应总量预算；省略仍为 `10_000` / `1_000`。
正安全整数不再有固定配置上界，单文档 `maxMarkdownBytes` 边界保持。显式关闭预算时由调用方承担总体资源成本。
消费 options 类型时须覆盖新增 `false` 分支；依赖首次目标观察或故障优先级的调用方应重新验证代表性 Run。

启用 parse-facts cache 后可配置 `warnAboveBytes`，默认 `16_777_216` bytes。实际成功读取的缓存文件严格超阈值时，
每次 invocation 至多追加一条 `parse-facts-cache-capacity` warning；不增加 Finding/Records/final data，不改变 Check outcome。
它只提醒可删除的准确文件，不自动清理、停用缓存或中止检查；现有调用方无需配置新字段。

### JSON 验证与包依赖

[`jsonValidation`](./checks/json-validation.md) 与 JSON Schema 的文档遍历在每个文档前让出事件循环，
使 timer/I/O 取消与其它 Check 可以推进；单文档同步读取/解析仍不可抢占，取消不提供部分 final data。
完整 JSON 语法、UTF-8、解码后重复键与领域结果规则保持；内部实现移除 Momoa 运行依赖。
文件选择所需的 `fast-glob@3.3.3`、`micromatch@4.0.8` 纳入运行依赖，安装时更新 lockfile。

### 命令完整性与检测依赖

[`commandCheck`](./guides/command-check.md) 升级至 Execa `10.2.0`：输出超限主动终止子进程，
不再依赖执行超时才回收；忽略软终止时沿用底层强杀升级，不承诺任意后代进程树的回收。
超限与非零退出等标记同时出现时也不会进入 `afterCommand`，因而不发布该回调的派生成功 data/Records；
完整非零退出仍可由调用方解释，默认失败原因优先级保持。
`outputByteLimit` 名称兼容保留，指南现明确它是各流独立的近似文本缓冲限额，不是严格 UTF-8 字节预算。

检测依赖升级为 `csv-parse@7.0.3`、`markdownlint@0.42.0` 与 `jscpd@^5.4.2`。
公开规则集合、阈值与 Finding 处理策略保持；重复检测的 Markdown token 计量和 Vue 范围修复可能改变
Findings/waiver identity，升级时应按实际输入复核，而不是只接受旧计数。
Markdown reference 检查另验证实际 backend 能力：消费者保留旧解析器锁图而导致 MD052 漏报时，
沿用 `backend-failed` 阻断，不把空结果当作通过；此资格检查也先于 findings cache 命中。

### 升级验证与追溯

从 `0.0.3` 升级时，先迁移 callback context 和文件 selection，再运行类型检查、实际安装包的 TS/JS consumer 与代表性 Run；
重点复核函数/重复检测 Finding 与 waiver、调度测量末位、Markdown 首次目标观察、命令完成回调、错误优先级及新增 options 分支。
`run.json` / `records.ndjson` 继续使用 [v4 machine schema](./output.md)，不能仅以 schema 版本判断 API 或 Check Record 兼容性。

| 变更主题 | 提交 |
| --- | --- |
| 纯磁盘文件选择、Core 索引与调试 | `2b2489cf`、`7302349e`、`0a815704` |
| Lizard 升级、TypeScript 修复与读取让步 | `255ab3ed`、`848e722d`、`1049c70e` |
| 声明式 callback context | `de9cf844` |
| 调度测量与终态修复 | `14a64e5e` |
| Markdown 缓存提醒与引用图/预算 | `acc3212d`、`a38a3320` |
| 命令完整性、检测依赖与工作区工具链 | `23535dd7`、`c68f42ac`、`4b9ca374`、`1b9fcae3` |
| JSON 文档协作取消与语法实现 | `306a0b25`、`965611cf` |

## 0.0.3

本节以本地 `v0.0.3` tag（`4a830ef3`）为边界，记录相对 `v0.0.2` 的净变化；以下旧签名与选择语法描述该版本，不是当前用法。Node `>=24.18` 的宿主要求与包根程序化入口保持不变。

### 从 0.0.2 升级

按项目实际使用的能力完成以下调整，再运行项目类型检查与代表性 Run，复核有效选择、单项终态、
`aggregate`、Records 与输出失败处理。`RunResult.kind === "completed"` 仍不表示质量检查通过。

1. **调整自定义 Check 的回调与类型名称。**
   `preflight` → `prepare`，`execution` → `execute`；
   `CheckPreflight` / `CheckPreflightResult` → `CheckPreparation` / `CheckPreparationResult`，旧字段不保留兼容别名。
   按原因码分类时，将 `preflight-threw`、`invalid-preflight-result` 改为
   `preparation-threw`、`invalid-preparation-result`。
   `prepare(options, signal, project?)` 每次 Run 都取得与 `execute` 一致的冻结项目上下文，
   但公开类型的第三参数可省略，读取前须处理该分支；同时复核 options 深度只读类型推导。
   见[自定义 Check](./guides/extending-check-lifecycle.md)。
2. **调整调度终态回调与状态读取。**
   `scheduler.measurementHooks`、`SchedulerMeasurementHook` 与已准备策略的 `complete` 分别改为
   `scheduler.terminalEffects`、`SchedulerTerminalEffect` 与 `terminalEffect`。
   状态改读 `RunResult.outputs.terminalEffects`，诊断码改为 `scheduler-terminal-effects-failed`。
   没有终态测量时不保证调用，资源释放不能依赖它。
   见[调度扩展](./guides/scheduling.md#已准备的-custom-strategy)。
3. **复核聚合结果与定制函数的失败处理。**
   `completed` / `output` 默认带 `aggregate`：有效 Check 非空且全部 `passed` 才为 `passed`，
   空列表或任一其它终态均为 `failed`；取消分支不新增聚合结果。
   旧 `checkAggregation` 策略对象改为同步 `(checks: readonly CoreCheck[]) => CheckAggregate`，
   读取规范顺序的只读有效列表，返回四态之一，不修改 Check 事实。
   函数抛错、返回 Promise/thenable 或非法值会直接拒绝 Run Promise，而非形成 `RunResult` 分支；
   此时不发布正常完成摘要或机器结果，调用方须处理 `await run(...)` 的拒绝。
   见[聚合契约](./api-mechanics.md#runcontrols-与-check-aggregation)。
4. **把 flag 选择改为组合条件。**
   `enabledByFlags: { flags, mode }` 改为 `{ when, propagateDependsOn? }`。
   `when` 使用 `CheckFlagCondition`：字符串表示单个 token，组合使用
   `all`、`any`、`none`、`notAll`、`exactlyOne`、`not` 或对应递归 AST。
   `dependsOn` 传播仍须显式启用，`observes` 不参与扩展。
   见[flag 条件](./guides/extending-check-lifecycle.md#按-flag-选择-check)；新增 Git 选择见下节。
5. **替换进度呈现的 `visibility`。**
   删除旧字段；需要省略安静通过行时，在普通可执行 Check 上声明 `omitQuietPassedRow: true`。
   它只接受字面量 `true`，容器不能声明，也不继承给子项。
   安静通过指 `passed` 且已接受 Records/messages 均为空；只改变人读行，完整快照、时长和机器事实保持不变。
   进度新增配置数与实际省略数，启用策略的行不编号，普通行仍按全局完成数编号。
   `maintenanceReminders` 保持默认省略安静通过行；随包构造器接受 boolean，可用 `false` 撤销默认。
   见[进度呈现](./guides/run-outputs.md#progress-rendering)。

### 新能力与现有 Check 修复

#### 项目声明与 Git 变化选择

- **九个随包构造器接受项目声明**：领域 options 同一顶层可声明标识、flags、关系、调度与呈现策略，
  公开 `PackageCheckAuthoringOptions`；既有领域配置无需迁移。项目字段与执行 options 分离，构造器仍拥有回调、
  解析函数与 handoff。`maintenanceReminders(entries)` 保持可用，并增加对象输入；`commandCheck` 使用自己的契约。
  字段清单、字面量类型推导与校验见[构造器项目声明](./api-mechanics.md#随包-check-的构造器项目声明)。
- **Definition 新增 `changes`**：以 `source: { compareWith }` 声明 Git revision，以路径区域派生
  `changeFlag(id)`。每次 Run 在选择前获取一次证据；可信零命中为 `{ ok: true, files: [] }`，
  证据不可用时不伪造 files，而保守派生全部已声明 change flags。
  回调的 `project.flags` 包含调用方与派生 tokens，路径或不可用原因从 `project.changes` 读取；
  Controls 拒绝 `vibe-check:change:` 前缀。`include` 必填，`exclude` 省略等同 `[]`，非法输入仍拒绝。
  见[文件变化选择](./api-mechanics.md#按文件变化选择-check)。

#### 外部命令与 Markdown 检查

- **新增 [`commandCheck`](./guides/command-check.md)**：以无 shell 的单个可执行程序与独立参数接入 Check，
  必填超时与 stdout/stderr 各自的字节上限。完整数字退出码默认 `0` 为 `passed`、非零为 `failed`；
  启动失败、超时、输出超限、信号终止、transcript 失败与取消保留不可用结算。
  默认调用方基础环境为空、输出丢弃，Product 最后注入固定纯文本/禁用颜色变量。
  可显式选择环境继承、调用时解析或 transcript 产物。
  完整且未中断的数字退出（如启用 transcript，其写入也须成功）才调用 `afterCommand.execute`，用领域结果替代默认结算；
  可选 `afterCommand.parseData` 建立类型化提供方。stdout/stderr 不自动发布，凭据、原始输出及派生数据的
  访问控制、保留与清理由调用方负责。
- **新增 [`markdownLint`](./checks/markdown-lint.md) 与 `parseMarkdownLintData`**：
  新增固定运行依赖 `markdownlint@0.41.1`，提供八项默认规则；`link-fragments` 须显式启用，
  本地目标/锚点完整性仍由 `markdownLinkValidation` 检查。默认 Finding 为 `non-blocking`，可设为 `blocking`。
  可选逐文件 findings 缓存默认关闭，使用调用方拥有的绝对目录；仍读取源码并重新结算策略与终态，
  损坏/不可用时重新计算，容量与清理由调用方管理。
  精确 `findingWaivers` 按 `path`、`rule`、完整 `range` 与 reason 对账，保留全部 Finding，
  未命中/过宽发布 audit。`findingCount` 包含已豁免项；消费 `MarkdownLintRecordData` 时须覆盖 audit 分支。

#### 依赖交接与数据工具

- **新增同一次 Run 内的私有 handoff**：提供方以 `defineCheck({ handoff: true, ... })` 声明，
  在已接受的 `passed` 结果交付对象/函数引用；直接 `dependsOn` 消费方用 `dependencies.get(provider)`
  同时读取规范化 data 与类型化引用，不扩大 `observes` 或传递依赖的权限。
  引用不进入 fingerprint、快照、RunResult、输出、聚合或缓存；执行图结束只清除 Product 自己的引用。
  提供方/消费方须保持只读观察，资源创建者/调用方负责释放。见[依赖交接](./guides/check-dependencies.md)。
- **公开六项 [Core 数据工具](./guides/data-boundaries.md)**：
  `canonicalizeJsonObject` / `canonicalizeJsonValue`、`canonicalJsonText` / `canonicalJsonBytes` 与
  `snapshotExactClosedRecord` / `snapshotClosedArray` 从包根导出。
  JSON 工具生成独立规范化副本或确定性文本/字节；结构工具只快照并冻结外层，保留嵌套与回调引用。
- **`reconcileFindingWaivers` 的 `waivers` 可省略**：省略或显式 `undefined` 等同 `[]`；
  仍验证全部 Finding 标识，保留顺序与引用，非法配置仍拒绝。已传数组无需修改；
  `ReconcileFindingWaiversOptions["waivers"]` 类型消费者须处理新增 `undefined` 分支。
  见[Finding waiver](./guides/finding-waivers.md#输入与默认值)。

#### 兼容修复与指南

- **[`fileMetrics`](./checks/file-metrics.md) 支持大量精确路径分批传输 SCC**：
  全部批次验收成功才发布一份统一测量，任一失败拒绝整次扫描，不发布部分结果；无新增公共配置。
- **修复 [`secretDetection`](./checks/secret-detection.md) 的 Windows 读取分支**：
  用路径/文件描述符的设备与 inode 身份握手，避免仅因缺少 `O_NOFOLLOW` 提前拒绝普通文件；
  POSIX 仍要求 `O_NOFOLLOW`，软链接、非普通文件或不可靠身份仍拒绝。
  此可移植性修复不扩展受支持平台承诺，也不提供恶意文件系统沙箱。
- **新增[从质量目标构建项目 Gate](./guides/building-project-gate.md)指南**：
  可执行场景覆盖命令接入、共享准备、依赖与观察、选择、自建缓存、资源约束和诊断转换。

`run.json` / `records.ndjson` 继续使用 [v4 machine schema](./output.md)；
RunResult API 与各 Check 的 Record 变化须分别复核，不能仅以 schema 版本判断兼容性。

### 实现与仓库维护

本节面向仓库维护者，不增加包消费者的运行入口。

- 随包工具迁入 `package-tools` 责任层，保持既有包根导入；收紧 TypeScript/Oxlint 与公开依赖边界检查。
- Project Gate 复用 `commandCheck`，`afterGate` 改为 `resultContributor`；按材料责任重组验收，
  用 change flags 收窄增量选择，显式启用 Markdown lint/cache；性能预算按总耗时与 Check 分布告警。
- 候选包复用原始编译产物并收窄缓存失效；重整材料验证、投影与治理验证入口。

### 0.0.3 相关提交

提交用于追溯实现；具体行为规范见以上指南，精确签名见安装包声明。

| 变更主题 | 提交 |
| --- | --- |
| 扩展生命周期与只读 options 类型 | `502dd799`、`155b781d` |
| 默认与同步定制聚合 | `454a00ed` |
| Git change flags、组合条件与可省略 exclude | `4a9426d7`、`f619f5c5`、`8638ed77`、`f6af3a53` |
| 随包构造器项目声明 | `09113635` |
| `commandCheck` 与完成阶段 | `a4f761ac`、`2229e2ca` |
| Markdown lint、缓存与精确 waiver | `ae3e05e1`、`5206ae78`、`c2054034` |
| 安静通过行呈现 | `2d2c532a`、`66bfce61` |
| 私有 handoff 与公开数据工具 | `9d09b785`、`0c6608ff` |
| SCC 分批与秘密检测文件读取 | `693a89be`、`2c991d6d` |
| 可省略 Finding waiver | `8d522ebf` |
| 项目 Gate 构建指南 | `3d4c97cb` |
| Gate 命令、材料与增量接线 | `a41e4b96`、`54f7da1b`、`a508fc48`、`9cd1238d`、`ddc60c31` |
| candidate 编译复用与文档材料校验 | `106929d8`、`fb6944df`、`bdbe685d`、`abda82a6` |

**历史说明更正**：下方 `0.0.2` 按真实 `v0.0.2` tag 恢复 `preflight`、`measurementHooks` 与 `afterGate`；
生命周期改名（`502dd799`）与 handoff（`9d09b785`）均在 `v0.0.2..v0.0.3` 范围，归于 `0.0.3`。
此更正仅修订发布说明，不改变 `0.0.2` 已发布产物或发布日期。

## 0.0.2

发布日期：2026-09-09。

本节按主题记录 `@zxyycom/vibe-check` 的 `0.0.2` 相对 `0.0.1` 的净变化。
升级影响随对应变更列出，提交记录集中在[相关提交](#相关提交)。

在 Node `>=24.18` 环境安装精确版本并更新 lockfile；按所用能力完成调整后，
运行项目 typecheck 和代表性 Run，复核 Check 终态、Finding/Records、aggregation 与诊断。

### 产品变化

#### 运行环境与包材料

- **宿主改为 Node `>=24.18`**，取代 Bun `>=1.3.14`；仓库开发脚本和 Gate 继续使用 Bun。
  集成入口保持为包根的程序化 API。
- **补全包声明与发现信息**，调整导出类型命名。
- **变更日志随包交付**，由 README 直接链接，便于按安装版本查阅变化与升级影响。
- **增加运行依赖和来源材料**：引入 `@secretlint/core`、private-key rule 与 `immutable`；
  `licenses/` 收录分析器翻译的 attribution、NOTICE、license 和 provenance。
  根 `LICENSE` 保持 MIT，包 manifest 的 license expression 为 `MIT AND Apache-2.0 AND BSD-2-Clause`。

#### 随包 Check

- **新增 [`secretDetection`](./checks/secret-detection.md)** 与 `parseSecretDetectionData`：
  在显式 `files` 范围内检测高置信 PEM private key，并提供结果数据、Records 和 waiver 类型。
- **[`functionMetrics`](./checks/function-metrics.md) 内置 TypeScript 分析器**：
  移除 `scanner` 配置及 Python/Lizard 运行前提，内部翻译基线更新到 Lizard 1.24。
  新增 `nestingDepth`，默认 `maximum` 为 `7`；CCN Record 增加按源码顺序排列的
  `complexityContributors: { token, line }[]`。升级时需复核新增 Finding 和 Record 结构。
- **[`duplicateDetection`](./checks/duplicate-detection.md) 更新引擎并修复比较范围**：
  包运行依赖 `jscpd` 从 `^5.0.11` 升至 `^5.1.1`；仓库开发依赖锁定 `5.1.1`。
  修复项目相对路径输入漏报；重复 locations 必须共享至少一个 code area，跨区域比较需配置共同 area。
- **[`fileMetrics`](./checks/file-metrics.md) 改用 SCC `4.0.0` 协议**：
  环境需提供兼容的 `scc` 命令，Rust `?` 的复杂度计数随之调整。
- **三个指标 Check 接入 Finding waiver**：`duplicateDetection`、`fileMetrics`、`functionMetrics`
  增加可审计的 waiver 标识与配置，默认 `findingPolicy` 仍为 `non-blocking`。
- **[`markdownLinkValidation`](./checks/markdown-link-validation.md#parse-facts-cache) 增加显式解析缓存**：
  使用单文件 JSONL 保存 parse facts；每次运行仍重新形成 Check 结果。

#### Check 依赖与选择

- **区分成功前置和终态观测**：`dependsOn` 要求所有直接 provider 为 `passed`；否则 dependent
  跳过回调，结算为 `unavailable / dependency-not-passed`。
  新增 `observes`，供需要等待上游任意终态的汇总或审计使用。
- **`preflight` 随所属 Check 准入执行**：由整次 Run 的全局 barrier 改为本 Check 的执行前阶段，
  受依赖、互斥、容量和取消约束；独立 Check 的准备可以并发。
- **新增 `enabledByFlags`**：支持 `all`、`any`、`none`、`not-all`。匹配的 root 显式设置
  `propagateDependsOn: true` 时，传递选中其 `dependsOn` 前置，即使前置自身 flag 条件未命中；
  省略时不传播，`observes` 不参与扩展。`checkAggregation.checks: "effective"` 聚合本次有效选择。
- **新增 `dependencies.list()`**：返回冻结、稳定排序的直接 `dependsOn ∪ observes` 四态 observation；
  `get()` 同样以该直接关系集合授权。

用法见[自定义 Check](./guides/extending-check-lifecycle.md)与[依赖和类型化数据](./guides/check-dependencies.md)。

#### 调度与观测

- **声明资源与顺序偏好**：Check 增加 `resourceClaims`、`admissionPriority`，scheduler 增加
  `resourceCapacities`；资源从 `preflight` 到 settlement 原子持有，priority 在合法 ready 候选中排序。
- **自定义准入策略**：`scheduler.admissionPolicy` 支持 `custom/simple` 与调用级 `custom/prepared`
  生命周期；`defineAdmissionPolicy` 辅助类型推导，策略可取得动作后性能 observation。
- **终态测量 hook**：`scheduler.measurementHooks` 接收调度测量，状态从
  `RunResult.outputs.measurementHooks` 读取。正常完成 Run 的 hook 失败可按输出失败优先级形成
  `kind: "output"`、`scheduler-measurement-hooks-failed`；已有取消或执行诊断保持优先。
- **独立模拟与本地历史策略**：`createAdmissionGraph` 构造不可变静态调度模拟；
  `createLearnedCriticalPathStrategy` 将调用方管理的时长历史接入 prepared strategy。

配置与边界见[调度指南](./guides/scheduling.md)。

#### 输出与文件工具

- **诊断日志分为 `core` / `scheduler` 两个 channel**：旧 `diagnosticLogging.file` 改为
  `diagnosticLogging.channels.core.file` 与 `.scheduler.file`，各有独立 status。
  `diagnosticLogFileNaming` 支持默认 `unique` 与固定 `channel`；固定名称冲突时失败，保留原文件。
- **完善 progress 与 console 呈现**：捕获 Check 回调及其已等待异步工作中的 `console.*`，覆盖
  `preflight` 并在 settlement 后呈现；直接 stdout/stderr、stream 或子进程输出独立于该捕获机制。
  新增 `presentCheckFindings` 生成有界消息摘要，并增加 Record 预览。`progressRendering` 支持
  formatter、条数和文本长度限制，配置错误定位到具体字段。
- **提供调用级路径上下文**：新增 `invocationId`、Check 专属 `artifactDirectory`，以及 Controls 的
  `checkArtifactBaseDirectory`、`progressLogFile`。machine 与 diagnostic 输出目录统一为可信目标：
  相对路径从本次 `projectRoot` 解析，绝对路径直接使用；不提供路径沙箱或目录清理。
- **新增 [`cacheJsonByKey`](./guides/cache-results.md)**：按调用方的 key、namespace/version、
  目录、解析与计算函数缓存本地 JSON 结果，并返回读写状态；
  并发协调和清理由调用方负责。
- **新增 [`collectProjectFiles`](./guides/collecting-project-files.md)**：
  按共享 selection 规则同步收集一次项目文件，返回冻结的相对路径快照。

输出细节见[Run 输出与诊断](./guides/run-outputs.md)。`run.json` 与 `records.ndjson`
继续采用 [v4 machine schema](./output.md)；上述 RunResult 和 Check Record 变化需分别复核。

### 实现与仓库维护

本节面向维护者，涵盖内部优化、Gate、包验收与协作工具。

- **私有实现优化**：分析器 reader 采用 suffix fast path；admission core 采用不可变选择索引、
  反向索引、计数器和持久 frontier，保持公开 DTO、顺序与回调契约。
- **Gate 配置集中化**：统一 definition manifest，分离 checks/runtime，`afterGate` 归 definition
  所有；命令收敛为 `bun run check`，提供默认 required、focused flags 与独占 `--all` 选择。
- **Gate 选择与质量策略**：复用 flag 传递和 effective aggregation；仓库质量 Finding 设为 blocking。
  root `maxParallel` 为 `3`，Bun test runners 与 repository scans 各最多并行 `2` 个。
- **Gate 证据结构化**：调用目录按 owner 分配 artifacts、channel logs 和 machine 输出；
  native diagnostics、lint/format failures 增加结构化 Records。
- **强化包验收并复用 candidate**：增加 Node external consumer、实际引擎及安装依赖许可检查、
  analyzer Worker/翻译材料验收；static release manifest 纳入 fingerprint。完整 Gate 复用已准备
  candidate，物理生命周期验证改为显式 `package:candidate:integration`。
- **增加显式研究与维护入口**：`source-mapping` 检查来源 ledger/identity/pin，`--sync` 更新派生 pin；
  Lizard 性能命令提供 A/B/C 分层测量，`admission:simulate` 提供虚拟准入平台；
  `maintenance:lizard-upstream` 提供非阻断的上游查询。
- **重整文档与治理**：按读者、随包范围和规则 owner 组织阅读路径，更新 Change Plan、Decision Records、
  Investigation Report 契约及索引；历史变更材料统一通过 Git 恢复。
- **集中维护文档发布映射**：`docs/package-documents.json` 声明 Markdown、Check 指南和 machine 材料的
  源文件与包内路径，构建、fingerprint 和包材料验收共同读取；包内链接检查覆盖 machine Markdown。
- **明确发布工作区与交接**：项目分支采用无前缀语义名称，发布准备与冻结源码分别在实现和 detached
  工作区进行；正式包验收、发布、版本标签与合回 main 按同一源码身份衔接。Package 文档按职责拆分。
- **增加可选 post-commit hook**：显式设置 `core.hooksPath` 后，在 `main` 每小时至多尝试一次
  non-force、no-tag 的 `origin/main` 推送；失败不阻断 commit。

维护入口见[仓库维护文档](https://github.com/zxyycom/vibe-check/blob/c0af9fff429ea22602432b542f743af29f305fa4/docs/navigation.md#仓库工具与测试)。

### 相关提交

按变更主题在[源码仓库](https://github.com/zxyycom/vibe-check)检索提交；提交号用于定位实现变化。

| 变更主题 | 提交 |
| --- | --- |
| Node 宿主 | `73a1d239`、`d765971a` |
| 包声明与发现信息 | `80ff28e8` |
| 运行依赖与来源材料 | `c239eab8`、`9ee0263e` |
| `secretDetection` | `a9d53de8` |
| `functionMetrics` | `0f317f2d`、`d356dcb4`、`e8f9ccb3`、`5ff3149e` |
| `duplicateDetection` | `21b4d23a`、`741fefe0`、`113d6344` |
| `fileMetrics` | `5bdda4db` |
| Finding waiver | `8c6eddb0` |
| Markdown 解析缓存 | `bf49676f`、`00c364b5` |
| `dependsOn` / `observes` | `88160edd` |
| `preflight` 时序 | `88160edd`、`da6ea93f` |
| flags 与 effective aggregation | `8fdb840b`、`da6ea93f`、`fb695143` |
| `dependencies.list()` | `7bcd56d4`、`88160edd` |
| 资源容量与准入优先级 | `29438d69`、`4ee8ca30` |
| 自定义准入策略 | `c9760932`、`80eec565`、`281e7711` |
| 终态测量 hook | `2103c4e5` |
| 调度模拟与本地历史策略 | `e83baa3e`、`822a1ef4` |
| 诊断 channel | `c30eaa65`、`752b7e8f` |
| progress / console / Finding 摘要 | `c30eaa65`、`5813738e`、`f2201ec1`、`47add411`、`92c6ec5d`、`eea8169b` |
| 调用级路径与输出目录 | `a5f2d044`、`92c6ec5d`、`54336c4e` |
| `cacheJsonByKey` | `72722d6f` |
| `collectProjectFiles` | `bf3d6e79` |
| reader 与 admission core 优化 | `dd9635d0`、`cea4d1db` |
| Gate 配置 | `84c44124`、`1b11ccda`、`5ae74e6d` |
| Gate 选择与质量策略 | `fb695143`、`c428530a`、`b30477b6` |
| Gate 结构化诊断 | `a5f2d044`、`6afa910a`、`acade164` |
| 包验收与 candidate 复用 | `73a1d239`、`21b4d23a`、`9ee0263e`、`c239eab8`、`6b19ec8f`、`fa4d45f5` |
| 研究与维护入口 | `3ea6180c`、`e2bad655`、`f7e9f353`、`853b30ea` |
| 文档与治理 | `94979fe1`、`7e76da8b`、`917517dc`、`761df044` |
| post-commit hook | `d71f388c`、`931a0c12` |
