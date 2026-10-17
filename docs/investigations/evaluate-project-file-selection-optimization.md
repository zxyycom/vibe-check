---
title: "项目文件选择成本的根因与等价优化验证"
id: "261012-evaluate-project-file-selection-optimization"
formedAt: "2026-10-12T14:41:40Z"
question: "显式路径列表的额外收集成本来自哪些重复工作，最小私有优化能否保持完整选择语义并改善真实公开调用？"
tags:
  - "performance"
  - "project-files"
relations:
  - type: "补充"
    target: "261012-measure-product-performance-baseline"
    summary: "隔离文件选择表示成本并验证等价优化"
---

## 形成时背景

前序全产品基线在相同 853 条最终路径上观察到明显的表示成本差异：Node 24.18.0 使用 24 条 glob patterns 约 22.3 ms，使用 853 条显式路径约 2573.9 ms；当时尚未定位内部阶段。本轮于 2026-10-12 从 HEAD `08c9166b85152168ca27d45452a4174afed50e57` 出发，调查并实施共同文件收集的私有优化。

本轮结论：安全 ASCII 字面列表的主要额外成本来自单路径判断反复编译完整列表。最终操作内谓词复用在同一物化 fixture 上将 Node 显式列表 warm median 从 **2415.9 ms 降至 69.6 ms**，完整路径和冻结结果一致；正常 glob 的有限样本中位数接近。

## 调查目的

区分原生 matcher、文件系统获取与最终选择的成本，消除可证明冗余的工作。验收以公开调用收益及原有选择、默认排除、访问失败、路径身份和按需边界为准；公开契约由[文件收集指南](../guides/collecting-project-files.md)拥有，内部机制由[Project files](../development/project-files.md)拥有。

## 调查范围与依据

| 对象 | 实际方法与覆盖 |
| --- | --- |
| 基线与输入 | 修改前 Product 等同 `5cb448b23453edc90e02b25d003efd57dcdd3509`；冻结 853 个文件的 path/bytes/SHA-256、24 条 glob patterns 及同结果的 853 条显式 patterns |
| 主运行时与参考 | Linux x64；Node 24.18.0 为主，Bun 1.3.14 单列参考；串行计时，OS cache 未清空 |
| 成本归因 | CodeGraph 调用边界、micromatch 4.0.8 每调用编译逻辑，以及单独 instrumented 副本的 singleton/batch 次数、pattern 数与耗时 |
| 最终 A/B | before 为修改前 collection 三模块快照，仅调整内部 import；after 从生产 `src/index.ts` 的 `collectProjectFiles` 进入；同一物化 fixture，返回即停止计时，路径断言、hash、import 和准备在外 |
| 行为证明 | 两运行时各 12 项目标测试；早期 19 组列表 × 3 个默认开关差分；超长 literal 的 Error/type/cause 专门对照 |

物化 fixture 含 853 个普通文件及必要目录，共 4,111,410 bytes。六个已变化的源码条目从固定 HEAD 恢复并逐项验证原 hash；它不含真实工作区的未选目录，因此与早期工作区计时是不同实验。每轮核对完整排序路径及 frozen，最终窗口前后核对 fixture 与生产源码身份。

[方法记录](./_resources/261012-evaluate-project-file-selection-optimization/METHODS.md)保留各阶段命令、输入和纠错。首次与无效 instrumentation 重叠的 baseline 已排除并重新采集。未测 cold start、CPU/RSS/GC、p95、Windows 或真实消费者端到端负载。

**2026-10-17 现场生命周期补记（非新增观测）：**原资源 METHODS 中关于短期工作物仍留在 tmp 的说明记录形成时状态；正式资源已承接必要计数、样本、方法和身份，完整冻结 fixture/源码副本不再是结论复核前提。
原资源中的路径继续作为形成时来源坐标；复测需要新授权及独占工作区，不保证旧临时命令在当前版本可执行。

## 调查结果与边界

### 根因与已采用机制

`filesystem-collection.ts` 在 static lstat、目录保留、必要路径和 lossy-entry 判断中反复调用单元素 `matchesConfigPatterns`，每次重新编译用户列表。显式列表 profile 记录 1717 次 singleton 调用、754052 次 pattern evaluation，matcher 为 2642.8 ms / 总计 2822.5 ms（约 94%）；最终两个 batch 仅 41.1 ms。计数包括用户层和默认层，不能把每次调用都视为 853-pattern 调用。glob profile 仅 17 次 singleton、408 次 evaluation，matcher 7.8 ms / 总计 50.8 ms。

最终实现只准备本次 collection 的单路径谓词：

