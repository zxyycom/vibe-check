---
title: "CPython 与 JavaScriptCore 执行 Lizard tokenizer 正则的性能差距解释"
formedAt: "2026-09-03T09:45:03+00:00"
question: "在真实 TypeScript source 产生相同 raw token 与 UTF-16 offset 的前提下，为什么 upstream Python Lizard 的正则扫描明显快于 Bun 上的 TypeScript port，当前证据能把原因定位到哪一层？"
tags:
  - "cpython"
  - "function-metrics"
  - "javascriptcore"
  - "lizard"
  - "performance"
  - "regex"
  - "source-alignment"
  - "typescript"
relations:
  - type: "归并"
    target: "diagnose-lizard-real-typescript-analyzer-hot-path.md"
  - type: "归并"
    target: "survey-lizard-host-acceleration-candidates.md"
---

## 形成时背景

直接前序已经在同一批 254 个真实仓库 TypeScript source（1,138,778 UTF-8 bytes）上确认：upstream Python Lizard 1.24 与当前 TypeScript port 产生相同的 2,222 条 Product-consumed function metrics，但 warmed analyzer-only median 分别为 304.21 ms 与 715.11 ms，TypeScript 约为 Python 的 2.35×。后续 profile 又将 Bun 的最大 native hotspot 定位到 `CodeReader` 的 combined tokenizer regexp；候选调查则发现 Oniguruma WASM 在受限 raw-scan spike 中有性能信号。

本轮继续追问的不是“应该换哪个库”，而是：**Python 为什么在这一个 source-aligned tokenizer workload 上快，差距是否来自 Python 有 native engine 而 TypeScript 只能解释执行，以及哪些更具体的 pattern 特征已有因果定位？**

本轮只在 `/tmp` 执行诊断 benchmark，并将最小 raw evidence 和可复跑 driver 收入随附资源；没有修改 Product runtime、port、translated core/readers/shared、依赖或 lockfile。形成时 current port 的 `CodeReader` SHA-256 为 `571bd9…ae86e`，upstream Lizard 1.24 `code_reader.py` 为 `0e7381…02cc`，254-file request 为 `71029f…0a4d`；完整 identity 和资源 hash 见 `provenance.json`。

### 当前阅读导航（不属于形成时证据）

- **本报告的 evidence owner：**同 raw-token workload 下 Bun 1.3.14 与 CPython 3.12.13 的 symmetric scan、scanner API/reuse、pattern ablation、generic-stage control、synthetic control 和 TypeScript generator control，以及结合双方引擎 source 得到的解释边界；CPython 3.14.7 仅保留一组 supporting symmetric observation。
- **直接前序：**frontmatter 以 `归并` 连接真实 TypeScript hotspot diagnosis 与[宿主加速候选调查](survey-lizard-host-acceleration-candidates.md)：本报告将前者的热点定位、后者的 backend candidate 与新原因隔离证据综合为下一轮优先级；它不原地改写两份既有材料的形成时判断。
- **最重要的当前事实：**254-file current façade fast path 已使 `matchFilename=0`。ordered reader dispatch 是历史路径的已修热点，不是本轮仍存在的 2.35× 差距根因。
- **measurement layer：**8–10×只属于 raw matcher 的 `count-only`/`consume-fields` 对称扫描；2.35×属于完整 analyzer-only operation。两层的输入虽相同，driver、样本、warm/JIT/GC 状态和包含工作不同；它们不能相减为“可回收毫秒”，也不能用 raw ratio 预测 Product 加速。
- **已排除与未排除：**当前 reader dispatch、per-file `RegExp` construction/reuse、`matchAll`/`exec` wrapper、Unicode word class 与 default token factory 没有主因信号；quoted-string branches 仍只是改变 segmentation 的次级候选，不能据此改实现。
- **结论强度：**“两边都有 native engine”“raw output 相同而约 8–10×”“generic branch 对 Bun/JSC 特别敏感”有直接依据；“Yarr 内部哪条 codegen、回溯或字符宽度路径导致该结果”仍未知。
- **形成时候选优先级（不是当前状态）：**先以完整 parity 重查 built-in staged-generic control；Oniguruma 是并列 backend candidate；两者不能闭合或仍有 material gap 后，才调查 quoted-string same-output control。这个顺序是调查优先级，不是采用或实现授权。
- **当前状态 owner：**本轮已停止进一步性能实现；Node 与 Onig 都不在执行。当前关闭状态及若重新授权时的唯一阅读入口由[最新综合调查](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)拥有。
- **非授权边界：**所有 ablation/staged scanner 都是诊断反事实，不是 production implementation。任何 port 改动仍须独立 Change、Decision、全 reader/token/extension parity 和 Product delivery 验证。

