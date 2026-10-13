---
title: "Markdown 路径游标候选的复制成本与完整 Check 对照"
id: "261013-evaluate-markdown-path-cursor"
formedAt: "2026-10-13T03:07:12Z"
question: "将 containment 路径余段复制改为游标后，局部成本、安全读取语义与完整 Markdown Link Check 耗时如何变化？"
tags:
  - "algorithmic-complexity"
  - "markdown-link-validation"
  - "performance"
  - "serial-io"
relations:
  - type: "补充"
    target: "261012-review-product-algorithmic-complexity"
    summary: "为K03补充游标候选的安全语义与完整Check对照"
---

## 形成时背景

**候选消除了普通路径余段数组复制，保留了已检查分支的串行 I/O 行为；完整 Check 在本轮样本中未测出加速。**
产品尚未采用。局部结构收益与整体耗时是两项事实，采用价值需结合维护成本和目标规模判断，
不能仅由“整体未加速”否决。通用取舍见[性能优化决策](../decisions/weigh-performance-costs-against-scaling-benefits.md)。

[前序复杂度调查](review-product-algorithmic-complexity.md)的 K03 在 `5cb448b23453edc90e02b25d003efd57dcdd3509`
上识别余段复制的条件性 Θ(D²) 成本。本轮冻结到 `bedcfc6b856678ebfc1db3ccf02520e43f56f3ea`，
补充具体候选的真实文件系统差分和公开 Run 对照。

原 trace 形成于 2026-10-13 10:31:43，计时窗口为 10:41:05–10:41:39，
报告归档复核于 11:10 起进行（均为 +08:00；raw 保留精确 UTC）。
同日用户澄清允许以有限开销换取低复杂度后，本报告收敛采用判断；原样本、方法与计时窗口保持不变。

## 调查目的

分别回答：路径游标减少了哪部分成本，是否保持原串行授权和读取语义，以及是否改善完整
`markdownLinkValidation` 的公开 `run` 耗时。
公开契约由 [Markdown Link Check](../checks/markdown-link-validation.md)拥有，
内部安全与缓存边界由 [Markdown 链接解析](../development/markdown-link-resolution.md)拥有。

## 调查范围与依据

### 唯一候选变化

由 `git archive bedcfc6b src` 取得两个完整 Product 副本，唯一源码差异为
`src/package-checks/markdown-link-validation/filesystem-probes.ts`。
候选增加私有 `segmentIndex`，普通前进复用 readonly segments；
symlink 分支仍截取余段、按原 helper 重组路径并重置游标，保持 40-hop 上限。
读取 buffer、parser、resolver、cache、公开 API 与 external-target policy 保持原实现。

`sources/` 保存 before/after 原字节，`candidate.patch` 为二者的零上下文派生 diff。
原源码、bundle、harness 与原 patch 的 SHA-256 由 identities 和审计结果区分保存。
归档时核对生产 probe 与冻结 before 一致；产品未应用候选。

### 完整 Check 测量

正式运行环境为 Node 24.18.0、Linux x64、AMD Ryzen AI 7 H 450、6 logical CPUs；
Bun 1.3.14 以 `--target=node --format=esm --packages=external` 编译未压缩 ESM bundles。

| workload | selected sources N | containment 组件数 D | 每 source / target bytes | 原 absolute target bytes |
| --- | ---: | ---: | ---: | ---: |
| shallow | 120 | 3 | 37 / 9 | 101 |
| bounded-deep | 40 | 128 | 37 / 9 | 356 |

目录为 D−1 个 `d`，叶子为 source 或 `target.md`。source 包含 Source 标题、空行、
文本为 `target` 且指向 `target.md#target` 的相对链接和末尾换行；target 为 `# Target\n`。
fixture hash 已在归档时重算核对。D=128 是宿主路径上限内的压力切面；绝对路径长度随复现位置变化。

