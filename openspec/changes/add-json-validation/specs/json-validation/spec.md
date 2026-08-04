本 delta spec 定义 strict JSON capability 的可观察行为；它是临时 change artifact，须通过实现前审计后才可执行。

## Purpose

让 Vibe Check 对 Product-approved JSON 文件提供严格、可定位且可比较的内容可靠性检查，同时保持 JSONC 配置、代码指标与底层 parser 责任分离。

## ADDED Requirements

### Requirement: JSON capability only consumes approved exact inputs

Product SHALL 以 stable capability ID `json-validation` 从 normalized scan inventory 选择 ordinary strict JSON exact inputs，并 SHALL 只把已批准的 project-relative paths 交给该 capability。Selector MUST 复用同一 invocation 的 resolved scope 与 `add-file-policy-overrides` 建立的 `ResolvedFilePolicy.checks.json`；`enabled = false` SHALL 缩小该文件的JSON exact inputs。Adapter MUST NOT 遍历 project root、扩展 glob、跟随目录或重新加入上游排除的 path。

Product 已知的 Vibe Check `.vibe-check/config.json` MUST 保持 Configuration-owned comment-capable Vibe Check JSON/JSONC 分类，不得因 `.json` suffix 自动作为 ordinary strict JSON 重复解析。首版 MUST NOT 把 generic `.jsonc`、comment 或 trailing-comma document 当成 strict JSON。JSON input eligibility MUST 与 code-metric eligibility 独立；JSON path MAY 同时被其它显式 capability 选中，但 MUST NOT 仅因进入 JSON exact inputs 自动进入 file/function/duplicate code metrics。

Quick profile MUST 不请求 `json-validation` 并返回 `skipped`。Full profile 在 selected base config 省略 `checks.json` 时 MUST 返回 `skipped`。Section 存在时，base `enabled = true` 或至少一个 in-scope path 经 matching override 得到 resolved `enabled = true` SHALL 请求 capability；base disabled且没有任何in-scope path被override启用时 MUST返回`skipped`。只有full profile已请求且selector在scope/policy/classification后没有approved exact input时，final result才 MUST为`no-input`。

#### Scenario: Profile and configuration determine request

- **WHEN** invocation 分别使用 quick profile、缺失 `checks.json` 的 full profile、effective enabled 全为 false 的 full profile 与存在 effective enabled policy 的 full profile
- **THEN** 前三者的 JSON capability 均为 `skipped`，最后一项才进入 exact-input selection
- **AND** `skipped` 不被改写为 `no-input`，也不启动 parser

#### Scenario: Ordinary JSON enters only the JSON capability

- **WHEN** normalized inventory 包含一个 file policy 启用的 ordinary `.json` path
- **THEN** `json-validation` 接收该 project-relative exact input
- **AND** adapter 不重新遍历 root，且该资格本身不使 path 进入任何 code-metric exact inputs

#### Scenario: Vibe Check JSONC remains configuration-owned

- **WHEN** discovered `.vibe-check/config.json` 使用 comments 或 trailing comma 并通过 Product Config contract
- **THEN** Configuration loader 继续按 Vibe Check JSON grammar 处理该文件
- **AND** strict JSON capability 不把 comments/trailing comma 报告为 ordinary JSON finding

#### Scenario: No approved JSON input

- **WHEN** full profile 通过完整且 enabled 的 `checks.json` 请求 `json-validation`，但 scope、generated policy、file-policy patches 与 format classification 后没有 approved JSON exact input
- **THEN** capability final result 为 `no-input`
- **AND** product 不启动 parser adapter 或把其它格式改判为 JSON

### Requirement: Strict JSON bytes and duplicate keys are validated exactly

JSON capability SHALL 对每个 approved input 执行 fatal UTF-8 decoding并拒绝 leading UTF-8 BOM。BOM 之后或无 BOM 时，accepted grammar MUST 是 RFC 8259 strict JSON：允许合法 JSON whitespace，拒绝 comments、trailing comma、malformed escape、invalid number 与 trailing non-whitespace bytes。任意合法 root value——object、array、string、number、boolean 或 null——MUST 被接受；root MUST NOT 被额外限制为 object。

Parser MUST 检查每个 object scope 内重复的 decoded member name；不同 object scope 可复用同名 key。以 escape 产生但 decoded 后相同的 names MUST 视为 duplicate。Duplicate finding common primary location MUST 指向后出现的 member；syntax finding common primary location MUST 指向 parser 可确定的最窄 failure span。Common path/location SHALL 承载 normalized project-relative path、one-based line/column 与 optional zero-based byte offset；JSON Pointer与first-definition secondary location MUST按下述typed evidence catalog投影。绝对host path、backend wording与raw parser object MUST NOT进入finding/evidence或stable identity。