## 调查目的

1. 用 runtime source 说明 CPython `re` 与 Bun/JavaScriptCore RegExp 的实际执行和缓存路径，排除“Python native、TypeScript interpreted”这一错误二分。
2. 在 raw token text 与 JS UTF-16 start offset 相同的前提下，隔离 scanner API、per-file construction/reuse、Unicode word class、generic lookahead、quoted-string branches 和 token factory/generator 等候选。
3. 解释为什么 raw scan 约 8–10×、完整 analyzer 约 2.35×并不矛盾，同时避免跨 harness 精确相减。
4. 给出下一轮最小调查顺序，但不授权修改 source-aligned port 或选择第三方 backend。

## 调查范围与依据

### 共同输入、pattern 与输出 guard

- 两侧读取前序报告保存的同一 decoded request：254 个 `.ts` source、1,138,778 UTF-8 bytes。raw guard 按每个 matched text 与其 JS UTF-16 start 计算；两侧均为 **296,074 matches、1,126,244 matched characters**，SHA-256 为 `47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e`。
- Bun 使用 current TypeScriptReader 在 `CodeReader` 形成的 393-character `gmsu` pattern；CPython 使用 upstream 365-character `re.M | re.S` pattern。两者不是 literal-identical：port 为对齐 Python `\w`/whitespace 等行为使用了 Unicode property 与 C0 compatibility 片段。guard 只证明该真实 corpus 的 raw text/UTF-16 offset 相等，不证明全部 reader、Unicode、malformed input 或宏处理语义。
- raw scanner timing 不含 digest，且在 measurement 前验证 guard。Bun 为 1.3.14；正式 Python 数字使用与 analyzer benchmark 一致的 CPython 3.12.13。除特别说明外，median 来自同一进程 warm 后的 cyclic/alternating samples；完整 rows 和 protocol 见 `evidence.json`。

### 两边都在 native engine 中执行，并非 TypeScript 解释正则

