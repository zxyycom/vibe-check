---
title: "真实 TypeScript Lizard analyzer 慢路径诊断"
formedAt: "2026-09-03T08:48:45+00:00"
question: "在真实仓库 TypeScript Product source 上，当前 TypeScript Lizard port 相对 upstream Python 仍约慢 2.35 倍，原因是否仍是此前的 reader 路径匹配，下一步可证实的热点和实施边界是什么？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "profiling"
  - "source-alignment"
  - "typescript"
relations:
  - type: "归并"
    target: "diagnose-lizard-typescript-port-performance-gap.md"
  - type: "归并"
    target: "remeasure-lizard-python-typescript-real-typescript-analyzer-performance.md"
---

## 形成时背景

直接前序的真实 TypeScript analyzer-only 复测已在 254 个真实仓库 `src/**/*.ts` source（1,138,778 bytes、2,222 条 canonical metrics）上确认：同一已解码输入、正常 reader selection、warmed operation 下，Python Lizard 1.24 median 为 304.21 ms，当前 TypeScript port 为 715.11 ms（约 2.35×）。它也确认这不是 Fortran、ST、Ruby 等 reader-family 加权造成的结论。

较早的 representative 27-language batch 曾将 TypeScript 的 ordered reader resolver/filename regex 定位为主要候选，并据此完成了 façade fast path。本轮的问题是：**该历史热点在当前常用的真实 `.ts` 路径上是否仍解释差距？若否，慢点在哪一层？**

本轮仅在 `/tmp` 进行 profile、计数和反事实隔离；没有修改 Product runtime、façade、registry、translated core/readers/shared 或公共接口。输入 request、corpus manifest 和完整 canonical metrics 不重复复制：它们由直接前序报告 [真实 TypeScript Lizard Python/TypeScript analyzer 复测](remeasure-lizard-python-typescript-real-typescript-analyzer-performance.md) 的资源 owner 保存；本报告的 `provenance.json` 记录了所引用的精确 SHA-256。

### 当前阅读导航（不属于形成时证据）

- **本报告的 evidence owner：**同一真实 TypeScript analyzer-only request 上的 resolver 计数、受限反事实、regex 构造计数和 sampling profile 的形成时解释；输入与 canonical metrics 的字节证据仍由 real-TypeScript 复测报告资源拥有。
- **直接前序：**frontmatter 的两个 `归并` 前序分别拥有 27-family 的早期差距诊断与真实 TypeScript 的跨实现复测；本报告只在它们交集的真实 `.ts` analyzer layer 定位候选热点。
- **已确认 / 推断 / 未知：**“已确认事实”只确认 current fast path 未走 ordered resolver、以及 profile/计数所示热点排序；“推断与未闭合环节”明确保留 regex 可回收比例、跨 runtime 原因及 full pipeline/Product 效果为未知。
- **不能比较或相减：**direct/current/ordered 受限反事实、stage observations 和 sampling percentages 不构成同一正式 ABBA；不得将它们相减为 resolver 或 tokenizer 的精确 wall-time 份额，也不得与 Python profile 直接比较。
- **形成时建议（不是当前状态）：**先在独立 core Investigation 中对 combined-regex tokenizer 取得完整 token-stream parity 和同 workload before/after；不从 sampling 百分比直接修改实现。
- **当前状态 owner：**本轮已停止进一步性能实现；本报告的 core Investigation 只保留为形成时诊断出口。当前关闭状态由[最新综合调查](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)拥有。

## 调查目的

1. 确认当前真实 TypeScript workload 是否仍执行 ordered filename resolver；以受限反事实判断其在替代调用形态中是否仍是 material cost，而不把它误当成纯隔离的 resolver delta。
2. 在输出完全等价的前提下，对 TypeScript tokenization、reader/state-machine、core processor 等相邻阶段取样，避免将 profile 的热点排序误说成可回收 wall time。
3. 对相同输入检查 Python 的 reader selection、regex cache 和 profile 排序，明确哪些比较成立，哪些绝不能跨 runtime 比较。
4. 形成下一步边界：本轮只记录 root-cause evidence，不授权改变 translated core 或把 sampling 百分比承诺为性能收益。

## 调查范围与依据

### 共同输入、等价 guard 与计时边界

- 使用直接前序保存的同一 request：254 个 ASCII 路径的 `.ts` source、1,138,778 bytes。每次实验都要求 2,222 条 Product-consumed canonical metrics 的 SHA-256 为 `29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6`；漂移即失败。
- 这里的 analyzer-only 边界包括 reader selection、tokenization、reader/state machine、processor 和 function-metric projection；不包括 file discovery/read/decode、request JSON parse、Worker transport、Product adapter/finding/settlement 或 process startup。它仍不能代表完整 Product 性能。
- TypeScript 调查在 Bun 1.3.14 上运行；Python 调查在 CPython 3.12.13 / upstream Lizard 1.24.0 / Pygments 2.18.0 上运行。`provenance.json` 记录整理本报告时的 worktree identity（HEAD `49b57cbf99747d516c4d95390b5d01ffb2f2b40d`、tree `c4812449ad73fb208b066c397d024c09f219e4c3` 及四个相关 source SHA-256），以及 request、driver 和采样输出来源/哈希。原始 `/tmp` evidence 未在执行时嵌入 HEAD/tree/source hash，故这些 consolidation-time identity **不能追溯证明** profile/反事实执行时正是该版本。

