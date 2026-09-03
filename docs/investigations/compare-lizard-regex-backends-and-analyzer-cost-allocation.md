---
title: "Lizard regex 后端与 analyzer 成本分配对比"
formedAt: "2026-09-03T11:26:10+00:00"
question: "在真实 TypeScript Lizard workload 上，正则/token generation 对 Python 与 TypeScript 性能差距可作何种有边界的比例判断；WASM、npm/native 和 CLI regex 后端分别有什么实际接入成本与继续调查价值？"
tags:
  - "backend"
  - "function-metrics"
  - "lizard"
  - "performance"
  - "regex"
  - "source-alignment"
  - "typescript"
  - "wasm"
relations:
  - type: "补充"
    target: "explain-cpython-jsc-lizard-regex-performance-gap.md"
---

## 形成时背景

直接前序已确认：在相同 254 个真实仓库 `.ts` source（1,138,778 UTF-8 bytes）和相同 2,222 条 canonical metrics 的 warmed analyzer-only scope 中，upstream Lizard 1.24 / CPython 3.12.13 median 为 304.21 ms，当前 TypeScript port / Bun 1.3.14 为 715.11 ms；Bun/JSC 的 source-aligned combined tokenizer regexp 是最大 sampling hotspot。它也已将 raw scanner 差距定位到约 8–10×，并给出 generic-lookahead/mega-alternation 的 Bun-sensitive signal；它没有给出严格可加总的 pipeline stage allocation，也没有覆盖后续取得的 WASM lifecycle、广泛 npm/native/CLI 筛选和 bounded CLI transport evidence。

本轮将五项新证据合并：同 token-stream guard 的 Python/TypeScript stage measurement、`vscode-oniguruma` 的 integration-cost probe、npm/native/CLI 扩展调查、第二轮现代 npm engine 实测，以及 bounded Node/V8 vs Bun/JSC runtime control。没有修改 Product runtime、translated port、依赖、lockfile、Worker protocol 或公共 API；本报告也**不授权采用**任何 backend。

这是一条对 `explain-cpython-jsc-lizard-regex-performance-gap.md` 的**补充**关系，而非重复指向其已归并的两份祖先：新报告增加分配口径和交付成本/CLI 边界，不否定前序关于 JSC pattern-shape hotspot 的核心结论。

### 当前关闭状态（不属于形成时证据）

- **当前执行结论：**用户已决定到此停止本轮 Lizard 性能实现与后续性能调查；本报告及前序的“下一步”“优先级”和 gate 只保留为形成时认识或将来重新授权时的阅读输入，**不构成当前任务授权**。
- **Node：**Node 24/V8 是已识别的 runtime-support/migration 候选，但当前不启动其 go/no-go、不改变 Product runtime，也不把 analyzer-only control 当作 Product 收益证明。
- **Bun 内建路径：**对当前 Bun 1.3.14/JSC、source-aligned pattern 与 real-TS workload，built-in `RegExp` 的实用优化空间有限；保留它为当前基线，不再实施 API/cache 或 tokenizer execution-shape 优化。该表述不预测未来 Bun/JSC 或不同 workload。
- **WASM/Onig：**不采用 `vscode-oniguruma`。其 direct integration 相对自建 native addon 为中等成本，但完成 all-reader parity、Worker/resource、artifact 与 consumer delivery gate 的总 adoption 成本在当前优先级下过高；不安装依赖、不增加 runtime switch/fallback。
- **重新开启条件：**只有用户重新授权性能工作时，才从本报告的 measurement layer、停止条件和形成时建议恢复；届时应先确认 workload、runtime 和 Product target 仍适用。

### 当前 runtime 问题的形成时答案

