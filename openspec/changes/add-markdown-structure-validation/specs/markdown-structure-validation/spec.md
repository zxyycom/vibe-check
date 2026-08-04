本 delta spec 定义 Markdown 结构 observations 与独立 policy findings；它是临时未审计 artifact，不表示该能力已获准实现。

## Purpose

本能力以不暴露具体解析器的稳定 Markdown 语义提供结构度量和策略 finding，使项目能够一致地评估文档组织质量。

## ADDED Requirements

### Requirement: 解析驱动的 Markdown 输入
本feature descriptor SHALL 只从 foundation normalized inventory与resolved `checks.markdownStructure`选择Product分类为Markdown的exact inputs执行结构检查，并 SHALL 以 GFM（CommonMark core 加 GFM table、task-list、strikethrough 与 autolink 扩展）解析正文。文档开头的 YAML front matter SHALL 作为 metadata 而非正文节点；fenced/indented code block、table、list 与 inline 节点 SHALL 按该方言的 AST 语义处理，并为每个度量和 finding 保留源文件与 1-based 行位置。公开配置 SHALL 引用产品语义和阈值，而不得暴露 parser、AST 库或命令名称。

#### Scenario: 解析含 front matter 和 GFM 节点的文档
- **WHEN** 批准的 Markdown 输入包含开头 front matter、GFM table、list、fenced code block 与 heading
- **THEN** 系统按 GFM 语义识别这些节点，且任何报告位置都指向原始文件的 1-based 行号

### Requirement: 稳定的结构度量单位
系统 SHALL 为每份文档、每个 heading section 和每个 AST paragraph 计算 `words` 与 `chars`。`chars` SHALL 为 prose text nodes 的 Unicode scalar value 数量；`words` SHALL 为这些 text nodes 中由空白分隔的非空文本 token 数量。文档与 section 总量 SHALL 包含普通段落和 list item 内的 prose，且 SHALL 排除 front matter、代码块、table cell、link destination、HTML markup 与 Markdown 语法标记；paragraph 度量 SHALL 对普通段落及 list item 内的段落独立计算，且 SHALL 排除 table cell 和代码块。一个 section SHALL 从其 heading 起延续到下一个同级或更高层级 heading 之前，且其 prose 总量包含嵌套子 section 的 prose。

#### Scenario: 计算 section 与 paragraph 的不同度量
- **WHEN** 文档的 heading 下包含普通段落、列表项段落、table cell 和 fenced code block
- **THEN** section 总量包含普通段落和列表项 prose 但不包含 table cell 或 code block，且每个可计段落各有独立的 words/chars 度量

### Requirement: Stable observation and check catalogs

Product descriptor SHALL 注册以下 closed observation catalog：`markdown-document-words` / unit `words` / subject kind `document`，`markdown-document-characters` / `characters` / `document`，`markdown-section-words` / `words` / `section`，`markdown-section-characters` / `characters` / `section`，`markdown-paragraph-words` / `words` / `paragraph`，以及 `markdown-paragraph-characters` / `characters` / `paragraph`。Document subject identity MUST 固定为 `document`；section identity MUST 为 `section:<1-based heading ordinal>`；paragraph identity MUST 为 `paragraph:<1-based countable paragraph ordinal>`，其中 ordinal 来自同一 parsed document 的 source order而不是line number、parser node ID或backend wording。

Observation semantic order MUST 先按 normalized project-relative path 的 Unicode code-point order，再对每个path依次发布document words/characters、各section按source order的words/characters、各paragraph按source order的words/characters。所有成功测量 MUST 产生 foundation `ObservationRecord` 并经 `MachineMetricsV2.observations` 投影，即使对应 policy 合规；warning streams不得复制observation。

Product descriptor SHALL 注册 stable check IDs `markdown-document-size`、`markdown-section-size`、`markdown-paragraph-size` 与 `markdown-heading-structure`。前三者分别拥有同级 minimum/maximum words/characters finding，最后者拥有 H1、depth skip 与 maximum depth finding；每条 content finding MUST 使用其 owning check ID和可定位source subject，且 accepted-warning matching SHALL 通过Product registry中的这些IDs进行。

