---
title: "当前全产品算法复杂度复查"
id: "261012-review-product-algorithmic-complexity"
formedAt: "2026-10-12T10:16:23Z"
question: "当前整个 Product 的算法复杂度覆盖是否闭合，旧候选哪些已消除、仍有条件成立或尚待补证，新线索落在哪些责任边界？"
tags:
  - "algorithmic-complexity"
  - "checks"
  - "core"
  - "performance"
relations:
  - type: "复查"
    target: "261012-audit-checks-core-algorithmic-complexity"
    summary: "在当前源码与调用边界上复核全量覆盖及39组旧线索"
---

## 形成时背景

**当前 347 个生产模块中，旧调查 39 组线索的 14 组原根因已消除；剩余成本主要涉及共同 Run、深层输入、文件处理和可选工具。**
本轮在源码 `5cb448b23453edc90e02b25d003efd57dcdd3509` 上复查[前序全量调查](audit-checks-core-algorithmic-complexity.md)，
取证日期为 2026-10-12。实际耗时由[性能基线](measure-product-performance-baseline.md)承接。

## 调查目的

识别全产品计算量随输入规模的增长，区分已消除的根因、仍可达的风险、必要输入／输出成本与待证疑点，
为后续判断提供依据。本轮范围是调查与记录。

## 调查范围与依据

范围为 `src/index.ts` 及全部生产源码；仓库脚本只用于定位消费者。

| 范围 | 文件数 | 覆盖对象 |
| --- | ---: | --- |
| Check | 9 | 声明、options、identity、facts 与回调边界 |
| Project Definition | 16 | authoring、验证、继承与关系归一化 |
| Project Run | 81 | invocation、flags、dependencies、graph、scheduler、measurement、human output |
| Check Settlement | 6 | 生命周期、outcome、Records 与冻结事实 |
| Data Boundary | 7 | closed/canonical 数据、路径选择、文件—区域索引 |
| Machine Output | 12 | facts 投影、fingerprint、序列化、校验与发布 |
| 公开入口 | 1 | 重导出 |
| Checks 与共享能力 | 201 | 九项 Check、`commandCheck` 及共享模块 |
| Non-core tools | 14 | admission、cache、change-flag debug、finding presentation/waivers、learned strategy |

生产成员与前序清单一致：**322 个自身字节未变的文件复用模块局部分析，25 个变化文件重新审读**；
39 组候选均另行核对当前调用者、输入、缓存及正常／回退分支。哈希证明字节身份，调用边界复核承担当前可达性判断。
46 个 analyzer 模块采用前序最终深审。逐文件身份见 `source-inventory.json`，变化依据见 `delta-review.md`。

证据结合静态推导与有界计数：capacity、单 scope 图验证、共享 DAG 直接调用当前 helper／公开 API；
文件索引只实测最终结果等价，匹配候选数按公式计算。Bun 1.4.2 计数复跑与前段结果一致，
仅用于操作量判断；性能报告的 Bun 1.3.14 耗时另行解释。Map/Set 采用通常均摊散列模型。

## 调查结果与边界

### 39 组线索的当前状态

按原根因分组，数量表示调查线索而非性能 Bug 数。完整触发条件、时间／空间成本和源码定位见 `candidate-status.json`；
同名 Markdown 提供摘要。

| 状态 | 组数 | 范围 |
| --- | ---: | --- |
| 原根因已消除 | 14 | C01/C02/C03、R01/R02/R03/R08、T01、K01/K04/K05/K06/K07/K14 |
| 部分消除 | 2 | R04 的 singleton scope 扫描、T02 的正常 prepared 索引已改善 |
| 部分子例获新证据 | 1 | U-A01 的未闭合 TS 模板与 C 注释 |
| 条件性增长／健壮性风险 | 13 | 12 项增长及 C04 无效 authoring 图的拒绝前展开 |
| 重复、有界、容量或默认形状限制项 | 6 | R10、K08/K09/K10/K11/K13 |
| 待证实 | 3 | K12、U-A02、U-A03 |

“已消除”限定原根因及对应分支：K06 成功路径复用历史测量，失败仍可重试；T01 的线性私有 helper 当前无生产调用者。

### Core 与可选调度工具

- **共同 Run（R05）**：对 N 个常数工作量 Check、Θ(N) 次决策边界，重复 snapshot、inspection 和候选视图
  带来至少 Ω(N²) 的累计投影。另在 singleton scopes 数 S=N、并发 P=N、独立任务连续准入时，capacity membership
  子项为 Θ(N³)：N=16/32/64 的计数为 1,360/10,912/87,360，吻合 `(N³−N)/3`。
  该三次项限定高并行条件，默认 P=4 不满足；R06 等待 running completions、R07 mutex fanout、R09 measurement
  扫描各有独立增长轴。