### TypeScript：resolver 排除和分层观测

1. 对当前 `analyzeLizardSource` instrumentation，254 个真实 ASCII `.ts` path 的 `matchFilename` 调用数为 **0**，输出 guard 仍通过。这是当前 façade fast path 命中的直接计数证据。
2. `current façade` 与以 `TypeScriptReader` 直接调用 core 的 pre-resolved 条件各 10 次，以交替 `current → direct` / `direct → current` 的 10 个相邻 pair 记录（每侧 10 samples）：median 分别为 **663.91 ms** 与 **663.25 ms**，差为 **-0.66 ms**。这只平衡每个相邻 pair 的先后位置；不是 ABBA/BAAB，也不足以控制更长时程漂移。该小差异相对样本波动没有可用的性能归因意义，只说明这两个具体调用形态之间没有可见的大差异。
3. 作为**受限反事实**，交替 `current → ordered` / `ordered → current` 的 10 个相邻 pair（每侧 10 samples）中，`ordered` median 为 **798.00 ms**，`current` 为 **701.63 ms**，差 **+96.37 ms**；两者均通过同一 digest guard。`ordered` 的精确形态是 `get_reader_for(path) → analyzeSourceCode(..., reader) → driver metric mapping`，而 `current` 是 `analyzeLizardSource`（fast path 及 façade 内部的 function-list mapping/freezes）后再经同一 driver mapping。因此它既不是纯 resolver 隔离，也不是完整旧 façade 的复现；它仅支持“在此 direct-core 替代调用形态中，旧 ordered selection 路径是 material 的”这一推断。该数不是当前路径成本，也不是正式 before/after 的 Product 性能结论。
4. 为理解后续热点，另执行同进程、少样本的 stage observations：full façade median 642.29 ms、direct core metrics 649.06 ms、direct bare core 647.21 ms、`TypeScriptReader` with no processors 619.75 ms、只生成 TypeScript tokens 576.28 ms。这些不同 mode 的计时次数和 guard 不完全相同，且没有与 Python 交替；它们仅用于**排序和隔离**，不能相减、相加或替代 715.11 ms 的正式复测。

### TypeScript：regex 计数、构造反事实与 sampling profile

- 一次 guarded current operation 中，全局 `RegExp` constructor instrumentation 观测到 **254 次**构造（每 source 一次），且只有一个参数组合：TypeScriptReader source-aligned combined tokenizer 的 **393 characters、`gmsu`**。同一轮全局 `RegExp.prototype.exec` instrumentation 观测到 **705,919 次**；这是所有 regex invocation 的总数，不能仅归给该 combined tokenizer。
- 单独重复构造该 pattern 254 次的 microbenchmark median 仅 **0.01948 ms**（11 samples；p90 0.02275 ms）。这是“缓存 `RegExp` 构造”没有价值的直接证据；它不衡量也不否定后续每次 `exec`/扫描的成本。
- 30 次 guarded façade operation 的 Bun sampling profile 运行 25.15 s、20,854 个 1 ms samples。该 393-character combined tokenizer regex 在 native `RegExp` frame 有 **68.0% self samples**（17.10 s）；下一项 `regExpExec` 为 1.9%。profile 同时显示 `next`、token generator、TypeScript reader state 和 core processors 在调用树中活动。
- sampling 的 68.0% 是该 profile 工作负载和采样器的**热点排序证据**，不是“68% wall time 可回收”的证明：profile 含 canonical guard，native frame 归因不能细分 regex 的所有调用站点，且优化可能移动成本或改变 token semantics。

### Python：selection/cache 与 profile 的可比范围

Python 以同一 decoded request 先 warm，再将 upstream normal `analyze_source_code` 与“预解析 `TypeScriptReader` 后保留同一 processor/state-machine pipeline”的 direct 条件进行 12 ABBA/BAAB blocks（各 24 samples）。normal median 为 **286.54 ms**，pre-resolved direct 为 **281.66 ms**；paired direct/normal median 为 **0.98458**，即仅约 **1.5%** 差异。normal path 的 254 个 `.ts` 都在 upstream 27 readers 的第 16 个匹配，因此该 timed second operation 有 **4,064** 次 `match_filename`。

Python 的 warmed true regex-compiler probe 为 **0** 次（第一次 purge 后会有 21 次；第二次 0），且 digest 一致。这说明 CPython regex cache 在该 warm protocol 下没有重复编译；它不证明 Python 的 selection 是零成本，也不能推断 Bun/JSC 的内部 regex code-cache 行为。