harness 经 `defineConfig` 只设置 source patterns 和 `findingPolicy: "blocking"`，
其余采用默认配置：默认排除、existing target 与 same/cross-document anchors 启用，
root-external 为 `report`，non-empty-directory 检查关闭，parse-facts cache 关闭。
同次 invocation 复用成功 heading facts，但每 occurrence 仍独立授权。两组均低于默认 occurrence/target limits。
diagnostic、machine publication 和 progress 输出关闭。

时钟包围 `await run(definition, { projectRoot })`，包含文件选择、执行和 settlement，
import 与 Definition 创建在外。每 workload 先各 variant 一次 warmup，
再执行 12 个交替 AB/BA 配对，workload 顺序也交替，共 **48 个正式样本**。
使用 warm OS cache；计时与其它实验 agent 互斥，但未保证全宿主独占或采集系统负载。
正式 bundles 没有 I/O 或复制计数插桩；每样本断言 completed、passed 和五个计数，
完整 outcome JSON 相等只在 warmup 比较。

归档审计核对唯一配对、执行顺序及全部摘要。median 取排序后第 6/7 值均值，
MAD 为相对 median 的绝对偏差中位数；独立中位数比与逐 pair 比率中位数分别保存。
12 样本的 nearest-rank p95 等于最大值，不能作为可靠尾延迟估计。

### I/O 差分与工程证据

独立 trace 版本用真实 `fs/promises` wrapper 记录 awaited
`lstat/readlink/open/stat/read/close` 的事件和 active/peak，并计数余段复制；仅 EACCES/EIO 两分支注入故障。
harness 深比较 before/after 结果、事件和 settlement 后，raw 保存 **21 项共同观测**及 `parity: true`。
两份独立完整 trace 未归档；相等依据是差分方法中的断言及成功输出。归档审计只读复核原观测。

原工程记录包括 before/after 各 **36 pass / 0 fail** 的 Link/Lint 测试、Node/Bun public smoke、
严格 tsgo、Node syntax 和 formatter 检查。后续修正 helper 的 unsafe narrowing，
17-input 完整 typed lint 通过；原测与修正 source 分别保存，计时数据仍绑定原测身份。
复核工具的类型、lint、格式及 syntax 记录见 `engineering/audit-verification.output.txt`。

## 调查结果与边界

### 局部复制成本与完整耗时

普通路径每步复制余段的总槽数为 `D(D−1)/2`。trace 中 D=3/128 的这项复制为 **3/8128 → 0**。
这证明该项数组复制消除；反复 path join/string、symlink rewrite 和串行 I/O 仍存在，
整个 probe 或 Check 尚未被证明降为 O(D)，实际 heap/GC 变化也未测量。

| workload | before / after median（ms） | 中位数比变化 | before / after MAD（ms） | after 更快配对 | 配对比率中位数变化 |
| --- | ---: | ---: | ---: | ---: | ---: |
| shallow | 173.95 / 176.83 | +1.66% | 6.11 / 8.54 | 5/12 | +1.09% |
| bounded-deep | 1082.07 / 1115.95 | +3.13% | 17.62 / 49.66 | 3/12 | +6.45% |

正值表示增加耗时。浅路径 before/after range 为 164.60–295.75 / 155.16–282.77 ms，
深路径为 1034.34–1100.46 / 1035.76–1288.05 ms；全部样本保留。
本轮未做显著性检验或 CPU/heap 归因，数据支持“未测出完整 Check 加速”，
不支持“游标导致显著变慢”；“其它成本淹没收益”仍是待验证解释。

### 已覆盖的行为

21 项观测覆盖普通路径、root/directory/FIFO、missing/ENOTDIR、越界路径、内外部 symlink、
loop、40-hop 边界、两种注入故障，以及读取上限、当前 bytes、no-follow final symlink 与非普通文件。
active I/O 峰值≤1、结束归零；lexical outside 无 I/O，外部 symlink 不访问 referent，hop 按原上限结算。
这支持所检查分支的串行安全语义保留；hostile replacement、stat/read 增长 race 及任意 syscall failure 尚未覆盖，
原 portable containment 的 TOCTOU 边界不变。

