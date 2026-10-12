---
title: "Check 与 Core 算法复杂度逐模块调查"
id: "261012-audit-checks-core-algorithmic-complexity"
formedAt: "2026-10-12T01:50:11Z"
question: "当前全部随包 Check 与 Core 的各生产模块存在哪些可达算法复杂度风险，哪些只是合理成本或待测量热点，应优先验证什么？"
tags:
  - "algorithmic-complexity"
  - "checks"
  - "core"
  - "performance"
relations: []
---

## 形成时背景

本轮回答用户提出的“当前全部 Check 与 Core 还有多少潜在算法复杂度问题”。
调查基线为 `21777db37c0284308b8c69eb2cc92ab0b012cd9b`，取证日期为 2026-10-12。

**最值得优先处理的线索在公共 Run：两条默认调度路径在简单合法输入上已有三次增长的操作计数证据。**
完整调查形成 39 组线索，按证据和成本性质分为 28、7、4 三类，详见结果部分。

## 调查目的

逐模块识别可避免的算法增长，区分必要输入／输出成本与条件性风险，为下一轮性能测量和优化选题提供依据。
本轮交付是调查结论与证据，实施优化属于后续任务。

## 调查范围与依据

**覆盖 347 个生产 TypeScript 文件**：六个 Core root 共 131 个、公开入口 1 个、package-checks 201 个、
附带 Non-core package-tools 14 个。排除 255 个测试、type-test、support、fixture 文件及
`src/bun-test.d.ts`；仓库脚本和第三方内部完整算法在范围外。

四个 `gpt-6.1-sol` 子代理分片调查，另一个同模型代理独立复核。依据包括领域 owner、当前源码和调用链、
有界输入上的实际操作计数。Core／Run／Checks 主计数使用 Bun 1.3.14，analyzer 合法样本主计数使用
Node 24.18.0；独立重跑与原结果一致。操作计数支持增长判断，实际延迟、CPU 和内存收益仍待测量。

347 个文件均有最终审读结论，覆盖缺项、重复最终归属和源码哈希漂移均为 0。
Checks 的 46 个 analyzer 初读条目已由专门深审替代，只计一次；纯类型和重导出文件按其实际职责归类。
覆盖汇总为 `coverage-summary.json`，成员与哈希为 `source-inventory.json`。

证据收敛有两处重要修正：analyzer 的 Go 变量／C++ 定义初探样本经合法性修正后才用于增长结论；
C04 只将共享 executable 声明在重复 ID 拒绝前的展开列为风险，无 executable 的共享容器按实际 warnings 输出量解释。
原探索输出保留在资源中并标明证据用途。

## 调查结果与边界

### 结论与计数口径

| 类别 | 组数 | 编号 |
| --- | ---: | --- |
| 源码支持的增长型候选 | 28 | C01–C06、R01–R09、T01–T02、K01–K06、K11、A01–A04 |
| 有界重算、重复工作或容量候选 | 7 | R10、K07–K10、K13–K14 |
| 尚待补证的疑点 | 4 | K12、U-A01–U-A03 |

“组”按机制归并，同一根因跨模块复用只计一次；R08 等组可包含几个近邻调用点。
**39 组是调查线索总数，不是已确认的性能 Bug 数量。** 增长型候选同时包含静态条件推导和计数证据，
实际影响取决于输入形状、启用功能与规模。

主要共性是：**稳定数据缺少查找索引、不可变数据反复处理、每轮全量扫描被调度轮数放大。**
因此优先方向是局部索引与结果复用，而非先扩大架构或替换算法框架。

### 公共 Run：证据最强、影响面最广的优先方向

两个样本均通过真实 `defineConfig`／`run` 完成：
默认 static policy、`maxParallel=1`、常数 passed callback、全部输出关闭。
N 是 Check 数，表内为实际查找比较次数。

| 机制与输入 | N=32 | N=64 | N=128 |
| --- | ---: | ---: | ---: |
| R01：稀疏依赖链上的 blocker summary | 10,416 | 85,344 | 690,880 |
| R02：无依赖 Checks 的 scope 查找 | 44,704 | 353,600 | 2,812,544 |

R01 每轮检查 pending 依赖时，线性寻找已结算 Task，累计为 N(N−1)(2N−1)/6。
R02 每个候选反复扫描全部 scopes；public Run 每 Check 一个 singleton scope，累计为 N(N+1)(4N−1)/3。
两者都是特定简单输入上的 Θ(N³) 额外工作，稀疏图与少量输出即可触发。

同一调用链还有两个较直接的候选：

- **R03：重复 graph fingerprint。** 两种样本均对同一不可变图 stringify 2N+2 次；N=128 时为 258 次，关闭输出仍执行。
- **C02：session 目录反复查找与建 Set。** 普通 open／settle 路径累计二次工作，可评估一次构建私有索引。

这解释了为什么已有索引的 reducer 仍可能被外围调度、选择与观察逻辑拖累。上述证据尚未给出真实耗时占比。

### 逐模块摘要

