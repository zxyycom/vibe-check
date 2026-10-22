# Markdown Link 测试质量审计

## 结论与范围

本轮完整阅读 `src/package-checks/markdown-link-validation/**` 当前 **10 个测试文件、36 个 Bun 实体**的正文、断言及所用 helper；不是抽样。
没有找到可安全整实体删除或合并的充分证据。优先处理的是 JSONL 尾行测试中的无效证明与 append 生命周期测试的时序 oracle；此外，既有有效 exact-byte 场景尚未覆盖 target-only 分支，属于覆盖范围补强，不是将整个实体判为低质量。
另有两项可选局部证据加强建议和一项可直接移除的实现身份断言。以下均为静态审计建议，**未实施测试、源码或 Case 改动，也未运行测试正文或 mutation experiment**。

审计以当前 owner 为准，不把 Case 映射闭合、测试名、输入相似度或运行时长当作质量结论；不设删测配额。
这份临时材料不是新增测试义务或 Product 规范。Markdown native I/O 的其它会话工作不在本轮审查/修改范围内。

### 已审读测试文件与处置概括

以下路径均相对 `/workspace/vibe-check/`；实体数来自官方 Case 查询，与主线程提供的本轮全树 closure 范围计数一致。

| 测试文件 | 实体数 | 处置概括 |
| --- | ---: | --- |
| `src/package-checks/markdown-link-validation/cache-behavior.test.ts` | 3 | 保留容量消息隔离、best-effort 结算及有效 exact-byte 场景；补强 target-only 覆盖（M3）。 |
| `src/package-checks/markdown-link-validation/constructor.test.ts` | 1 | 保留 closed options、预算、prepare 与 final-data parser；只建议移除函数引用身份断言（M6）。 |
| `src/package-checks/markdown-link-validation/execution-outcomes.test.ts` | 3 | 全部保留：完整 Check 的 policy/安全投影、外部目标去敏、target 不扩展 source selection。 |
| `src/package-checks/markdown-link-validation/graph-behavior.test.ts` | 6 | 全部保留；missing/empty 初值 oracle 与批次取消阶段定位可加强（M4、M5）。 |
| `src/package-checks/markdown-link-validation/input-rejection.test.ts` | 2 | 全部保留：零选择与 all-rejected 不同；已分类 rejection 在后续 unavailable 时保留。 |
| `src/package-checks/markdown-link-validation/local-resolver.endpoints.test.ts` | 1 | 保留：direct endpoint 类型、fragment/flags、深路径、symlink cursor/hop 边界。 |
| `src/package-checks/markdown-link-validation/local-resolver.test.ts` | 5 | 全部保留：source containment、外部授权、logical budgets、固定观察、新 invocation 与首错停止。 |
| `src/package-checks/markdown-link-validation/markdown-parser.test.ts` | 4 | 全部保留：occurrence grammar、fresh slugger、UTF-16 ranges、immutable facts/controlled failure。 |
| `src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts` | 6 | 保留全部独立义务；尾行恢复/隔离与 append 开始后等待需要改写证明方式（M1、M2）。 |
| `src/package-checks/markdown-link-validation/unavailable-outcomes.test.ts` | 5 | 全部保留：各阶段 no-partial publication、root/source errors、取消及 publication 前停止。 |
| **合计** | **36** | **2 个实体局部改写候选、1 项覆盖范围补强、2 项可选局部加强；另有 1 个实体内单断言删除候选；0 个整实体删除/合并建议。** |

## 依据与查询边界

