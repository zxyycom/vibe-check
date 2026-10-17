---
title: "全产品性能基线与覆盖边界"
id: "261012-measure-product-performance-baseline"
formedAt: "2026-10-12T10:16:26Z"
question: "当前整个 Product 在支持运行时与有界代表负载上的性能表现如何，哪些边界已有测量、只有静态依据或仍待取证？"
tags:
  - "checks"
  - "core"
  - "performance"
relations: []
---

## 形成时背景

**本轮为九项 Check、`commandCheck`、共同 Run、输出及随包工具建立了代表路径的性能基线。**
Node 24.18.0 为消费者主基线，Bun 1.3.14 单列为工作区参考。成本分布涉及扫描、文件选择、调度、输出和可选历史／缓存，
各负载应按自身规模解释。

取证日期为 2026-10-12，源码为 `5cb448b23453edc90e02b25d003efd57dcdd3509`。
[算法复杂度复查](review-product-algorithmic-complexity.md)承接全量源码的增长机制，本篇承接实际操作耗时。

## 调查目的

记录全产品代表负载的耗时、实际结果分支和覆盖缺口，为后续性能判断提供可复核基线。
本轮范围是调查与记录，消费者规模和性能预算尚待明确。

## 调查范围与依据

测量从 `src/index.ts` 进入九项 Check、通用命令 Check、Run／aggregation／outputs、文件与数据工具、
AdmissionGraph、cache、learned、finding 和 change-flag debug。完整 Run 中的 validation、normalization、settlement
属于间接覆盖；逐域状态见 `COVERAGE.md`。

| 条件 | 本轮口径 |
| --- | --- |
| 环境 | mise 锁定 Node 24.18.0／Bun 1.3.14，Linux x64/WSL2，源码与依赖保持原样 |
| 计时 | `performance.now()` 包围完整 `await run(...)` 或公开工具操作；import、进程启动、声明构造及 fixture 准备在窗口外 |
| 主基线样本 | 每组首轮一次，再取同进程 3 次重复的中位数与范围；串行、非随机交错，OS cache 未清空 |
| 输入 | 仓库语料按路径、bytes、SHA-256 冻结并核对；secret 使用无秘密合成文本，maintenance 只读实际 Git 历史 |
| Check 配置 | 输出关闭、并发 1；工具和输出矩阵另列配置 |
| 执行载体 | 源码公开 API；取证时共享候选包 stale / rebuild，安装包与 Gate 留作覆盖缺口 |

首轮仅表示本组首次操作，小样本适合观察中位数和范围，尚不足以估计冷启动或总体尾延迟。
`METHODS.md` 保存采样、恢复和复测条件；`combined-evidence.json` 路由三份原始证据分片，`summary.json` 保存派生统计。

**2026-10-17 现场生命周期补记（非新增观测）：**随附结构化资源已承接当轮必要样本、方法与边界；原 tmp 的组合 JSON、缓存、生成输出与源码镜像不是第二份正式证据源，不要求长期保留或直接重跑。
原资源中的路径继续作为形成时来源坐标；复测需要新授权及独占工作区，不保证旧临时命令在当前版本可执行。

## 调查结果与边界

### 九项 Check 的 Node 基线

下表采用实际 glob／领域配置，所有样本均 `completed`、Check 为 `passed`。MB 为十进制单位。
由于输入和工作义务不同，跨 Check 耗时只作各自参考，不能直接排列缺陷优先级。

| Check | 输入与条件 | 中位数（ms） | 三次范围（ms） |
| --- | --- | ---: | ---: |
| `duplicateDetection` | 853 文件 / 4.11 MB，4 areas，cache off | 1463.4 | 1463.2–1483.3 |
| `fileMetrics` | 1085 文件 / 6.02 MB，SCC 4.0.0 | 145.0 | 134.5–147.7 |
| `functionMetrics` | 526 文件 / 2.42 MB，2 areas | 543.8 | 512.8–557.3 |
| `jsonValidation` | 289 JSON / 18.93 MB，单文件上限设为 8 MiB | 476.6 | 473.0–496.7 |
| `jsonSchemaValidation` | 5 schemas、4 bindings，offline | 40.2 | 36.7–54.5 |
| `maintenanceReminders` | 30 entries，3 个非零实际 Git 历史 base | 389.6 | 384.3–410.0 |
| `markdownLinkValidation` | 323 Markdown / 2.61 MB，cache off | 1612.8 | 1612.4–1675.1 |
| `markdownLint` | 559 Markdown / 3.41 MB，8 rules，cache off | 1345.3 | 1274.4–1426.2 |
| `secretDetection` | 100 个无秘密合成文件 / 0.417 MB | 5.5 | 5.1–5.8 |

`commandCheck` 的受控 Node 进程输出 2 字节并 exit 0，中位数 29.2 ms，范围 29.1–33.3 ms，均 passed。
JSON 语料含仓库调查资源，8 MiB 为显式配置；secret 仅覆盖无秘密输入，command 仅覆盖小输出成功分支。

### 共同 Run、输出与工具

以下为 Node 首轮后 3 次重复的中位数。每行保持自己的工作量口径；组合操作按总成本解释。

