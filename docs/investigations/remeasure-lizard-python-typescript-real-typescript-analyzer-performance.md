---
title: "真实 TypeScript Product 源上的 Lizard Python 与 TypeScript analyzer 复测"
formedAt: "2026-09-03T08:27:49Z"
question: "在同一批真实仓库 TypeScript Product 源、同一已解码 source 和相同 canonical 输出前置条件下，当前 TypeScript Lizard port 与 upstream Python Lizard 1.24 的 analyzer-only warmed-operation 性能如何比较，历史 Product 与 analyzer 数值为何同量级？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "source-alignment"
  - "typescript"
relations:
  - type: "复查"
    target: "compare-lizard-python-typescript-performance.md"
---

## 形成时背景

此前的性能报告把两个不同 scope 并列：historical Product 的 TypeScript/JavaScript **2 文件、160 bytes** 小输入，以及 fixed Lizard 1.24 的 **27 reader family、3,456 个 tiny virtual files、316,160 bytes** 合成 batch。前者的完整调用含启动和 Product 外围，后者只计已解码 source 的 analyzer operation；它们都出现数百毫秒数值，容易被误读为“产品层与分析器层成本相同”，也容易把多语言 reader-family 合成结果当成 TypeScript 主路径结论。

本轮不改动 runtime、translated core、reader 或 port。它复用已提交的 Product fast-path 复测 corpus manifest：254 个已跟踪、非 test/fixture/test-support 的真实仓库 `src/**/*.ts` Product source，合计 1,138,778 bytes；并继续排除唯一 before/after corpus drift 的 `src/package-checks/function-metrics/analyzer/port-facade.ts`。这直接回应“这里的 analyzer 是否只是小众分析器”的疑问：这里特指 Lizard 的**函数度量 analyzer**（reader selection 后计算每个函数的 CCN、NLOC、位置和参数数），本轮只测真实 TypeScript 输入，未给 ST、Ruby、Fortran 或其他 reader family 等权。

### 当前阅读导航（不属于形成时证据）

- **本报告的 evidence owner：**254-file 真实 TypeScript 的 Python/TypeScript canonical-metrics equality 与 analyzer-only warmed-operation ABBA/BAAB 对照；request、preflight 和 raw samples 由本报告资源拥有。
- **直接前序：**frontmatter 的 `复查 → compare-lizard-python-typescript-performance.md`；本报告复查的是其跨语言 analyzer 问题，但以不同真实 TypeScript workload 回答，不能覆盖或替代前序的 historical Product、tiny 或 27-family batch。
- **已确认 / 推断 / 未知：**本工作负载上的跨实现 wall-time 差异及 output equality 已确认；它不解释根因，Product、consumer workload、其他语言、session 与 runtime 版本的适用性仍未知。
- **不能比较或相减：**本报告 analyzer-only 数字不能与完整 Product fast-path 复测或 historical Product 数字相减；三者输入、计时边界和运行模型不同，即使量级相近也不代表层级成本相同。
- **形成时建议（不是当前状态）：**保持实现不变，另做同一 request 的 root-cause profile/隔离调查；任何 translated core 或 runtime 改动都需独立授权。
- **当前状态 owner：**本轮已停止进一步性能实现；这里的 root-cause 后续调查不再执行。当前关闭状态由[最新综合调查](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)拥有。

## 调查目的

1. 在真实 TypeScript Product source 上，先确认 upstream Python Lizard 1.24 与当前 TypeScript port 的 Product-consumed canonical metrics 完全相等。
2. 在严格 analyzer-only 边界下，重测两侧 warmed-operation 的 15 block ABBA/BAAB、每侧 30 个样本，并保留 raw samples、版本、commit、request 和 driver identity。
3. 明确旧有“约 400 ms Product”与“约 200–600 ms analyzer”数值为何不能按层级或量级直接推断，避免以错误 scope 形成语言或 Product 性能结论。

## 调查范围与依据

### 输入和等价 guard

- 输入 request 由 manifest 的 254 个 byte-verified UTF-8 文件解码为同一组内存 `{path, source}` 字符串；request SHA-256 为 `71029f6bf4f38e14f9ebae4923822dda751b9a2101da68fab8bde6f882c90a4d`。
- 两侧都执行其**正常** reader selection：Python 调用 upstream `lizard.analyze_file.analyze_source_code(path, source)`；TypeScript 调用当前 `analyzeLizardSource({ filename, sourceCode })`。每个函数只映射 Product 消费的 `file/name/startLine/endLine/nloc/ccn/parameterCount`，再按 `file,startLine,endLine,name,nloc,ccn,parameterCount` canonical-sort 并 SHA-256。
- preflight 的两侧均为 2,222 metrics，canonical digest 都是 `29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6`。每一个计数样本再次要求完全相同的 digest；若 real TypeScript complexity 出现任何 drift，runner 在记录前十个差异后 fail closed，不为取得时序而修改实现。

