本 delta spec 定义文本路径 literal 分类、例外与脱敏 finding；它是临时未审计 artifact，不表示该能力已获准实现。

## Purpose

本能力从受批准文本中识别绝对和禁止路径字面量，并以项目根脱敏的 finding 帮助项目避免泄露或固化环境路径。

## ADDED Requirements

### Requirement: 文本路径引用的受限检查范围
本feature descriptor SHALL 只从 foundation normalized inventory与resolved `checks.pathReferences`选择Product分类为supported text的exact inputs检查路径字面量，并 SHALL 将“核心路径”解释为文本中出现的 filesystem/workspace path literal，而不是 import、模块解析、包依赖或架构依赖图。系统 SHALL 识别 POSIX absolute path、Windows drive/UNC path、`file:` URI 和有效政策明确列出的 forbidden path literal；它 SHALL 不从相对路径、bare identifier、URL（`file:` 除外）或 import syntax 推断路径引用。

#### Scenario: 不将 import 当作路径依赖检查
- **WHEN** 批准文本包含 `import x from "pkg"`、`../relative/file`、`https://host/a` 和 `/srv/app/secrets`
- **THEN** 系统只将 `/srv/app/secrets` 作为绝对路径引用候选，且不为前三者产生 path-reference finding

### Requirement: Markdown 文本分段与代码示例政策
系统 SHALL 对 Markdown 输入以产品定义的 Markdown 语义区分 prose、inline code、fenced/indented code block、front matter、table、list、link label、link destination 与 autolink metadata，而不得以全文件 regex 忽略其结构。`includeInlineCode` 与 `includeCodeBlocks` SHALL 分别选择是否检查 inline code 与 fenced/indented block code/example；无论这两个leaves取值为何，系统 SHALL 检查 prose、list、table与可见link/image label文字，排除front matter、Markdown link destination与autolink destination/metadata。Destination中出现的absolute path或`file:` URI由canonical change `add-markdown-link-validation`独占分类，本capability不得为同一occurrence产生第二个finding。

#### Scenario: 默认排除 code example
- **WHEN** 文档 prose 含 `/opt/live`，fenced code block 含 `/tmp/example`，且有效政策未启用 code/example 检查
- **THEN** 系统只为 prose 中的 `/opt/live` 评估和报告 path-reference finding

#### Scenario: Link destination has one owner

- **WHEN** Markdown link label显示`/visible/path`，destination为`file:///private/target`，且effective path-reference policy启用absolute reporting
- **THEN** path-reference capability只评估可见label中的literal
- **AND** destination metadata被排除并仅由Markdown link owner分类

### Requirement: 项目根脱敏与可配置例外
系统 SHALL 将引用到项目根或其后代的绝对路径以稳定 `<project-root>` token 加相对后缀报告，而不得输出项目根的真实绝对值。有效政策 SHALL 按scan-configuration delta定义的case-sensitive raw exact equality与allow > forbidden > report-absolute precedence应用arrays；arrays不得解释为glob、prefix、substring或regex。Product SHALL 注册 stable check IDs `absolute-path-reference` 与 `forbidden-path-literal`；absolute policy finding使用前者，forbidden exact-match finding使用后者。finding SHALL 包含 check 语义、匹配类别、源位置、经脱敏的呈现值和触发政策标识，以便Product registry accepted-warning及审计消费。

Stable path finding identity MUST 由check ID、finding code、normalized source path及下述catalog标为identity的classification/policy rule/semantic occurrence ordinal组成，并以opaque fingerprint投影；它 MUST NOT包含line/column/byte offset、message、raw literal、raw project root或未脱敏absolute path。Location和sanitized display只用于当前定位/呈现，前置空行移动不得改变identity或cache key。

#### Scenario: 脱敏项目内绝对路径
- **WHEN** 项目根为 `/work/acme`，文本出现 `/work/acme/config/private.json`，且路径未被 allowlist 覆盖
- **THEN** finding 的呈现值为 `<project-root>/config/private.json`，且不包含 `/work/acme`

#### Scenario: Stable identity excludes location and raw project root

- **WHEN**同一project-relative文档中的path occurrence只因前置空行改变location
- **THEN**其opaque fingerprint与semantic occurrence ordinal保持不变
- **AND**fingerprint input和public finding都不包含raw project root或source start

### Requirement: Path findings register exact codes and redacted typed evidence

`path-reference-validation` descriptor SHALL 注册下列closed finding-code/evidence catalogs。每项evidence使用foundation generic `{key, kind, value}` entry并严格按声明顺序投影；unknown、missing required、wrong-kind、duplicate、out-of-order或redaction-invalid entry MUST使normalized capability result成为`invalid-result`。Common normalized source path、finding code及标为identity的evidence参与stable identity；common location与`sanitizedDisplay`不参与。Human `message`/`suggestion`不得成为消费者恢复classification、policy或display语义的source。

