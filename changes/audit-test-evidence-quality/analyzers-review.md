# Function-metrics analyzer 全量测试质量审查

## 结论与范围

本分区已逐体审查 **26 个测试文件、82 个当前 Bun 实体、8,442 行**，不是抽样。
结果是 **80 个实体保留、1 个实体保留但须补强 corpus 完整性、1 个实体保留并可删除其中一个完全重复的参数行**。
没有足够证据建议直接删除任何整个实体；没有按耗时、文件长度、翻译来源或配额筛选。

本轮只写本报告和隔离 scratch，不修改测试、Case、Product、provenance、oracle 或 Gate，也未 stage/commit。
下面“须补强”和“可删除”都是后续实施建议，不表示已生效。

### 审查输入与闭合

- 读取项目 AGENTS、导航、测试策略、Case 维护、编码规范及 `test-evidence-review` skill；产品公开 owner 为
  `/workspace/vibe-check/docs/checks/function-metrics.md`，内部 owner 为
  `/workspace/vibe-check/docs/development/scanner-dependencies.md#owner-local-adapters`，来源维护 owner 为
  `/workspace/vibe-check/docs/tooling/source-mapping.md`。
- 读取本分区全部实体正文、setup、helper 和参数矩阵，并读取实际委托的 **110 个 source fixture**，不是只读 shared harness。
  分别审查 82 项 normal/edge oracle、27 项 malformed oracle、27-reader mapping、110 项 selected-extension fixture observation
  加 10 项 semantic input、78 项 raw-token observation、14 项 upgrade observation 加 2 项原始 TypeScript defect control。
- 来源身份实体的完整 helper 已读；对照 root ledger 的 46 个 translated source/range、83 个 class identity、841 个 symbol/seam mapping
  全部读取。JSON 的大矩阵以保留字段的紧凑投影逐项读取；source→symbol 验证与 parser 行为验证没有混为一谈。
- 必要实现沿 CodeGraph 查询和邻近源码读取：真实 pipeline/façade/registry、extension protocol/registry/output、模型与 state aliases、
  callback dispatch、Go/Ruby-like shared states、Rust/Kotlin 修正、Swift label composition、ST state 和 ND 等。
- 82 个精确 entity key、逐体 verdict、Case IDs、文件摘要与已读委托材料在本地
  `/workspace/vibe-check/.log/test-quality-audit/20261022-full-02N0Mb/analyzers/coverage.json`；`unreviewedEntityKeys` 为空。
  26 个测试文件与派发 scope 的 SHA-256 一致。该 scratch 是本轮取证，不是新增的提交实体账本。
- 使用主线程已执行的全树注册闭合作为身份背景，不重复注册。闭合不证明正文通过或断言质量。

## 需要处理的具体候选

### AN-CENSUS-001：补强 selected-extension corpus 的实际集合校验，保留实体

- **实体完整名称：** `Lizard port façade > matches the fixed-tag selected-extension corpus across every reader fixture and semantic case`。
- **位置：** `/workspace/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.test.ts:100-120`；
  shape helper 在同文件 `:162-185`。
- **Case / owner：** `FM-ANALYZER-PORT-FACADE-001`；
  `/workspace/vibe-check/docs/development/scanner-dependencies.md#owner-local-adapters`。
  当前证明目的包括全部 110 个 normal/edge/malformed fixture 及 10 个扩展语义输入的真实结果。
- **具体缺陷：** `:106-107` 只检查 JSON 自带的 `fixtureCount === 110`、`semanticCaseCount === 10`；
  helper 只确认 `fixtures`、`semanticCases` 是数组并遍历成员，从未将计数字段连接到实际数组长度，也未锁定成员身份或排除重复。
  因而保留这两个 metadata 数字、将两个数组置空时，shape 校验仍接受，`:108-120` 的全部 Product 调用与结果对比被跳过。
  仅删除某一语言或 semantic row、或用另一行替换它，也没有独立的覆盖拒绝信号。
  这是由当前控制流可构造的静态通过路径；本轮没有动态改 fixture 或运行该测试。
- **不是自身 oracle：** 当前各行的 metrics/tags/ND expected 来自固定 tag 的 Python `FileAnalyzer` observations，
  test 的 `expectedMeasurement` 是数据透传，不调用 TypeScript analyzer 计算 expected。问题在于 corpus 可以静默缩水，
  不是现有 120 行的 expected 不独立。
