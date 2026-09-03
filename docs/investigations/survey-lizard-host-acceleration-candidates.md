---
title: "Lizard analyzer 宿主加速候选调查"
formedAt: "2026-09-03T09:38:29+00:00"
question: "在 source alignment 约束可观察 Lizard analyzer 语义、而非 JavaScript 原语的前提下，哪些 regex/lexer 与其它宿主实现候选值得继续验证；它们在 27-reader 覆盖、Bun Worker、打包和性能证据上分别处于什么状态？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "regex"
  - "source-alignment"
  - "typescript"
relations:
  - type: "补充"
    target: "diagnose-lizard-real-typescript-analyzer-hot-path.md"
---

## 形成时背景

### 形成时使用方式与结论

**本文是候选调查，不是采用或安装授权。**它回答“下一轮应验证什么”，不改变当前已对齐的 built-in `RegExp` port，也不授权修改 Product runtime、公开 API、Worker protocol、依赖或锁文件。

- **已确认的瓶颈范围：**在 254 个真实仓库 `.ts` 文件的 _analyzer-only_ workload 中，当前 reader path matching 不是主要根因；source-aligned combined-regex tokenization 是首要热点。这不能外推为 Product 端到端瓶颈，也不代表 sampling 百分比可直接回收。
- **形成时最小下一步：**在独立 Change 中，将 **VS Code Oniguruma WASM** 限于 `CodeReader` 内部 tokenizer 实现的受控 spike；若测试需要 seam，它必须是非导出、仅测试构建可用的临时注入点，最终实现直接替换内部执行而不保留可配置 backend interface。先闭合 token stream 与 27-reader parity，再测 full analyzer 与 Product workload。built-in sticky/multi-pattern scanner 是必须并行比较的无依赖 control。
- **当前不应做：**不因本报告直接采用任何库；不以 parser/AST、Worker pool 或通用 lexer framework 替换 Lizard analyzer；不把 TypeScript-only probe 当作 27-reader 或 Product 结论。

下文中的“已确认、推断与未知”是本调查的证据分层；[对应 Decision](../decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md)拥有未来采用 host primitive 的约束和验收门槛。

直接前序已在 254 个真实仓库 `.ts` source（1,126,244 UTF-16 code units、2,222 条 canonical metrics）上排除当前 reader path matching，并把优先级定位到 `CodeReader.generateTokens` 的 source-aligned combined-regex 扫描：该处的 Bun native `RegExp` frame 占 sampling profile 68.0% self samples，tokenizer-only 约 576–637 ms。它不是可回收比例，也不能证明“内建正则是唯一允许的正则实现”。

新 Decision [允许 Lizard port 使用证据闭合的宿主原语优化](../decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md) 已明确：source alignment 约束 token stream、reader/state/processor 生命周期、错误与取消边界，不要求宿主继续使用内建 `RegExp`、generator 或对象布局；替换仍须证明完整 token stream、27-reader oracle、source identity、Product lifecycle、真实 workload 和分发边界。

本轮只在 `/tmp` 安装候选并运行最小 compile/API/raw-scan probes；没有改 Product runtime、依赖、锁文件、Worker protocol 或 investigation index。形成时 checkout 是 `49b57cbf99747d516c4d95390b5d01ffb2f2b40d`；完整 input SHA-256 由直接前序报告的随附资源保存；本报告核对的实际 source hash 分别为 `CodeReader` `571bd…ae86e`、TypeScriptReader `340ec…bcbe0`、PHPReader `7e771…a1db4`、ErlangReader `5af0c…4a165`、FortranReader `9dd16…1c6b0`、StReader `14a6a…2671`，254-file request `71029…90a4d`。

### 当前阅读导航（不属于形成时证据）

