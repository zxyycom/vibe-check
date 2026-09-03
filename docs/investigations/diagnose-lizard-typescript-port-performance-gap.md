---
title: "TypeScript Lizard port 性能差距根因"
formedAt: "2026-09-03T06:22:29Z"
question: "固定 Lizard 1.24 representative batch 中 TypeScript port 较慢是否由解码或 Python 原生依赖导致，应优先在哪一层继续优化？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "profiling"
  - "source-alignment"
relations:
  - type: "补充"
    target: "compare-lizard-python-typescript-performance.md"
---

## 形成时背景

[前序性能对照](compare-lizard-python-typescript-performance.md)确认，同一份 fixed Lizard 1.24 representative batch 在 `warmed-operation` 下，Python median 为 262.44 ms，TypeScript port 为 632.22 ms；但 historical/current Product 对照反而是当前 TypeScript Product 更快。用户据此询问 analyzer-only 差距是否来自 Python 的底层解码工具或原生优化，并要求先调查、不要直接优化 source-aligned core；Product-owned 外围只有在证据直接支持时才可作为优先候选。

本轮只新增 profile、反事实实验和正式调查记录，没有修改 Product、port façade、reader registry、translated core/readers/shared/protocol 或 public/package surface。候选只在 `/tmp` 中执行；其精确源码副本作为报告证据保存，不属于运行时实现，也不构成修改 source-aligned port 的授权。

**使用与授权边界。** 本报告的用途是定位下一轮调查/Change，不是实施授权。后续代理应按以下状态使用本报告；随附 raw resources 是各项观测的可复核 owner，本报告是这些观测的范围、解释和授权边界 owner。

- **已证事实：**本报告的计时、profile、output parity 和 runtime 筛查只适用于所述 fixed Lizard 1.24 representative batch、runtime 和方法；B scope 不包含文件读取、字符解码、Worker 或 Product settlement。
- **探索性推断：**suffix-index/preselected-reader 反事实只证明固定 corpus 的 output 等价和候选回收方向；它不是正式 before/after ABBA，也不证明任意 filename matcher 等价或能替代 source-order registry。
- **实施建议（非授权）：**“推荐实施顺序”只规定若另行获批时应先验证什么；它不允许直接修改任何实现。
- **明确禁止越界：**本报告不授权修改 `reader-registry.ts`、`CodeReader.matchFilename`、translated core/readers/shared/protocol 或 Product admission。即使 fast path 位于手写 façade，也属于 analyzer port 的 deviation；它必须保留完整 filename 语义和对未证明安全输入的原 registry fallback，并先取得独立 Change/Decision、deviation ledger 和 parity 证据。

## 调查目的

1. 核对 B analyzer-only 计时是否包含文件读取、字符解码、JSON decode、Worker 或 Product adapter。
2. 核对 Lizard、Pygments 和 PathSpec 是否以 native extension 直接加速本次 Python operation。
3. 用相同 3,456-file workload 分解 TypeScript hot path，并定位 port 边界与 translated core 各自的成本。
4. 形成分层优化顺序：哪些候选可留在手写 façade，哪些必须先经过新的 core 调查、Decision/Change 和 deviation/parity 证据。

## 调查范围与依据