以下列出模块自身或直接共享路径的结论。共有 Core 成本统一归其编号，避免在每项 Check 下重复统计。
“未见独立候选”表示本轮审读结论；具体必要成本与未知边界见对应资源。

#### Core、入口与附带工具

| 模块 | 文件数 | 主要结论 |
| --- | ---: | --- |
| `check` | 9 | 未见独立增长型候选；options alias 按 detached 输出树计量。 |
| `project-definition` | 16 | C01 关系去重二次；C04 无效 executable DAG 拒绝前指数展开；C06 深层 inherit 前缀反复物化。 |
| `check-settlement` | 6 | C02 session 查找／建 Set 二次；C03 大 blocked-reason 引用表重复扫描。 |
| `data-boundary` | 7 | C05 动态 closed-key 校验二次；固定小 schema 成本有界，区域关系按实际边数计。 |
| `machine-output` | 12 | 未见独立增长型候选；多遍序列化、验证和峰值内存可按实际负载测量。 |
| `project-run` | 81 | R01–R03 见上；R04–R05 图准备与全态扫描；R06–R09 并行订阅、锁 fanout、局部查找及按需测量；R10 截断前完整处理。 |
| 公开入口 | 1 | 仅重导出。 |
| Non-core tools | 14 | T01 learned 预测／得分表缺索引；T02 selection 重复建表与 membership 查找。仅 learned 使用者触发。 |

#### 九项 Check、通用 Check 与共享模块

| 模块 | 文件数 | 主要结论 |
| --- | ---: | --- |
| `duplicateDetection` | 25 | K04 重叠 area 求交二次；K10 关闭 cache 仍 fingerprint；K11 多 location 去重二次，但默认扫描器固定两个 location。 |
| `fileMetrics` | 15 | K07 SCC batch 内重复复制／计量前缀；28,000 固定预算限制单 batch 大小，属于有界重算。 |
| `functionMetrics` | 63 | A01 签名全量 Unicode 展开；A02 子状态链派发；A03 namespace 全栈重建；A04 Ruby 插值后缀重匹配。另有 U-A01–U-A03。 |
| `jsonValidation` | 6 | 未见独立增长型候选；严格解析的 key 检查与值物化承担不同义务。 |
| `jsonSchemaValidation` | 12 | K08 同一 instance 的多 schema binding 重读／解析；复用前须确定跨 binding 的快照语义。 |
| `maintenanceReminders` | 6 | K06 对重叠历史逐提醒重跑 diff-tree；最终 changedLines 数据仍需完整计算。 |
| `markdownLinkValidation` | 19 | K05 每个 anchor 查询线扫 headings；K09 可选 cache 全量恢复历史；共用 K03 深路径复制、K13 按 byte cap 分配。 |
| `markdownLint` | 12 | K12 front-matter regex 待引擎验证；K14 排序期间重复 range DTO 分配；共用 K03／K13。 |
| `secretDetection` | 11 | 未见自身独立增长型候选；选中文件的覆盖说明仍按实际文件数计量。 |
| `commandCheck` | 5 | 通用命令入口；未见自身独立增长型候选，外部命令与 callback 成本由调用方决定。 |
| 共享模块 | 27 | K01 目录名字反复全扫；K02 subtree pruner 重建路径前缀。其余共享模块未见独立增长型候选。 |

三个自然输入轴已有直接计数证据：K01 宽目录查找、K05 同目标 anchor 查询在规模 32／64／128 时，
分别产生 1,024／4,096／16,384 次比较；K06 的 3 条提醒重复测量同一 3 个后继 commit，
通过真实 execute 调用 fake Git 共 14 次，其中 diff-tree 9 次。

Analyzer 的四项增长由合法小输入族支持：长 Python 参数表、深 Go block、深 namespace 内的 C++ extern 声明、
平坦 Ruby 插值。最终函数／token 输出不足以解释额外增长；A02 的增长计数来自 Go，
其它共享 reader 目前主要是静态可达性证据。A04 统计的是成功匹配后缀的重复宽度。

### 建议顺序

1. **第一批聚焦 R01、R02、R03、C02。** 用不同 Check 数的独立宽图／稀疏链建立端到端耗时基线，
   确定预算后评估已有 task／scope 索引复用、session Map／Set、一次 graph fingerprint。
   保持调度顺序、准入判断与诊断事实一致；R04／R05 先纳入测量，再决定改动范围。
2. **第二批处理自然 Check 负载。** 优先 K01 目录名字索引、K05 heading slug Set、K06 单次执行内的 commit 测量复用；
   大量重叠 area 的项目加入 K04。保留文件系统实时授权、精确输入集、Git 累积 numstat 与失败传播。
3. **Analyzer 四项单独评估。** 先测真实签名长度、嵌套和插值分布，再决定如何维护与 Lizard 的来源一致性。
   优化须验证 token、指标、EOF 和 replay 语义；这里的收益与兼容性成本需要一起判断。
4. **其余候选按触发条件排期。** learned、高并行度、高 fanout mutex、measurement demand 和深输入决定相关性。
   K08 先定快照语义，K09 先定 cache 容量策略；K12／U-A01 补引擎证据，U-A02 补实际复制证据，
   U-A03 补合法嵌套族可达性。C04 作为失败前资源成本单独处理。