- **Definition／动态数据**：C05 对 K 个动态 exact keys 做 Θ(K²) 比较，实际消费者包括 change-flag debug 的 regions；
  固定小 schema 成本有界。C06 深层继承反复物化增长前缀，产生 Θ(n²) 元素工作。
  C04 共享 executable DAG 在重复 ID 拒绝前可能指数展开，属于无效输入健壮性；合法容器的 warnings 则按实际输出量计。
- **图验证（R04）**：singleton scope 的全 task 扫描已消除。多 Task scope 对每个 nonterminal q 重起 DFS，
  总量 `Σ_q O(V_q+E_q)`，单 scope 稀疏链可达 Θ(V²)，public singleton 该项为零；四次有序 prepare 是常数因子。
- **Learned（T02）**：正常 prepared 路径复用图索引，static fallback 仍逐边界重建；activation membership 与排序
  另按候选规模计量。

### 九项 Check、通用入口与共享能力

| 模块 | 文件数 | 当前结论 |
| --- | ---: | --- |
| `duplicateDetection` | 25 | K04 area 求交已索引化；K10 关闭 cache 仍完整 fingerprint；K11 多 location 二次项在默认两个 location 下有界 |
| `fileMetrics` | 15 | K07 batch 前缀重复计量已消除；完整 CSV、排序与外部 SCC 成本分别计量 |
| `functionMetrics` | 63 | A01–A04 签名、深状态链、namespace、Ruby 插值增长仍在；U-A01 两子例补证，U-A02/U-A03 待证 |
| `jsonValidation` | 6 | 严格解析与 key/value 检查各有数据义务；本轮未识别独立增长型根因 |
| `jsonSchemaValidation` | 12 | K08 同 instance 多 binding 重读／解析仍在；不同 schema 验证与完整错误计数另计 |
| `maintenanceReminders` | 6 | K06 成功的重叠历史测量已复用；保留失败重试与外部 Git 成本 |
| `markdownLinkValidation` | 19 | K05 anchor 已索引化；共享 K03/K13 安全读取成本，K09 可选 cache 全量恢复仍在 |
| `markdownLint` | 12 | K14 比较器重复 DTO 分配已消除；共享 K03/K13，K12 front-matter 正则待证 |
| `secretDetection` | 11 | 文件覆盖、gap facts 与扫描成本按输入输出计；本轮未识别自身独立增长型根因 |
| `commandCheck` | 5 | 准备、转录与结果处理按输入输出增长；外部命令和回调工作量由消费者决定 |
| 共享模块 | 27 | K01 宽目录查找已索引化；K02 深路径前缀复制仍在；含严格 JSON、host、文件及 finding 路径 |

K02/K03 深路径复制可达 Θ(D²)，受宿主路径长度限制。文件选择还随候选数、pattern 数及 area membership 增长，
等价文件集合的不同选择表示已有[性能对照](measure-product-performance-baseline.md#文件选择表示的隔离对照)。
K09 每轮恢复完整 cache；持续新增 content digest、使历史线性增长时，跨轮累计恢复量才可能二次，冻结语料的 warm 重复不持续追加。
K10 为额外线性 IO，K13 为按上限分配。函数指标的两类病理输入详见[专题报告](audit-function-metrics-pathological-input-cost.md)。

### 必要成本与证据缺口

| 边界 | 成本性质 |
| --- | --- |
| 文件—区域索引 | 完整双向关系 E 可达 F×R；`appendSources` 按契约全量重建，连续微量追加可累计二次工作，属于已知调用形状成本 |
| Canonical JSON | 共享 DAG 按出现次数展开：13 个独特对象的样本产生 8,191 次 `ownKeys`；文本输出本身可指数增长。仅规范化副本的共享复用是另一问题 |
| 完整事实与工具输出 | Machine Output 序列化／验证、Records 排序、waiver audit、presentation 的完整 omitted-tail 各有数据义务；JSON cache 按 payload 读写 |

本轮形成源码与操作量证据，产品实现保持原样。真实消费者规模、延迟预算、CPU/heap/GC 峰值、第三方 parser/scanner
和任意用户回调内部算法仍未知；实际影响与收益需结合性能测量判断。

## 随附资源

- [有界操作计数与样本边界](./_resources/261012-review-product-algorithmic-complexity/bounded-operation-counts.json)
- [39 组候选的完整当前条件](./_resources/261012-review-product-algorithmic-complexity/candidate-status.json)
- [候选状态可读摘要](./_resources/261012-review-product-algorithmic-complexity/candidate-status.md)
- [全产品 owner 覆盖矩阵](./_resources/261012-review-product-algorithmic-complexity/coverage-matrix.md)
- [25 个变化模块及历史复用依据](./_resources/261012-review-product-algorithmic-complexity/delta-review.md)
- [有界计数探针](./_resources/261012-review-product-algorithmic-complexity/operation-count-probe.ts)
- [当前生产成员、排除规则与源码身份](./_resources/261012-review-product-algorithmic-complexity/source-inventory.json)