- 已读 [测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)、本项目 `test-evidence-review` skill、[编码规范](../../docs/development/coding-style.md)、文档导航及 README 的 Check 路由。
- 公开 owner：[Markdown Link Check](../../docs/checks/markdown-link-validation.md)，重点为参数、cache、执行阶段/预算/取消、结果和 I/O 安全边界。
- 内部 owner：[Markdown Link 解析与目标授权](../../docs/development/markdown-link-resolution.md)，重点为 source facts、单次图观察、direct targets、parse-facts cache。
- CodeGraph 首先恢复了 36 个模块文件，以及 `executeMarkdownLinkValidation` → traversal/resolver → parse-cache、graph/target observation 的调用关系；随后逐行读取实际测试和相关实现。CodeGraph 的缺失符号查询没有被当作实现不存在的证明。
- 直接核对的实现/辅助证据为同目录 `constructor.ts`、`options-validation.ts`、`execution.ts`、`source-traversal.ts`、`source-reader.ts`、`resolver-engine.ts`、`reference-graph.ts`、`target-observation.ts`、`filesystem-probes.ts`、`markdown-parser.ts`、`parse-facts-cache/{session,payload}.ts`、`constructor.test-support.ts`、`local-resolver.test-support.ts`，以及父目录 `check-execution.test-support.ts`。另读了 `measurement.test-support.ts`，但它不是本轮实体，未用它替代行为测试。
- 官方查询实际执行：`bun run test-evidence -- topics --root .`；`list --query markdown-link-validation --limit 100 --root .`（返回 7 个 Cases、覆盖本范围 36 实体）；`show AUX-MARKDOWN-LINK-PARSER-001`、`show AUX-MARKDOWN-GRAPH-EXECUTION-001`、`show AUX-MARKDOWN-LINK-OPTIONS-001`（均带 `--root .`）。首次猜测的 topic `markdown-checks` 查询为空，随后按官方 topic/query 恢复，没有把空结果当作无 Case。
- 其余关联 Cases 由官方 `list` 返回：`AUX-MARKDOWN-LINK-OUTCOMES-001`、`AUX-MARKDOWN-LINK-CACHE-CAPACITY-001`、`AUX-MARKDOWN-LINK-TARGET-001`、`AUX-MARKDOWN-GRAPH-OBSERVATION-001`。本报告不复制第二套完整 entity 账本。
- 全树 `check` 由主线程统一执行，本代理未重复运行。映射合法不等于以下证明缺口已闭合。

## 优先候选

### M1：改写尾行测试；当前 newline-isolation 断言已由 fixture 自己满足