- **Bun 内建正则是否基本到头？**不能据此宣布所有 Bun/JSC `RegExp` 或未来 Bun 版本已无优化空间；built-in staged-generic 仍是需完整 parity 复查的 execution-shape control。但对**当前** real-TS、Bun 1.3.14/JSC、source-aligned pattern/workload，exact runtime control 已把主要差距强烈定位到 runtime engine/execution，且 Bun 内 backend 筛选中没有比 `vscode-oniguruma` 更值得继续的外部候选。因此不应先投入另一种 Bun `RegExp` API/cache 小改；只有 Bun 仍被选择或必须支持时，才按 Onig gate 继续。
- **改 Node 会更好吗？**在同一 TS port、request、driver 和 exact output guards 的 warmed **analyzer-only** control 中，Node 24/V8 complete analyzer + Product-field projection median 为 **128.79 ms**，Bun/JSC 为 **636.85 ms**（Bun 约 **5.02×**）；raw matcher 与 token materialization 也同向。它支持优先开展 Node 24 runtime-support/migration **go/no-go**，不证明 Product 已更快、更不授权切换 runtime。
- **为什么不能在 Bun 内私用 V8？**Bun-hosted `new Worker(...)` 仍使用 Bun/JSC；从 Bun parent 获得 Node/V8 需要 child process/IPC，违反当前 FunctionMetrics 的 child-process/scanner-command I/O 边界。这是 runtime-support/migration 问题，不是 private tokenizer backend option。
- **冷启动与 Product 边界：**上述 `operationMs` 排除 process start、TS stripping/import、preflight/warm/guard；独立 fresh import-only wall 反而是 Node **99.20 ms**、Bun **26.34 ms**。完整 Product API、Worker lifecycle、package/consumer、cold/warm representative workload 尚未验证，故不能以 analyzer-only speedup 预测端到端收益。
- **形成时行动优先级（不是当前状态）：**先做 Node 24 runtime-support/migration go/no-go；仅当 Bun 仍被选择或必须支持时，再做 private Oniguruma full-parity/full-analyzer spike。两条路径都不是采用、依赖或 Product runtime 变更授权；当前关闭状态以上文为准。

### 入口结论：三个问题的形成时答案

| 用户问题                        | 本轮可恢复的答案                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 证据强度与非授权边界                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WASM 接入难度如何？**         | `vscode-oniguruma@2.0.1` 是**中等**接入成本，而非一行替换：需要随包 WASM artifact、realm-global async init、capture-range/flag adapter、显式 dispose，以及 Worker cancel/RSS、external-consumer artifact 验证。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 有真实 TS raw token text/UTF-16 offset parity 与 raw speed signal；尚无全 reader、full analyzer、Product 或 resource gate 证据，故不采用、不安装、不增加 runtime switch/fallback。                                                                                                                                                                                                     |
| **正则是否是主卡点、占多少？**  | 在这个 real-TS analyzer-only workload 中，token path 是**最强的主要候选**：TS isolated token/full median scale 约 **71.4%**，Python 为约 **32.8%**；token-generation gap **410.68 ms** 与 formal full gap **410.90 ms**量级近乎相同。regex-only 的直接热点证据是 combined native `RegExp` **68.0% self samples**。                                                                                                                                                                                                                                                                                                                                                                                                    | 71.4%/32.8% 与“gap≈full gap”来自不同 driver、样本和嵌套 pipeline 的比例观察；68% 是 sampling self。它们支持优先级，**不**证明 regex 精确占比、100% 因果归属或可回收毫秒。                                                                                                                                                                                                              |
| **npm/native/CLI 还有候选吗？** | 有真正的现代 npm PCRE2-WASM engine，但兼容不等于高效或可交付：`pcre2-wasm@10.47.5` 通过 exact stream guard，却在**同 raw corpus/guard/字段消费协议**的 warm `matchAll` 为 2,842.38 ms、native 为 666.94 ms（**4.26×慢**）。`onigasm@2.2.5` 也通过 exact guard；其 own raw driver 为 465.82 ms、生命周期较弱，因而不是第二 engine candidate（不把该数与 VS Code Oniguruma driver 直接比较）。其它 PCRE2 wrapper 分别 import 或 mandatory property 失败，RE2 variants 因 `(?=`拒绝。**在 Bun 内 regex-backend 筛选中**唯一仍值得继续的候选是 Oniguruma WASM；native/Node-API 是远期交付项目，CLI 不应产品化或继续 benchmark full pipeline。独立于 backend，Node 24 runtime-support/migration 是应先做 go/no-go 的路径。 | PCRE2 只可与同协议 native control 比较，且仅属于 raw scanner；不得与 Onig 的其他 raw driver、token/full driver 相减。CLI 的 **38.70 ms**只是预写文件后的 child+scan+JSON parse；纳入 materialize、scan、decode/parse、UTF-8-byte→UTF-16 mapping、digest 与 cleanup 后为 **306.24 ms**，其中 16.05 MB stdout 和 **291.80 ms** scan+decode/parse+mapping+digest 吞没 raw-engine signal。 |