#### Scenario: Any legal root value succeeds

- **WHEN** approved inputs 分别以 object、array、string、number、boolean 或 null 作为唯一 root value，且 bytes 满足 strict JSON
- **THEN** 每个 input 完成 syntax validation 且不因 root type 产生 finding
- **AND** whitespace 与 root scalar 不被改写或 canonicalize

#### Scenario: Invalid bytes and syntax are findings

- **WHEN** approved input 含 invalid UTF-8、leading BOM、comment、trailing comma、invalid token 或 root value 后的 non-whitespace bytes
- **THEN** capability 为该 path 产生对应 stable JSON content finding 与精确 byte/line/column
- **AND** 不返回 partial parsed value 或把该 content defect 映射为 backend execution failure

#### Scenario: Duplicate decoded key is located

- **WHEN** 同一 object scope 先包含 member name `name`，后又包含 decoded 后同为 `name` 的 literal 或 escaped key
- **THEN** capability 产生 duplicate-key finding，location 指向第二个 key，并附带第一个 key 的位置
- **AND** nested sibling objects 中各自唯一的同名 key 不产生 duplicate finding

### Requirement: JSON findings register a typed evidence catalog

`json-validation` descriptor SHALL 注册下列 stable check/evidence catalogs；每项 evidence 使用 foundation generic `{key, kind, value}` entry，按所列顺序投影，unknown、missing required、wrong-kind、duplicate 或 out-of-order entry MUST 使 normalized capability result 为 `invalid-result`：

1. `json-syntax`：required `syntaxReason:string`（Product-owned stable reason，不是backend message），optional `jsonPointer:string`。Order MUST 是 `syntaxReason`、`jsonPointer`。
2. `json-duplicate-key`：required `jsonPointer:string` 与 required `firstDefinition:location`。Order MUST 是 `jsonPointer`、`firstDefinition`；common primary location指向第二次定义，secondary location指向第一次定义。
3. `json-unsupported-input`：required `unsupportedReason:string`，allowed stable values为`binary`或`maximum-bytes-exceeded`；optional `actualBytes:number`与optional `maximumBytes:number`只在size reason出现。Order MUST是`unsupportedReason`、`actualBytes`、`maximumBytes`。

三个catalog的identity participation MUST为：`syntaxReason`与present `jsonPointer`参与syntax identity；duplicate的`jsonPointer`参与identity而`firstDefinition` location不参与；unsupported的`unsupportedReason`参与identity而byte counts不参与。三个catalog的redaction requirement MUST是“normalized structural values only”：pointer/reason不含raw JSON value，location path必须project-relative，number只表示byte counts；message/suggestion只做人读，不承载consumer必须解析的structured semantics。Catalog keys/kinds/required/order/identity/redaction由producing Product registry验证。注册这些checks/catalog MUST进入sorted public catalog canonical SHA-256并改变expected `semanticRegistryFingerprint`，canonical examples与validator fixtures MUST同步新fingerprint；immutable machine v2 schema只验证generic evidence entry union，其metrics/warning schema bytes与URI MUST保持不变。

#### Scenario: Duplicate key evidence preserves both locations

- **WHEN** duplicate-key finding由第二次member definition产生
- **THEN** common location指向第二次定义，evidence按`jsonPointer`、`firstDefinition`顺序提供string与location values
- **AND** machine consumer无需解析message即可定位pointer和第一次定义

#### Scenario: Unsupported evidence is structured and redacted

- **WHEN** input因binary或maximum bytes policy产生unsupported finding
- **THEN** required `unsupportedReason`使用stable Product value，size case按catalog追加actual/maximum number evidence
- **AND** evidence不包含raw bytes、absolute path或backend wording

#### Scenario: JSON catalog does not mutate portable schema

- **WHEN** Product registry新增上述JSON check IDs与evidence catalogs
- **THEN** artifact-set validator按producing revision catalog验证records与order，expected `semanticRegistryFingerprint`及examples/fixtures随sorted catalog更新
- **AND** canonical immutable machine v2 schema bytes、identity与generic evidence shape保持不变

### Requirement: Input policy and capability outcomes remain distinguishable

Generated-file disposition、binary classification 与 maximum readable size MUST 在 Product-owned inventory/file-policy boundary 决定并随 exact-input plan 传入；JSON adapter MUST NOT 自行改变这些 policies。匹配global `generatedFiles`、exclude或其它scope exclusion的path MUST 保持在normalized inventory之外，per-file override MUST NOT重新纳入。仍在inventory但被分类为binary，或byte length超过该path `ResolvedFilePolicy.checks.json.maximumBytes` 的 selected JSON path MUST 产生file-scoped `json-unsupported-input` content finding；structured reason/byte values进入catalog evidence，恢复动作只进入human suggestion，且input MUST NOT交给JSON grammar parser。这些确定性内容限制不是dependency unavailable或execution failure。

