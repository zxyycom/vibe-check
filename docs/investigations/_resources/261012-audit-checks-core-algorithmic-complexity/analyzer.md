# Function analyzer 全部 46 个生产文件的复杂度审计

## 范围、方法与边界

本切面审阅冻结 HEAD `21777db37c0284308b8c69eb2cc92ab0b012cd9b` 下 analyzer 的 46 个生产 TypeScript 文件（27 reader，含共享 C/C++ reader）。每个文件均按实际 tokenizer、继承/调用链、状态更新、集合增长、replay/EOF 路径审阅，不以搜索命中作为完整深审。成员与 SHA 来自 `source-inventory.json`，逐文件结论在 `analyzer-coverage.json`。不含测试、fixtures、第三方引擎内部算法，也不重报已修正的 `setImmediate` admission yield。

先读取 AGENTS、navigation、scanner-dependencies、source-mapping、Lizard performance owner，以及 investigation-report/performance-optimization skill。CodeGraph 的 explore 没有暴露；实际使用 `codegraph_callees/callers(addToLongName)`，caller 能定位 context/parameter 桥，但 callee 出现无关资源变量，不能证明完整调用闭合；随后通过限定 analyzer 路径逐文件读取。来源规则：Lizard 1.24.1 source-aligned internals 优先忠实翻译，报告不批准优化、升级或新增偏差。

变量：N 为源字符数，T 为 token 数，D 为当前嵌套状态/namespace 深度，K 为候选声明数，I 为 interpolation 数，L_j 为第 j 次追加前的签名字符数，O 为必须交付的函数名/贡献项等输出字节或条目。Product 单文件 8 MiB、aggregate 64 MiB 是输入界限，不是深度/签名/插值数量上限，也不证明在上限内可接受耗时。façade 本身没有这些 cap；cap 由外层 Check measurement 拥有。

证据分级：**静态+操作计数**确认源码执行的增长操作；**静态/条件**只描述触发路径或可能的引擎成本；不把主体长度、调用数或潜在 regex 回溯空间当 wall time。无 baseline、CPU/RSS 或完整 Check benchmark，因此不声称现实瓶颈、收益、全部 reader 线性，也不宣称已确认指数复杂度。

## 四项已确认的独立根因

### A01 — 每次签名追加都 Unicode 展开完整已有 longName

- 定位：`analysis-model.ts:290-296 FunctionInfo.addToLongName`；`addParameter:303-313`；`analysis-context.ts:712-728`；声明状态通过这些桥进入。每次 `Array.from(this.longName).at(-1)` 为取一个尾 code point 遍历并分配完整已有字符串；`Array.from(appended)[0]` 单次扫描 appended，总和通常仅是输入/签名大小。
- 推导：时间/累计临时元素 Θ(Σ L_j)，固定短 token 的 q 次追加为 Θ(q²)；单次瞬时 array 空间 Θ(L_j)。参数/返回类型的最终签名只要求 Θ(L_final)，二次展开不是必要输出。`name +=`/参数片段 `+=` 的引擎 rope 成本不用于这个结论。
- 合法触发：`def f(a0,a1,...): pass`，大量参数（探针 16/32/64/128）；还存在合法表达式括号被当前 TS 状态当候选声明处理、最后不输出函数的路径。没有 signature length 或 parameter 数量输入硬 cap（metric maximum 只在分析后判 Finding）。
- 计数：Python q=16/32/64/128 时追加前字符总和为 1349/5669/23525/96885；输出参数数准确为 q、函数一项。这是实际调用前量取 L_j，静态源码保证随后 Array.from 展开；不是仅字符串长度拟合。
- 最小方向：仅读取末 code point（须正确处理 surrogate pair）和首 code point，或维护已有 tail；不可用裸 `at(-1)` 破坏 Unicode 字母间加空格规则。必须保持 longName/参数/token/metric 语义；该 translated body 的改动需另行批准和 source-alignment/parity 验证。

### A02 — 子状态链每个 token 从根逐级递归派发

