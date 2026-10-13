# Lizard 1.24.1 source-alignment deviations

本文件解释当前 TypeScript host 为保留 Lizard 1.24.1 translated scope 所作的窄调整。它是人读
fidelity evidence，而非第二份 provenance ledger：source/range、hash、SPDX、translated target
path 与 upstream revision 的唯一 machine-readable owner 是
[`licenses/lizard-1.24.1-provenance.json`](../../../../../../../licenses/lizard-1.24.1-provenance.json)。

## Closure rule

`lizard-1.24-source-identity.json` 必须恰好引用 root inventory 中 `status: "translated"` 的每个
source/range。`source-identity.test.ts` 以这一个 filtered set 为准，要求：

1. 46 个 translated source/range reference 无缺失、无额外项、无重复项；
2. 每个 reference 至少有一个 AST-verifiable source symbol 或 named host seam；
3. root inventory 推导出的全部 41 个 target 都被验证：每项 primary target 加上
   `additionalTargetPaths`，其中 extension protocol 与 ND typed host 是 additional target；
4. 这些 entries 共同闭合 83 个 class identity 与 841 个 symbol/host-seam mapping；
5. manifest 不得携带 hash、SPDX 或 target-path ledger，并且 current `src/**/*.ts` 不得读取
   archived Change 输入。

因此本文件不重新列出 46 个 range 或 41 个 path；增加、删除或重定向 translated scope 只能先改变
root inventory，并使上述 exact-set check 失败直到 current identity evidence 同步。

## Mapping vocabulary

每一项 non-direct mapping 都在 identity manifest 中有具体 `reason`。以下 vocabulary 说明它们的
稳定边界：

| 映射 | host 调整与边界 |
| --- | --- |
| `python-constructor`          | Python `__init__` 由 TypeScript constructor 表示；不会引入反射或 second lifecycle。                                                       |
| `source-name-host-alias`      | 已存在的 typed host spelling 与 source spelling 共用一个 analyzer-internal storage/callback。                                             |
| `inherited-source-storage`    | Python inherited field 在其定义的 translated parent storage 中验证，不复制派生 class state。                                              |
| `call-signature-host-seam`    | TypeScript 需要区分 token-state call、extension iterable call 或 descriptor invocation；该 seam 保留 source order 和 receiver/lifecycle。 |
| `string-subclass-host-seam`   | Ruby token 的 Python string-subclass state 以唯一 typed object 保留，不形成 generic token framework。                                     |
| `host-casing-seam`            | 仅将不可同时存在的 source snake_case private/function spelling 映射到 host camelCase member，不添加 runtime alias。                       |
| `dynamic-attribute-host-seam` | Python dynamic attribute delegation 改为显式 typed adapter，避免在 Product 中打开任意 attribute surface。                                 |
| `entry-surface-host-seam`     | upstream CLI/parser entry 被 Product 排除，只保留 translated range 内必要的 typed lifecycle hook。                                        |
| `field-initializer-host-seam` | Python initializer 的 state 由 TypeScript declared field initializer 建立；不另建无行为 constructor。                                     |

`direct` 不需要理由：source spelling 直接在 translated target AST 中出现。

## Core and extension boundaries

- `lizard.py` retained analysis lifecycle、models、nesting/builder、five processors、in-memory
  `FileAnalyzer` handoff、`OutputScheme` 与 result-hook ranges 保持 source callbacks、state和顺序。
  File discovery、decode、multiprocessing、report invocation 和 CLI ownership 仍在 port 外。
- `parse_args` 的 translated fragment只保留 `set_args` 的 registration order；Product adapter/Check
  不把 argparse surface带回 analyzer。
- `get_extensions` 是 closed internal registry：known deferred body 仍显式失败，direct internal
  object/class registration 的 ordering 继续由 source-aligned registry/protocol 验证。它不创建 plugin
  API。
- `extension_base` 保留 `ExtensionBase.__call__` 和 inherited context state。protocol 是同一 root
  provenance entry 的 additional target：它承接 TypeScript 特有的 descriptor/special-call resolution，
  同时仍从 `ExtensionBase` 的 source call lifecycle 获得 identity seam。