Stable structure finding identity MUST 由check ID、finding code、normalized project-relative path及该check evidence catalog中标为identity的values组成，MUST NOT包含line/column/byte offset、actual、threshold、expected、unit或message；location只用于当前定位。仅在前方增加空行而不改变semantic tree ordinal、finding code或rule时，identity MUST保持不变。

#### Scenario: Compliant metrics still publish in semantic order

- **WHEN** two Markdown exact inputs全部满足structure policy
- **THEN** `MachineMetricsV2.observations`仍按path、subject与words-before-characters顺序包含全部registered facts
- **AND** structure finding channels保持为空

#### Scenario: Invalid catalog combination fails capability result

- **WHEN** runner为paragraph subject发布document-only metric，或使用未注册unit/check ID
- **THEN** foundation normalized-result validation将 capability 判为 failed/invalid-result
- **AND** invalid observation/finding不进入machine或human output

### Requirement: Structure comparison requires an explicit baseline

`all` SHALL 包含全部current structure findings；`changed` SHALL 只包含source path位于resolved changed scope的current findings，并保持`all`中的相对顺序。只有调用者提供有效显式baseline时，Product才 SHALL 以stable line-independent finding identity比较current与baseline，并只把已经属于`changed`且baseline中不存在的current identity按原顺序放入`regressions`。因此`regressions` MUST是`changed`的order-preserving subsequence。省略、无效或不可用baseline MUST NOT 从Git history、cache、上一提交或observation location推断comparison；省略baseline时该feature MUST保持current-only且regressions为空。Structure observations在任何情况下都 MUST 保持current-only，不进入baseline/delta/regression。

#### Scenario: Line-only movement is not a regression

- **WHEN** caller提供有效显式baseline，current仅在同一structure subject前增加空行
- **THEN**finding identity保持相同且不产生new regression
- **AND**observation只报告current location，不创建observation comparison

#### Scenario: Omitted baseline stays current-only

- **WHEN**caller省略baseline且current产生structure findings
- **THEN**findings进入all并按changed scope进入changed，但regressions为空
- **AND**Product不读取cache或Git previous commit来补baseline

### Requirement: Heading 结构规则
系统 SHALL 将 heading level 1 至 6 作为结构事实记录，并 SHALL 依据已配置政策验证最大 heading depth、相邻 heading 的跳级和 H1 数量/位置。跳级 SHALL 指文档顺序中一个 heading level 比前一个 heading level 增加超过 1；同级、回退到更高层级和文档开头的首个 heading 不构成跳级。`requireSingleH1` SHALL 独立要求整份文档恰有一个H1；`requireFirstHeadingH1` SHALL 在文档至少有一个可见heading时独立要求首个可见heading为H1，文档无heading时仅由`requireSingleH1`决定是否违规；`forbidDepthSkips`与`maximumDepth`分别控制跳级和最大深度。违反时 SHALL 产生可定位 finding。

#### Scenario: 报告 heading 跳级和 H1 违规
- **WHEN** 政策同时设置`requireSingleH1 = true`、`requireFirstHeadingH1 = true`与`forbidDepthSkips = true`，且文档先出现H2、随后从H2跳到H4
- **THEN** 系统分别为single-H1、first-visible-heading与H2至H4跳级产生带当前行位置的finding

#### Scenario: First-heading rule does not imply a required heading

- **WHEN**文档没有visible heading、`requireFirstHeadingH1 = true`且`requireSingleH1 = false`
- **THEN**系统不产生first-heading或single-H1 finding
- **AND**若只把`requireSingleH1`改为true，则产生single-H1 finding

### Requirement: Structure findings register exact codes and typed evidence

`markdown-structure-validation` descriptor SHALL 为四个checks注册下列closed finding-code与evidence catalogs。每项evidence使用foundation generic `{key, kind, value}` entry并严格按声明顺序投影；unknown、missing required、wrong-kind、duplicate或out-of-order entry MUST使normalized capability result成为`invalid-result`。Finding code本身、common normalized path及下述标为identity的evidence参与stable identity；common location与标为non-identity的evidence不得参与。所有evidence均不得包含absolute host path或parser wording，human `message`/`suggestion`不得成为消费者恢复required机器语义的来源。