### 取舍状态与后续证据

原取舍因未观察到完整 Check 收益而保持基线；这项实施状态仍然有效。
其“局部收益不足以承担新增游标状态”的价值判断尚未充分论证，现调整为**待权衡，而非已否定**。
后续可围绕目标路径深度、分配压力和维护复杂度决定是否采用，按需要补充会改变判断的测量；
端到端加速不是唯一可能的价值，局部降本也不能冒充整体复杂度改善。

当前证据限于本机、warm cache、合成 corpus 与正式 Node timing。
cold cache、真实 corpus、Bun timing、跨 OS、CPU/heap/GC，以及候选 package/consumer/完整 Gate 尚未验证。
本次整理仅修改文档，没有重跑性能或 trace，也未改变生产 probe、测试或 Case。

## 随附资源

- [统计、身份与 trace 复核结果](./_resources/261013-evaluate-markdown-path-cursor/audit-result.json)
- [游标候选的派生差分](./_resources/261013-evaluate-markdown-path-cursor/candidate.patch)
- [engineering/audit-oxlintrc.json](./_resources/261013-evaluate-markdown-path-cursor/engineering/audit-oxlintrc.json)
- [engineering/audit-verification.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/audit-verification.output.txt)
- [engineering/bun-after-tests.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/bun-after-tests.output.txt)
- [engineering/bun-before-tests.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/bun-before-tests.output.txt)
- [engineering/final-engineering-exits.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/final-engineering-exits.output.txt)
- [engineering/format-fd.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/format-fd.output.txt)
- [engineering/gate-final.stdout.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/gate-final.stdout.output.txt)
- [engineering/gate-first-manifest-copy.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/gate-first-manifest-copy.output.txt)
- [engineering/gate-first-package-documents-copy.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/gate-first-package-documents-copy.output.txt)
- [engineering/helper-lint-final.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/helper-lint-final.output.txt)
- [engineering/helper-lint-initial.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/helper-lint-initial.output.txt)
- [engineering/helper-lint-input-identities.json](./_resources/261013-evaluate-markdown-path-cursor/engineering/helper-lint-input-identities.json)
- [engineering/mirror-oxlintrc.json](./_resources/261013-evaluate-markdown-path-cursor/engineering/mirror-oxlintrc.json)
- [engineering/typed-helper-verification.output.txt](./_resources/261013-evaluate-markdown-path-cursor/engineering/typed-helper-verification.output.txt)
- [engineering/typed-helper.patch](./_resources/261013-evaluate-markdown-path-cursor/engineering/typed-helper.patch)
- [只读审计程序](./_resources/261013-evaluate-markdown-path-cursor/methods/audit/audit.ts)
- [methods/audit/tsconfig.json](./_resources/261013-evaluate-markdown-path-cursor/methods/audit/tsconfig.json)
- [methods/io-trace.mts](./_resources/261013-evaluate-markdown-path-cursor/methods/io-trace.mts)
- [methods/measured-harness.mts](./_resources/261013-evaluate-markdown-path-cursor/methods/measured-harness.mts)
- [methods/trace-harness.mts](./_resources/261013-evaluate-markdown-path-cursor/methods/trace-harness.mts)
- [methods/trace-probes.after.js](./_resources/261013-evaluate-markdown-path-cursor/methods/trace-probes.after.js)
- [methods/trace-probes.before.js](./_resources/261013-evaluate-markdown-path-cursor/methods/trace-probes.before.js)
- [methods/tsconfig.json](./_resources/261013-evaluate-markdown-path-cursor/methods/tsconfig.json)
- [methods/typed-harness.mts](./_resources/261013-evaluate-markdown-path-cursor/methods/typed-harness.mts)
- [raw/bun-smoke-typed-helper.json](./_resources/261013-evaluate-markdown-path-cursor/raw/bun-smoke-typed-helper.json)
- [raw/bun-smoke.json](./_resources/261013-evaluate-markdown-path-cursor/raw/bun-smoke.json)
- [raw/frozen-identities.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/frozen-identities.txt)
- [raw/node-measure-end.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/node-measure-end.txt)
- [raw/node-measure-exit.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/node-measure-exit.txt)
- [raw/node-measure-start.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/node-measure-start.txt)
- [48 个原始计时样本](./_resources/261013-evaluate-markdown-path-cursor/raw/node-measure.json)
- [raw/node-smoke-typed-helper.json](./_resources/261013-evaluate-markdown-path-cursor/raw/node-smoke-typed-helper.json)
- [raw/node-smoke.json](./_resources/261013-evaluate-markdown-path-cursor/raw/node-smoke.json)
- [21 项共同 I/O 观测](./_resources/261013-evaluate-markdown-path-cursor/raw/node-trace-parity.json)
- [raw/production-unchanged.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/production-unchanged.txt)
- [raw/snapshot-differences.output.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/snapshot-differences.output.txt)
- [raw/typed-helper-identities.txt](./_resources/261013-evaluate-markdown-path-cursor/raw/typed-helper-identities.txt)
- [resource-origins.json](./_resources/261013-evaluate-markdown-path-cursor/resource-origins.json)
- [sources/after-filesystem-probes.ts](./_resources/261013-evaluate-markdown-path-cursor/sources/after-filesystem-probes.ts)
- [sources/before-filesystem-probes.ts](./_resources/261013-evaluate-markdown-path-cursor/sources/before-filesystem-probes.ts)
- [原实验统计摘要](./_resources/261013-evaluate-markdown-path-cursor/summary.json)