### 数字阅读顺序与不可相减边界

1. 先读“可声称的性能分配观察”：它拥有 formal full-analyzer、raw-token 与 sampling 数字的 measurement layer 和强度。
2. 再读“bounded Node/V8 vs Bun/JSC runtime control”：它拥有 warmed analyzer-only 的同-port runtime 对照、冷 import 反向和 Bun/V8 boundary；它不拥有 Product runtime 采用结论。
3. 再读“WASM 接入成本与 Oniguruma evidence”“第二轮现代 npm engine 实测”与“npm/native/CLI 矩阵”：它们拥有候选的 parity、生命周期和 delivery 判断；PCRE2 只与同协议 native control 可比，raw scanner 时间也不等于 full analyzer 或 Product 时间。
4. 最后读“建议、停止条件与未知”：这是**形成时**的调查顺序——先做 **Node 24 runtime-support/migration** go/no-go，再在 Bun 仍被选择或必须支持时评估 private `vscode-oniguruma` tokenizer spike；当前是否行动只由上文“当前关闭状态”决定。

不得把 raw-token、formal full-analyzer、sampling、WASM raw 或 CLI bounded-control 的 median/ratio 横向相减、相加或换算为 Product 加速；它们的 driver、sample count、warm/JIT/GC、I/O/transport 与包含工作不同。

## 调查目的

1. 在相同 corpus 和 output guards 下，说明 regex/token generation 在 Python/TS full analyzer 差距中可观察到的比例，明确何处只能给 ratio observation、不能相减归因。
2. 将 Oniguruma WASM 的 raw signal 与实际初始化、资源、Worker、package artifact 成本放在同一判断中。
3. 扩展 npm/WASM/native/CLI 候选矩阵，区分 feature incompatibility、未验证和 delivery cost，避免把“更快 regex engine”误作可交付 tokenizer。
4. 区分 runtime-support/migration 与 Bun 内 regex backend 两条调查路径及其停止条件，而不形成实现、依赖或 runtime 变更授权。

## 调查范围与依据

### 共同 workload、版本和 output guards