1. Check `markdown-document-size` SHALL 允许且只允许finding codes `markdown-document-below-minimum-words`、`markdown-document-above-maximum-words`、`markdown-document-below-minimum-characters`与`markdown-document-above-maximum-characters`。Evidence order SHALL 为required `subjectKind:string`（固定`document`，identity，redaction none）、required `subjectIdentity:string`（固定`document`，identity，redaction none）、required `rule:string`（对应触发的config leaf，identity，redaction none）、required `actual:number`（finite non-negative，non-identity，redaction none）、required `threshold:number`（positive safe integer，non-identity，redaction none）、required `unit:string`（`words | characters`，non-identity，redaction none）。
2. Check `markdown-section-size` SHALL 允许且只允许finding codes `markdown-section-below-minimum-words`、`markdown-section-above-maximum-words`、`markdown-section-below-minimum-characters`与`markdown-section-above-maximum-characters`，并使用与document check相同的六项required evidence/order；`subjectKind`固定`section`，`subjectIdentity`使用registered `section:<ordinal>`，两者及`rule`参与identity，其余不参与，全部redaction none。
3. Check `markdown-paragraph-size` SHALL 允许且只允许finding codes `markdown-paragraph-below-minimum-words`、`markdown-paragraph-above-maximum-words`、`markdown-paragraph-below-minimum-characters`与`markdown-paragraph-above-maximum-characters`，并使用同一六项required evidence/order；`subjectKind`固定`paragraph`，`subjectIdentity`使用registered `paragraph:<ordinal>`，两者及`rule`参与identity，其余不参与，全部redaction none。
4. Check `markdown-heading-structure` SHALL 允许且只允许finding codes `markdown-heading-single-h1-required`、`markdown-heading-first-heading-h1-required`、`markdown-heading-depth-skip`与`markdown-heading-maximum-depth-exceeded`。Evidence order SHALL 为required `subjectIdentity:string`（`document`或registered section identity，identity，redaction none）、required `rule:string`（`requireSingleH1 | requireFirstHeadingH1 | forbidDepthSkips | maximumDepth`，identity，redaction none）、required `actual:number`（finite non-negative H1 count或heading level，non-identity，redaction none）、required `expected:number`（positive expected count/maximum level，non-identity，redaction none）、required `unit:string`（`count | heading-level`，non-identity，redaction none）。Single-H1使用actual H1 count/expected 1/unit count；first-heading使用actual first level/expected 1/unit heading-level；depth skip使用actual current level/expected previous level+1；maximum-depth使用actual current level/expected configured maximum。

#### Scenario: Size finding exposes typed threshold evidence

- **WHEN**section words实际值120违反`maximumWords = 100`
- **THEN**finding使用check ID`markdown-section-size`、code`markdown-section-above-maximum-words`和按catalog排序的section identity/rule/120/100/words evidence
- **AND**consumer无需解析message即可确定subject、规则、actual、threshold与unit

#### Scenario: Heading finding exposes machine-readable rule outcome

- **WHEN**首个visible heading为H2且`requireFirstHeadingH1 = true`
- **THEN**finding使用code`markdown-heading-first-heading-h1-required`及subject identity、rule、actual 2、expected 1、unit heading-level evidence
- **AND**line/location只用于当前定位且不参与identity

### Requirement: 度量与策略 finding 分离
系统 SHALL 在无任何阈值违规时仍产生可观察的结构度量，并 SHALL 仅在 `checks.markdownStructure` 的有效政策被违反时产生 structure finding。文档、section 和 paragraph 的 minimum/maximum words/chars 阈值及 heading 规则 SHALL 支持由 file-policy override 为匹配文件替换；未被 override 覆盖的输入 SHALL 使用 selected base section。`false` leaf SHALL 表示该单项规则未启用；启用 minimum 时实际值小于 threshold产生finding，启用maximum时实际值大于threshold产生finding，等于边界合规。finding SHALL 标识检查语义、受影响层级、实际值、适用阈值和源位置，而不得把度量缺失表示为通过。

#### Scenario: per-file override 只改变 finding 判定
- **WHEN** 同一文档的 section words 度量为 120，基础政策最大值为 100，而匹配该文件的 override 最大值为 150
- **THEN** 系统仍报告该 section 的 120 words 度量，且不产生该 section 的最大长度 finding
