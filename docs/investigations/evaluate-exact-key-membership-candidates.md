---
title: "Exact-key 线性成员校验候选的规模收益与开销"
id: "261013-evaluate-exact-key-membership-candidates"
formedAt: "2026-10-13T03:07:06Z"
question: "保持 exact-key 语义且不采用经验尺寸阈值时，局部线性候选在不同规模和字段顺序下有哪些收益、开销与采用条件？"
tags:
  - "algorithmic-complexity"
  - "data-boundary"
  - "performance"
relations:
  - type: "补充"
    target: "261012-review-product-algorithmic-complexity"
    summary: "为C05补充公开快照API的跨规模对照与采用边界"
---

## 形成时背景

本轮候选呈现明确取舍：**大输入更快，部分小输入增加开销；产品尚未采用，采用价值待重新评估。**
原判断把小输入回退当作否决条件。用户在 2026-10-13 明确接受以可承受的常数开销换取低复杂度，
因此本报告修正这一推断，保留全部原始观测；取舍原则由[性能优化决策](../decisions/weigh-performance-costs-against-scaling-benefits.md)承接。

[前序复杂度调查](review-product-algorithmic-complexity.md)的 C05 指出动态 K 个 exact keys 的成员比较为 Θ(K²)。
本轮以 `bedcfc6b856678ebfc1db3ccf02520e43f56f3ea` 为共同基线，补充具体候选的公开快照 API 对照。
原计时发生于 2026-10-13 10:24–10:45，报告形成于 11:07:06，资源归档及复核于 11:11 起进行
（均为 +08:00；原始资源保留 UTC）。本次整理沿用同一轮数据，没有重新计时。

## 调查目的

判断局部线性成员校验在不同规模、键形状和字段顺序下的收益与开销，为具体采用取舍提供依据。
本次候选保持公开语义，并遵循用户对这轮优化提出的“无经验尺寸阈值”约束。
报告区分实测结果、未测准备、语义假设和产品实施状态。

## 调查范围与依据

### 入口与候选

公开契约由 [Core 数据工具](../guides/data-boundaries.md)拥有。`snapshotExactClosedRecord` 先取得冻结浅快照，
再调用 `hasExactPlainRecordKeys` 检查字段集合；快照、冻结和属性枚举成本均在计时内。
harness 直接从冻结的 `closed-values.ts` 模块导入该公开函数，测量层为局部 API，而非安装后 package 或完整业务路径。

字段表的公开前提是稳定、无重复的 string 数组。候选保留浅引用、getter/symbol/不可枚举属性及不支持原型的拒绝、
Proxy 反射失败处理；本轮还额外保留 baseline 对重复字段表的拒绝，后者是候选保持目标，不是新增公开承诺。

基线是等长检查后逐个执行 `keys.includes`。各候选只改变成员校验：

| 候选 | 实现 | 证据状态 |
| --- | --- | --- |
| initial | 每次建立 `Set(actualKeys)`，按索引读取字段表并逐个 `delete` | 正式计时及语义 smoke |
| threshold64 | K≤64 沿用基线，K>64 建 Set | 正式计时，含 63/64/65 边界 |
| cancelled-threshold256 | K<256 沿用基线，K≥256 建 Set | 仅准备及 smoke；因本轮阈值约束取消 |
| prefix | 先消除同序前缀，再对余段建 Set 并逐个 `delete` | 无尺寸阈值；正式计时覆盖三种顺序 |

在通常均摊 Set 模型下，成员校验由 Θ(K²) 降为 O(K)；这不等于整个快照 API 的复杂度证明。
等长与一次性 `delete` 保留额外的重复表拒绝。Set 来自 actual keys；改为 `new Set(keys)` 会引入调用方 iterator，
需要另行核对行为，不能视为已测实现。

### 测量设计

环境为 Linux x64、Node 24.18.0，由 Bun 1.3.14 构建 Node bundle。CPU 型号、系统负载、温度及 GC/heap 峰值未记录。
输入和字段表预先构造，值交替引用同一 nested object 与 callback；每组先语义断言和 warmup，
再执行 8 轮交替 AB/BA。计时循环调用公开 API，构造、断言和 I/O 在时钟外，返回值未在时钟内消费。

| 窗口（2026-10-13，+08:00） | 组数 / 样本数 | 规模、形状与预热 |
| --- | ---: | --- |
| 10:24:07.023–10:24:18.432 | initial 9 / 144 | K=0/1/2/4/8/16/64/256/1024；`region-00000` 同序；每 variant 每组预热 500 次 |
| 10:29:45.834–10:30:19.825 | threshold64 26 / 416 | K=0/1/2/4/8/16/32/63/64/65/128/256/1024；short/shared-prefix 同序；预热 500 次 |
| 10:44:30.887–10:45:31.713 | prefix 34 / 544 | K=0/1/2/4/16/256/1024；两种键形状，K≥2 测三种顺序；K≤16 预热 20,000 次，其余 500 次 |