- `lizardcomplextags` 保留 upstream processor 的 source-order token/current-line append 行为；完整 contributor
  sequence 留在 private port facts，Product 何时投影该事实不属于 translated body。
- `lizardnd` 保留 upstream processor、threshold metadata 和 `check_loop_brackets`。Python import-time
  `patch`/`patch_append_method` 没有被翻译为可变 extension framework：`FileInfoBuilder` 的 17 个 named
  members 与 `FunctionInfo` 的 typed construction/field initialization 是窄的 host seam，并由 identity
  manifest 逐 member AST 验证。它不引入 public loader、reflection 或任意 class patch capability。

## Reader/shared boundaries

35 个 `lizard_languages/**` translated source/range 延续既有逐 symbol identity mapping。1.24 将 Java body states 与 PHP state machine 分别拆到 `java_body_states.py` 和 `php_states.py`；对应的 TypeScript targets 保持在各自 reader-internal module，Java factory 中的嵌套 state classes仍按 source class/member identity 递归验证，避免 ESM 初始化循环而不退回单一大 reader 文件。涉及 inherited
reader state、source aliases、Python constructor、state receiver binding、Ruby token representation及
source regex/whitespace behavior 的差异，均在 manifest 中逐项指向可解析的 translated AST member并给出
reason。它们不扩大为 scanner、filesystem、public parser 或 runtime plugin contract。

## Private façade reader-resolution seam

手写 `analyzer/port-facade.ts` 拥有仅 host 使用的 private reader-resolution seam，供 capability 与
supplied-source analysis 共用。它保持当前 registry selection 与 unsupported-input boundary；未由该 seam
覆盖的输入仍交给 source-aligned registry。该 seam 不是 translated member、public contract、scanner
protocol 或 consumer setting，且不改变 root provenance inventory 或 source-identity mapping。

## 1.24.1 两项局部结果偏差

- Rust 仅在 match scope 第二及后续真实 `=>` 的 `addCondition` 增量处，将 token/currentLine 追加到已由 `complextags` 建立的 tags。无扩展不采集；首 arm、非 match 箭头不计；嵌套 scope 各自独立。原始新版 CCN 与 ND 不变，不将所有箭头加到 static conditions。
- Kotlin-local 的 `expressionBoundary` 持有当前 `FunctionInfo` 及最后已消费正文 token 的 endLine/nloc 快照，包含 when 子状态返回；在 declaration、外层 brace 或 EOF 完成前只恢复该函数边界，再重放 ender。全局 currentLine/file NLOC 不回退，其他 reader/adapter 不做位置后处理。