### 适用边界与查证路径

本轮完成静态审读、有界操作计数和独立复核；交付为报告及取证资源，产品、测试与 Case 保持不变。
真实 workload 分布、端到端延迟、CPU／RSS、第三方 scanner／parser 内部算法仍未覆盖。
展示上限、输入 byte cap、固定 batch 预算分别约束不同对象，不能直接代替运行时间预算。
后续源码、运行时、缓存契约或主要负载变化时，应按对应候选重新取证。

按问题展开资源即可，无需顺读全部附件：

- 模块机制、源位置、完整公式及行为约束：`core-foundations.md`、`project-run.md`、`checks.md`、`analyzer.md`、`tools.md`。
- 逐文件结论和去重范围：`*-coverage.json` 与 `coverage-summary.json`。
- 实际取证方法和样本：`*-probe.ts` 与 `*-observations*.json`；锁定版本／validated 结果为主证据，初探输出保留探索过程。
- 关键反例：`review*` 资源记录共享 authoring DAG 与完整 analyzer façade 的独立复核。

## 随附资源

- [Analyzer 46 文件最终覆盖表](./_resources/261012-audit-checks-core-algorithmic-complexity/analyzer-coverage.json)
- [Analyzer 初探输出（含不作为合法性证据的旧样本）](./_resources/261012-audit-checks-core-algorithmic-complexity/analyzer-observations.json)
- [Analyzer 有界操作计数探针](./_resources/261012-audit-checks-core-algorithmic-complexity/analyzer-probe.ts)
- [Analyzer 合法样本 Node 24.18.0 主结果](./_resources/261012-audit-checks-core-algorithmic-complexity/analyzer-validated-observations.json)
- [Analyzer 逐机制、逐 reader 审读详情](./_resources/261012-audit-checks-core-algorithmic-complexity/analyzer.md)
- [Check 覆盖表（155 最终、46 已由专门深审替代的初读条目）](./_resources/261012-audit-checks-core-algorithmic-complexity/checks-coverage.json)
- [Check 锁定 Bun 操作计数及 fake Git 调用结果](./_resources/261012-audit-checks-core-algorithmic-complexity/checks-observations.json)
- [Check 真实入口有界探针](./_resources/261012-audit-checks-core-algorithmic-complexity/checks-probe.ts)
- [九项 Check、commandCheck 与共享模块审读详情](./_resources/261012-audit-checks-core-algorithmic-complexity/checks.md)
- [Core foundations 与公开入口逐文件结论](./_resources/261012-audit-checks-core-algorithmic-complexity/core-foundations-coverage.json)
- [Core foundations 锁定 Bun 主结果](./_resources/261012-audit-checks-core-algorithmic-complexity/core-foundations-observations-locked.json)
- [Core foundations 非锁定 Bun 初探输出](./_resources/261012-audit-checks-core-algorithmic-complexity/core-foundations-observations.json)
- [Core foundations 与 learned ranking 计数探针](./_resources/261012-audit-checks-core-algorithmic-complexity/core-foundations-probe.ts)
- [Core foundations 根因、反例与必要成本](./_resources/261012-audit-checks-core-algorithmic-complexity/core-foundations.md)
- [最终覆盖闭合、去重和源码身份核对结果](./_resources/261012-audit-checks-core-algorithmic-complexity/coverage-summary.json)
- [Project Run 81 文件逐项结论](./_resources/261012-audit-checks-core-algorithmic-complexity/project-run-coverage.json)
- [Project Run 锁定 Bun 20 个有界样本结果](./_resources/261012-audit-checks-core-algorithmic-complexity/project-run-observations.json)
- [Public Run 与 direct Scheduler 分类计数探针](./_resources/261012-audit-checks-core-algorithmic-complexity/project-run-probe.ts)
- [Project Run 调用链、增长公式与触发条件](./_resources/261012-audit-checks-core-algorithmic-complexity/project-run.md)
- [独立 public Run 共享 authoring DAG 反例结果](./_resources/261012-audit-checks-core-algorithmic-complexity/review-observations.json)
- [独立共享 authoring DAG 可达性探针](./_resources/261012-audit-checks-core-algorithmic-complexity/review-probe.ts)
- [独立完整 analyzer façade 的 Ruby 复核结果](./_resources/261012-audit-checks-core-algorithmic-complexity/review-ruby-observations.json)
- [独立 Ruby 插值 façade 探针](./_resources/261012-audit-checks-core-algorithmic-complexity/review-ruby-probe.ts)
- [冻结生产成员、排除规则及源码 SHA256](./_resources/261012-audit-checks-core-algorithmic-complexity/source-inventory.json)
- [Non-core package-tools 14 文件覆盖表](./_resources/261012-audit-checks-core-algorithmic-complexity/tools-coverage.json)
- [Non-core tools 算法与 Core 去重边界](./_resources/261012-audit-checks-core-algorithmic-complexity/tools.md)