1. 每条 pattern 长度不超过当前原生 parser 的 65536 字符范围，且每个 slash segment 匹配 `[A-Za-z0-9_.-]+`、不为 `.` 或 `..` 时，用 `Set` 做精确 membership。重复路径、dot 文件和空列表保持原结果；其它列表继续由原生 matcher 解释。
2. 固定默认排除数组全为正 patterns。保持先判断用户匹配、再判断默认层的短路顺序，仅在首次实际需要默认判断时，以相同 `CONFIG_GLOB_OPTIONS` 编译并复用正列表 OR；关闭默认层时不构造。
3. 文件获取、inspection、剪枝、no-follow、byte 检查顺序及最终完整列表匹配、排序、去重和冻结保持原样。谓词生命周期止于本次操作。

两个关键修正支撑最终采用：

- **原生错误上下文：** 未加长度 guard 的 `Set` 会把 lossy-entry 场景中带目录 context/cause 的错误推迟为裸 `SyntaxError`。两运行时对照确认后，超长 pattern 回到原生路径；这只是快路资格，不是新公共限制。
- **默认层构造时机：** 初次生产 A/B 的 Node glob 中位数为 16.6→23.5 ms，三次 warm 不足以判断回归。静态检查确认无条件构造 20 个默认 matcher 是可避免工作，遂改为惰性构造；没有据此将旧差异全部归因于该工作。

### 最终公开调用测量

同一运行时、同一进程逐轮串行 AB/BA；glob 每侧 1 次首轮 + 12 次 warm，显式列表每侧 1 次首轮 + 3 次 warm。每运行时共 34 次调用，完整路径/hash/frozen 均一致。

| workload | before median / range（ms） | after median / range（ms） |
| --- | ---: | ---: |
| Node glob 24（12 warm） | 17.995 / 10.184–25.149 | 17.802 / 10.584–26.768 |
| Node explicit 853（3 warm） | 2415.899 / 2410.193–2431.028 | 69.556 / 65.531–70.996 |
| Bun glob 24（12 warm） | 52.388 / 49.822–67.413 | 52.899 / 48.455–55.320 |
| Bun explicit 853（3 warm） | 1598.745 / 1568.181–1615.709 | 98.212 / 94.393–103.845 |

明确收益限于本安全 ASCII 显式列表。正常 glob 的中位数接近，但样本共享宿主/进程，不能担保普遍无回归或稳定尾延迟；最终 batch 的 F×P 工作仍在。早期临时候选计时把 `JSON.stringify` 路径断言纳入终点，baseline 未纳入，因此其 raw 只保留为探索证据，精确收益采用上表同边界结果。

### 行为与交付验证

生产测试在既有实体中补充 literal/duplicate/dot、Unicode/空 segment/方括号 fallback 及超长错误 context。Node/Bun 的 collection、public collection、path identity 目标测试各 12/12 通过；collection Case 的证明目的连续，未新增 entity 或 Case。冻结快照、各阶段原始数据和历史 patch 保留；源码格式化后的身份与已测实现分开说明。

2026-10-12 三项优化稳定后，同一 local candidate `0.0.0-local.15bfd8447e98` 经公共入口验收：required Gate 为 34 passed / 9 not-applicable，complete `--all` 为 43/43 passed，均 exit 0。覆盖 Product/scripts 工程检查、入口/import boundary、材料、artifact 和外部安装消费者 types/docs/真实 Node runtime；完整 Case 为 704 entities / 176 Cases / 15 topics。独立 reviewer 复核了实现、文档及 Case。

首轮 required Gate 的唯一阻塞是 Markdown Link 的仓库容量 1500 不足。同 selection、其它 limits 不变的公开 installed Check 在容量 2000 下完成 346 sources、2102 occurrences、1702 logical target validations，0 finding / 0 rejected input。HEAD 静态重建为 1455 targets；当次冻结文档集合的静态计数与 1702 一致，增量 247 中三份报告贡献 240，其余 7 来自新 Decision 和 owner 链接。HEAD 数字是静态重建，不是旧 runtime 实跑。仅将 Gate-owned 容量改为 2000，同步配置、测试、owner 和既有 Case；Product 默认 1000、selection、blocking 和其它 limits 保持。

[交付证据](./_resources/261012-evaluate-project-file-selection-optimization/delivery-verification.json)保存首次失败、容量复核、最终 Gate 及材料复检。该预算计 logical target 验证，memo 命中也计数，不等于物理读取次数。required/all 的 elapsed-to-initial-result 为 23.7/38.1 秒；required p95 5040.9 ms，all mean 2340.6 ms / p95 5375.9 ms 触发既有非阻断告警，性能预算未提高。这些是本地组合验收，不证明三项组合的性能收益或用户环境已部署。

### 后续辅助代码审查

辅助脚本按编码规范补充 argv、JSON 和 unknown-error 边界；形成时八份源码保存在 `helper-source-history.json`，当前修订版不冒称旧样本生成身份。最窄输入验证不替代性能重测，原 raw/模块快照/patch 保持。

## 随附资源