- **本报告的 evidence owner：**27-reader regex/lexer capability inventory、候选 API/compile probes 与真实 TypeScript raw-scan spike；候选版本、原始 rows、feature inventory 和 guards 由本报告资源拥有。
- **直接前序：**frontmatter 的 `补充 → diagnose-lizard-real-typescript-analyzer-hot-path.md`；先从该报告恢复真实 TypeScript analyzer-only hotspot、profile 解释边界和其两份直接前序，而不是把本报告的候选判断当成 root-cause profile。
- **已确认 / 推断 / 未知：**“证据状态”是唯一的强度地图：Oniguruma 的 raw-match/offset parity 与 isolated signal 已确认；它值得 full-token experiment 是推断；all-reader semantics、Product lifecycle、delivery 和稳定 full-pipeline 收益仍未知。
- **不能比较或相减：**Oniguruma/native raw-scan 数字仅覆盖 raw tokens/digest，且两侧缓存/构造形态不同；不得换算为 analyzer 或 Product 加速，也不得与 profile 百分比、27-language 或完整 Product timing 相减。
- **后继的当前结论：**[CPython 与 JavaScriptCore 性能差距解释](explain-cpython-jsc-lizard-regex-performance-gap.md)新增 same-output built-in staged-generic signal；它把 built-in staged-generic 提升为先于或不低于 Oniguruma 的调查候选。该后继拥有其 raw/full measurement layer、已排除项和引擎机制未知项，本报告的形成时 probe 不被回写为该结论的证据。
- **当前状态 owner：**本轮已停止进一步性能实现，不执行本报告或后继中的形成时实验顺序；Node、built-in staged-generic 与 Oniguruma 都不是当前候选。当前关闭状态和重新授权时的阅读入口由[最新综合调查](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)拥有；未来采用门槛仍由[对应 Decision](../decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md)拥有。

## 调查目的

1. 盘点全部 27 个 registered readers 实际 `generateTokens`/shared tokenizer 所需的 regex、Unicode、global iteration 与 offset 语义，避免只以当前 TypeScript pattern 推断全局兼容性。
2. 将 RE2、PCRE2-WASM、PCRE2 Node-API/native delivery、VS Code Oniguruma/Oniguruma WASM 与内建 multi-pattern/sticky scanner 分开判断，而不是把“regex library”当作单一技术。
3. 对非 regex 选择点只保留与现有 profile、27-reader coverage 和 source-aligned 语义距离有关的候选；不把 parser/Worker/JIT 的理论能力说成已测收益。
4. 给出下一轮有明确 parity、资源和 delivery gate 的最小实验顺序。

## 调查范围与依据

### 27-reader regex/lexer inventory

动态 import registry 后，对每个 registered Reader 调用 `generateTokens`；`RegExp` construct instrumentation 记录其动态 final pattern/flags。PHP 以 `<?php ?>` 进入 inner tokenizer。结果：

- 26 个 readers 进入 `CodeReader.generateTokens` 的同一 combined-regex family（358–643 chars）；另一个 **ErlangReader** 为 Pygments-compatible reader-local lexer，以短小 sticky `uy` regex 和手写 scan 推进。
- 26 个 final patterns 均为 `gmsu`，Fortran、ST 由 source 的 `(?i)` normalisation 另加 `i`。`g` 不是可省略装饰：shared tokenizer 用 `sourceCode.matchAll()`，将 `match[0]` 与 JavaScript **UTF-16** `match.index` 交给 `TokenMatch`；token match 必须消费输入。
- shared base 的 generic-type alternative 带 positive lookahead，故 26 个 final patterns 都需要 lookahead；CLike raw string、Python triple string 与 PHP code-block boundary 还有 negative lookahead。shared word/whitespace alternatives 使用 Unicode properties；PHP addition 另有 named capture/named backreference；Erlang 的 reader-local identifier patterns 也用 Unicode properties/sticky offsets。

完整的逐 reader final pattern 长度、flags 和 feature inventory 在 `regex-feature-inventory.json`。它是动态 constructed pattern 的 inventory，不声称列出每一个 reader state 中的静态 regexp literal。

### 候选 package/API probes

所有 package 只安装在 `/tmp/lizard-regex-probe`。版本、license、WASM size、错误和 mapping 细节见 `candidate-probes.json`。官方/上游资料仅用于定义能力与 delivery boundary：