short 为 `r0` 等短键，shared-prefix 为带固定长前缀的键；same 跟随枚举顺序，
reverse 逆序，odd-even 先奇索引再偶索引。各组实际 iterations 记录在 raw，不能直接比较不同 K 的批次总时长。

主指标是每轮 `candidate.elapsedMs / before.elapsedMs` 的 8 值中位数。
另存独立样本中位数之比、全部配对比值、范围及方向计数；两种比率分别解释。
归档复核独立重算 **1,104 个样本、69 组**，并核对唯一轮次、AB/BA 顺序和原摘要；全部样本保留。

### 身份与行为证据

`sourceSha256.harness` 标识实际 compiled JS，而 `before/candidate` 标识冻结 TS 模块。
原测 TS、后续仅类型修正的 TS 与原 frozen bundle 分别保存；归档时核对四份既有修正构建与原 JS 逐字节相同。
[资源阅读指南](./_resources/261013-evaluate-exact-key-membership-candidates/resource-guide.md)解释身份、类型修正及完整复核入口。

原 harness 在计时前验证双方行为。prefix 还覆盖两种键形状、三种顺序、重复键、拒绝 iterator 的稳定数组、
特殊自有键、null prototype、浅引用、getter/symbol/不可枚举属性及 Proxy 失败。
归档时另于 11:12:28.754–11:12:29.616（+08:00）运行四个 frozen bundles 的 Node 非计时 smoke，均 exit 0。
后续 17-input typed lint 通过的是修正后的输入；原已测 TS 与未执行的正式测试草案各按原身份保留。

## 调查结果与边界

### 不同规模的收益与开销

下表使用配对比率中位数；正值为增加耗时，负值为减少耗时。

| 候选与条件 | 小输入观测 | 大输入观测 |
| --- | --- | --- |
| initial，同序 | K=0/1/2/4/8/16：+25.55% / +31.39% / +27.82% / +22.82% / +19.90% / +17.06% | K=256：−14.71%；K=1024：−43.67% |
| threshold64，两种键形状 | K=65：+6.35% / +5.81%，各 8/8 配对变慢 | K=256/1024 均有收益，全部数值见该阶段摘要 |
| prefix，两种键形状 | K=2/4/16 的 reverse/odd-even 共 12 组：+16.41% 至 +30.09%，各 8/8 配对变慢 | same K=256：−26.26% 至 −25.66%；same K=1024：−49.72% 至 −48.60%；reverse/odd-even K=1024：−45.53% 至 −39.35% |

initial 的 K=2 有两轮 before 特别慢，6/8 配对回退，其余上述小规模组为 8/8。
此前 initial 的“17–32%”、threshold64 的“6.6–7.5%”来自独立样本中位数比，与表中的配对口径不同。
Set 分配成本主导小形状是可能解释，尚无分配或 GC profile 支持因果归因。
完整组级结果、绝对批次时长和迭代数均可从 raw 与摘要复核。

### 采用判断与未测方案

**小输入回退与大输入收益同时成立，尚不能据此判定业务总体收益或代价不可接受。**
原报告将“低风险”扩成“所有合法常用形状都不能回退”，这一额外约束已撤回。
现有 initial 与无阈值 prefix 都可继续按实际开销、目标规模、内存和维护成本评估；无须先证明每组都更快。
产品仍保持基线，本报告的判断修正不等于候选已采用。

另外两类尝试有不同状态：

- threshold64 有测量；256 阈值只有准备与 smoke。后者的取消依据是本轮阈值约束，不是性能失败。
- `keys.every(key => Object.hasOwn(value, key))` 对重复字段表可能与 baseline 不同；
  重复表超出公开的 unique 前提，不能据此判定有效输入的契约不等价。
  当时因额外保持 baseline 拒绝行为而未继续，尚无该提案的性能数据。

### 适用边界与后续证据

现有数据证明本机 Node 的局部 API 稳态对照；尚缺真实调用频率和规模/顺序分布、`debugChangeFlags` 端到端、
Bun 性能、跨机器，以及 CPU/heap/GC 证据。后续应围绕会改变采用判断的缺口补证，
同时保留小型非同序开销与大规模收益；真实流量分布未知是判断边界，不是自动否决条件。

