---
title: "Core 优化后的全产品复杂度复查"
id: "261015-review-product-complexity-after-core-optimizations"
formedAt: "2026-10-15T05:44:19Z"
question: "在b2926基线的365个生产模块中，39组旧线索哪些已消除、仍条件可达或未证实，复用旧分析与新读取的边界是什么？"
tags:
  - "algorithmic-complexity"
  - "core"
  - "performance"
relations:
  - type: "复查"
    target: "261012-review-product-algorithmic-complexity"
    summary: "在新365模块基线复核39组状态与调用边界"
---

## 形成时背景

2026-10-15，用户要求在优化讨论前完整普查当时 Product，而不是仅列热点或预先排序。
基线为 `b2926b14880da7546f39aba7c0e07424f65f3977`：已有 Prepared facts、阶段需求、静态 frontier 等共同路径改动，
需要复核[前序全域调查](./review-product-algorithmic-complexity.md)的旧 39 组线索与调用条件。

本报告补录原 ignored `tmp/complexity-investigation-20261015/` 的独立复查，非清理过程中重新审计当前代码。
`formedAt` 取原 coverage/status 的 `capturedAt=2026-10-15T05:44:19.444Z/05:44:19.450Z` 的整秒；
资源实际补存于 **2026-10-17**，分别记录 `supplementedAt`。前序为 347 模块基线，本轮为 365 模块且更新了状态、
调用边界和计数，条件不同，不能合并成旧报告当时已取得的认识；因此单独形成“复查”后继。

## 调查目的

1. 闭合当时所有生产模块的覆盖与排除口径，区分旧局部分析复用、新 runtime 阅读和纯类型结构阅读。
2. 逐项复核旧 39 个 ID 的根因、可达条件、时间/空间变量与必要成本，不把线索数量当 Bug 或优先级。
3. 通过小规模计数补充条件判断，不以逻辑计数冒充时长、内存、当前实现状态或实施授权。

## 调查范围与依据

### 源码身份及阅读覆盖

实际扫描 753 个 `src/**` 文件，排除 `/fixtures/` 子树、`src/bun-test.d.ts` 及名称含
`.test.`、`.test-support.`、`.type-test.`、`.fixture.` 的文件，得到 **365 个生产 TypeScript 模块、388 项排除**。
Worker `.ts` 属于源码，发布 `.mjs` 为构建产物；没有 fixture 之外的 JS/MJS/CJS 运行模块漏项。

旧 347 成员中 284 个 SHA 相同、63 个变化，另有 18 个新模块。完整成员的路径、SHA、owner、读取方式、当时判断与限制
保留于 coverage 资源；不继续重复存储每项展开的前序全文，前序局部/delta 分析由其正式报告承接。

| 取证方式 | 模块数 | 证据边界 |
| --- | ---: | --- |
| SHA 相同，复用前序局部或delta分析并核对本轮owner调用边界 | 284 | 不是284次新的逐行审读。16个文件在前序相对更早调查已有变化，须用前序完整delta分析而非更早historical clue。 |
| 当前runtime body或目标算法与接线阅读 | 73 | 分段阅读相关实际路径，不宣称每行都取得新形式化证明。 |
| 当前符号结构/契约阅读，无独立runtime集合算法 | 8 | 不把TypeScript编译器成本算作Product运行时成本。 |

当时先使用 CodeGraph node/callers/callees；无 explore 工具或结果不足时，才限定源码路径读取。
SHA 只证明局部字节身份；当前 caller 的规模、输入和生命周期判断另行阅读，不据相同 SHA 推断调用风险不变。

### 小规模计数与纠错

使用 pinned Node 24.18.0 执行实际 helper/公开入口的有界计数，未测 wall time、CPU、heap 或跨进程内存。
Core、Analyzer、inheritance/race 三组计数和原方法文本见 bounded-operations 资源。
第一次 Core harness 错用不存在的 `inspection.pendingTasks`，在首个合法构造后失败、未生成最终 JSON；
改为公开 `inspection.nextBoundary==='select'` 断言后全脚本成功。这是辅助脚本失误，不是产品失败。