1. Check `absolute-path-reference` SHALL 允许且只允许codes `path-reference-posix-absolute`、`path-reference-windows-drive-absolute`、`path-reference-windows-unc`与`path-reference-file-uri`。Evidence order SHALL 为required `classification:string`（`posix-absolute | windows-drive-absolute | windows-unc | file-uri`，identity，redaction none）、required `policyRule:string`（固定`reportAbsolutePaths`，identity，redaction none）、required `sanitizedDisplay:string`（non-identity，redaction required）与required `semanticOccurrenceOrdinal:number`（positive safe integer，identity，redaction none）。
2. Check `forbidden-path-literal` SHALL 允许且只允许code `path-reference-forbidden-literal`。Evidence order SHALL 使用同样四个keys/kinds/order；`classification`固定`configured-forbidden-literal`，`policyRule`固定`forbiddenLiterals`，classification/policyRule/ordinal参与identity，`sanitizedDisplay`不参与并必须redacted。

`sanitizedDisplay` MUST使用以下closed呈现：project-root或后代为`<project-root>`加safe project-relative suffix；其它POSIX/Windows/UNC/file URI absolute value分别为`<absolute-posix>`、`<absolute-windows-drive>`、`<absolute-windows-unc>`、`<file-uri>`；非absolute forbidden literal为`<forbidden-literal>`。它与其它evidence、message、fingerprint、cache、artifact和public DTO MUST NOT包含raw project root、drive/share/user directories、未脱敏absolute path或raw forbidden literal。Ordinal MUST按同一source path AST/text traversal中相同classification与policyRule的occurrences从1计数，且不使用line/start位置。

#### Scenario: Absolute finding exposes only redacted evidence

- **WHEN**prose出现project root外的Windows UNC path并由`reportAbsolutePaths`触发
- **THEN**finding使用check ID`absolute-path-reference`、code`path-reference-windows-unc`与ordered classification/policyRule/`<absolute-windows-unc>`/ordinal evidence
- **AND**consumer无需解析message，任何output bytes都不含raw server/share path

#### Scenario: Forbidden literal uses its own code and policy evidence

- **WHEN**non-absolute raw token exact match `forbiddenLiterals`
- **THEN**finding使用code`path-reference-forbidden-literal`、classification`configured-forbidden-literal`、policyRule`forbiddenLiterals`与display`<forbidden-literal>`
- **AND**raw configured literal不进入finding evidence、message、fingerprint或artifact

### Requirement: false-positive 控制与确定性结果
系统 SHALL 在生成 finding 前完成路径 token 边界、平台形式和有效政策匹配验证，并 SHALL 对同一内容、项目根和有效政策产生确定结果。系统 SHALL 将可识别为 example/code 的区段选择、allowed/forbidden literal policy 与 platform path form 作为可观察的判定依据；无法满足路径 token 边界的文本 SHALL 不产生 finding。该能力 SHALL 不读取被引用路径、解析 import graph、检查link destination或将 path literal 存在性解释为链接验证。

#### Scenario: 忽略嵌入标识符的伪路径
- **WHEN** prose 中出现 `prefix/home/user/suffix`，且它不满足路径 token 边界，而另有独立的 `C:\\Users\\dev\\work` token
- **THEN** 系统忽略前者并按有效政策评估后者，且不执行任何 filesystem 读取

### Requirement: Path-reference regressions require an explicit baseline

`all` SHALL 包含全部current path-reference findings；`changed` SHALL 只包含source path位于resolved changed scope的current findings，并保持`all`中的相对顺序。只有调用者提供有效显式baseline时，Product才 SHALL 以stable line-independent opaque identity比较current与baseline，并只把已经属于`changed`且baseline中不存在的current identity按原顺序放入`regressions`。因此`regressions` MUST是`changed`的order-preserving subsequence。省略、无效或不可用baseline MUST NOT 从Git history、cache、上一提交或source location推断comparison；省略baseline时该feature MUST保持current-only且regressions为空。

#### Scenario: Omitted baseline publishes current findings only

- **WHEN**caller省略baseline且current产生absolute或forbidden-literal finding
- **THEN**finding进入all并按changed scope进入changed，但regressions为空
- **AND**Product不读取cache或Git previous commit来补baseline

#### Scenario: Line-only movement is not a path regression

- **WHEN**caller提供有效显式baseline，current只在同一路径literal前增加空行
- **THEN**stable identity保持不变且不产生new regression
- **AND**current location更新但不参与fingerprint或cache identity