本轮完成证据归档、统计/身份复核和上述非计时 smoke；相关生产源码与正式测试保持基线字节。
本次文档整理没有重跑性能、trace、Product Gate、完整产品测试或构建。
原始样本、候选和工程记录作为阅读证据保存，受控复现方法见资源指南。

## 随附资源

- [本轮完整身份与69组独立统计复核](./_resources/261013-evaluate-exact-key-membership-candidates/audit-results.json)
- [共同baseline完整源码](./_resources/261013-evaluate-exact-key-membership-candidates/baseline/closed-values.ts)
- [取消且未测的阈值256：完整候选源码](./_resources/261013-evaluate-exact-key-membership-candidates/cancelled-threshold256/candidate.ts)
- [取消且未测的阈值256：真实冻结compiled JS](./_resources/261013-evaluate-exact-key-membership-candidates/cancelled-threshold256/harness-frozen.mjs)
- [取消且未测的阈值256：原冻结TypeScript harness](./_resources/261013-evaluate-exact-key-membership-candidates/cancelled-threshold256/harness-measured.ts)
- [取消且未测的阈值256：后续仅类型修正的harness](./_resources/261013-evaluate-exact-key-membership-candidates/cancelled-threshold256/harness-type-fixed.ts)
- [来源路径、逐字节副本及U0转换身份](./_resources/261013-evaluate-exact-key-membership-candidates/copy-identities.json)
- [最终17-input typed lint退出结果](./_resources/261013-evaluate-exact-key-membership-candidates/helper-validation/helper-lint-final.txt)
- [初始9项typed lint诊断原文](./_resources/261013-evaluate-exact-key-membership-candidates/helper-validation/helper-lint-initial.txt)
- [typed lint所有17输入与SHA-256](./_resources/261013-evaluate-exact-key-membership-candidates/helper-validation/helper-lint-input-identities.json)
- [历史typed lint规则配置](./_resources/261013-evaluate-exact-key-membership-candidates/helper-validation/mirror-oxlintrc.json)
- [历史typed lint镜像类型配置](./_resources/261013-evaluate-exact-key-membership-candidates/helper-validation/mirror-tsconfig.json)
- [全量Set：完整候选源码](./_resources/261013-evaluate-exact-key-membership-candidates/initial/candidate.ts)
- [全量Set：真实冻结compiled JS](./_resources/261013-evaluate-exact-key-membership-candidates/initial/harness-frozen.mjs)
- [全量Set：原冻结TypeScript harness](./_resources/261013-evaluate-exact-key-membership-candidates/initial/harness-measured.ts)
- [全量Set：后续仅类型修正的harness](./_resources/261013-evaluate-exact-key-membership-candidates/initial/harness-type-fixed.ts)
- [全量Set：全部原始样本](./_resources/261013-evaluate-exact-key-membership-candidates/initial/samples.json)
- [全量Set：全部paired统计摘要](./_resources/261013-evaluate-exact-key-membership-candidates/initial/summary-paired.json)
- [无阈值prefix：完整候选源码](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/candidate.ts)
- [无阈值prefix：真实冻结compiled JS](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/harness-frozen.mjs)
- [无阈值prefix：原冻结TypeScript harness](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/harness-measured.ts)
- [无阈值prefix：后续仅类型修正的harness](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/harness-type-fixed.ts)
- [无阈值prefix：全部原始样本](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/samples.json)
- [无阈值prefix：全部paired统计摘要](./_resources/261013-evaluate-exact-key-membership-candidates/prefix/summary-paired.json)
- [原实验现场说明与归档边界](./_resources/261013-evaluate-exact-key-membership-candidates/provenance-original.txt)
- [逐类用途、identity释义与受控复现前提](./_resources/261013-evaluate-exact-key-membership-candidates/resource-guide.md)
- [本轮Node24非计时语义smoke结果](./_resources/261013-evaluate-exact-key-membership-candidates/semantic-recheck.txt)
- [真实原始全样本paired统计程序](./_resources/261013-evaluate-exact-key-membership-candidates/summarize.ts)
- [阈值64：完整候选源码](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/candidate.ts)
- [阈值64：真实冻结compiled JS](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/harness-frozen.mjs)
- [阈值64：原冻结TypeScript harness](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/harness-measured.ts)
- [阈值64：后续仅类型修正的harness](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/harness-type-fixed.ts)
- [阈值64：全部原始样本](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/samples.json)
- [阈值64：当时独立中位数比摘要](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/summary-historical.json)
- [阈值64：全部paired统计摘要](./_resources/261013-evaluate-exact-key-membership-candidates/threshold64/summary-paired.json)
- [未执行且撤回的正式测试草案U0等价diff](./_resources/261013-evaluate-exact-key-membership-candidates/withdrawn-formal-test.patch)