- 定位：`shared/code-reader.ts:207-210 subState, 218-237 consume/invokeCurrentState`；`shared/golike.ts:25-35, 123-128`；`shared/rubylike.ts:27-49, 82-96, 104-129`；`readers/typescript.ts:335-367, 386-399, 426-436`；Java 的 `java.ts:120-130, 201-210` 与 `java-body-states.ts`，Erlang 的 `_state_func_first_line`。TSX tokenizer 还有独立的 `Tokenizer.__call__` 子 tokenizer 链（typescript.ts:107-119，tsx.ts:68-81）。
- 推导：state 为 CodeStateMachine 时父 consume 调用子 consume，直到叶子。单 token Θ(d_t)，整流 Θ(Σ d_t)，最坏 O(TD)；D 个合法嵌套 block 加 D 个深处 statement 即 Θ(D²)，stack/state 空间 Θ(D)。固定 parallelStates 数 1–3 不抵消这条链。
- 合法已计数触发：Go `func f(){` + D 层 `{` + D 次 `_ = 1;` + 闭合括号。n=16/32/64/128，输入 151/279/535/1047 bytes，base consume 次数 1483/5515/21259/83467，均只输出一个函数。没有 D 倍输出需要。
- 范围：Go/Swift/Kotlin/Scala/Rust/Zig/Solidity 的 shared GoLikeStates 与 Ruby/Lua 的 RubylikeStateMachine 均静态到达；Java nested class/method、TS/JS/Vue/TSX reader 状态、Erlang nested fun、TSX embedded tokenizer 也可能形成链，但它们**没有本轮各自增长测量**；普通 C-like function body 用 bracket counter，不据此推广 A02；Python/GDScript indent pop 是摊还路径。初探 TS `const x = (((1)))` 的 consume 次数约线性，反而形成 A01 候选 longName，故不能拿该样本证明 TS 的 A02。
- 最小方向：显式 active-state 栈/叶 dispatch 或 trampoline 候选，而非贸然删祖先 consume。必须保持每层 lastToken/toExit、callback receiver、token replay、EOF、cloning concrete class 与 currentFunction 生命周期。递归 RangeError 在 pipeline 中按来源捕获；没有本轮证明 stack overflow 的实际规模/结果完整性，不能把它当安全深度 cap。

### A03 — 每个候选函数名都重新 map/join 完整 namespace 栈

- 定位：`analysis-context.ts:77-78 NestingStack.withNamespace` → `FileInfoBuilder.tryNewFunction:516-522`；`shared/clike.ts:243-252 CLikeStates.try_new_function/_state_global`（按当前文件行号，精确符号优先）。全栈包含 Namespace、FunctionInfo 和大量空名 BARE_NESTING。
- 推导：每候选 Θ(D + qualified-name bytes)，整体 Θ(Σ candidate-depth + produced candidate-name bytes)。深 namespace 内 K 次变量/声明候选为 O(KD)。这里候选不必最终输出函数，因此不能全部解释成 O(O)。对真正长 qualified-name 输出，其必要字节部分应单列。
- 合法触发：D 层 `namespace a {` 中 K 次 `extern int x;`（重复 extern declaration 合法），再闭合。D=K=n=16/32/64/128 时 namespaceSlots 1008/4064/16320/65408，namespaceCalls=80/160/320/640；**functionCount 均 0**。CPU常数、临时名字符分配未计时。
- 最小方向：维护可回滚 qualification prefix、延后确认后 materialize、或区别 named vs bare scopes；但 FunctionInfo.name 可变、source decorator fallback 与候选名语义必须保留，缓存不能假定所有 nameInSpace 永久不变。`lastFunction:127-131` 反向 stack 搜索也随 D 增长，当前主要在函数 pop 后发生；其是否额外超过名字输出成本未独立确认，不新增一条重复候选。

### A04 — Ruby interpolation restart 重复匹配整段余下 quoted token

- 定位：`readers/ruby.ts:46-87 rubyTokens`，尤其 55-58 tokenize、66 restart prepend quote、71-79 先取整个 quoted token 再拆首个 `#{`；`shared/code-reader.ts:551-552` shared quoted-string alternatives。
- 推导：合法平坦 `x = "#{1}#{1}..."` 长度 N=4I+6。每次恢复 quoted suffix，tokenizer 又成功匹配包含全部余下插值的字符串，再拆第一个插值；匹配总宽度为 Σ(4i+2)=2I²+4I，即 Θ(NI)，固定宽度插值为 Θ(N²)。输出 token 数 4I+5 是线性；不依赖 substring 是否复制或 regex 失败回溯推测。
- 证据：隔离进程暂时包装 RegExp.prototype.exec，只对 tokenizer 成功的、以双引号开头且含 `#{` 的 match 累加 match[0].length。I=16/32/64/128 时 quotedMatches=I，quotedMatchedCharacters=576/2176/8448/33280；输出 token 数69/133/261/517。Bun 与 Node V8 均观察到初始四项一致。此计数证明重复成功匹配文本，不证明 wall time。
- 最小方向：单游标处理 literal/interpolation、避免重新 lex 余下整个 quoted suffix；但原始 offset/restart、escapes、嵌套 brace、regex-wrapper 顺序和源码 token 必须一致。需要另行审批来源忠实边界，报告不批准重新设计 Ruby lexer。

