---
title: "Lizard optional extensions 对 Vibe Check 的采用价值评估"
formedAt: "2026-09-03T01:34:10Z"
question: "当前被裁切或延期的 Lizard optional extensions 中，哪些有加回 Vibe Check 的意义，哪些不应恢复，以及为什么？"
tags:
  - "function-metrics"
  - "lizard"
  - "metric-policy"
  - "source-alignment"
  - "upstream-release"
relations:
  - type: "补充"
    target: "assess-lizard-upstream-release-and-branch-delta.md"
---

## 形成时背景

Vibe Check 已以 Lizard `1.23.0` 为 source-aligned baseline 完成 `functionMetrics` 的 TypeScript hard cut；当前 baseline 的 19 个 concrete optional extension body 被明确标为 deferred 且不注册。当前正式上游版本是 `1.24.0`，它新增了 Halstead extension（3 个新 Python 文件），而不是把既有 deferred body 改写为新的行为。本报告回答“这些能力是否值得成为未来 Product 工作”，不是把上游存在、可翻译或已列在 provenance 中误写成采用授权。

本报告直接**补充** [`assess-lizard-upstream-release-and-branch-delta.md`](./assess-lizard-upstream-release-and-branch-delta.md)：前序报告确定 `1.24.0` 的正式性、tag/release 差异和未发布分支增量；本轮在该 release 前提下逐一评估 deferred extension 的消费者结果、owner、重叠和 Product contract 成本。它不修正前序 release 事实，也不重新裁决其结论。

**形成时的 current Product 约束（已确认事实）。** [`functionMetrics` owner](../checks/function-metrics.md) 与实现当前只把 NLOC、standard CCN 和参数数量作为可出 Finding 的函数指标；公开 `FunctionMetricsFindingMetric` 也只有 `cyclomatic-complexity`、`function-code-density`、`parameter-count`。port façade 是 Check-private，产出私有 Lizard-domain DTO；Product adapter 才映射到核心字段。逐文件 analyzer/Worker 路径没有可直接承接 cross-file extension aggregation 的 Product contract；已对齐的 [private-port Decision](../decisions/isolate-lizard-port-behind-check-private-interface.md) 禁止将它扩张为 public parser、plugin 或 generic extension API。

**适用边界。** 本文只记录 `2026-09-03T01:34:10Z` 时对仓库和官方 `1.24.0` tag 的调查认识。它不修改产品、Change、Decision、baseline、provenance 或 public API；不证明外部消费者永远不需要某指标。真实消费者、阈值、语言范围、性能 budget 和发布授权仍由相应 Product/Change/Decision owner 承接。

## 调查目的

本轮以可复核方式回答：

1. 1.23 deferred 的 19 个 concrete body 与 1.24 新 Halstead，共 20 项，各自实际做什么、当前是否有已验证的 Product consumer、应由谁拥有、主要风险是什么？
2. 哪些只值得进入一次**有明确消费者的选择**，哪些与现有 capability 重叠、改变输入/identity、只产生 CLI 输出，或属于别的 owner，因而不应恢复到 `functionMetrics`？
3. 若未来选择一个指标，当前最小闭合 Product contract 和所需证据是什么？
4. `adopt-selected-lizard-extensions` 与 `sync-lizard-typescript-port-to-1-24-0` 两个 Change 应怎样切分和排序，才能不把上游同步误当成自动扩张产品行为？

本轮不选择阈值、metric 名称、公开 options、语言支持级别、实现方案或任何 extension loader；也不进行 runtime implementation、性能实验、consumer research 或 Change 创建。

## 调查范围与依据

### 检查对象、版本与方法