- **实体完整名：** `Markdown Link parse-facts cache > ignores malformed, unknown, and unterminated lines while last valid identity wins`。
- **位置：** `src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts:197-240`，尤其 201、223-226、238-240；相关实现为 `parse-facts-cache/session.ts:123-135,144-148`。
- **owner 承诺：** [parse-facts cache](../../docs/development/markdown-link-resolution.md#markdown-link-parse-facts-cache) 第 78-81 行要求即使尾行本身有效，未以 newline 结束也不得恢复；第 96-98 行要求 append 前隔离旧 partial tail，避免新完整 line 粘连损坏。
- **具体缺陷（静态事实）：** `envelope(...)` 本来是完整 JSON，201 的 `.slice(0, -1)` 删除了闭合 `}`，所以该输入同时是 malformed JSON；错误实现若仍尝试解析无 newline 尾行，也可因 JSON 语法错而通过。另一方面，223-226 的 fixture 自己先写入 `\n${envelope(...)}`，因此 238 的 `contents.includes(partialTail + "\n{")` 在 `finalize` 前已经为真。删除实现中 144 的隔离 newline，现有 `includes` / `endsWith` 检查仍无法辨别尾部两个 JSON 是否粘连；这是推导，尚未运行 mutant。
- **最小动作：** 保留 malformed/unknown/last-valid-wins 目的；分别使用“完整有效 JSON、但无终止 newline”的尾行检验不恢复，以及在无 fixture 预先补 newline 的场景下 finalize 后解析完整 lines，断言旧尾行隔离且新 identity 可由新 session 恢复。不要只检查字符串中任意位置存在换行。
- **删除后的证据去向：** **无现存断言完整承接这两项义务，不能删除实体。** 本实体 222、228-234 对 last-valid-wins/restore-once 有价值；`cache-behavior.test.ts:115-122` 的 hostile payload 退化只承接 malformed miss，不承接有效尾行拒绝或新 line 隔离。应在原实体内改写局部 fixture/断言，不必为入账本机械拆实体。

### M2：改写 append 生命周期测试；不能用第几次 `aborted` getter 代表 I/O 已开始

- **实体完整名：** `Markdown Link parse-facts cache > awaits the append once publication has started despite later cancellation`。
- **位置：** `src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts:162-191`，尤其 165-174、184-190；实现 `parse-facts-cache/session.ts:138-148`。
- **owner 承诺：** [cache 取消与发布](../../docs/checks/markdown-link-validation.md#取消与发布) 第 159 行及[内部 cache](../../docs/development/markdown-link-resolution.md#markdown-link-parse-facts-cache)第 96-98 行：append 开始后等待完成，finalize 幂等，不启动后台写入。
- **具体缺陷（静态事实）：** Proxy 在第二次读取 `aborted` 时先保存旧 `false`，随后立即 abort，再把旧值返回；取消实际上发生在 `appendFile` 调用之前，而不是其 pending 期间。测试锁定了当前实现恰好两次 getter 的细节；新增合法检查点会改变时序。它也没有使 append 可控地保持 pending，不能确定性判断 `finalize` 是否提前返回；最后读到一行只证明那个时刻文件有一行，未独立观察“append pending 时 finalize 仍未完成”。
- **最小动作：** 保留本实体的独立生命周期义务，但以可观察的 append-start / pending / completion 边界安排取消，并断言 completion 前 finalize 不结算、completion 后结算且第二次 finalize 不重复 append。实现这一证明的工具/接缝需另行评估；不得为了通过审计临时增加 Product 测试专用公开接口。若现有边界无法稳定自动化，应按测试策略记录 `Manual CR:` 对象和条件，不能继续把 getter 次数当作已开始 I/O。
- **删除后的证据去向：** **没有等价的当前 pending-append 断言，须改写而非删除。** `unavailable-outcomes.test.ts:174-213` 的 `default Check direct callbacks > does not start parse-facts publication after cancellation without reporting stale findings` 证明 publication 前取消无文件；本实体 184-190 仍提供 finalize 重复调用后只产生一行的 smoke evidence。前者不能替代开始后的等待义务。

### M3：保留有效 exact-byte 场景，另补 target-only 分支覆盖

- **实体完整名：** `default Check direct callbacks > invalidates source and direct-target parse facts by exact content bytes`。
- **位置：** `src/package-checks/markdown-link-validation/cache-behavior.test.ts:141-180`，尤其三次执行所用 `MARKDOWN_FILES`；helper 为 `constructor.test-support.ts:10-12`。
- **owner 承诺：** [cache 启用与复用](../../docs/checks/markdown-link-validation.md#启用与复用) 第 140-141 行与[内部 cache](../../docs/development/markdown-link-resolution.md#markdown-link-parse-facts-cache)第 92-94 行要求 source/target 当前 exact bytes 重新授权读取；[单次图观察](../../docs/development/markdown-link-resolution.md#单次引用图与观察)第 36 行区分已加载 source facts 与 target-only facts。
- **覆盖边界（静态事实，非既有断言失效）：** `docs/guide.md` 和 `docs/target.md` 都匹配 `MARKDOWN_FILES`，target 被 source traversal 提前读入；`target-observation.ts:20-21` 复用其 source facts，`readTargetFacts`（96-108）不是此场景的执行路径。标题只称 source/direct-target，并未声称 target-only；当前测试有效证明 source/target 角色重叠时的 byte invalidation。target-only 读取路径在 warm cache 下仍读取当前 bytes，则尚未由此场景证明；仅让该路径错误复用旧 target bytes/facts，不影响现有三次状态变化。
- **最小动作：** 保留既有有效场景，另以 files 限为 `docs/guide.md` 的 cold/warm/target-change/source-change trial 补强 target-only 覆盖，保证 target 只能经 direct-target 分支提供 headings；用独立的 `missing-anchor` Record、source/occurrence/target counts 锚定失败原因。可在原实体内增加 trial，不要求为覆盖补强拆分实体或 Case。
- **删除后的证据去向：** **没有当前 enabled-cache target-only byte invalidation 断言，不能删除实体。** `execution-outcomes.test.ts:166-202` 的 `default Check direct callbacks > validates a direct Markdown target outside source scope without scanning its links` 已有 source-only selection 与准确 counts，但 cache 关闭、没有跨 invocation 改 bytes；只能复用其 fixture 边界，不能替代本项。

## 次级局部建议

### M4：可选加强 snapshot 的首次 missing / empty 锚点；现有 metamorphic 证据有效

- **实体完整名：** `Markdown reference graph > fixes missing and directory observations while observing logical aliases independently`。
- **位置：** `src/package-checks/markdown-link-validation/graph-behavior.test.ts:66-103`，尤其 74-76、90-93。
- **owner 承诺：** [单次图观察](../../docs/development/markdown-link-resolution.md#单次引用图与观察)第 38-40 行及[执行阶段与节点观察](../../docs/checks/markdown-link-validation.md#执行阶段与节点观察)第 178-179 行要求首次缺失/目录 entry 结果固定，下轮才观察变化。
- **可选加强的证据边界：** `missing`、`empty` 预期均取自本次被测 resolver 的首次返回，再与后次返回比较；这是有效的 metamorphic equality，不是恒真或自证循环，能检出中途创建后错误重查并改变结果的回归。它未独立检查 baseline 确实是 `missing-target` / `empty-directory`；增加该锚点可使本场景对“两次均错误放行”的失败更明确，但不应据此否定现有固定观察证明。
- **可选动作：** 增加两项独立的首次/复用后完整 finding 预期，再保留修改文件与新 invocation 的对照；别名分离断言 77-88 原样保留。
- **删除后的证据去向：** endpoint 实体 `Markdown local resolver > resolves direct local files, directories, and same or cross-document anchors` 在 `local-resolver.endpoints.test.ts:74-78,90-97` 已锚定分类器的一次性 missing/empty，但没有中途创建文件/目录 entry；**无现存断言承接冻结缺失与目录状态，不删除整个实体。** 该建议为局部加强，不否定跨调用比较的全部价值。

### M5：真实事件循环取消证据保留；不要把它升级解释为“每 256 边”均已证明

- **实体完整名：** `Markdown reference graph > yields edge batches to timer and I/O cancellation without publishing normal Records`。
- **位置：** `src/package-checks/markdown-link-validation/graph-behavior.test.ts:241-288`。
- **owner 承诺：** [协作取消](../../docs/checks/markdown-link-validation.md#协作取消与完整发布)第 194-196 行及[内部图观察](../../docs/development/markdown-link-resolution.md#单次引用图与观察)第 43-44 行要求阶段/节点/每 256 边真实让步，取消后不发布普通 Records 或 data。
- **具体证据边界：** timer / I/O 在 `resolveAll` 之前即排队；同文档 resolver 场景确实能区分真实事件循环与单纯 microtasks，不能删成“仅实现细节”。但即使移除 `resolver-engine.ts:139-141,159-161` 的批次内 checkpoints，阶段末的 143-145 / 106-107 仍可能观察到同一取消，现有最终 unavailable 断言不能区分。完整 Check 场景更可在 root/source 前期 I/O 或 checkpoint 取消，未证实取消已经到达逐边结算。
- **后续可选验证：** 保留已有真实 timer/I/O 事件循环证明。精确每 256 边边界是否需要增强，先以阶段观察与隔离环境中移除批次内 checkpoint 的 mutant 验证当前证据灵敏度，再决定局部动作；本轮不把未执行的 mutant 推导升级为已经证明的测试失效，也不靠总耗时阈值替代阶段证据。
- **删除后的证据去向：** `unavailable-outcomes.test.ts:139-168` 只承接预先取消；没有等价的真实事件循环/边阶段取消证据。**整实体必须保留；这里是证明范围不足/局部改写建议，不是已运行 mutant 的结论。**

### M6：可直接移除单个函数引用身份断言，不删除 constructor 实体

- **实体完整名：** `default Check direct callbacks > materializes bounded Markdown Link defaults and rejects malformed resolved options`。
- **位置：** `src/package-checks/markdown-link-validation/constructor.test.ts:140`：`assert.equal(defaultCheck.parseData, parseMarkdownLinkValidationData)`。
- **owner 承诺：** [效果与结果](../../docs/checks/markdown-link-validation.md#效果与结果)第 269-273 行允许用 Check parser 或 root parser 验证 final data，要求返回领域 data / 非法输入抛 `TypeError`；没有要求二者是同一个函数对象。
- **具体缺陷：** 引用相等锁定当前 wiring；语义等价 wrapper 不违反公开承诺，却会使此断言失败。这不是回归证据，应删该行，而非删除承载其它独立义务的整个实体。
- **删除后的现存承接断言：** 同实体 141-155 已直接调用 `defaultCheck.parseData` 并与手写完整结果比较；157-167 对非法计数要求抛错。它们承接 parser 暴露与实际行为，不依赖函数身份。本地导入随后是否仍有用途可随改写清理，不扩张到其它文件。

## 强制保留的独立边界

- **10,001 logical occurrences / target reads**：`graph-behavior.test.ts:190-237` 的 false、显式较大 totals 与有限 10,000 三组路径有固定 counts/失败预期；constructor 接受大数字不能替代 runtime 成功与计费证据。同节点共享 parse cache 不使这些图/预算 trial 失去独立性。没有按慢/快裁决。
- **阶段化首错与无部分 publication**：`graph-behavior.test.ts:145-184` 用非法 UTF-8 target 与 batch budget/source size 对撞；`unavailable-outcomes.test.ts:12-77` 证明 occurrence/target 限制映射为完整 Check unavailable/messages/no Records；`input-rejection.test.ts:92-121` 又证明 rejection 已接受 facts 不随 unavailable 丢失。输入看似重复，调用方可见失败不同。
- **真实 filesystem 与逻辑观察**：local resolver 的 containment/symlink/missing/file mutation，graph 的 alias/auth-domain/source-role 复用分别证明授权、固定观察与 identity；不可改成只模拟 resolver 返回值，也不可把 logical `targetReadCount` 当 syscall 计数。
- **parser / payload / complete Check**：parser 的 `expectedRange` 是从 fixture 文本计算位置，不调用被测 parser；UTF-16 测试另有手写固定坐标。payload round-trip 比较独立原始 facts，并有 closed-shape / reversed-range 拒绝，不因调用配对 projector 就自动构成自证循环。cache/no-cache differential 是要证明不改变结算，完整 Check 的手写 Records/data 另有独立锚点；不删这些不同边界的证明。
- **安全投影**：`execution-outcomes.test.ts:101-160` 手写完整 safe Record 且检查序列化内容不含外部 path/fragment/query，是完整 Check 投影证据；resolver 的 outside descriptor 不替代 execution/messages 不泄漏证明。
- **容量提醒与 best-effort**：unit 严格大于阈值、默认 16 MiB、UTF-8 失败关 publication，与 integration 中 warning 不改 status/data/Records/messages 是不同层级；容量规模本身不是删除理由。read/append 的失败被允许退化，不能据此把成功空结果与失败分支合并。

## 未证明、未覆盖与交接

1. 本轮静态读审没有执行测试正文、mutation、完整 Gate、build、安装或网络访问；不能据此声称 36 个实体当前通过、M1/M5 mutant 已实际幸存，或改写方案已可运行。源代码与 Case 均未修改。
2. 安全测试中的 `targetReadCount === 0` 是 **logical** 计费证据（公开 owner 第 183-186 行），不是“未发生任何 root 外 lstat/read/open”证据。现有可读外部 fixture 即使被多做一次探测也未必改变结果。这是需要独立 I/O 观察或 `Manual CR:` 的未证明边界，不是删除当前授权矩阵的理由；不在本轮擅自重做另一会话的 native I/O。
3. 未扩展审查 `markdown-lint`、共享 collection、其它 owner 的测试实体，也未追查平台未执行分支是否在 Windows CI 真正运行。source/target no-follow hostile replacement 保证以 owner 明示的非原子边界为限，不额外发明安全义务。
4. 主线程若安排动态基线，最窄对象是上述单个实体对应的 `bun test <file> --test-name-pattern '<leaf name>'`；已向主线程报送 M2/M3 的精确命令。M1/M5 的反证需要隔离副本中的定向 mutant，单跑现有测试通过并不闭合证明缺口。
5. 后续实施仍需按原 Case 目的保留身份连续性，运行最窄测试和全树 `bun run test-evidence -- check --root .`；本报告不擅自增加 Case、不预先删除映射。本轮报告材料校验由主线程统一安排。