## 条件成本、未确认候选与反例

1. **Regex 风险未定级为指数/二次（U-A01）**。shared tokenizer 的泛型分支 `(?:[\w\s,.?]|(?:extends))+` 允许同一 `extends` 按字母或整词匹配；配合 lookahead 成功、主体末端失败的 `<` + `extends` 重复 + `?!>` 可产生大量候选回溯分区，但本轮没有引擎实际时间/步骤证据，也未判其为合法源码。数字 separator、comment/string、Python triple quote、Ruby `%`、PHP heredoc backreference、Vue tag、Erlang quoted atom 等 regex 均读过，匹配成功的推进并不证明失败匹配线性。`analysis-model.parameters:270-274` 的未锚定标识符+尾锚定 regex 对合法 C++ `void f(int aaaa[]){}` 产生失败匹配（探针 parameter_count=0 是当前输出，不是本轮 Bug 判断），长标识符可导致多起点重试；regex 引擎优化使成本仍未知。`CodeReader.matchFilename:494-495` 的未锚定 `.*\.(ext)$` 在 façade 非ASCII fallback 上也有多起点失败扫描条件；Product filesystem path ceiling 与固定27 reader应一起考虑。不能仅因出现 nested quantifier 就宣称 ReDoS。最小方向是有界、独立 hard-timeout engine probe/oracle，再决定 cursor/regex 改动，不能简单换 regex backend。
2. **TS suffix slice 累计宽度不是已证实时间二次（U-A02）**。`typescript.ts:46-81 splitTemplateLiteral` 每次 `content=content.slice(index)` 的余下字符串长度之和可为 Θ(NI)，但 indexOf/brace scan 实际只在每次前进的 disjoint prefix 工作；JS 引擎可能 substring share。只确认 repeated suffix 创建和条件复制/保留风险，尚无实际复制/flatten/RSS 证据。JS/Vue 继承；TSX 是自己的 tokenizer，不能错误认定继承该 splitter。最小方向是 absolute cursor，保留源 token、brace 与 malformed fallback，是否值得优化须先取得 baseline。
3. **Python f-string 递归重扫条件（U-A03）**。`python.ts:158-249` 查找 expression end 时扫描内部 quoted literal，随后对 expression 再调用 generateTokens；单层、平坦多个 expression 的区间是消耗式且只被有限次扫描。若 analyzer 能完整接收深度 D 的嵌套 f-string，每层重复词法可为 O(ND) 并占用递归栈；本轮未构造/验证任意增长的合法语法族与 tokenizer可达性，不能确认二次，也不能据单层输入说所有 Python线性。GDScript继承此实现，但其合法 f-string支持不同，不能直接外推。下一步必须先证明实际合法且当前 tokenizer保留嵌套的样本。
4. **固定多遍不是无界乘积**。SwiftReplaceLabel（Swift/Kotlin）先 materialize+filter T tokens，然后对固定 conditions 各扫描两遍，O(C T)，C在registry固定，当前是固定常数遍、O(T) token reference存储；不当作二次。修改为单遍需保持标签替换顺序/末端边界，当前没有收益证据。pipeline五核心+两选中extension是固定stream passes；line/comment whitespace计数是按输入片段字符扫描。ND处理每token固定字段/Set work；complextags O(T) 与 O(contributors)必要输出；façade冻结函数/contributor projection O(F+contributors+输出字节)是必要输出，非全图平方。
5. **摊还、固定窗口与私有 seam**。PythonIndents pop 每层一次，PLSQL pending whitespace每token缓冲/排出一次，C-like readUntilTokens捕获与一次 replay/filter按区段计；不把嵌套 while 或 replay 当二次。R recent_tokens最多10，reverse/join/extract最多10项，assignment附加函数数也由窗口限制；shift不是无界风险。PHP match closing计数循环按先前arms数累计，一次性O(arms)，assignments栈可O(T)保留但没查到重复全栈扫描。protocol原型查找/registry splice可随私有扩展数量/继承深度增长；实际 façade仅两固定extensions，无public plugin授权，不能把任意私有extension input的O(E²)作为用户可触发Product问题。extension-output当前不在 façade热入口，平均字段每调用O(F)而项数固定；没有函数-函数全对比。