主线程另以 Node24、45 秒外层 timeout 重跑 Core/Analyzer：四组 Core 和25条 Analyzer observations逐项相同。
这是同 harness 复现，不是独立算法证明；secondary probe 未得到该次复跑确认。
早期计数与性能代理末组存在约一秒潜在重叠，因此不声称整个早期计时窗独占；本报告只使用逻辑计数。

2026-10-17 本次补存只读取上述旧材料并投影资源，没有重新运行 probe、代码审计、类型检查或 Gate。
forming-observations 文本原样保留当时跨域判断、源锚点及限制；其中旧命令/绝对路径均为历史做法，不是当前执行指引。

## 调查结果与边界

### 39 个原根因的状态更新

| 当时分类 | 数量 | 含义 |
| --- | ---: | --- |
| 原根因消除 | 18 | 不代表整个模块无增长成本。 |
| 部分消除/限定子例已防护 | 4 | R04、R05、T02、U-A01；其余条件仍需分别判断。 |
| 条件可达的增长/健壮性机制 | 9 | C04、C06、R06、R09、K02、A01–A04，不等于已确认9个Bug。 |
| 重复、容量、默认形状限制或有界额外成本 | 5 | R10、K08、K09、K11、K13，不自动作为优化收益。 |
| 尚未证实 | 3 | K12、U-A02、U-A03，保留不确定性，不从嵌套循环外观认定故障。 |

逐项可达条件、变量、时间/空间推导和形成时源锚点完整保存在 candidate-status 资源。

### 调用链与表示的关键区分

- 旧默认 static/no-observer 的重复全态扫描、scope membership 扫描和mutex cohort广播已被当时的group-head/局部delta路径替代；
  该结论不能推广给完整 custom/observer 投影、活跃scope数组、动态blocked前缀或Shell pending成本。
- full callback/diagnostics 的累计全量 DTO 可有输出义务；重复排序或建索引是另一个问题。
  learned 当时仍返回 full-demand function callback，端到端时长不能只归因于其自身 sort。
- static frontier 在同一单调分支上有摊还改善，但不同constraint groups的动态阻塞head可在多轮查询重复构成前缀；
  直接增长轴为组数 G，不能以同组宽任务代替 G=N 的族。本轮未计量该退化族，不称为实测热点。
- C04共享无效executable DAG的拒绝前展开、C06深inherit前缀、running race重复订阅、measurement逐pending积分等
  应分别以触发条件与计数判断；不是所有重复都值得新增复杂实现，也不把小输入常数代价当自动否决。
- 完整Record/reason/waiver/omitted-tail、machine candidate安全验证、canonical完整文本、F×R关系边、显式appendSources全量重建、
  distinct schema校验与真实scanner输出具有合同义务，不能因为展示少量而省略事实、安全验证或取消/失败语义。

后续若采用优化或确认Bug，应以当前 owner/源码重新建立基线；本轮的“仍有条件可达”不是当前遗留任务清单。
实际公开 API timing 另见[同日性能普查与组合对照](./survey-product-api-performance-and-tradeoffs.md)，
不能以本报告的计数直接推导时长收益或为多项改动分配因果贡献。

### 未验证范围

不是365文件新的逐行形式化审计；284模块明确复用前序证据。
第三方 AJV/Secretlint/SCC/jscpd/micromatch/Markdown parser 内部最坏复杂度、任意用户回调、宿主regex/rope/GC、peak RSS、
真实消费者规模与预算分布、任意malformed成本和物理Worker exit均未闭合。
未新确认需要另立Bug记录的复杂/严重故障，也未进行Product/test/owner改动；旧来源路径、脚本和现场副本不永久保留。
本报告保存独立认识与反例边界，不维护长期benchmark、可重跑SDK或当前工程验收。

## 随附资源

- [有界计数与形成时方法文本](./_resources/261015-review-product-complexity-after-core-optimizations/bounded-operations.json)
- [39组完整状态与条件](./_resources/261015-review-product-complexity-after-core-optimizations/candidate-status.json)
- [365个生产成员的身份和读取方式](./_resources/261015-review-product-complexity-after-core-optimizations/coverage.json)
- [当时完整跨域观察原文](./_resources/261015-review-product-complexity-after-core-optimizations/forming-observations.txt)