- **仓库 current owner。** 阅读 [`functionMetrics` contract](../checks/function-metrics.md)、[`scanner dependency` owner](../scanner-dependencies.md)、`src/package-checks/function-metrics/{options,measurement-model,records,final-data,execution,analyzer-adapter}.ts`、port façade/adapter，以及 [TypeScript hard-cut Decision](../decisions/replace-lizard-runtime-with-product-owned-typescript-analyzers.md)、[private-port Decision](../decisions/isolate-lizard-port-behind-check-private-interface.md)、[upstream advisory Decision](../decisions/track-lizard-supported-languages-with-upstream-advisory.md)。这确认了公开 metric、Finding、waiver、Record/final-data、scanner 和 port owner 的实际边界。
- **1.23 provenance。** 阅读形成时唯一 machine-readable [`licenses/lizard-1.23.0-provenance.json`](./_resources/assess-lizard-extension-adoption-value/lizard-1.23.0-provenance.json) 与 analyzer fixture mapping。该随附资源只保存本报告的形成时依据，不是当前 1.24 baseline 的 ledger 或 current-evidence owner。它有 21 个 deferred `lizard_ext` 文件：`default_ordered_dict.py` 只被 deferred `duplicate` 使用，`keywords.py` 只被 deferred `wordcount` 使用；二者是依赖，不是 concrete extension body，故下文表格不把它们再算一项。
- **官方一手 source/test。** 对工作区外只读 clone 的官方 tag [`1.23.0`](https://github.com/terryyin/lizard/tree/1.23.0) 和 [`1.24.0`](https://github.com/terryyin/lizard/tree/1.24.0) 运行 `git diff --name-status 1.23.0 1.24.0 -- lizard_ext`、`git ls-tree` 与逐文件行计数；交叉读取官方 [`lizard_ext` tree](https://github.com/terryyin/lizard/tree/1.24.0/lizard_ext)、[`1.24.0 CHANGELOG`](https://github.com/terryyin/lizard/blob/1.24.0/CHANGELOG.md) 和官方 [`test/` tree](https://github.com/terryyin/lizard/tree/1.24.0/test)。专门测试包括 `testHalstead.py`、`testNestingDepth.py`、`testNestedStructures.py`、`testMcCabe.py`、`testFunctionExitCount.py`、`testFunctionGotoCount.py`、`testFunctionStatementCount.py`、`testFunctionDependencyCount.py`、`testCPreprocessorExtension.py`、`testCOutsideComplexity.py`、`testAssertionExtension.py` 和 `test_extensions/**`；存在上游测试不等于存在 Vibe Check consumer 或 Product contract。

### 已确认 source inventory

1. `1.23.0..1.24.0` 的 `lizard_ext` name-status 只新增 `halstead_classifier.py`、`halstead_metrics.py`、`lizardhalstead.py`，另修改 CSV/version 输出外围；**19 个 deferred concrete body 均 unchanged**。
2. 新 Halstead 三文件分别为 135、80、193 physical lines，合计 **408**。它计算每函数 volume、difficulty、effort；官方 CHANGELOG 将其作为 `-Ehalstead` 的新输出能力。其 Python classifier 是专用分类器，其他 readers 走通用近似 token classification；这使数值、浮点稳定性、语言语义与运行成本都不能由“新增 408 LOC”推断为低风险。
3. 当前 public options 没有 generic extension array/name；当前 analyzer registry 是 port-internal lifecycle implementation，不是 Product API。现有逐文件 output 不能凭空承接 `duplicate`、`duplicated_param_list` 或 `boolcount` 所需的 cross-file pass。
4. 在已读 current owner、public type 和当前记录中，**未找到**这 20 项的现有 Vibe Check Product consumer、limit、Finding metric、waiver identity 或 Record/message contract。该事实仅限仓库当前 contract；不声称外部真实需求不存在。

### 评估口径

- **推荐分级**：`shortlist` 表示值得先取得真实 consumer/threshold evidence，仍不等于恢复；`conditional` 表示只在明确、互斥的政策需求下再选；`do-not-restore` 表示当前应保持不恢复；`other-owner` 表示问题不属于 function metric owner。
- **“消费者结果”**是采用后能为项目使用者产生的可观察决策结果；没有此结果时，不因上游 feature 存在而扩张 API。
- **“主要风险”**优先列出会破坏当前 input、identity、并行模型、公开 contract 或分析语义的风险，而非只列翻译工作量。

## 调查结果与边界

### 默认结论与推荐 shortlist

**默认结论（建议）：当前不恢复任何 20 项，也不公开 extension 名称或 extension array。** 这与当前 1.23 baseline 的“deferred 且默认不注册”一致，也避免把 `1.24.0` release 存在误当作 product requirement。

若用户以后选择推进，推荐先在同一选择框架中只比较以下三项，而非批量 port：

1. **`complextags`（shortlist）**：可作为已存在 CCN Finding 的有界解释附件——告知超阈 CCN 由哪些 complexity token/行构成——而不是第二个 metric 或另一个 gate。它直接帮助现有 Finding 的可行动性，且不应独立改变 pass/fail；仍须证明所有 reader 的 token/line fidelity 和 message/Record 负担。
2. **`nd`（shortlist，优先进入选择）**：max nesting depth 是整数、局部、易设上限且可直接形成“降低最深嵌套”的行动；但上游 `nd` 不只是结构嵌套：`?` 以及条件内第一个 `&&`/`||` 也计入深度。官方 C++ 样例中 `if(a&&b)` 的 ND 是 2、ternary 的 ND 是 1；对应 `ns` 值分别是 1、0。因而优先 `nd` 是把它作为更广的“认知嵌套/条件复杂度”产品候选，前提是消费者接受该语义，不是说它与 `ns` 相同或天然替代。产品若采用二者之一，应以**二选一**避免同一嵌套问题的重叠 Finding。
3. **Halstead（shortlist，但风险最高）**：volume/difficulty/effort 可能揭示 CCN/NLOC 未覆盖的表达式/操作符复杂性，故值得做真实 consumer research；但它是 1.24 新 source，不是 baseline 的小补丁。专用 Python classifier 与其他 reader 的通用近似、浮点输出、跨语言承诺及性能会显著提高 fidelity 和 policy 成本。

`modified`、`mccabe`、`nonstrict`、`ignoreassert` **不是新增并行 metric 的候选**；它们只在用户明确要改变“什么算 CCN”时，作为一组互斥的 `complexityCounting` policy alternatives 复核。`exitcount`/`gotocount` 只在明确的 legacy C-family coding-rule consumer 下可进入同样的选择。没有明确 consumer 时，保留 deferred 是正确的可逆默认值。

### 逐项覆盖与推荐

下表的“当前消费者”均指已核验的 Vibe Check contract；`无`不表示永不采用。上游具体机制和测试均可由官方 [`1.24.0/lizard_ext`](https://github.com/terryyin/lizard/tree/1.24.0/lizard_ext) 与 [`1.24.0/test`](https://github.com/terryyin/lizard/tree/1.24.0/test) 复核。

| 项目 | 分级与当前消费者结果 | 适合 owner | 主要风险 / 为什么 |
| --- | --- | --- | --- |
| `boolcount` | **do-not-restore**；无 current consumer，输出项目级 bool token 比率。 | 不适合 `functionMetrics`；若有语言健康度需求另立 owner。 | cross-file accumulation 且 `print_result` 写 stdout；“bool” token 不是可跨语言一致的函数质量信号。 |
| `complextags` | **shortlist**；把现有 CCN Finding 的 complexity contributors/line 作为解释附件。 | `functionMetrics` Finding/message/Record owner。 | 必须只辅助既有 CCN，不能变成并行 gate；各 reader 的 token 与行号必须有 parity evidence。 |
| `cpre` | **do-not-restore**；无独立用户结果。 | 输入/reader semantics owner，且仅在明确 C preprocessing policy 时。 | 通过忽略 `#else..#endif` 改变 source token stream 与输入语义，不是额外 metric；会改变现有 CCN/NLOC/function identity。 |
| `dependencycount` | **other-owner**；函数内 import/include 计数不是已验证 consumer。 | 专门 dependency/graph owner。 | token heuristic 不等于 dependency graph；跨文件、解析/解析失败和语言语义均超出 function metric 边界。 |
| `dumpcomments` | **do-not-restore**；只是打印注释。 | CLI/report tooling（如未来需要），不是 Product Check。 | stdout/格式输出，且产品无 CLI；没有结构化 Finding/Record consumer。 |
| `duplicate` | **do-not-restore**；当前已有 `duplicateDetection` consumer。 | `duplicateDetection` owner。 | 以 cross-file token 序列做重复块检测，重叠现有专用能力且需要全局聚合；重复 scanner 会产生冲突结果和 policy。 |
| `duplicated_param_list` | **do-not-restore**；无 current consumer。 | 只有真实 API-design smell consumer 时由专门 quality rule owner。 | 需要 cross-file function aggregation；参数拼写相同不自动等于设计问题，阈值和语言/identity policy 未定义。 |
| `exitcount` | **conditional**；仅明确 legacy C-family “过多 return/exit” rule 时可评估。 | `functionMetrics` 的显式语言受限 rule，或独立 legacy-rule owner。 | `return`/throw/yield/early exit 语义跨语言不共通；不能用一个泛化 count 误导全部 55 extensions。 |
| `gotocount` | **conditional**；仅明确 legacy C-family `goto` prohibition/limit 时。 | 同上，且语言范围必须 closed。 | 很多语言无 goto 或语义不同；没有跨语言 consumer，不能成为默认 function metric。 |
| `ignoreassert` | **conditional**；仅作为 complexity counting policy 选择。 | `functionMetrics` CCN policy owner。 | 改写 existing CCN，而非新增 metric；test/assert 识别跨语言有误计风险，必须与其他 CCN modifiers 互斥。 |
| `io` | **other-owner**；fan-in/fan-out/I/O-style token rule 无 current consumer。 | 专门 graph/dependency architecture owner。 | 不是可靠函数内 metric；依赖 call/import graph、跨文件 resolution 和语言语义。 |
| `mccabe` | **conditional**；仅作为 CCN counting policy 选择。 | `functionMetrics` CCN policy owner。 | 它改变 complexity counting（例如 switch/case handling），不能与 standard CCN 作为并行“另一个 metric”无解释地发布。 |
| `modified` | **conditional**；仅作为 CCN counting policy 选择。 | `functionMetrics` CCN policy owner。 | 同样是 CCN 语义变体；与 `mccabe`/`nonstrict`/`ignoreassert` 需明确互斥和 migration semantics。 |
| `nd` | **shortlist，优先进入选择**；每函数最大 depth 可给出“降低最深嵌套”的行动，但上游也将 `?` 与条件内首个 `&&`/`||`纳入 depth（`if(a&&b)` 为 ND=2，ternary 为 ND=1）。 | `functionMetrics` metric/Finding owner。 | 是“认知嵌套/条件复杂度”候选而非纯结构深度；需消费者接受该定义，并验证 215-line extension、跨 reader lifecycle、limit、anonymous/function boundary 和 parity corpus。 |
| `nonstrict` | **conditional**；仅作为 CCN counting policy 选择。 | `functionMetrics` CCN policy owner。 | 关闭 strict complexity-counting 语义，不能作为无阈值的额外观察值；与其它 modifier 冲突。 |
| `ns` | **do-not-restore**；无已选 consumer；它对 `if(a&&b)` 为 1、ternary 为 0，衡量的是更窄的结构嵌套。 | 只有消费者明确需要纯结构嵌套时，才由 `functionMetrics` metric owner 与 `nd`重新比较。 | 与 `nd`解决的用户问题高度重叠但语义不同；二者二选一是避免重叠 Finding 的 Product policy，不能把它表述为自然替代。 |
| `outside` | **do-not-restore**；无 current consumer。 | function identity/reader owner，仅在明确接受新增结果 identity 时。 | 流尾调用 `end_of_function()`，把函数外复杂度作为名为 `*global*` 的 pseudo-function 纳入结果；会新增函数 identity/Record/Finding subject，而非“排除”既有复杂度。 |
| `statementcount` | **do-not-restore**；无 current consumer。 | 只有明确 statement-density consumer 时由 `functionMetrics` metric owner。 | 与 NLOC 高度相关而语句定义跨语言不稳定；没有显示其比现有 NLOC 提供增量决策价值。 |
| `wordcount` | **do-not-restore**；生成 HTML 并尝试打开浏览器。 | report/UI tooling（如未来需要），不是 Product Check。 | CLI/browser side effect，依赖 `keywords.py`；产品无 CLI且无 HTML artifact contract。 |
| `halstead` | **shortlist，先研究后决定**；潜在表达式复杂度 consumer，当前没有。 | `functionMetrics` metric/Finding owner；1.24 sync 先承接 source/provenance。 | 408-line新增 source；Python专用 classifier、其他语言 generic approximation、浮点、阈值、性能和跨语言承诺必须闭合。 |

### 采用一个 selected metric 所需的闭合 contract

**已确认事实：** 当前三项指标的每一项都有 closed option/limit、`FunctionMetricsFindingMetric` member、stable waiver identity、supplemental Record/message、adapter DTO mapping 和 tests。故“只把 extension 打开、再从内部读一个字段”不会形成可审计 Product capability。

**建议的准入顺序（不构成实施授权）：** 对每一个被选择的 metric 或解释附件，Change 必须同时决定并验证：

1. **真实消费者与范围：** 明确哪个用户决策会因它改变；确定支持 reader/language 集合和不支持时的行为。无当前 consumer 不应被语言为“永不”，但也不能先公开能力再寻找用途。
2. **closed Product input：** 选择是否有 metric-specific limit；不得公开 generic extension loader、name string array 或 port internals。CCN modifier 必须成为 closed、互斥的 `complexityCounting` policy，而不是并行 metric。
3. **Finding/waiver/publication：** 若它可 gate，新增封闭 Finding metric、stable waiver identity、Record data、human message、final-data/documentation 和 adapter DTO；若 `complextags` 仅解释既有 CCN，则明确它不新增独立 settlement。
4. **source alignment 与 differential corpus：** 更新 source/range mapping、provenance/legal inventory、extension lifecycle corpus，并在所有承诺 reader 上验证数值、line/identity和 malformed boundary。Halstead 还须覆盖 Python classifier 与 generic classifier 的分歧样本。
5. **性能/并行边界：** 给出 exact-input、per-file Worker 和跨文件 aggregation 的实际资源上限、取消和 determinism evidence；不能为了一个 extension 建立 Product-wide scanner/plugin framework。

### 两个 Change 的边界、依赖与顺序

本轮形成时建议把未来工作保持为下列两个独立 Change。报告只保存该切分与排序的形成时认识；Change artifacts 才拥有后续实施上下文，stable docs/Decision 才拥有当前规则：

| Change | 负责什么 | 不负责什么 | 依赖与完成条件 |
| --- | --- | --- | --- |
| `sync-lizard-typescript-port-to-1-24-0` | 将 source-aligned baseline、provenance、mapping、legal/deviation 与 parity evidence 同步至正式 `1.24.0`；把 Halstead 三文件记录为 deferred。 | 不采用 Halstead 或任何 1.23 deferred body；不扩张 public metrics/options。 | **不依赖 `adopt-selected-lizard-extensions`**。先完成并稳定提交，作为后续实现可依赖的 source identity。 |
| `adopt-selected-lizard-extensions` | 选择证据与 closed Product contract；仅当选定一个具体 outcome 时，才在**同一 Change**实施、测试和验收。若选择 `none`，以不扩张 contract 完成。 | 不公开 extension names/array，不创建 generic plugin API，不借同步“顺便”采用上游行为。 | 选择证据可先做；任何具体 capability 的 runtime implementation 与 acceptance **硬依赖完整 Change 名 `sync-lizard-typescript-port-to-1-24-0` 的 1.24 stable commit**。 |

因此，推荐顺序是：先建立/完成 `sync-lizard-typescript-port-to-1-24-0` 的 source-aligned sync（Halstead 保持 deferred）→ 在 `adopt-selected-lizard-extensions` Draft 取得真实消费者和选择证据 → 只有明确批准该 Change 的选项后才实施。这样既不让 `adopt-selected-lizard-extensions` 阻塞纯 baseline sync，也不让它在不稳定 source identity 上实现。若它选择 `none`，`sync-lizard-typescript-port-to-1-24-0` 仍独立有价值，而前者的正确结果是没有 public 扩张。

### 需要用户决定的事项

在推进 `adopt-selected-lizard-extensions` 至 Plan 或实施前，用户应只决定以下会实质改变结果的事项：

1. 是否存在一个具体 consumer，要用 `complextags` 解释 CCN finding、用 `nd`限制最大嵌套，或用 Halstead 作表达式复杂度判断；没有该 consumer 时维持默认不恢复。
2. 若选择嵌套，消费者是否接受 `nd` 的更广条件复杂度语义，还是明确需要 `ns` 的纯结构语义；无论选择哪一项，是否接受二选一以避免重叠 Finding。
3. 是否有明确、语言受限的 legacy C-family rule 要求 `exitcount` 或 `gotocount`；否则它们保持 deferred。
4. 是否要改变 standard CCN 的定义；若要，必须在 `modified`/`mccabe`/`nonstrict`/`ignoreassert` 的互斥 closed policy 中选一条，而不是添加四条并行指标。
5. 是否对任一 Draft 授权进入 Plan 或 runtime implementation；本报告、Draft metadata 和通过机械检查均不替代该明确授权。

### 未知、限制与重新调查条件

- **未知：** 尚未取得真实 consumer project、可接受阈值、各语言 precision expectation、Halstead performance budget，或跨文件 capability 是否值得为某一规则新增显式 aggregation seam。
- **不应外推：** 上游测试证明的是 Lizard 1.24 行为，不证明 TypeScript port 的 parity、更不证明 Vibe Check public contract 的价值。`1.24.0` tag 以后 `master` 的未发布提交也不在本结论范围内。
- **重新调查条件：** 出现具体 consumer/threshold、产品决定重定义 CCN、`sync-lizard-typescript-port-to-1-24-0` 更新 baseline、Lizard 发布含 extension 变化的新正式版本，或 owner 改变 worker/DTO/Finding architecture 时，应重新做一轮报告或在授权 Change 中复核。

本报告形成时的实际动作仅为记录调查认识；它没有恢复 extension、变更 Product behavior、建立 Decision 或向外部系统写入。后续 Change 的创建、状态和授权由其各自 artifacts 与当前任务另行承接。

## 随附资源

- [形成时 Lizard 1.23.0 provenance ledger](./_resources/assess-lizard-extension-adoption-value/lizard-1.23.0-provenance.json)