## 各 reader 组的实际审阅要点

逐文件 JSON 保留准确成员、哈希、notes 与关联发现。下表解释语义审阅范围，不能作为“全组线性”证明。

| 组 | 实际检查与结论 |
| --- | --- |
| C/C++/C#/ObjC/TTCN | C-like candidate/global/declaration/template/old-C replay/lambda/namespace state，各override的确认/返回；A01/A03可达，C-like普通body用counter而非每brace clone。C# expression-body、ObjC selector、TTCN continuation只影响局部。 |
| Java | CLike继承加body classes factory、class/static/anonymous/new/annotation state；A01/A03+深class/method子状态链A02。 |
| Go/Swift/Kotlin/Scala/Rust/Solidity/Zig | GoLike clone/substate生命周期和各override；A01/A02。Swift/Kotlin固定label多遍已单列；Rust match、Kotlin when新增CCN/deviation语义不能优化时丢失。 |
| TS/JS/TSX/Vue | TypeScript声明/type skip/annotation callback replay、函数栈/object/computed名；JS继承，Vue script过滤；TSX独立XML cache flush/abort与嵌入tokenizer；A01/A02结构可达，TS suffix slice条件U-A02不外推TSX。 |
| Ruby/Lua | Rubylike深clone、function结束callback与block差异；A01/A02，Ruby独占已确认restart重扫A04；Lua token regex和assignment状态不是Ruby restart。 |
| Python/GDScript | indentation、lookahead一次性buffer、triple quote/NLOC、参数/类型annotation、f-string递归；A01可达、U-A03未证实，不能按Ruby clone外推。 |
| Erlang | reader-local sticky Pygments兼容lexer各branch推进、operator固定表、字符串/escape/macro/quoted atom，再审 nested fun reader states；A01与子state链A02结构可达，regex失败仍未知。 |
| Fortran/ST | fixed keyword lists大小固定，case conversion/宏regex/token过滤与brace/indent context；function/namespace/pop lifecycle。Fortran参数A01；ST没有参数token追加，未发现ST独立无界乘积。 |
| PHP/PLSQL/Perl/R | PHP代码块分区、heredoc、assignments/args/match arms；PLSQL END/EXIT lookahead、nested declarations与body计数；Perl prototype/call/sub brace counters；R10项窗口。PHP/PLSQL/R签名追加A01；Perl不解析完整签名，不能强加A01。 |

## 探针与资源用途

- `analyzer-probe.ts`：有限规模的实际生产方法包装计数；只在 disposable process 修改内存prototype，并在 finally恢复。不是测试/Case、新Benchmark或Product修改。
- `analyzer-observations.json`：初次Bun 1.3.14探索结果；Go样本含同scope重复变量、C++含同scope重复定义，**不作为合法输入证明**。保留用于恢复转折；其Ruby/Python/TS观察有效，不代表Node24.18。
- `analyzer-validated-observations.json`：改用Go `_ = 1` 与C++重复 `extern` 合法声明后，在实际Node24.18.0重复计数；为上文主证据。Bun的 process.versions.node=24.3.0是其兼容字段，不是Node执行版本。
- 命令分别 `timeout --signal=KILL 20s mise exec bun@1.3.14 node@24.18.0 -- bun run <resource>/analyzer-probe.ts` 与 `timeout --signal=KILL 20s mise exec bun@1.3.14 node@24.18.0 -- node <resource>/analyzer-probe.ts`，均退出0，最大片段3456 bytes。Node命令直接执行调查资源而非项目脚本；所有项目脚本仍以bun run为入口。
- 未运行大benchmark、病理regex、外部Python/Ruby/Go/C++编译器语法验收、fullCheck性能、source-mapping行为验收、产品测试/Case修改。合法族依据语言的常规结构规则判断；现有分析输出作为可达性而非编译器合法性证明。父报告负责材料验证、调查发布与索引；本切面只写analyzer前缀资源。