两项偏差由 direct 矩阵、原始 oracle 的显式字段覆盖及真实 Worker/public Run 验收。
贡献列表的公开语义见 [Check 指南](../../../../../../../docs/checks/function-metrics.md#效果与结果)；Kotlin `when` 的 `->` 不属于 reader conditions，不由这两项偏差补采。

## TypeScript callback 与空值合并的受控偏差

- `CodeStateMachine.consume` 完成时保存并清空旧 callback，然后 `call(this)` 调用。旧槽仅完成一次，
  token replay 安装的新 callback 保留；不改变 receiver、lastToken/toExit 或建立 callback stack。
- TypeScript tokenizer 在局部 addition 识别 `??`，`\w+\?` 以 `(?!\?)` 避免吞掉紧凑写法的第一问号。
  TSX 直接使用 CodeReader，因而独立 addition 同步；TypeScript logicalOperators 新增 `??`，
  CCN 与 complextags 沿原 processor 每个真实 token 增加一并保留真实 source line。
- ND 仅在 reader 已声明 `??` 为 logical operator 时复用现有 `&&`/`||` 分支。
  condition 内外、打开括号重置首项标记、hidden bracket、分号和函数 reset 均不重写；
  不把 `??` 加到 DEFAULT_LOOPS 或授权其他语言的新口径。JS、JSX/TSX 与 Vue 的继承属于必要影响。

`typescript-metrics.test.ts` 保存独立边界、七操作符与实际 ND 状态矩阵，`source-baseline-upgrade.test.ts`
只覆盖产品期望，原始 1.24.1 两项缺陷 control 的错误观察保持不变；它们不再充当产品正确期望。
完整 metrics、贡献、Finding 与 waiver 经真实 Worker/public Run 验收，installed Node consumer 同时覆盖 typed-tail 与四项 `??`。
本偏差不扩成返回类型 parser 重写，不宣称未探测合法形态受完整语法支持。

## Regex 的 source-start host 表达

Python `\A` 使用绝对起点断言 `(?<![^])`。共享 tokenizer 有多行模式，JS `^` 会错误吞掉合法跨行 division；
锁定 Bun 1.3.14 对 `(?<![\s\S])` 在 astral codepoint 后错误成功，而 `(?<![^])` 在该 Bun 与 Node 24.18 均仅匹配 offset 0。
这属于 source fidelity 的 host 表达，不是第三项结果偏差；Unicode identifier division 的 raw/metric 回归与六消费者原始 token oracle 证明该边界。

前缀拆分只对 slash 出现在非首位的 token 扫描 Python whitespace；无 slash 或 slash 为首字符时不可能发生拆分，保持原 token 与 generator/factory 生命周期。这一局部 guard 避免对所有普通 token 重复扫描，不改变 regex 识别或原始 oracle。

## 私有 tokenizer 的不可闭合尾部成本防护

`CodeReader.generateTokens` 保留原 pattern 的首次消费编译、完整 source 匹配、分支顺序、flags/normalization、UTF-16 offset、Unicode 零宽推进、macro/factory 与惰性生命周期。TS/TSX 通过私有实参传输原固定 `TEMPLATE_LITERAL`，仍在原 addition 位置使用相同 normalization；模板 regex 与拆分逻辑不改。

只有规范化 addition 为空或以 `|` 开始时才允许整个 guarded 路径；其它拼接片段保留原 native loop。例如 `/**` 与 addition `?` 的原末尾 slash 可零次匹配，不能把原分支替换为不可成功的 lookahead。原错误仍在首次消费时发生，factory throw、partial consumption 和 iterator return 不提前 drain。

comment 风险由最后 `/*` 与 `*/` 的非重叠位置保守筛选；template 成本风险由最后原始反引号之后是否含 raw `${` 筛选。无风险输入走原 native loop；风险路径只在从当前游标及之后已不可能匹配完整对应分支时惰性省略相应分支。完整模板 token 跨过最后反引号后不另行构造 reduced pattern。筛选不是语法判定，quoted/escaped delimiter 可保守误触发；无 raw `${` 的模板尾部与最后 delimiter 之前复杂路径仍保留原 regex，不承诺任意 malformed 的线性上界。

这项等价宿主改写由独立 Decision `261012-bound-unclosable-tokenizer-tail-cost` 和 Investigation `261012-evaluate-bounded-tokenizer-optimization` 承接采用与形成时测量。支持的 Product host 是 Node；Bun 是仓库工具及独立性能参考。长模板 N24 在 Bun 原 matcher 上出现省略尾部 token、候选恢复完整 token 的观察，原因未知，不称两者全等、不推断引擎资源耗尽；候选以支持 Node 的完整 raw text/offset/line、final stream 和 adapter facts 为语义对照。正常 Node 语料的有限小幅成本观察不伪装成无损或普通项目加速。

三个既有 translated member 身份与 source/target inventory 保持不变；第四私有参数和 nested helper 不新增 curated module/class/member/named host seam。复审 identity，但不以本地性能改写重写 upstream hash、revision 或原始 oracle。共享 tokenizer 和 TS/TSX 的既有测试正文保留独立 addition、普通闭合前缀与未闭合尾部、offset/factory/零宽/惰性回归。

## Review trigger

当 root provenance 的 translated record、`additionalTargetPaths`、Lizard revision，或任何 source-aligned
member/host seam 改变时，必须复审本文件和 identity manifest。无关 Product adapter、Worker、resource
或 package work 不得借此重排 translated code；反之，不能以 source alignment 为由跳过 lint、format、typecheck、
reader/adapter behavior、license/provenance 或 package-artifact verification。Gate quality exception 的精确硬编码
selection 另由 `scripts/project/gate/definition.ts` 拥有，并由 provenance/header test 验证；本 evidence 不导出该 selection。

仅 private façade reader-resolution seam 改变时，复审本说明和 façade differential evidence 即可；它本身
不要求修改 root provenance 或 identity manifest。