- **最小动作：** 保留该实体和现有独立 expected；至少将 metadata 与实际数组长度相连，并验证 fixture 路径与当前预期 fixture 集合一致、无重复。
  10 项 semantic identity 应有独立的预期集合，而不是再次从同一个被检数组生成 expected。
  可以使用现有 fixture 树和 reader mapping，不创建第二套持久 entity ledger。
- **回归承接：** 仍由本实体承接 selected pair 的全语言 contributor/ND 行为；直接 reader tests 使用五个 core processors，
  malformed test 没有扩展，不能替代这个 selected-body obligation。不能因补强需要而删除整个实体或整个矩阵。
- **后续验证：** 目标测试及全树 Test Evidence；最窄负向证明可在隔离副本只改此 JSON 的数组成员、保留 metadata，
  确认新 guard 拒绝 empty/missing/duplicate rows。本轮未执行该动态方案。

### AN-CENSUS-002：删除一个完全重复的 Swift 参数行，不删除实体

- **实体完整名称：** `Go-like readers preserve all Lizard 1.24 upstream language scenarios`。
- **位置：** `/workspace/vibe-check/src/package-checks/function-metrics/analyzer/readers/golike-readers.test.ts:519-525`；
  前一份相同输入与预期在 `:512-518`。
- **Case / owner：** `FM-ANALYZER-READERS-E-001`；
  `/workspace/vibe-check/docs/development/scanner-dependencies.md#owner-local-adapters`。
- **具体缺陷：** `upstreamCases` 的零基第 64、65 行完全相同：均为 `SwiftReader` / `swift`，相同 `protocol p`
  （`func f1() -> Double` 与 `var area: Double { get }`）后接空 `class c`，相同源码字节、相同 `expected: []`。
  这里不是不同后缀、空白、入口或生命周期的同形对照。每次 `analyze` 都进入真实 `analyzeSourceCode`，新建 context/reader；
  没有第二次调用才验证的共享状态断言。
- **最小动作与回归承接：** 只删除 `:519-525` 的后一参数行，保留 `:512-518` 的相同 protocol/get-declaration exclusion 回归。
  同一个实体及 Case 不删除、不拆分；其余 Go、Rust、Scala、Solidity、Zig、Swift、Kotlin 矩阵保持。
  静态 AST 枚举确认当前 `upstreamCases` 共 102 行，此处是该数组中唯一完全相同的整行。
- **后续验证：** 最窄 Go-like reader 测试与完整 Test Evidence。未测量时长，也不声称删一行能改善 Gate 性能。

## 逐文件覆盖与处置

下表路径相对仓库根。

下表每一行都是全文审查，不是按名称推断。除显式列出的两项外，没有形成清理候选。
Case 简写均指当前 `FM-ANALYZER-…-001`，精确关联见当前 Case 账本及本地 coverage。