## 证据阅读与复核

| 阅读目的 | 资源入口 |
| --- | --- |
| 核对计时与统计 | `raw/node-measure.json`、`summary.json`、`audit-result.json` |
| 检查候选与身份 | `sources/`、`candidate.patch`、`resource-origins.json`、`raw/*identities.txt` |
| 复核行为差分 | `raw/node-trace-parity.json`、`methods/trace-harness.mts`、`methods/io-trace.mts` |
| 区分原方法与后续修正 | `methods/measured-harness.mts`、`methods/typed-harness.mts`、`engineering/typed-helper.patch` |
| 核对工程验收时点 | `engineering/` 的 before/after tests、typed lint 与 audit 记录 |

在仓库根执行以下只读审计，可重算统计并核对受管源码身份：

```sh
mise exec -- node \
  docs/investigations/_resources/261013-evaluate-markdown-path-cursor/methods/audit/audit.ts \
  docs/investigations/_resources/261013-evaluate-markdown-path-cursor
```

该命令不创建 fixture 或运行产品。默认输出 `bundlesVerifiedFromOriginalExperiment: false`，
因为附件未持有完整 bundles；归档的 audit-result 使用第三参数原实验目录，另核对了原 bundle 与 patch hashes。
资源来源与转换由 manifest 保存：原字节复制和两个派生 U0 patch 分别标识，日志仅改扩展名以保持 Git 可见。

历史 measured/typed/trace harness 按原 imports 和输出布局保存，供阅读；完整复现需另行恢复冻结 source、
依赖、Bun compiler 和原配置，在隔离目录运行并独立保存新样本。
原 trace harness 留下 FIFO，曾导致两个 repository-copy tests 失败；精确清理后生产 Gate 43/43 通过。
这些日志证明环境恢复，不是候选验收。复现 trace 时需对 FIFO/symlink 安排 finally 清理，
不能把历史 harness 当作日常 smoke。原实验目录仍保留，本次未执行清理。