- 输入是前序保存的 request：254 个真实 `.ts` source、1,138,778 UTF-8 bytes。完整 analyzer guard 为 2,222 条 canonical metrics，digest `29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6`。
- raw TypeScriptReader guard 在两侧相同：295,156 tokens、token text/position accumulation digest `a3a71bd5022b4d6b9f15d2bd24b4947ff9e3c61d7395794be82042b3635fff98`。现有 matcher-level guard 则是 296,074 matches、matched text/UTF-16 start digest `47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e`。
- 正式 Python/TS measurement runtime 为 Bun 1.3.14、CPython 3.12.13、upstream Lizard 1.24.0 commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`；主 Node control 为项目 engines `>=24 <25` 内的 Node 24.18.0 / V8 13.6.233.17-node.50（由 CPython 3.14.7 controller 经 `mise exec -- python3 ...` 启动，child identity 已记录）；host 为 Linux WSL2 / AMD Ryzen AI 7 H 450。`provenance.json` 分别记录 measurement runtimes 与 synthesis host，并保存完整 inputs、resource hashes 和 temporary-source hashes。它是 runtime diagnostic 与后续 go/no-go 输入，**不是** Product runtime 采用建议。

### Python/TypeScript 分层协议与可相加边界

正式 full-analyzer result 使用已有 15-block ABBA/BAAB（每侧 30 samples、fresh target 内一次不计入 warmup），正常 reader resolution、分析与 Product-field projection 均在计时内；其完整 rows/CI 仍由前序 performance report 的 `evidence.json` 拥有。

本轮 raw-token control 使用 8 个跨 runtime ABBA/BAAB block（每侧 16 samples）。每个 fresh child 先进行一次不计入的 raw token materialization，之后计时第二次 `TypeScriptReader.generate_tokens/generateTokens` 与 token-array materialization；token digest 在计时后检查。因此它不含 reader state、processors、metric projection 和 child startup/import，也不是 long-lived Worker session。

同 runtime 的 15-block normal/direct and standalone projection measurements只用于层级排除：lazy pipeline 是 `generateTokens → processors → reader state` 的嵌套 generator；外层 `.next()` 包含内层推进。对每 token 加计时会显著扰动约 295k-token workload。因此这些 stage medians **不是互斥 bucket**，不能相加，也不能把 raw/full 的不同 driver median 相减为 processor/state 或 regex 的精确 ms。

### 一手资料与能力/交付边界

- [`vscode-oniguruma`](https://github.com/microsoft/vscode-oniguruma) 公开其 MIT WASM binding/API 和 positioning；[Bun Workers](https://bun.sh/docs/runtime/workers) 与 [Bun Node-API](https://bun.sh/docs/runtime/node-api) 定义本项目需实际验证的 Worker/native boundary，而非承诺具体 addon 生命周期。
- [Google RE2](https://github.com/google/re2)、[Rust `regex`](https://docs.rs/regex/latest/regex/) 与 [Hyperscan pattern support](https://intel.github.io/hyperscan/dev-reference/compilation.html) 均一手说明以限制 lookaround/backreferences/capture 取得其线性或多模式性质；[PCRE2](https://github.com/PCRE2Project/pcre2) 与其 [API](https://pcre2project.github.io/pcre2/doc/pcre2api/) 说明 rich syntax、code-unit API 和 optional/build-dependent JIT。新 probe 的现代 [pcre2-wasm wrapper](https://github.com/gudoshnikovn/pcre2-wasm) 是实际 package/API source；本机结果仍以随附 evidence 为准。
- [ripgrep README](https://github.com/BurntSushi/ripgrep) 说明 PCRE2 是 opt-in build feature；其 [FAQ](https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md) 说明 multiline/PCRE2 的速度与内存边界。这些来源只支撑能力和交付约束；本机 timing 以随附 evidence 为准。

## 调查结果与边界

### 可声称的性能分配观察

| 观察                                         |                                                                             数值 | 可支持的结论                                                                                                      | 不可支持的结论                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| formal complete analyzer median              | Python 304.21 ms；TS 715.11 ms；paired Python/TS 0.4264，95% CI [0.3978, 0.4388] | 当前 real-TS analyzer-only scope 下 TS 约 2.35× Python                                                            | Product、consumer 或 cold Worker 性能                                     |
| raw TypeScriptReader token generation median | Python 99.84 ms；TS 510.52 ms；paired Python/TS 0.1943（8 blocks 0.1889–0.1987） | 相同 token stream 的 isolated token generation 在 TS 约 5.15× Python，故是最强的当前 gap candidate                | regex engine 单独就是 5.15×；该数字还含 wrapper/template/array allocation |
| TS token/full median scale                   |                                                   510.52 / 715.11 = **约 71.4%** | 在两个有相同 corpus/output 但不同 driver 的 median scale 上，TS token generation 与完整 analyzer 同量级且占大部分 | “TS regex 精确占 full 的 71.4%”或可回收 71.4%                             |
| Python token/full median scale               |                                                    99.84 / 304.21 = **约 32.8%** | Python full pipeline 中相同 isolated token stage 的相对量级较小                                                   | 两侧 processor/state 的精确差值                                           |
| 两侧 token-generation gap 与 formal full gap |                  510.52 − 99.84 = **410.68 ms**；715.11 − 304.21 = **410.90 ms** | 两个差值量级近乎相同，进一步加强“token path 是主要候选”的优先级                                                   | “100% full gap 已由 regex 证明”或可直接相减的因果 allocation              |

这三条比例观察的共同限制是：raw control 与 formal full analyzer 的 driver、sample count、child/JIT/GC 状态和包含工作不同。它们是**比例/量级 evidence**，不是完整 analyzer 的严格 mutually-exclusive profile。regex-only 的最佳直接证据仍是前序 Bun sampling 中 combined native `RegExp` **68.0% self samples**，以及同 raw matcher 的 symmetric 8–10× control；sampling self 仍是热点排序，不是可回收 wall percent。

相反，当前 reader selection 不是主要解释：本 workload 的 current TS façade 已计数为 `matchFilename = 0`，pre-resolved direct/normal paired median 为 Python 0.9970、TS 0.9979；standalone projection 只有 Python 7.96 ms、TS 4.30 ms。它们排除的是当前 `.ts` fast path 中的 material alternative，不会建立严格完整 bucket。

### bounded Node/V8 vs Bun/JSC runtime control

项目环境的 Node **24.18.0** / V8 **13.6.233.17-node.50**（`mise exec --`）可直接执行现有 `.ts` analyzer 与 `performance-harness.test-support.ts`，无需 tsx/ts-node/custom loader，并落在项目 `>=24 <25` engine range 内；关闭 `--experimental-strip-types` 时 `.ts` admission 以 `ERR_UNKNOWN_FILE_EXTENSION` 失败，故 direct execution 依赖 Node 24 的默认 type stripping。本 control 用相同 TS driver/source graph、同一 request 和三种 exact output guard；每个 fresh child 在计时前进行 exact preflight 和一次同进程 warmup，计时后验证 output。每 mode 8 个 Node/Bun ABBA/BAAB block、每侧 16 samples；`operationMs` 不含 process start、TS stripping/import、preflight/warm/guard。

matcher 的计时体**只**读取 `text.length + match.index`，完全不含 SHA digest；精确 `(matched text, UTF-16 start)` SHA-256 guard 在计时**前** preflight，并在每次 warm/timed operation 后于计时**外**重跑。token/full mode 的 digest guard 同样在计时外。因此 `operationMs` 可比较 engine execution，但不能伪装成含 guard 的 end-to-end child latency。

| 同一 TS port 的 operation                          | Node 24/V8 median（p10–p90） | Bun/JSC median（p10–p90） | paired Node/Bun median | guard                                                                          |
| -------------------------------------------------- | ---------------------------: | ------------------------: | ---------------------: | ------------------------------------------------------------------------------ |
| raw native `RegExp` fields (`text.length + index`) |       12.58 ms (12.35–13.37) | 439.38 ms (431.48–445.13) |  0.0285（Bun约 35.1×） | 296,074 raw text + UTF-16 starts exact SHA pre/post；每 sample count/field-sum |
| raw TypeScriptReader token materialization         |       69.27 ms (66.10–74.04) | 489.32 ms (476.55–504.23) |  0.1419（Bun约 7.05×） | 295,156 token text/position digest                                             |
| complete analyzer + Product-field projection       |    128.79 ms (123.67–133.47) | 636.85 ms (625.63–664.68) |  0.1994（Bun约 5.02×） | 2,222 canonical metrics digest                                                 |

这在此 workload 上把当前差距强烈定位到 **runtime engine/execution**，而非 TypeScript translation 有无运行或 reader semantic drift；它仍不能拆分为 V8 regexp JIT、JS object/generator execution、GC 或其他 runtime internals 的精确因果份额，也不代表其它 V8、Bun upgrade 或 Product latency。

这也是两个独立 runtime 的 control，**不是**让现有 Bun-hosted `new Worker(...)` 私下使用 V8 的实现路径：Bun Worker 仍运行 Bun/JSC。若要从 Bun parent 获得 Node/V8，就需要 child process 与 IPC；这违反 FunctionMetrics 当前“不执行 child process/scanner command”的 I/O 边界，故不属于 private analyzer backend option。

为了不把 loader/startup 混进 operation，上述 TS analyzer modules 的 import-only fresh-process ABBA 独立测量：Node 24 observed wall median **99.20 ms**，Bun **26.34 ms**，paired Node/Bun **3.81**。该外层时间只围住 runtime start、相同 module graph load/evaluate、JSON ready output 与 exit，**不是** in-process operation 或 Product startup。它方向上反而是 Bun 较快，因而不能解释 operation 内 Bun 较慢；也不能把 full-child observed wall（它还包含 preflight/warm/guards）称为纯 loader 成本。

### WASM 接入成本与 Oniguruma evidence

`vscode-oniguruma@2.0.1` 是本轮 **Bun 内 regex backend** 筛选中唯一有真实 TS raw-token text/UTF-16 offset parity 和 speed signal 的外部 backend，但接入不是一行 `matchAll` 替换：

| 项目             | 已测事实 / 所需工作                                                                                                                                                                   | 结论边界                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| artifact/init    | package 约 507 KB，`onig.wasm` 473,151 bytes；`loadWASM` 异步且为 realm-global single init                                                                                            | one-shot Worker 每次承担 init；必须随 artifact 分发、不得 runtime download                                                |
| matching adapter | scanner 返回 capture range而非 token text；binding 已将内部 UTF-8 range 转为 `captureIndices` 的 JS UTF-16 offset，adapter 必须 source slice、用 full capture range，并显式映射 flags | 需覆盖 astral、malformed source、26 shared readers、PHP outer/inner named semantics；Erlang local lexer不应被强行迁移     |
| resources/cancel | `OnigScanner` 与 `OnigString` 必须 `dispose()`；正常处理要 `finally`，terminate 只能依赖 realm teardown                                                                               | 10 次 Worker load/terminate 后 parent RSS 41.32→71.72 MiB 是未解释 risk signal，不是已证明 leak，也尚未满足 resource gate |
| raw timing       | 同字段 254-file warm raw：native 557.84 ms，Onig 98.91 ms；fresh cold total 187.40 ms                                                                                                 | 都是 raw scanner，非 full analyzer/Product；cold cost会削弱 one-shot Worker 收益                                          |

WASM 比自建 Node-API addon 避免每 OS/arch prebuild、native binary 供应链和 CLI subprocess protocol，因此是**中等而非极高**接入成本；但它仍触及 private tokenizer、Worker async initialization、package asset/legal inventory、resource/cancellation tests与 external-consumer artifact acceptance。不能把它描述成零成本“后端优化”。

### 第二轮现代 npm engine 实测

第二轮补齐了“此前只遇到旧 PCRE2 wrapper”的信息缺口。`pcre2-wasm@10.47.5` 是真实、现代的 PCRE2-WASM npm wrapper：它以 embedded binary 完成 import/init/compile，并在 254 文件上通过 296,074 条 `(text, UTF-16 start)` exact guard。required bridge 的 warm `matchAll` median 却为 **2,842.38 ms**；same-harness native control 的 `matchAll` median 为 **666.94 ms**，即 PCRE2 wrapper 在该可比协议下 **4.26×更慢**；lazy iterator 为 7,757.13 ms。测量只覆盖 raw scan/match transport，不能与 Onig、token or full-analyzer drivers 横向相减，但足以按性能排除此 wrapper。

第二个 @of wrapper 的实测 import 错误是 `ReferenceError: document is not defined at dist/libpcre2.js:57`；universal fork 虽完成 WASM init，但 mandatory `\p{White_Space}` 报 `unknown property name after \P or \p`。`onigasm@2.2.5` 通过同 exact guard、warm raw 为 465.82 ms，却弱于 VS Code Oniguruma 已有 signal，且没有 public deterministic scanner/string disposal（module-global LRU）；现代 `@adguard/re2-wasm@1.2.1` 和 pure-JS `re2js@2.8.6` 仍因 mandatory `(?=`拒绝。结论不是“没有 npm regex library”，而是：**有真正 engine，但 capability/parity 不等于 required tokenizer path 高效或可交付。**

### npm/native/CLI 矩阵

| 候选                              | contract / evidence                                                                                                                                                                | delivery judgment                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`vscode-oniguruma@2.0.1` WASM** | current TS raw parity与 speed signal；26 shared patterns和 PHP outer 曾 compile                                                                                                    | **形成时 Bun 内 backend 路径的唯一继续候选**：先 all-reader token parity、full analyzer/Product ABBA、Worker RSS/cancel、exact artifact；不采用、不加 runtime switch/fallback |
| Shiki Oniguruma / `onigasm@2.2.5` | 前者只通过 local Bun smoke；后者通过 exact raw `(text, UTF-16 start)` guard，warm raw 465.82 ms，但 release旧且无 public deterministic scanner/string dispose（module-global LRU） | 不如已有 `vscode-oniguruma` speed signal且 lifecycle较弱；不是第二 engine candidate                                                                                           |
| **`pcre2-wasm@10.47.5`**          | 现代 embedded-binary PCRE2 WASM；通过 296,074 exact raw text/UTF-16 guard，wrapper index 已是 JS UTF-16 character index                                                            | **性能排除**：same-harness native `matchAll` 2,842.38 ms vs native 666.94 ms（4.26×慢）；iterator 7,757.13 ms。不能与其他 harness 或 full analyzer相减                        |
| other PCRE2 WASM wrappers         | `@ofjansen/pcre2-wasm@1.4.0` 在 Bun import 直接 `document is not defined`；universal fork init后因 mandatory `\p{White_Space}` compile fail                                        | 这些是 exact wrapper/delivery/grammar exclusion，不是对 PCRE2 engine 的普遍速度结论                                                                                           |
| RE2 / Rust regex / Hyperscan      | 新 `@adguard/re2-wasm@1.2.1` 与 pure-JS `re2js@2.8.6`仍因 mandatory `(?=`拒绝；当前 26 shared patterns还需要 lookahead，PHP另有 named backreference/capture                        | direct replacement 不兼容；重写 pattern 是 tokenizer redesign，不作 backend optimization                                                                                      |
| PCRE2 native / Node-API           | 可表达 feature且可选择 16-bit code units/JIT                                                                                                                                       | 没有 Bun-proven full-corpus binding；需要 prebuild、ownership、Worker, SBOM/CVE/license与平台策略，是远期 native-backend project                                              |
| `rg --pcre2` / other CLI          | 预写 files 的 child+scan+JSON parse 38.70 ms；包含 materialize、scan、decode/parse、UTF-8-byte→UTF-16 mapping、digest 与 cleanup 的 bounded control 为 **306.24 ms**               | 不是 Product CLI，PATH/build/JIT不受控；16.05 MB stdout以及 scan+decode/parse+mapping+digest 的 291.80 ms 计时吞没 raw engine signal；不产品化、不再 benchmark full pipeline  |
| Moo/Chevrotain/parser             | built-in JS RegExp 或不同 token/AST contract                                                                                                                                       | 没有 exact stream 的替代引擎或已证收益，排除                                                                                                                                  |

### 建议、停止条件与未知

**形成时第一优先级、独立的 Investigation 是 Node 24 runtime-support/migration go/no-go，而不是采用授权。**在项目 engines `>=24 <25` 内，Node 24 的同-port control 仍显示 matcher、token、full operation 的 material speedup；这条路径不要求重写 translated core，却不能凭 benchmark 直接改变 Product runtime。它必须验证：正式 Product API 与 error contract、Worker creation/cancel/termination、package/packed artifact、external Node consumer、现有 Bun support/consumer compatibility、Project Gate 与 cold/warm representative workload。任一支持、语义、交付或端到端收益 gate 不闭合即停止；本报告不授权更改官方 runtime、依赖或 package contract。当前不启动此 Investigation，以上“当前关闭状态”为准。

**形成时仅在 Bun 仍被选择或必须支持的前提下，Bun 内 regex-backend 路径唯一值得继续的是 `vscode-oniguruma`。**第二轮实测确认“有真正 npm engine”不代表它在 required stream 上快或易交付；`pcre2-wasm@10.47.5` 已因 same-harness 4.26× 的 raw slowdown 排除。Onig spike 仍先闭合：每 token text/UTF-16 offset/progress、26 shared readers + PHP、现有 27-reader oracle、macro/template/processor/extensions、Worker cancellation/error/RSS、no-download packed artifact/external Bun consumer；之后才在同 runner 比较 raw、full analyzer与 Product cold/warm。任一语义、resource、delivery或稳定收益门槛失败即停止，保留 built-in baseline。它不是依赖、runtime switch/fallback 或 WASM adoption 授权；当前不启动该 spike。

built-in staged-generic仍是无依赖 same-output control，但它会改 translated tokenizer execution shape；quoted-string staging因语义难度已明确不在当前路径。不得以 RE2/Rust/Hyperscan 的 feature限制反向驱动 regex rewrite，也不得以 CLI、Worker pooling或 Product adapter 重构绕过 tokenizer gate。

仍未知的是：Onig 在全 reader 实际 token stream 的兼容性、full analyzer/Product净收益和 one-shot Worker memory plateau；JSC 内部究竟是 lookahead、mega-alternation code shape、bytecode/JIT path还是 allocation interaction主导；以及 token path 改善后 processors/state 是否成为下一个 material cost。若 corpus、Bun/JSC、reader addition、package artifact或 Worker model变化，以上形成时结论需重新调查。

## 随附资源

- [evidence.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/evidence.json)
- [node-bun-engine-abba.py](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/node-bun-engine-abba.py)
- [node-bun-engine-driver.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/node-bun-engine-driver.ts)
- [node-bun-engine-summary.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/node-bun-engine-summary.json)
- [node-bun-import-abba.py](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/node-bun-import-abba.py)
- [node-bun-import-smoke.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/node-bun-import-smoke.ts)
- [npm-regex-second-pass-native-probe.mjs](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/npm-regex-second-pass-native-probe.mjs)
- [npm-regex-second-pass-onigasm-probe.mjs](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/npm-regex-second-pass-onigasm-probe.mjs)
- [npm-regex-second-pass-probe.mjs](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/npm-regex-second-pass-probe.mjs)
- [npm-regex-second-pass-re2-probe.mjs](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/npm-regex-second-pass-re2-probe.mjs)
- [npm-regex-second-pass-summary.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/npm-regex-second-pass-summary.json)
- [oniguruma-cold-raw-summary.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/oniguruma-cold-raw-summary.json)
- [oniguruma-cold-raw.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/oniguruma-cold-raw.ts)
- [oniguruma-integration-cost.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/oniguruma-integration-cost.json)
- [oniguruma-integration-probe.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/oniguruma-integration-probe.ts)
- [provenance.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/provenance.json)
- [python-stage-breakdown.py](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/python-stage-breakdown.py)
- [raw-token-abba.py](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/raw-token-abba.py)
- [raw-token-bun.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/raw-token-bun.ts)
- [raw-token-python.py](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/raw-token-python.py)
- [rg-cli-bounded-control.json](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/rg-cli-bounded-control.json)
- [rg-cli-bounded-control.mjs](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/rg-cli-bounded-control.mjs)
- [typescript-stage-breakdown.ts](./_resources/compare-lizard-regex-backends-and-analyzer-cost-allocation/typescript-stage-breakdown.ts)