| 测试文件 | 实体数 | Case / 处置与主要证明信号 |
| --- | ---: | --- |
| `src/package-checks/function-metrics/analyzer/extension-output.test.ts` | 3 | CORE；保留。独立 2/8→5、3/5→4、missing attribute 拒绝、精确 schema/format strings、Unicode 宽度、ordered cross/print lifecycle。 |
| `src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts` | 11 | EXTENSION-PROTOCOL；保留。真实 lookup/MRO/special-call、排序与非法 index 拒绝、metadata shadowing、context/brace handoff、selected/deferred registry 与 ND args。 |
| `src/package-checks/function-metrics/analyzer/model-context.test.ts` | 2 | CORE；保留。source alias 经真实分析及 cross-file mutation 变为 CCN 8；decorator 经真实 context 观察 nesting/token 行号，不是只测 fixture 自己。 |
| `src/package-checks/function-metrics/analyzer/pipeline.test.ts` | 5 | CORE；保留。独立完整 function/file metrics、comment/generated stopping、Python whitespace、present-undefined 传播；默认入口对比另有固定 expected。 |
| `src/package-checks/function-metrics/analyzer/port-facade.test.ts` | 3 | PORT-FACADE；2 保留、1 按 AN-CENSUS-001 补强。精确 frozen facts 与 unsupported 拒绝；ASCII/Unicode/换行 fallback 对照及完整 selected corpus。 |
| `src/package-checks/function-metrics/analyzer/reader-registry.test.ts` | 3 | READER-REGISTRY；保留。独立 source-order 名单与 55-suffix dispatch 表、大小写、unknown/无后缀拒绝及 R/r metadata。 |
| `src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts` | 7 | READERS-D；保留。全部 fixture 与 Java/C#/ObjC/TTCN 专属 source 矩阵均有实际 metric/name/range/longName expected。compact helper 只按 expected 选择观测字段，不从 SUT 生成 expected。 |
| `src/package-checks/function-metrics/analyzer/readers/erlang.test.ts` | 1 | READERS-A；保留。4 suffix、source/comment/guard/macro；8 source、9 adversarial、9 Pygments rule rows 和 66-token exact probe 全部已读。 |
| `src/package-checks/function-metrics/analyzer/readers/fortran.test.ts` | 1 | READERS-A；保留。9 suffix、fixed/free tokenizer 与完整 29 source rows 的 file NLOC、function list、parameters、nesting/ranges。 |
| `src/package-checks/function-metrics/analyzer/readers/golike-readers.test.ts` | 2 | READERS-E；实体均保留，仅 AN-CENSUS-002 删除一个重复参数行。全部 102 upstream rows、7 reader fixture groups 和 backtick controls 已读。 |
| `src/package-checks/function-metrics/analyzer/readers/javascript.test.ts` | 1 | READERS-C；保留。真实 reader 的 regex/template tokens、nested function/class/object/computed/export/arrow names 与 metrics。 |
| `src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts` | 1 | MALFORMED-DIFFERENTIAL；保留。27 个 reader-targeted source、SHA、exact source-order mapping 与完整 function observations，含非空与空结果。 |
| `src/package-checks/function-metrics/analyzer/readers/php-plsql.test.ts` | 3 | READERS-F；保留。PHP block/namespace/trait/closure/特殊问号 token，PL/SQL nested procedure/function、exception、trigger 均有独立预期。 |
| `src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts` | 10 | READERS-B；保留。Python/GDScript/Ruby/Lua/Perl/R 每个实体及所有分支输入已读，包含 token、完整 metrics、names 和有界 CCN controls。 |
| `src/package-checks/function-metrics/analyzer/readers/st.test.ts` | 1 | READERS-A；保留。fixture、function-block/function/action boundaries 与 17 source rows，包含 empty/comment/directive exclusion。 |
| `src/package-checks/function-metrics/analyzer/readers/tsx.test.ts` | 1 | READERS-C；保留。JSX/attribute/arrow 的 token 与函数顺序/范围，并有独立 Node-baseline 未闭合模板尾部 token/offset 预期。 |
| `src/package-checks/function-metrics/analyzer/readers/typescript.test.ts` | 1 | READERS-C；保留。declare/type/interface exclusion、typed/generic/decorated functions、template/regex 和有界 tokenizer-tail token/offset 全读。 |
| `src/package-checks/function-metrics/analyzer/readers/vue.test.ts` | 1 | READERS-C；保留。normal/edge 与多 script block 的顺序/metrics/ranges；不把启发式 reader 行号扩大为完整 AST source map 承诺。 |
| `src/package-checks/function-metrics/analyzer/shared/clike.test.ts` | 3 | CORE、CLIKE-OVERRIDE-SEAM；保留。真实 shared transition/super dispatch、r-value correction、Unicode names 与派生 condition categories。 |
| `src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts` | 7 | CORE；保留。addition eligibility、raw/factory offset、零宽/Unicode、惰性 return/throw、callback reentry/receiver、source fields/decorator factories 均有实际信号。 |
| `src/package-checks/function-metrics/analyzer/shared/golike.test.ts` | 2 | CORE；保留。最小 source subclass 使用真实 GoLikeStates，独立 function metrics 和 override event 断言；不是只断言 fixture 日志。 |
| `src/package-checks/function-metrics/analyzer/shared/js-style-regex.test.ts` | 3 | CORE；保留。六消费者 78 项独立 raw-token oracle、factory offset/惰性尾部拒绝及真实跨行/astral division 指标。 |
| `src/package-checks/function-metrics/analyzer/shared/rubylike.test.ts` | 2 | CORE；保留。真实 shared subclass cloning、function keyword、inherited callbacks 经最小 consumer 观察；合成 Lua-like consumer 不等于 concrete Lua reader 的集成证明。 |
| `src/package-checks/function-metrics/analyzer/source-baseline-upgrade.test.ts` | 3 | PORT-FACADE、READERS-E；保留。14+2 原始 observations 与产品 correction 分离；Rust 7 输入×3 extension lifecycle、Kotlin 7 boundary inputs 加 accessor 完整期望。 |
| `src/package-checks/function-metrics/analyzer/source-identity.test.ts` | 1 | SOURCE-IDENTITY；保留。真实 production AST 与独立 curated manifest/root ledger 的 exact source/target 闭合；不是 fixture 只与自身比较。 |
| `src/package-checks/function-metrics/analyzer/typescript-metrics.test.ts` | 4 | `FM-TYPESCRIPT-NULLISH-METRICS-001`、`FM-TYPESCRIPT-FUNCTION-BOUNDARIES-001`；保留。typed-tail、7 operator controls、ND 状态矩阵、逻辑 AND/OR 对照及 Kotlin negative controls。 |
| **合计** | **82** | **26 文件；80 原样保留，1 保留并补强，1 保留并清理单行。** |