| 产品域 | 负载 | 中位数与实际分支 |
| --- | --- | --- |
| Run／settlement／aggregation | 10 prepared Checks，1000 Records，P=4 | 输出关闭 6.6 ms；内部阶段间接覆盖 |
| Machine Output | 同上 | machine-only 31.6 ms，全部输出 36.4 ms；publication succeeded，含投影、序列化与 IO |
| Diagnostic／progress | 同上 | diagnostic-only 15.4 ms，plain progress 4.5 ms；诊断含计量，TTY 未测 |
| 普通／learned 调度 | 100 no-op Checks，P=4 | static 21.4 ms，learned 正常 prepared 路径 39.3 ms |
| Git／flag selection | 真实 HEAD~1 | 31.5 ms；`not-applicable`／`flag-condition-not-matched`，Check 未执行，strict aggregate 为 failed |
| 文件选择／change-flag debug | 603 source files | collect 7.9 ms，debug 加 formatter 7.1 ms；debug 处理当前全集 |
| 文件—区域索引 | 5000 files / 32 regions | build 15.9 ms，全量重建式追加 100 files 12.0 ms，10000 queries 1.9 ms |
| Canonical／closed 数据 | 5000 rows / 552,781 字节 | 组合操作 14.6 ms |
| `cacheJsonByKey` | 同 payload，首次 compute 后 3 hits | hit 7.4 ms |
| AdmissionGraph | 128-task chain，完整 select／settle | 2.2 ms |
| Finding waiver／presentation | 1000 findings / 100 waivers，limit 10 | 1.2 ms；100 waived、11 messages |

这些小样本与组合操作尚不能隔离子阶段收益。例如 progress 小于关闭输出、debug 小于 collect，均不足以支持加速结论；
learned 的 no-op 成本也不代表长任务的调度收益。

### 文件选择表示的隔离对照

**相同 853 条最终路径**，公开 collection 使用 24 个 glob patterns 时中位数为 22.3 ms，
使用 853 个显式路径 patterns 时为 2573.9 ms。等价集合证明选择表示会显著影响本样本成本，内部阶段归因仍待隔离。

据此，显式路径形式的四项 Node 测量归为诊断，原 glob 补测形成主基线。
例如 duplicate 两种表示约为 3.40 s／1.46 s；这是配置形状对照，不是产品优化前后或纯运行时 A/B。

### Bun 参考证据

| 场景 | 观察 | 适用条件 |
| --- | --- | --- |
| Check cache | links off/hit 约 2229/1027 ms；lint 1845/682 ms；duplicate 1533/139 ms | 各自冻结语料；Gate 已启用 lint/duplicate cache；Node cache 对照待测 |
| 大图调度 | P=1、N=512/1024/2048 约 589/2400/13538 ms | static、no-op、输出关闭，限定 Bun 合成负载 |
| 并行度对照 | N=512，P=1 约 619 ms，P=512 约 1697 ms | 独立于上一组的并行度试验 |

[既有 Run 阶段调查](profile-post-optimization-run-stages.md)保留其版本与 profile 条件。
[函数指标专题](audit-function-metrics-pathological-input-cost.md)承接未闭合输入退化和取消；
合法语料 Layer C 的 Bun 分解存在阶段重叠，按诊断证据解释。

### 覆盖缺口

功能缺口包括声明构造／复杂继承、typed handoff／relations、丰富失败／取消分支、TTY、并发 cache miss、
learned fallback／大 history、schema HTTPS 和第三方内部阶段。环境与容量缺口包括真实消费者规模、预算、
跨平台、安装包／Gate、CPU/heap/GC 峰值及稳定尾延迟。具体分支见 `COVERAGE.md`。

本轮形成的是源码操作基线，产品实现保持原样；这些观察为后续验证提供参考，而非性能门禁或优化收益证明。

## 随附资源

- [逐产品域性能覆盖矩阵](./_resources/261012-measure-product-performance-baseline/COVERAGE.md)
- [测量协议、修正过程与复测边界](./_resources/261012-measure-product-performance-baseline/METHODS.md)
- [原始证据合并与统计 helper](./_resources/261012-measure-product-performance-baseline/assemble.ts)
- [Bun Check、cache 与工具原始证据](./_resources/261012-measure-product-performance-baseline/bun-check-evidence.json)
- [Bun 大图与高并行调度原始证据](./_resources/261012-measure-product-performance-baseline/bun-scheduler-evidence.json)
- [五项 Check 与 commandCheck 测量 helper](./_resources/261012-measure-product-performance-baseline/checks.ts)
- [证据元数据与无损分片映射](./_resources/261012-measure-product-performance-baseline/combined-evidence.json)
- [Core、输出与工具测量 helper](./_resources/261012-measure-product-performance-baseline/core-tools.ts)
- [Node 主基线与诊断原始证据](./_resources/261012-measure-product-performance-baseline/node-evidence.json)
- [四项 Check 原 glob 主基线 helper](./_resources/261012-measure-product-performance-baseline/node-four-native.ts)
- [四项 Check 显式路径诊断 helper](./_resources/261012-measure-product-performance-baseline/node-four.ts)
- [文件选择表示隔离 helper](./_resources/261012-measure-product-performance-baseline/selection-isolation.ts)
- [派生统计摘要](./_resources/261012-measure-product-performance-baseline/summary.json)