- [Google RE2](https://github.com/google/re2) 明确不支持 look-around/backreferences，且不以所有 pattern 更快为目标；[google/re2-wasm](https://github.com/google/re2-wasm) 也明确说明 lookahead 缺失且部分 capture 行为与 built-in 不同。
- [PCRE2](https://github.com/PCRE2Project/pcre2) 是可嵌入的 C library；其 [API](https://pcre2project.github.io/pcre2/doc/pcre2api/) 有 code-unit offsets 和 optional JIT，但 JIT 是 heavyweight、且依赖 build/hardware。
- [VS Code Oniguruma](https://github.com/microsoft/vscode-oniguruma) 是 Microsoft 的 MIT WASM binding，但 README 明确它为 VS Code 而作、无意成长为 general Oniguruma WASM binding。
- [Bun Node-API](https://bun.sh/docs/runtime/node-api) 说大多数现有 Node-API extension 可直接工作；这不是某一 addon、每个平台 artifact 或 Worker lifecycle 的兼容保证。Bun [Workers](https://bun.sh/docs/runtime/workers) 仍标为 experimental（尤其 termination）。

### Oniguruma TypeScript raw-scan spike

`vscode-oniguruma 2.0.1` 在 Bun 1.3.14 能加载其随包 `onig.wasm`（473,151 bytes）。wrapper 要求明确 `createOnigString().dispose()`/`OnigScanner.dispose()`；安装包公开导出和 `.d.ts` 都只有 `createOnigScanner(patterns)`，尽管内部构造器有配置位也未由该工厂转发。因此 probe 以 pattern prefix 显式映射 JS `s` 为 Oniguruma `(?m)`，并仅在 Fortran/ST 加 `(?i)`。

- 26 个当前源码捕获的 `CodeReader` final patterns 加 PHP outer code-block pattern 都成功编译；这只是 **compile compatibility**，不等于 token parity。
- 对真实 254 个 `.ts` source，将 native `RegExp(pattern, "gmsu")` 的 raw `matchAll` values/UTF-16 starts 与一个重用 Oniguruma scanner 的 `findNextMatchSync` values/converted UTF-16 starts 做逐 token diff。两侧均为 **296,074** raw matches，digest `0c7a6e…7703b`，逐 token 相等。
- 5 个交替 pair 的同一 raw-scan/digest workload median：native **603.32 ms**，Oniguruma **208.84 ms**（约 2.89×）。此数字包含每 file native regexp construct，却让 Oniguruma scanner 跨 file 重用；这正是将来 static pattern cache 在一个 Worker 中可能采取的形态。它不包含 shared macro grouping、TypeScript template splitting、reader state、processors、metric mapping、WASM initialization、Worker round-trip 或 Product finding settlement。
- 三次 fresh Bun process observation 中，WASM `loadWASM` 约 7.7–8.5 ms，100 次 scanner create/dispose 约 26.7–105.8 ms；这是噪声很大的 resource observation，不能外推为 Product cold cost。

原始 rows、guard 和环境见 `oniguruma-real-typescript-raw-scan.json`，26+PHP compile evidence 见 `oniguruma-compile-inventory.json`。

## 调查结果与边界

### A. regex / lexer backend candidates

| Candidate                                 | 当前兼容性/实测                                                                                                                                                                                 | Delivery 与语义风险                                                                                                                                                    | 判断                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **VS Code Oniguruma WASM**                | 26 shared patterns + PHP outer pattern compile；真实 TS raw tokens/UTF-16 offsets pass；raw scan 208.84 vs 603.32 ms                                                                            | pattern flag translation、manual WASM object disposal、WASM asset bundling、one worker/termination behavior；该 binding 不承诺 general regex API                       | **首选下一轮实验**，但仅作为 `CodeReader` 内部 tokenizer 实现；先做完整 token stream 与 27-reader parity，不能直接采用。        |
| **Built-in multi-pattern/sticky scanner** | native JS regex 与现有 pattern 语法/UTF-16 完全兼容；尚无 spike                                                                                                                                 | 需保留 source alternative priority、unanchored search、macro grouping；多次 sticky probe 可能反而更多 host calls                                                       | **无依赖 control**；与 Onig full-parity spike 相邻执行，不能预设有收益。                                                        |
| **RE2 / re2-wasm**                        | 对现有 TypeScript final pattern compile 直接拒绝 `(?=`；shared positive lookahead 影响所有 26 combined readers，PHP 还有 negative lookahead                                                     | 任何「rewrite 掉 lookaround」都要证明匹配优先级、capture 与 all-reader token stream，不再是 direct internal replacement                                                | **不推荐**。不为追求线性时间引入大规模 regex rewrite；当前不是 untrusted user regex service。                                   |
| **PCRE2 WASM**                            | PCRE2 engine feature集理论上覆盖 lookaround/Unicode；所试 `@stephen-riley/pcre2-wasm 1.2.4` 在 Bun 和 Node-compat runtime 都在 init 阶段无法解析 package-local wasm URL，未到 compile/benchmark | async init、per-object manual `.destroy()`、package wrapper failure、WASM memory 和 no-runtime-download asset policy；WASM 不有 native JIT                             | **不推荐作为下一步**。可在 Onig 失败后，用受控自有 adapter/reproducible artifact 单独重开，不把失败 wrapper 当 PCRE2 性能结论。 |
| **PCRE2 Node-API/native**                 | PCRE2 official C API 可表达所需 constructs；未有 Bun/本机/full corpus probe                                                                                                                     | 需自行或审计维护 addon；8/16-bit code-unit 与 JS UTF-16 offsets、N-API ownership/error/cancel、每 OS/arch prebuild、license/SBOM/security、Worker load/unload 都要闭合 | **后备而非首选**。只有 Onig 证明稳定收益却不能满足 packaging，或有支持矩阵授权时才调查；不把 PCRE2 JIT 当作已证收益。           |

### B. 非 regex 选择点（按当前证据分层，不作无证据 catalog）

| 选择点                                              | 与已测热点的关系 / 27-reader语义距离                                                                                                                                                                                                                                                         | 结论                                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 专用 lexer generator / hand-authored lexer          | 可替代 26-reader shared scanning，也可保留 Erlang local lexer；但需要承载每个 reader addition、Unicode、lookaround、priority、UTF-16 offset、macro/tokenFactory 的完整行为。Moo 仍以一个 sticky JS `RegExp` 执行；Chevrotain 也是 ordered JS-RegExp lexer，并引入 token vector/allocation。  | 可作长期 fallback/JS control，但无“换框架即更快”证据，**不在首轮**。精确版本、license/transitives 仍须审计。                                                                       |
| native/WASM byte lexer 或 SIMD text scanner         | 可把扫描循环移至非 JS host，但每次 token 都必须保留 JS UTF-16 offset、Unicode/astral conversion、unanchored alternative priority、all 26 reader additions；这不是 AST/parser 的等价替换。当前 profile 只证明 combined-regex 热点，未证明 byte/SIMD scanner 会超过 Oniguruma 或内建 control。 | 是 tokenizer 的另一种内部实现形态，**不在首轮**；只有 Oniguruma/sticky control 不能闭合而又有独立 probe 时，才以私有 adapter 评估现成 package/自有 WASM artifact 的交付与 parity。 |
| TypeScript/JS scanner                               | [TS compiler scanner](https://github.com/microsoft/TypeScript/wiki/Codebase-Compiler-Scanner) 有标准/JSX scan 与 parser-controlled rescan，却输出 `SyntaxKind`；当前 JS regex wrapper、template/JSX、comment/whitespace/malformed token 语义不同，且 `typescript` 只是 devDependency。       | 只可作 TS-only negative/control experiment，**不推荐作为 shared Lizard tokenizer implementation**。                                                                                |
| tree-sitter、SWC、OXC 等 parser（native/WASM 分开） | AST/parser 不是当前 required token stream；语言覆盖不等于 27 reader 的 upstream tokenizer + state/processor lifecycle。每个 Tree-sitter grammar 各有 provenance/license；SWC/Oxc只覆盖 JS/TS 子集且会改变 comments、whitespace、error recovery 与 function boundary authority。              | **不推荐用于本热点**，除非产品另行决定以 parser AST 改写 analyzer contract；当前 profile 不能证明 parser 会更快。                                                                  |
| generator/processor pipeline host rewrite           | direct-core/token-only observations 表明它是 regex 后的相邻成本，但无 callback/allocation 的可回收因果拆分                                                                                                                                                                                   | 暂不动；先让等价 lexer candidate full-pipeline remeasure，再对剩余成本 profile。                                                                                                   |
| Worker pool/transfer                                | 当前测量是 analyzer-only；Product 使用 one-shot Worker，pool 会改变 cancellation/termination/resource lifecycle，而不会消除 Worker 内 tokenizer cost。                                                                                                                                       | 不用来解释或修复本差距；若未来 Product cold latency 有预算，先作 Product-stage profile/repeated-session/cancellation workload；不用 pool library。                                 |
| Unicode/source positions/data structures            | `TokenMatch.startOffset` 是 UTF-16；Erlang 另有 code-point scan；Onig adapter 已需 UTF-8↔UTF-16 conversion。                                                                                                                                                                                 | 视为 correctness boundary，不能用 byte offsets、lossy string view 或 AST range 偷换。                                                                                              |

### 形成时下一轮实验：顺序、边界与停止条件

1. **Oniguruma `CodeReader` internal spike**：在独立 Change 中直接替换 `CodeReader.generateTokens` 的内部扫描实现；若 differential test 必须切换实现，只加非导出、仅测试构建可达的临时 seam，完成后移除。不得保留 runtime-configurable backend、Product option 或泛化 plugin interface。缓存一个 scanner/translated pattern 于 Worker lifetime，并总是在 finally dispose scanner/string。先对 26 combined readers、PHP outer pattern 与 Erlang local lexer 保持明确边界。
2. **先语义，后 timing**：完整 token-stream differential（每 token value、UTF-16 start、empty/error/progress）、现有 27-reader oracle、source identity、processor/extension protocol；特别覆盖 `s/i` mapping、lookaround、PHP named backreference、non-ASCII/astral text、cancel/Worker terminate。
3. **再相同 workload ABBA**：254-file真实 TS full analyzer before/after，另以代表性 27-language corpus 检查回归；包括 one-shot Worker Product condition、WASM init/cold vs warmed、RSS/asset size。只有稳定收益、delivery、license/security/no-download 和 all parity 全部闭合才考虑采用。
4. 在同一 corpus 运行 **built-in sticky/multi-pattern control**；若它以更小语义/供应链成本达到相同收益，优先它。若两者均不稳定或 token parity 不闭合，保持当前 built-in baseline，不转向 PCRE2/native/parser。

**停止条件：**任一候选若不能在完整 token stream、27-reader oracle、资源/取消、打包与安全门槛中闭合，或不能在相同 workload 显示稳定收益，即停止该候选并保留 built-in baseline；不得以静默 fallback、公开或可配置 backend interface、Product 层重构绕过失败。

### 证据状态：已确认、推断与未知

**已确认：**source alignment 不排斥库 regex、WASM 或其它 host primitive；RE2 direct replacement 与当前 shared pattern 不兼容；当前 Oniguruma probe 给出了真实 TS raw-match parity 和 isolated speed signal；PCRE2-WASM 所试 wrapper 在本 Bun/Node compatibility environment 不能初始化。

**推断：**Oniguruma 值得进入受控 full-token/full-analyzer investigation，因为它是唯一既通过当前 target raw stream 又显示同 workload较低扫描时间的候选。该推断不等于 2.89× analyzer/Product 加速，也不等于 27-reader parity。

**未知：**Oniguruma 对所有 reader additions、PHP named semantics、Erlang local lexer 的正确映射；WASM bundle 在 Product 的 exact asset/Worker cancellation behavior；真实 Product cold/warmed wall time、memory、security review；任何 PCRE2 native addon 的 Bun/平台支持；以及 generator/processors 仍可回收的部分。

本报告只适用于本轮 source、Bun 1.3.14、254-file warmed raw-scan probe。未来任一 native/WASM/lexer package 都须固定版本并审计 transitive/artifact/license/security、Bun trusted lifecycle scripts、无运行时下载与目标 OS/arch；改变 tokenizer、Bun/Oniguruma version、package artifact、Worker strategy、reader additions或代表性 corpus 后须重新调查。

## 随附资源

- [candidate package/API probes](./_resources/survey-lizard-host-acceleration-candidates/candidate-probes.json)
- [Oniguruma compile inventory](./_resources/survey-lizard-host-acceleration-candidates/oniguruma-compile-inventory.json)
- [Oniguruma real-TypeScript raw-scan probe](./_resources/survey-lizard-host-acceleration-candidates/oniguruma-real-typescript-raw-scan.json)
- [regex feature inventory](./_resources/survey-lizard-host-acceleration-candidates/regex-feature-inventory.json)