Python cProfile 的热点也位于 tokenization、processors 和 TypeScript state-machine：例如 `generate_tokens_with_regex`、`_generate_tokens`、reader `__call__`、`line_counter`、`comment_counter` 与 `_state_global` 均靠前。这和 TypeScript 的“核心 token/processor pipeline 而非 façade”方向一致；但 cProfile 在一次 operation 中记录 1.295 s，远高于正常 wall observation，且其 cumulative group 会重叠。因此 Python profile 的绝对时间、函数百分比和调用数**不可与 Bun sampling profile 横向相减或比较**。

## 调查结果与边界

### 已确认事实

1. **此前的路径匹配不是当前真实 TypeScript gap 的根因。** 当前 254 个常用 `.ts` input 全部走 façade fast path，`matchFilename=0`；且 current façade 与 pre-resolved direct-core 这两个具体调用形态的 663.91/663.25 ms 小差异没有显示可解释约 2.35× gap 的 resolver 成本。
2. **旧调查并非错误，只是适用条件已变。** 受限反事实表明，在 `get_reader_for → direct core` 形态中，旧 ordered selection 路径相对 current façade flow 多约 96.37 ms；这与此前 representative 多语言 batch 的方向一致，但它不是纯 resolver delta。当前 fast path 已将该路径从这批标准 `.ts` 输入中排除。
3. **当前最强的 TypeScript hotspot evidence 是 source-aligned combined-regex tokenization 的反复扫描。** token-only/direct-core stage 的集中度，以及 Bun profile 中该 regex 的 68.0% self samples 共同把调查优先级定位到此处，而不是路径匹配、Product adapter 或 regex object construction。705,919 是全局 `RegExp.prototype.exec` instrumentation count，只提供“regex execution 频繁”的辅助证据，不能仅归给 combined tokenizer。
4. **只缓存 tokenizer `RegExp` 构造不值得。** 它的孤立构造成本约 0.0195 ms/254 files，相对于数百毫秒的 analyzer operation 可忽略。

### 推断与未闭合环节

**推断：**当前 TypeScript/Python performance gap 很可能主要来自同一 source-aligned tokenizer/state-machine pipeline 在 Bun/JavaScriptCore 上的 token scanning/regex execution 成本，而非名称/路径解析。这个推断由快路径排除、token-only stage 和 profile 排序共同支持。

**尚未确认：**现有证据不能把差距完全归因于 JavaScriptCore、某一个 regex 语义分支、generator overhead、allocation、state transition 或 processor。本轮没有 token-stream-equivalent replacement，也没有按 regexp alternative、source shape 或 JSC 内部代码生成分解的 ABBA 因果实验；因此不能宣称 68% 可回收，也不能承诺任何 tokenizer 重写会让 TypeScript 追平 Python。

### 建议与授权边界

- **建议（非实施授权）：**若未来性能目标要求继续，应先开独立 core-hotspot Investigation/Change，以 token-stream equivalence、canonical metrics parity 和同一真实 `.ts` corpus 的正式 ABBA before/after，逐项验证 combined-regex tokenization 的候选。优先测试扫描/匹配策略而不是 RegExp construction cache。
- **不建议：**为当前 gap 再改 reader resolver、把 reader 泄漏到 Product、仅缓存 RegExp 对象，或基于本 profile 切换 Product runtime。
- **当前动作：**只新增本报告与可复核 raw resources；不改任何运行时代码。任何 tokenizer 改法都会触及 source-aligned translated core/readers/shared，当前未获实施授权。

本结论只适用于上述 warmed analyzer-only、254 个真实 ASCII `.ts` source、Bun/CPython 版本和 host。它不推出完整 Product、JS/TSX、未知 filename、不同语言分布、其他机器或长寿命 Worker 的性能结论。若 fast-path grammar、tokenizer、Bun/JSC、upstream reader 或代表性 workload 改变，必须重新测量。

## 随附资源

- [provenance](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/provenance.json)
- [python cProfile tottime](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-cprofile-tottime.txt)
- [python profile driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-profile-driver.py)
- [python profile evidence](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-profile-evidence.json)
- [python regexp cache driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-regexp-cache-driver.py)
- [python regexp cache](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-regexp-cache.json)
- [python stage driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-stage-driver.py)
- [python stage measurement](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/python-stage-measurement.json)
- [typescript base tokenizer](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-base-tokenizer.json)
- [typescript Bun CPU profile](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-bun-cpu-profile.md)
- [typescript CPU profile run](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-cpu-profile-run.json)
- [typescript façade direct counterfactual](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-facade-direct-counterfactual.json)
- [typescript façade direct driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-facade-direct-driver.ts)
- [typescript fastpath count](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-fastpath-count.json)
- [typescript ordered resolver counterfactual](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-ordered-resolver-counterfactual.json)
- [typescript profile driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-profile-driver.ts)
- [typescript reader only](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-reader-only.jsonl)
- [typescript regexp construction driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-regexp-construction-driver.ts)
- [typescript regexp construction](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-regexp-construction.json)
- [typescript regexp count](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-regexp-count.json)
- [typescript stage driver](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-stage-driver.ts)
- [typescript stage timings](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-stage-timings.jsonl)
- [typescript tokenizer only](./_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-tokenizer-only.jsonl)