### 计时范围和协议

- **包含：**同一已解码 source 上的 reader selection、Lizard/port 分析和上述 canonical Product-field mapping。
- **不包含：**file discovery、读取、UTF-8 decode、JSON/request parse、Worker transport、Product adapter、finding/settlement、snapshot、以及 process startup（后者另记录为 `observedWallMs`，不是主统计）。因此这是 **analyzer-only** 证据，不是 Product 性能。
- 每个样本是 fresh target；target 先运行一次不计入的同进程 analyzer warmup，再以 `operationWallMs` 记录第二次 analyzer operation。15 blocks 奇数 ABBA、偶数 BAAB，每 block 每侧两次，共 Python 30、TypeScript 30；IQR/outlier 不删除。配对值为每 block 两个样本的 geometric mean 的 Python ÷ TypeScript ratio；95% CI 是 deterministic 10,000 bootstrap median。
- 形成时当前 worktree 为 `49b57cbf99747d516c4d95390b5d01ffb2f2b40d`；upstream Lizard 为 `1.24.0` commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`，CPython 为 3.12.13、Pygments 2.18.0，Bun 为 1.3.14。完整 machine、request、harness/driver/runner SHA-256 和所有样本见随附资源。

## 调查结果与边界

### 已确认结果

60 个计数样本均通过 canonical output guard。仅对本 host、该 corpus、这些 runtime 版本和 warmed-operation protocol：

| 指标 | Python Lizard 1.24 | 当前 TypeScript port |
| --- | ---: | ---: |
| 30 samples median | 304.21 ms | 715.11 ms |
| p90 | 401.76 ms | 908.56 ms |
| paired Python ÷ TypeScript median | \- | 0.4264 |
| paired ratio bootstrap 95% CI | \- | [0.3978, 0.4388] |

**确认事实：**Python 在这份真实 TypeScript analyzer-only workload 上更快；按 paired median，Python 用时约为 TypeScript 的 42.6%（TypeScript 约为 Python 的 2.35×）。CI 明确在 1 以下，且 Python p90 也低，按前序报告的 5% practical band 分类为 `python-faster`。这修正了“Python 目前仍大概率略快”的弱表述：对**此处定义的真实 TypeScript analyzer-only scope**，证据显示的是明显差距，而不是小众语言加权造成的猜测。

**不能据此说 Python Product 更快。** 本轮故意排除了 read/decode、Worker 和 Product settlement；它没有重测也不能替代完整 Product 的跨实现对照。它也不代表 consumer repository、JavaScript/TSX、malformed input、long-lived worker session、其他机器或其他 runtime 版本；不授权进一步改动 translated core/readers/shared 或 Product runtime。

### 为什么旧数值会“同量级”

时间不是按“Product 层一定远大于 analyzer 层”这样的固定层级增长，而由**输入量、文件形状、计时边界和启动模型**共同决定：

1. 历史约 400 ms 的 Product cold 结果只分析 **2 个、160-byte** TS/JS 文件，却包含 fresh-process startup、Product/Worker/I/O 等固定开销；它不是 254-file Product 吞吐结果。
2. 旧 analyzer representative batch 虽只 316 KB，却有 **3,456 个** tiny virtual files、3,456 functions，并在每文件进行 reader resolution；它不含 Product 外围但有大量 per-file analyzer work，因此可以恰好落在 262–632 ms 这一数值区间。
3. 相同真实 corpus 的完整 Product 复测才显示适当的工作量：254 文件、1.14 MB 的 warmed complete Product operation median 是 **4,636.53 ms**（fast path after）；该值包含 read/decode、Worker、adapter、records 和 settlement，不能与这里的 715.11 ms analyzer-only 相减来归因。

所以旧的 400 ms 与 200–600 ms “看起来接近”只是不同输入和 scope 的偶然数值重叠，不是两层成本相等的证据；新结果分别给出真实 corpus 的 analyzer-only（304/715 ms）和既有 full Product（约 4.6 s）两个不可混用的观察。

## 随附资源

- [corpus-manifest.json](./_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/corpus-manifest.json)
- [evidence.json](./_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/evidence.json)
- [preflight-canonical-metrics.json](./_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/preflight-canonical-metrics.json)
- [request.json](./_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json)
- [run-benchmark.py](./_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/run-benchmark.py)