调查基线是仓库 commit `e2bad655dde89d07c48413fae4c6167746e10708`、Bun 1.3.14、Linux x64，以及 upstream Lizard 1.24 commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`、CPython 3.12.13、Pygments 2.18.0。workload 继续使用前序报告保存的 27 reader families × normal/edge × 64：3,456 个内存 source、316,160 bytes、3,456 functions；正式 parity digest 仍为 `cdb07113214d24a7526318363223f730c7358be9dac2a66e4d648eef6e0b4b7d`。

实际采用五类证据：

- **调用边界审计：**读取 benchmark driver、Python driver、port façade、reader registry 和 upstream `FileAnalyzer`。两边都在 operation timer 前读取并解析 request；计时函数接收已解码的 `{path, source}` / Python `str`。真正的 `auto_read` 文件解码只在本 benchmark 未调用的 upstream `FileAnalyzer.__call__`。
- **runtime/dependency 审计：**检查 upstream build metadata、Python loaded modules 与 Pygments distribution。Lizard/Pygments 未发现 `.so`、`.pyd`、`.dll` 或 `.dylib`；PathSpec 未被该路径 import。CPython 内建 regex engine 与 JavaScriptCore regex 都属于各自 runtime 的原生实现，但不是 source decoder。
- **profile：**Python 使用 cProfile，TypeScript 使用 Bun sampling CPU profile。profile 会放大绝对时间；generator pipeline 的 inclusive time 相互重叠，因此只用于热点排序，不能相加或替代前序 ABBA wall evidence。
- **探索性隔离实验：**分别测 reader dispatch，并以只在 `/tmp` 执行的 suffix index 反事实实现与当前 façade 交替计时。反事实先通过 3,456 files 的 byte-identical JSON output preflight。该实验不是 fresh-process、15-block 正式 before/after benchmark，只用于判断候选是否值得进入后续 Change。
- **runtime 筛查：**用 `bun build --target=node` 生成同一个 bundle（SHA-256 `ebdb65e5e60615910d6aca5f27c69f489a2c150eaa937565fe251caa84c2baf6`），分别由 Bun 1.3.14 与项目 engine range 内的 Node 24.18.0 运行同一个 request（SHA-256 `7b0c68abab42a12e1f6799d94f8e23f777600dcca1a8e484d18048b5c0bf68ff`）。命令、可执行文件版本、bundle identity 和 Bun `process.version` 兼容值见随附方法记录。该 9-sample 顺序筛查不是跨 runtime ABBA，也不构成更换 Product runtime 的建议。

另以 pre-resolved reader 对 27 families 各执行 15 次 warmed observation，用于排列剩余 core hotspot。Python 与 TypeScript 分别顺序采样，未做跨 runtime ABBA，故只报告方向和候选集中度，不将 family 数字当作发布性能承诺。

## 调查结果与边界

### 已证结论：不是解码，也没有 Lizard/Pygments native accelerator

“Python 通过更快底层解码工具获胜”的假设可在本次 B scope 内排除：Python `json.load` 与 TypeScript `JSON.parse` 都发生在 operation timer 之前，计时范围内没有磁盘读取、UTF-8 decode、Worker、CLI/CSV 或 Product settlement。因此本报告不需要用 JSON load 的耗时来解释正式 operation wall。

Pygments 确实由 Erlang reader 使用，但 representative batch 中只覆盖 128 个 Erlang files。固定 2.18.0 环境的 warmed cProfile 中，`ErlangReader.generate_tokens` 128 calls 约 9 ms cumulative、Pygments `get_tokens_unprocessed` 4,224 calls 约 13 ms、`get_lexer_by_name` 约 7 ms；Pygments 是纯 Python distribution，未发现独立 native extension。TypeScript 的 Erlang reader 在本轮 family ranking 中反而快于 Python，因此它不能解释总体 Python 优势。

### 已证热点：façade 每文件触发 ordered regex reader dispatch

当前手写 `port-facade.ts` 对每个 source 调用 source-aligned `get_reader_for`；registry 按上游顺序遍历 27 readers，而每次 `matchFilename` 都对完整 filename 执行 suffix regex。当前 batch 因 reader 位置不同累计执行 48,384 次 filename regex test。Bun CPU profile 将 `get_reader_for → matchFilename` 标为约 40.8% inclusive CPU；dispatch-only median 为 234.11 ms。

相同 3,456 paths 的独立 microbenchmark 显示：当前 TypeScript ordered regex dispatch median 234.42 ms，预编译一次每 reader 的 regex 仍为 226.91 ms，而 direct suffix map 为 0.238 ms；Python 原始 `get_reader_for` 为 26.81 ms。由此可确认：**只缓存 RegExp 构造不足以解决问题**，主要成本是 Bun/JSC 上对完整路径连续执行大量 ordered regex；Python 的相同 source shape 在 CPython runtime 上成本显著较低。证据尚不能把差异进一步归因到某个 regex engine 内部实现细节。

两个独立、输出等价的 preselected/suffix-index 反事实实验得到一致方向：

- 第一组 12 observations：当前 median 599.59 ms，preselected reader 338.46 ms，paired median 节省 271.22 ms。
- 第二组 8 ABBA blocks / side 16 observations：当前 median 574.96 ms，façade suffix index 305.56 ms。

**探索性推断（不是正式 before/after 结论）：**这约回收当前 TypeScript operation 的 45%–47%，也能解释前序 Python/TypeScript 369.78 ms median gap 的大部分。由于本轮没有保存独立隔离 façade mapping/freeze 的可复核样本，本报告不对该层作排除性结论；当前证据只足以确认 reader dispatch 是更高优先级候选。

这个 hotspot 跨越边界：ordered registry 和 `matchFilename` 属于 source-aligned port，调用它的 `port-facade.ts` 虽是项目手写的私有 seam，但仍位于 analyzer port 内。绕过 `get_reader_for` 不是可免记的机械翻译；若进入实施，必须先有明确 Change/Decision，并进入 deviation ledger，保留 registry/core 原实现且不把 Product admission 写入 translated module。

本轮 suffix-index 反事实只证明固定 representative corpus 输出等价，不证明任意 filename 的 matcher 等价。后续候选必须让 `isLizardSourceSupported` 与 `analyzeLizardSource` 共用同一 resolver，并选择以下可证路径之一：对已证明安全的 filename grammar 使用保持 registry first-match/source-order 的快速路径，其余输入回退原 `get_reader_for`；或者通过 differential/property evidence 证明所有 filename 语义等价。证据至少覆盖 55 canonical suffixes、重复 suffix precedence、大小写与 Unicode case-fold、多点路径、无/未知 suffix、路径分隔符和 line terminator edge；若不能闭合则停止实施。

### upstream reader selection、CLI 调用频度与 Python cache

**已证事实：**fixed upstream `308b1c3…` 的 `lizard_languages/__init__.py:32-67` 每次 `get_reader_for` 都按 27 个 reader 的 source order 逐个调用 `match_filename`；`lizard.py:613-616` 的 `analyze_source_code` 对每个输入再取得 reader。随附的 54 个 canonical fixture path（每个 reader family 各 normal/edge）与当前 TypeScript registry 逐项选择相同，故 B 的 known-suffix batch（54 × 64）两边每文件都保留同一 reader selection。B 的 Python driver 直接调用 `analyze_source_code`、TypeScript harness 经 façade 调用 `get_reader_for` 后传入 core，所以 B API-only scope 每文件各选择一次。upstream CLI directory scope 不同：`lizard.py:1016-1021` 的 supported file 在 discovery 为 validity 与 language support 各调用一次，随后 analysis 再调用一次；本轮 `/tmp` 动态 probe 观察到 supported `a.c`、`b.js` 各 3 次，unknown `c.txt` 1 次，而 explicit `a.c` 因 discovery short-circuit 只在 analysis 调用 1 次。

**已证事实：**在 exact CPython 3.12.13 的 B selection loop 中，48,384 次 `re.compile` API 调用只有 27 次进入实际 regex compiler；完整 batch 先 warmup 后的第二次 operation 为 0 次 true compile，cache 为 125，低于容量 512。相同 3,456 paths 上，TypeScript `matchFilename` 实际构造 48,384 个 `RegExp` 对象。Python cache 因而遮蔽了重复 pattern construction 的实际编译成本；它不证明 upstream 作者有意依赖该 cache，也不说明 Bun/JavaScriptCore 是否复用内部 regex program，更不能独自解释整个 gap。

**历史与边界：**suffix helper 最早见 `f00bb16…`（2013，`include header files`）；`1111373…`（2014，`auto register langauge`）及 `b2b2e00…`（2014，`refactoring the CodeReaders`）形成 auto-registration/`CodeReader.get_reader` 形态；`c8e2be…`（2016，`restructure`）将其重组为当前 `languages()` + `get_reader_for` + `match_filename`。这些 commit message 没有性能动机；“实现较简单、便于扩展、当时 reader 较少”只能是合理推断，不能当作作者意图。known suffix 的一致性也不抹除既有 boundary：upstream core 对 unknown filename fallback `CLikeReader`，当前 façade 返回 `undefined`；reader registry/core 仍须保持原状，任何 resolver fast path 仍需按本报告既定 Change/Decision/deviation/parity 边界处理。

### 探索性候选：剩余差距集中在少数 translated tokenizer

suffix-index 反事实保留完整 façade output mapping 后，TypeScript operation 的探索性 median 约 306 ms，已接近但仍慢于前序 Python 262 ms。按 family 的 pre-resolved median 排序显示，剩余候选高度集中：Fortran 为 TypeScript 74.28 ms / Python 10.76 ms，ST 为 30.55 / 6.62 ms，Ruby 为 18.33 / 6.51 ms；三者的 median gap 合计约 99 ms。27 families 的逐项 median gap 合计约 118 ms。family samples 与整体 benchmark 不是同一交替实验，不能直接相加或解释整体残差，但足以说明后续不应从整个 state machine 或所有 readers 开始重构。

TypeScript profile 也把 shared tokenizer regex、native `regExpExec`、Fortran tokenizer和 ST tokenizer列为后续热点。CPU sampling profile 本身不能排除 `Set`、freeze 或对象分配的次级成本；这里只根据输出等价的 dispatch 反事实确定第一优先级。translated core 尚未完成 token-stream 级隔离和正式 before/after，因此 family 结果只能形成下一轮调查顺序，不能授权修改 core。

同一 built JavaScript bundle 的 runtime 筛查中，Bun median 为 645.50 ms，Node 24.18.0 为 456.33 ms，且两者 output digest 相同。这个结果说明余下成本至少对 JavaScript engine/runtime 敏感，不能全部归因于 TypeScript 源码结构；但样本不是 ABBA，Bun 也仍是 Product runtime，所以它不支持切换 runtime，只支持后续实验同时控制 source shape 与 engine。

### 影响面

**这不是单一原因，也不是已证实的 Product regression。** primary dispatch 影响每个已接纳 analyzer file，并随文件数以及其 suffix 在 source-order registry 中的位置放大；当前 representative batch 的 3,456 files 因此累计 48,384 次 filename regex test。剩余 tokenizer 候选则主要影响被相应 reader 解析的语言：本轮 Fortran、ST 和 Ruby 的 family gap 合计约 99 ms；**这是基于该语言分布的探索性归纳**，语言占比或源码形状改变时不能外推。Bun 645.50 ms 与 Node 24.18.0 456.33 ms 的同 bundle 筛查说明本 batch 的完整 analyzer workload 对 runtime 敏感，但没有把 runtime 敏感性归因给某一个 reader 或热点。

不同 scope 的方向不能互套：前序 B tiny cold-start 只有 160 bytes，TypeScript 34.94 ms 快于 Python 63.40 ms，却是 startup-dominated，不能代表 representative analyzer throughput；B representative 的 Python 262.44 ms 快于 TypeScript 632.22 ms 也不代表完整 Product。前序 A historical Product 则显示当前 TypeScript 仍更快：cold 为 328.87 ms 对 Python 442.66 ms，warmed-operation 为 86.32 ms 对 185.96 ms；该 scope 包含 Lizard 1.23→1.24、I/O、subprocess/Worker 与 Product 边界变化，因而既不能归因给 translated core，也不是已证实的 Product regression。

### 实施建议（非授权）

以下顺序只有在单独获得实施授权后适用；它不改变上述 source-aligned core 禁止修改的当前边界。

#### Reader-dispatch 候选比较（非授权）

| 候选 | 判断 | 依据与边界 |
| --- | --- | --- |
| **A：private resolver 的 O(1) suffix fast path + `get_reader_for` fallback** | **仅推荐作为下一 Change 的研究目标。** Map 从 `languages()` 的 source order 构造，重复 canonical suffix first-wins；`isLizardSourceSupported` 与 `analyzeLizardSource` 必须共用它。 | 将 27 readers 的 56 个 declared extension entries 收敛为 55 个 case-insensitive canonical suffixes；fast path 只接纳已证明安全的完整 filename grammar，例如整个 path 为 ASCII、无 JavaScript line terminator 且以 ASCII canonical suffix 结尾，其他 Unicode/line-terminator/未覆盖形状一律回退原 registry。它是 façade 内的 port deviation，不是免费优化。 |
| **B：per-batch/global memoization** | 不优先。 | 它只摊销 exact filename 的重复 lookup，不能改善首次或大量不同 filename 的 ordered scan；global cache 还引入生命周期/空间边界。因此相比按 final suffix 的 resolver，收益面和可证明边界都较差。 |
| **C：预编译每个 reader 的 regex** | 不推荐。 | 已测 TypeScript ordered regex dispatch median 仅从 234.42 ms 到 226.91 ms，仍保留 ordered regex scan；且需修改 source-aligned `CodeReader.matchFilename`，不满足本报告的 core 零修改边界。 |
| **D：重排 readers、改 registry、向 Product 泄露 reader、或切换 Node** | 不推荐。 | 重排/改 registry 会改变 source-order first-match 语义并触及 core；向 Product 泄露 reader 会把 analyzer reader selection 责任穿过私有 façade 边界。Node 24.18.0 筛查虽为 456.33 ms、Bun 为 645.50 ms，但不是 ABBA，且 Bun 仍是 Product runtime，不能作为切换 runtime 的依据。 |

若 A 另行获批，其实施验收必须同时满足：Decision 与 deviation ledger 明确该差异；原 reader registry/core 零 diff；共享 resolver 对安全完整 filename grammar 的 fast branch 以及其他输入的 registry fallback 建立 identity differential/property evidence，并覆盖 55 canonical suffixes / 56 declared entries、重复 precedence、mixed case、Unicode folds、line terminators、多点路径、无 suffix 和 unknown suffix；full oracle parity；以及同 manifest 的 15-block ABBA before/after。未闭合任一项时保持 fallback，不实施近似替换。

1. **先开一个受约束的 façade 优化 Change：**只在手写 `port-facade.ts` seam 内研究 source-order-derived suffix fast path，不修改 `reader-registry.ts`、`CodeReader.matchFilename` 或 reader/core；Change/Decision 和 deviation ledger 必须明确它仍是 analyzer port 内的非机械差异。让两个 façade API 共用 resolver，对未被证明安全的 filename 回退原 registry；验证上述完整 filename 语义、oracle parity，以及同 manifest 的正式 15-block ABBA before/after。若语义不能闭合，则停止而不是回退成静默近似。
2. **再开独立的 core hotspot Investigation：**只研究 Fortran、ST，随后才是 Ruby/Python/GDScript。优先验证 per-reader tokenizer pattern/setup cache 是否保持完整 token stream、metrics、state-machine 和 extension lifecycle；任何实现都进入 deviation ledger，并由独立 Decision/Change 授权。
3. **暂不投入：**文件/JSON decode、Pygments/native replacement、façade output mapping、对象冻结、通用 parser/plugin framework 或全局 state-machine 重构。当前 evidence 不支持这些方向。

本报告没有建立 performance budget，也没有证明 representative corpus 等同于真实项目语言分布。reader dispatch 成本随 suffix 在 source order 中的位置和文件数量变化；任何优化交付仍需增加真实 Product corpus 或明确 consumer workload 的复测。若 Bun/runtime、reader registry、extension set 或 workload 变化，应重新调查。

## 随附资源

- [façade suffix-index ABBA 探索证据](./_resources/diagnose-lizard-typescript-port-performance-gap/facade-suffix-index-abba.json)
- [façade suffix-index 实验源码](./_resources/diagnose-lizard-typescript-port-performance-gap/facade-suffix-index-experiment.ts)
- [Python full warmed regex cache 观测](./_resources/diagnose-lizard-typescript-port-performance-gap/python-full-warm-cache.json)
- [Python profile 环境与观测](./_resources/diagnose-lizard-typescript-port-performance-gap/python-profile-observations.json)
- [Python reader dispatch microbenchmark](./_resources/diagnose-lizard-typescript-port-performance-gap/python-reader-selection-microbenchmark.jsonl)
- [Python runtime native module probe](./_resources/diagnose-lizard-typescript-port-performance-gap/python-runtime-native-probe.json)
- [Python selected cProfile stats](./_resources/diagnose-lizard-typescript-port-performance-gap/python-selected-profile-stats.txt)
- [Python upstream reader selection 与 cache raw 观测](./_resources/diagnose-lizard-typescript-port-performance-gap/python-selection.json)
- [27 reader-family median 排序证据](./_resources/diagnose-lizard-typescript-port-performance-gap/reader-family-medians.json)
- [TypeScript reader dispatch microbenchmark](./_resources/diagnose-lizard-typescript-port-performance-gap/reader-selection-microbenchmark.jsonl)
- [runtime control Bun 结果](./_resources/diagnose-lizard-typescript-port-performance-gap/runtime-control-bun.json)
- [runtime control entry](./_resources/diagnose-lizard-typescript-port-performance-gap/runtime-control-entry.ts)
- [runtime control 方法与版本](./_resources/diagnose-lizard-typescript-port-performance-gap/runtime-control-method.md)
- [runtime control Node 24 结果](./_resources/diagnose-lizard-typescript-port-performance-gap/runtime-control-node-24.json)
- [TypeScript Bun CPU profile](./_resources/diagnose-lizard-typescript-port-performance-gap/typescript-cpu-profile.md)
- [TypeScript dispatch 反事实证据](./_resources/diagnose-lizard-typescript-port-performance-gap/typescript-dispatch-counterfactual.json)
- [TypeScript RegExp construction raw 观测](./_resources/diagnose-lizard-typescript-port-performance-gap/typescript-regexp-construction.json)
- [TypeScript upstream reader selection raw 观测](./_resources/diagnose-lizard-typescript-port-performance-gap/typescript-selection.json)
- [TypeScript stage profile](./_resources/diagnose-lizard-typescript-port-performance-gap/typescript-stage-profile.json)