## 必须保留的独立证明边界

1. **翻译来源与来源身份不是删除理由。** 当前 owner 明确保留完整 in-memory lifecycle、OutputScheme pure formatting 和 closed extension protocol；
   没有从“Product 不提供 CLI/plugin”推出这些 private translated bodies 已失去义务。
   source identity 读取真实 TypeScript targets 的 AST，再与独立 curated mapping/root inventory 对照，能检测身份消失或重定向。
   它不执行 reader，所以也不能反向替代语义矩阵。
2. **默认 pipeline 的对比不是裸自比较。** `/workspace/vibe-check/src/package-checks/function-metrics/analyzer/pipeline.test.ts:133-178`
   先断言 CCN 2、20/19 tokens、参数与范围等硬编码结果，再比较 default/constructed/helper 三入口；共享错误不能靠入口一致而通过。
3. **façade differential 有明确窄目的。** `port-facade.test.ts:57-98,215-243` 的 expected 使用 source-order registry/core，
   不是独立 parser oracle；它证明的是 host fast-path/fallback 与原 registry 一致。独立 fixed-tag corpus 和首个硬编码 façade test
   另外证明分析结果，所以不能把 resolver seam 对照按“复用同一分析器”直接删掉。
4. **所有语言的实际 expected 均已读。** 例如 Erlang 保留 Pygments token quirks、Fortran 变量名 `if` 的 source-faithful CCN、
   R alias 的异常 NLOC、ST 某些声明提前结束等 observations；它们属于启发式 source parity，不是完整语言语法正确性的宣称。
   大矩阵有真实的不同输入/可观察结果，不能因行数多要求拆成新实体或删行。
5. **原始缺陷 control 与正确期望分开。** upgrade test 保留 upstream typed-tail CCN 4/ND 3 与四项 nullish CCN 9/ND 8，
   实际 Product 断言另为真实正文边界、CCN 1/5、ND 0/4 与正确 tags；没有把旧错误当正确计量定义，也没有静默改写原 oracle。
6. **测试支持不是自动的 fixture 自证。** shared CLike/Go-like/Ruby-like consumer 中的关键动作仍由生产 shared class/context 完成；
   独立结果/事件断言证明 subclass dispatch、receiver 或继承 callback。其范围是 shared seam，不自动证明 concrete language path。

## 边界、未决项与验证

- **未发现可直接删除的整个实体；不把潜在 coverage 扩展当删测依据。** 例如 synthetic Ruby-like seam 不足以单独证明 concrete Lua
  assigned-anonymous 接线，source-field roundtrip 也不单独等于所有消费者共享 storage；应按本表给定的窄证明范围解释，不能将这些边界误记为全文无效。
- 当前 READERS-A Case 的叙述仍写“七条 Pygments rules”，现有测试数组实际是九条。这是说明计数陈旧，不是测试无质量或应删两条的理由；
  后续若触及该 Case，应同步描述。这里不更改账本，也不由历史材料反向创建新的测试义务。
- oracle README/metadata 记载固定 `1.24.1` tag/revision 和 Python 形成路径，当前 expected 与 TypeScript SUT 的运行时计算独立。
  本轮没有外部 checkout、联网、安装或重新生成上游 observations，**没有重新认证当时上游执行**。
- 本轮仅运行本地只读读取、CodeGraph 查询和静态 AST/JSON 枚举；AST 枚举确认矩阵数量及 Swift 完全重复行，SHA 对照确认测试快照未漂移。
  没有执行任何测试正文、benchmark、完整 Gate 或 source-mapping sync；因此不宣称测试通过、性能改善或安全清理已动态证明。
- 正式改动只有本报告。文档材料与 Change 校验、全树 Test Evidence 的最终合并验证由主线程按本轮授权统一处理；
  后续实际删行/补强必须运行最窄目标测试并再次完成全树闭合。