- [方法、命令、取证修正与Phase B边界](./_resources/261012-evaluate-project-file-selection-optimization/METHODS.md)
- [修改前collection模块原字节](./_resources/261012-evaluate-project-file-selection-optimization/before-collection.ts)
- [修改前filesystem模块原字节](./_resources/261012-evaluate-project-file-selection-optimization/before-filesystem-collection.ts)
- [修改前公开façade模块原字节](./_resources/261012-evaluate-project-file-selection-optimization/before-public-collection.ts)
- [修改前snapshot时间与来源hash](./_resources/261012-evaluate-project-file-selection-optimization/before-source-provenance.json)
- [生产目标tests与Case审查记录](./_resources/261012-evaluate-project-file-selection-optimization/behavioral-verification.json)
- [Bun Phase A before样本](./_resources/261012-evaluate-project-file-selection-optimization/bun-baseline.json)
- [Bun Phase A tmp样本](./_resources/261012-evaluate-project-file-selection-optimization/bun-tmp-candidate.json)
- [统一Gate、文档容量与交付验证摘要](./_resources/261012-evaluate-project-file-selection-optimization/delivery-verification.json)
- [Phase A临时差分helper](./_resources/261012-evaluate-project-file-selection-optimization/differential-probe.ts)
- [最终测时filesystem source原字节](./_resources/261012-evaluate-project-file-selection-optimization/final-filesystem-collection.ts)
- [最终三文件实现与测试diff](./_resources/261012-evaluate-project-file-selection-optimization/final-implementation.diff)
- [853物化fixture来源与hash核对](./_resources/261012-evaluate-project-file-selection-optimization/fixture-provenance.json)
- [辅助脚本的输入边界](./_resources/261012-evaluate-project-file-selection-optimization/helper-inputs.ts)
- [形成时辅助脚本完整源码与hash](./_resources/261012-evaluate-project-file-selection-optimization/helper-source-history.json)
- [惰性默认层修正前后source身份](./_resources/261012-evaluate-project-file-selection-optimization/lazy-default-provenance.json)
- [Bun超长literal修复后差分](./_resources/261012-evaluate-project-file-selection-optimization/long-literal-bun-guarded.json)
- [Bun超长literal修复前差分](./_resources/261012-evaluate-project-file-selection-optimization/long-literal-bun-unguarded.json)
- [超长literal差分helper](./_resources/261012-evaluate-project-file-selection-optimization/long-literal-differential.ts)
- [Node超长literal修复后差分](./_resources/261012-evaluate-project-file-selection-optimization/long-literal-node-guarded.json)
- [Node超长literal修复前差分](./_resources/261012-evaluate-project-file-selection-optimization/long-literal-node-unguarded.json)
- [冻结语料与patterns](./_resources/261012-evaluate-project-file-selection-optimization/manifest.json)
- [受控物化fixture helper](./_resources/261012-evaluate-project-file-selection-optimization/materialize-frozen-fixture.ts)
- [Phase A副本测量helper](./_resources/261012-evaluate-project-file-selection-optimization/measure-experiment-copy.ts)
- [Phase B统一边界AB/BA测量helper](./_resources/261012-evaluate-project-file-selection-optimization/measure-frozen-fixture.ts)
- [最后统一边界AB/BA测量helper](./_resources/261012-evaluate-project-file-selection-optimization/measure-lazy-default.ts)
- [Phase A公开API测量helper](./_resources/261012-evaluate-project-file-selection-optimization/measure-public-api.ts)
- [Node Phase A before样本](./_resources/261012-evaluate-project-file-selection-optimization/node-baseline.json)
- [Node独立instrumented profile](./_resources/261012-evaluate-project-file-selection-optimization/node-instrumented-profile.json)
- [Node Phase A tmp样本](./_resources/261012-evaluate-project-file-selection-optimization/node-tmp-candidate.json)
- [Phase B Bun同fixture原始样本](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-bun-frozen-fixture.json)
- [最终Bun同fixture原始样本](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-lazy-bun-frozen-fixture.json)
- [最终Node同fixture原始样本](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-lazy-node-frozen-fixture.json)
- [最终统计、source身份与边界](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-lazy-summary.json)
- [Phase B Node同fixture原始样本](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-node-frozen-fixture.json)
- [Phase B统计、source身份与边界](./_resources/261012-evaluate-project-file-selection-optimization/phase-b-summary.json)
- [惰性修正前的格式化生产source](./_resources/261012-evaluate-project-file-selection-optimization/pre-lazy-filesystem-collection.ts)
- [Phase A副本生成helper](./_resources/261012-evaluate-project-file-selection-optimization/prepare-experiment-copies.ts)
- [Phase A统计](./_resources/261012-evaluate-project-file-selection-optimization/summary.json)
- [Phase A tmp候选diff](./_resources/261012-evaluate-project-file-selection-optimization/tmp-candidate.diff)