**CPython 路径。** Upstream `CodeReader.generate_tokens` 每次组装 pattern 后调用 `re.compile(..., re.M | re.S)`，再由 `Pattern.finditer` 产生 matches。CPython 的 [`re.finditer`](https://github.com/python/cpython/blob/v3.12.13/Lib/re/__init__.py#L219-L224) 会先经过 `_compile`；[`_compile` cache](https://github.com/python/cpython/blob/v3.12.13/Lib/re/__init__.py#L271-L329) 以 pattern type、pattern 和 flags 为 key 复用 compiled `Pattern`。随后 `_sre` 的 C 实现创建 scanner/iterator，并在 engine 内搜索和产生 `Match`，而不是让 Python 逐字符解释 regexp（[`Pattern.finditer`/scanner`](https://github.com/python/cpython/blob/v3.12.13/Modules/_sre/sre.c#L2834-L2902)、[`sre_search`](https://github.com/python/cpython/blob/v3.12.13/Modules/_sre/sre.c#L692-L711)）。它是 C 写成的 regexp virtual machine；“native”不表示它为每个 pattern 生成机器码 JIT。

**Bun/JavaScriptCore 路径。** Bun 1.3.14 固定其 WebKit/JavaScriptCore revision（[`Bun WebKit pin`](https://github.com/oven-sh/bun/blob/bun-v1.3.14/scripts/build/deps/webkit.ts#L1-L6)）。在该 JavaScriptCore 中，`new RegExp(pattern, flags)` 经 cache 创建/取得 `RegExp`；constructor/`finishCreation` 并不等于完整执行代码已生成。第一次实际 match 才走 `compileIfNecessary()`，通常先尝试 Yarr RegExp JIT，不能 JIT 时才使用 Yarr bytecode（[`RegExp creation/compile`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/RegExp.cpp#L207-L294)、[`matchInline`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/RegExpInlines.h#L103-L203)）。所以 TypeScript 的 regexp 同样由 C++ engine、并可能由生成的 native machine code 执行，不是 TypeScript loop 在解释 pattern。

### Scanner API、构造、缓存与 generator control

在 Bun 的同一 raw guard 下，各条件先 warm，再执行 3 个 cyclic samples：

| Bun raw scanner condition          |    Median | 相对 per-file `matchAll(new RegExp)` |
| ---------------------------------- | --------: | -----------------------------------: |
| 每文件 `matchAll(new RegExp(...))` | 502.97 ms |                                1.000 |
| 复用一个 RegExp 的 `matchAll`      | 474.94 ms |                                0.944 |
| 每文件 `new RegExp(...).exec` loop | 492.59 ms |                                0.979 |
| 复用一个 RegExp 的 `exec` loop     | 494.84 ms |                                0.984 |
| 每文件 sticky `y` manual scan      | 507.47 ms |                                1.009 |

`matchAll` 会建立 RegExp string iterator，并在每次 `next` 通过 RegExp exec 产生 match/result object（[`String.prototype.matchAll`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/StringPrototype.cpp#L1509-L1544)、[`JSRegExpStringIterator`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/JSRegExpStringIterator.cpp#L67-L172)）。但这里 `matchAll`、`exec` 与 sticky control 都在相邻范围；只有 `matchAll` reuse 显示 5.6% 的小信号，且样本有明显波动。因此 wrapper/iterator 可能有次级成本，却不能解释数量级差距。

四次 fresh-process 观察中，首次/重复 reused `matchAll` 的范围分别为 462–518/444–494 ms；随后 per-file new 的首次/重复范围为 436–518/433–475 ms，区间重叠。JSC regexp cache 以 pattern/flags 为 key 的 weak cache 复用仍存活的 `RegExp`；仅长度不超过 256 的已执行 pattern 会进入 strong cache（[`RegExpCache`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/RegExpCache.cpp#L41-L93)、[`cache limit`](https://github.com/oven-sh/WebKit/blob/5488984d20e0dbfe4be2c3ba8fb18eb81a5e0e8b/Source/JavaScriptCore/runtime/RegExpCache.h#L55-L82)）。当前 393-character pattern 不符合 strong-cache 条件，且 fresh-process probe 不能强制 weak-cache/compiled-code eviction。这些 source facts 和 observation 共同说明：constructor-only 的 0.019 ms 不能证明 first-exec compile 为零，也不能把每文件 `new RegExp` 等同为每文件完整 JIT compile；在这份 workload 上，new/reuse 没有显示能解释大差距的信号。

CPython raw control 也得到同一结论。显式复用 compiled `Pattern.finditer`、调用 `re.finditer(patternString, flags)` 和每文件 `re.compile(...).finditer` 的 medians 分别为 44.24、44.52 和 43.95 ms；后两者都受 CPython cache 保护。因此 Python cache 确实避免 warmed workload 重编译，但“Python 缓存、Bun 完全不缓存”并不符合两侧 source 或本轮数据。

在 TypeScript generator control 中，`CodeReader.generateTokens` default 与显式 `match.group(0)` token factory 分别为 455.48/455.60 ms；TypeScriptReader wrapper 条件分别为 479.35/485.72 ms，paired output guards 相同。它不支持把数百毫秒差距归因于默认 token factory 调用；macro/template/generator 是相邻成本，但明显小于 raw scanner 的数量级差距。

### 相同 raw output、对称消费边界的跨 runtime 差距

最终 cross-runtime control 在两侧各执行 12 个 alternating pairs，并保留两种对应的 native-consumption 形态：`count-only` 只推进 matcher 并计数；`consume-fields` 读取每个 runtime 的 matched-text length 和 native start field（Bun 为 `m[0].length`/`m.index`，CPython 为 `len(m.group())`/`m.start()`）。后者不会在计时循环中把 Python code-point start 转成 UTF-16；该转换只在计时外的 guard 完成。因此它对齐了 match 推进与字段读取边界，而不是计入一份相同的 offset-conversion 工作。两侧 preflight 都得到上述相同 raw guard：

| 对称 raw condition | Bun 1.3.14 | CPython 3.12.13 | Bun ÷ Python |
| ------------------ | ---------: | --------------: | -----------: |
| count-only         |  438.45 ms |        42.49 ms |   **10.32×** |
| consume-fields     |  434.34 ms |        56.29 ms |    **7.72×** |

因此当前可复述的量级是 **Bun/JSC raw scan 约为 CPython 的 8–10×**，而不是选取一个 API/消费边界后给出假精确单值。CPython 3.14.7 supporting observation 为 10.20×/7.97×，也落在同一范围。

这证明的是**这两个不同 regexp engine 执行各自 source-aligned pattern 的 workload 差异**，不是所有 Python 与 JavaScript regexp 的语言级规律。pattern 文本虽不完全相同，但后续 ablation 检查了最明显的 Unicode 差异。

### Pattern feature ablation 与 exact-output generic-stage control

下表为各自 runtime 内的 cyclic ablation。Bun 变体从记录的 current pattern 构成；CPython feature driver 使用与 upstream current 在此 corpus 通过同一 raw guard 的重构 pattern（其 table baseline 是该 driver 的内部 baseline，而非 literal source text）。除标为 same guard 的项外，其余变体会改变 token segmentation，只能说明 pattern shape 值得继续隔离，不能成为实现建议：

| Runtime / variant                     |    Median | Output relationship                    | 能支持的判断                          |
| ------------------------------------- | --------: | -------------------------------------- | ------------------------------------- |
| Bun current                           | 435.31 ms | baseline                               | 同一脚本基线                          |
| Bun ASCII word class                  | 440.85 ms | same count/chars；该 corpus 同 guard   | Unicode property 不是当前主要成本     |
| Bun remove generic lookahead branch   | 314.74 ms | same count/chars；该 corpus 同 guard   | 减少 27.7%，最强单项定位              |
| Bun remove quoted-string branches     | 209.80 ms | 296,074 → 320,413 matches，digest 变化 | 大 pattern-shape signal，但语义混杂   |
| CPython current                       |  63.74 ms | baseline                               | 同一 Python 脚本基线                  |
| CPython ASCII word class              |  63.15 ms | same guard                             | Unicode class 也非主要成本            |
| CPython remove generic branch         |  62.98 ms | same guard                             | 仅约 1.2%，没有 Bun 式收益            |
| CPython remove quoted-string branches |  67.06 ms | matches/digest 变化                    | 不支持“少一条 string branch 普遍更快” |

generic alternative 是：

```regex
<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>
```

它位于一个同时包含 comments、quoted strings、numbers、words、symbols、whitespace、reader additions 与最终 catch-all `.` 的 mega-alternation 内。该 branch 在这批 source 上独立匹配 **0 次**，而 current/no-generic 的完整 raw digest 仍相同；即使没有产生 token，它仍可能改变 engine 为整个 matcher 生成和执行的控制流。

更强的 diagnostic control 把 generic alternative 从 combined matcher 移出：只有当前位置为 `<` 时才执行 generic regex，其余位置用移除 generic 的 sticky main regex。两种形态在两侧都保持同一 296,074-token digest：

| Runtime（12 个 alternating pairs） |  Combined | Staged at `<` | staged ÷ combined |
| ---------------------------------- | --------: | ------------: | ----------------: |
| Bun 1.3.14                         | 451.10 ms |     328.97 ms |         **0.729** |
| CPython 3.12.13                    |  47.05 ms |      67.48 ms |         **1.434** |

这把当前最强的具体解释收窄为：**generic positive-lookahead 作为 mega-alternation 内分支时，对 Bun/JSC 的 matcher 形态造成显著成本；同样的 source-level 拆分在 CPython 与额外 Python loop/anchored match 一同出现时反而慢 43.4%。** 它不是“lookahead 一定慢”的普遍规律，也没有证明 stage-at-`<` 是 production 解法。该 control 同时改变 combined-vs-sticky matcher 与 host loop 形态；它只在当前真实 corpus 保持 raw output，尚未覆盖宏、完整 TypeScript token stream、27 readers、processors、extensions、取消或 Product delivery。

两个保持 254-file shape 和 1,126,244 UTF-16 code units、但不再是 TypeScript source 的 synthetic controls 进一步限制了可声称的机制：

| Synthetic input                              |   Current | No generic | no-generic ÷ current |
| -------------------------------------------- | --------: | ---------: | -------------------: |
| 不含 `<`                                     |  89.65 ms |   84.62 ms |                0.944 |
| 大量 `<`，但没有 `?`/`>`，lookahead 必然失败 | 101.92 ms |   90.00 ms |                0.883 |

不含 `<` 时仍有小差异，说明 whole-pattern/code-shape 可能有成本；大量失败 `<` 时差距扩大，说明 failed nested-lookahead work 是候选组成部分。但两者都达不到真实 staged control 的 0.729 ratio，且 synthetic token distribution 与真实 source 不同，所以仍不能选定 JSC 内部机制。

尝试以 `JSC_dumpRegExpDisassembly` / `JSC_traceRegExpJITExecution` 获取当前、no-generic 和 staged pattern 的 JIT/bytecode 证据时，Bun 1.3.14 没有产生可审计的 engine diagnostic output；`JSC_useRegExpJIT=true/false` 的跨进程 timing 又与执行顺序漂移重叠，且无法确认开关是否生效。因此本轮**不能确认 current/no-generic/staged 各自实际走 JIT 或 bytecode，也不能比较生成代码大小**。

## 调查结果与边界

### 已确认结论

1. **不是 Python native、TypeScript interpreted。** CPython `_sre` 与 JavaScriptCore/Yarr 都在 native runtime 中执行 regexp；JSC 甚至会尝试 RegExp JIT。这里是两个 engine 对特定 pattern/workload 的实现表现差异。
2. **当前 reader dispatch 已排除。** 254-file current fast path 的 `matchFilename=0`，current façade 与 pre-resolved direct core 也没有 material delta。历史 ordered resolver 曾经昂贵，但已经不能解释当前 2.35× gap。
3. **raw scanner 差距比 full analyzer 更大。** 在相同 raw text/UTF-16-offset guard 和对称消费边界下，Bun/JSC raw scan 约为 CPython 的 8–10×。
4. **per-file construction、`matchAll` wrapper 和 Unicode property 不是主因。** new/reuse、`matchAll`/`exec` 和 ASCII-class controls 都没有接近所需数量级的改善；default token factory 也没有 material signal。
5. **当前最强的具体原因是 generic lookahead 与 mega-alternation 的 JSC-sensitive 组合。** Bun 的 same-output remove-branch ablation 改善 27.7%，same-output staged control 改善 27.1%；Python 对 remove-branch 几乎不敏感，staged control 反而慢 43.4%。这说明主要差异不是 Python 少做 token 工作，而是 pattern structure 与 engine execution strategy 的交互。
6. **quoted-string branches 是次级候选，不是已确认原因。** Bun 删除它们有很大 signal，但 raw segmentation/digest 改变；Python 同一变体反而略慢。没有 same-output rewrite 之前，不能归因为 quoted-string matching 或据此改实现。

### 为什么 raw 约 8–10×，full analyzer 只有约 2.35×

两者不矛盾，因为比例的分母和计时边界不同：

- raw control 只扫描 match，并刻意不做 token object、macro/template split、reader state machine、processors、function metrics 和 canonical projection；它放大 regexp engine 本身的相对差异。
- full analyzer 加回双方各自的 generator、state transitions、Python/TypeScript object work、processors 和 metric mapping。这些非 regex 工作不会按 raw scanner 的同一比例缩放；CPython 的 Python-level pipeline 也可能相对增加更多成本，从而把整体比率压回 2.35×。
- `434.34 - 56.29` 不能当作 analyzer 中“可回收的 378 ms”，也不能把 raw median 分别从 715.11/304.21 精确相减。raw 与 full 来自不同 driver、采样数、warm/JIT/GC 状态和调用边界；现有 sampling percentage 也只给热点排序。要取得可加总的 stage budget，必须在同一 runner、同一 operation 以互斥阶段或 matched counterfactual 重测。

因此，full ratio 较小不否定 regexp hotspot；它只说明完整 analyzer 还包含大量两侧成本结构不同的工作。

### 尚不能确认的引擎内部原因

当前证据尚不能区分下列 JSC/Yarr 内部机制：

- lookahead 是否使某些 alternative 退出更优的 JIT/codegen path；
- mega-alternation 是否扩大每个 match 起点的状态、回溯、寄存器或 capture bookkeeping；
- `gmsu`、8-bit/16-bit string path 与 Unicode mode 的组合是否触发 slow path；
- quoted branches、lazy quantifiers、final catch-all 与 generic branch 的哪种交互占主导；
- JIT code size、instruction-cache、GC/liveness 或 engine version 是否放大差距。

JSC source 只确认 RegExp JIT/bytecode、cache 与 8-bit/16-bit input 等实现路径存在；上列更具体机制仍是待区分假设。现有 profile/benchmark没有可审计的 regexp disassembly、engine counters 或真实 source 上的正交单特征 matrix，不能选定其中一项。尤其不能因为 JS offset 是 UTF-16 就归因于 UTF-16：JSC 依据实际 string representation 区分 8-bit/16-bit input；本轮 ASCII word-class ablation也没有收益。

### 对下一轮优化调查的意义（不构成实施授权）

1. **优先调查 built-in staged-generic control。** 它已有 same-output real-corpus 27% raw signal，不增加 runtime dependency、WASM asset 或资源生命周期，故在当前证据下应先于或至少不低于 Oniguruma。下一轮必须重新从 current source 形成 scanner，验证完整 token value/UTF-16 offsets、macro/template、27 readers、extension protocol、cancellation、full analyzer 与 Product cold/warm；不得直接复制本轮临时脚本进 core。
2. **Oniguruma 仍是并列 backend candidate。** 前序 survey 的 raw spike 更大，但它有 WASM init、asset、manual disposal、Worker termination 和 all-reader semantics 成本。应作为同一调查中的 candidate，而不是因 isolated 2.89×直接采用。
3. **若 staged/Oniguruma 后仍有 material gap，再隔离 quoted-string branches。** 必须先设计 same-output rewrite/control；不能以改变 token segmentation 的 ablation 为实现依据。
4. **不要优先做 RegExp object cache、改 `matchAll` 为 `exec`、ASCII-only 或 Product Worker pool。** 当前证据没有显示它们能解释主要 gap；Worker 优化也不能消除 Worker 内部 scanner cost。

本报告不选择 backend、不授权 translated core deviation，也不创建公开/runtime-configurable scanner abstraction。任何候选都必须由独立 Change/Decision 承接，并在稳定收益之外满足 source identity、完整 token differential、27-reader oracle、processor/extension lifecycle、Bun Worker/取消/资源、no-runtime-download、依赖/license/security 和 required/full Gate。runtime、pattern、reader additions、corpus 或 package artifact 改变后，本轮结论必须复查。

## 随附资源

- [bun-feature-ablation.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-feature-ablation.ts)
- [bun-feature-output-guards.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-feature-output-guards.ts)
- [bun-generic-stage-control.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-generic-stage-control.ts)
- [bun-raw-reuse.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-raw-reuse.ts)
- [bun-symmetric-raw.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-symmetric-raw.ts)
- [bun-synthetic-controls.ts](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/bun-synthetic-controls.ts)
- [evidence.json](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/evidence.json)
- [provenance.json](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/provenance.json)
- [python-feature-ablation.py](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/python-feature-ablation.py)
- [python-generic-stage-control.py](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/python-generic-stage-control.py)
- [python-raw.py](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/python-raw.py)
- [python-symmetric-raw.py](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/python-symmetric-raw.py)
- [typescript-token-pattern.json](./_resources/explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json)