对所有 exact inputs 完成规定检查且没有 finding SHALL 返回 `succeeded` 和 zero findings；完成检查并发现 syntax、duplicate-key 或 unsupported-input defect 仍 SHALL 返回 `succeeded` 和 findings。Approved input 无法读取、内部执行中断或 adapter 返回违反归一化契约的结果 MUST 分别形成 shared capability `failed` diagnostic，且 MUST NOT 伪装成 finding、`no-input` 或 successful empty result。一份文件的 parse finding MUST NOT 阻止其它 approved inputs 被检查。

#### Scenario: Global generated scope remains authoritative

- **WHEN** JSON path 匹配global generated/excluded scope，同时某个 per-file override 对其声明 `checks.json.enabled = true`
- **THEN** path 仍不进入normalized inventory或JSON exact inputs
- **AND** override和adapter都不能重新纳入global scope之外的文件

#### Scenario: Binary and oversized inputs are explicit defects

- **WHEN** selected `.json` path 被 Product inventory 分类为 binary，或 byte length 超过 resolved maximum
- **THEN** capability 为该 path 产生 `unsupported-input` finding 并跳过 grammar parsing
- **AND** scan 不把该 path 静默当作 valid JSON 或 capability execution failure

#### Scenario: Parse defect differs from execution failure

- **WHEN** 一个 exact input 是 malformed JSON，另一个 exact input 在 adapter 执行期间无法读取
- **THEN** malformed file 形成 JSON content finding，而 read failure 形成 capability `failed` diagnostic
- **AND** partial findings 不能把 overall capability 结果提升为 `succeeded`

### Requirement: JSON findings have deterministic comparison and cache semantics

Current 与显式 baseline SHALL 使用同一个 invocation-owned resolved config、file policy 与 JSON rules snapshot，并按各 revision 自己的 normalized inventory 选择 exact inputs。省略 explicit baseline 时 JSON capability MUST 只产生 current results，不推断 comparison target。`changed` membership MUST 先服从 invocation changed-file scope并保持`all`中的相对顺序；regression matching只可处理已经属于`changed`的current findings，并 MUST 使用不含 line/column 的 stable finding fingerprint，至少由 semantic check ID、normalized path、finding kind 与可用 JSON Pointer/member identity 派生，使同一 defect 的行位移不制造新 identity。`regressions` MUST保持为`changed`的order-preserving subsequence。无法产生稳定 semantic location 的 syntax finding MUST 使用规范化 defect kind 与 bounded source context identity，而不是绝对 offset 单独作为 identity。

JSON cache owner MUST 从 JSON rules version、measurement-relevant file policy、exact-input content fingerprint 与 capability implementation identity 构造 cache key；MUST NOT 依赖任意 config version label、artifact/report fields 或 sibling capability setting。Deterministic zero/finding result MAY cache；read/execution failure MUST NOT 作为成功结果缓存。Current 与 baseline 只有完整 identity 相等时才可复用结果。

#### Scenario: Current-only scan does not infer baseline

- **WHEN** invocation 省略 explicit baseline
- **THEN** JSON capability 校验 current exact inputs 并保持 comparison unavailable
- **AND** product 不读取 previous commit 或根据 cache 猜测 baseline

#### Scenario: Line movement preserves finding identity

- **WHEN** baseline 与 current 的同一 JSON Pointer 存在相同 duplicate-key defect，但前方 whitespace 使 line/offset 改变
- **THEN** comparison 将其视为同一 stable finding，current location 仍报告新位置
- **AND** line、column 与 absolute byte offset 不单独制造 regression

#### Scenario: Relevant input invalidates cache

- **WHEN** exact-input bytes、JSON rule version或 measurement-relevant file policy 任一改变
- **THEN** JSON cache identity 改变并重新检查受影响 input
- **AND** 仅 report text、artifact directory 或 sibling capability setting 改变不使 JSON cache 失效

### Requirement: Formatting is outside the initial JSON contract

首版 JSON capability MUST NOT 报告 indentation、whitespace、newline、key order、canonical number representation、trailing newline 或 pretty-print style finding，也 MUST NOT rewrite source bytes。后续 formatting 能力若加入 MUST 使用独立 semantic check identity、可配置 policy 与 contract change，不能把其 verdict 混入 JSON syntax/duplicate-key identity。

#### Scenario: Different formatting has the same syntax verdict

- **WHEN** 两份 approved JSON inputs 仅在 insignificant whitespace、indentation、key order 或 final newline 上不同且都满足 strict grammar
- **THEN** JSON capability 对两者都不产生 formatting finding
- **AND** product 不修改任一文件 bytes
