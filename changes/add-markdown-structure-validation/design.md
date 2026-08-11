# Design

本设计先建立稳定的 Markdown semantic document投影，再让 Structure Check在自己的政策和record catalog内计算度量与领域 verdict。

## Context

当前 `src/product/**` 能收集文件并运行代码 metrics scanners，但没有 Markdown AST或文档结构产品对象。`scripts/**` docs validator只服务本仓库固定材料，不能被提升为产品 parser。活动决策已确认 Check/Record core、TaskPlan、TypeScript Project Definition、Check-owned file policies和 format-aware built-ins；这些方向目前尚未成为 current runtime。

实施依赖 `establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition` 和 `add-file-policy-overrides`。本 Change自己固定 Markdown结构语义、policy与 records；基础 Changes只提供公共 ports。

## Goals / Non-Goals

目标：

- 用稳定 GFM语义和 source mapping取代 regex/整文件计数。
- 始终发布可查询的当前 structure measurements，并让 Project Definition policy独立决定 violations和 CheckResult。
- 把 parser-native AST、dependency、异常和资源预算隔离在 Product-owned Markdown document boundary。
- 让 Structure与Link两个独立 Checks复用格式事实，但不共享启用状态、policy、records或 verdict。

非目标：

- 不提供 formatter、rewrite、Markdown lint全集、链接验证或 network work。
- 不让通用 Core拥有 Markdown metric/rule字段，也不创建通用 AST公共 API。
- 不为 parser package、version或 backend options建立 project-facing选择。
- 不比较 measurement delta或把 location当作 comparison identity。

## Decisions

### 1. 固定一个 Check 和四个 Record 类型

本 feature固定 `checkId = markdown-structure-validation`，并注册：

- `markdown-document-measurement`：每个文档的 words/characters。
- `markdown-section-measurement`：每个 heading section的 words/characters。
- `markdown-paragraph-measurement`：每个 countable paragraph的 words/characters。
- `markdown-structure-violation`：size或 heading policy违反，closed字段标识 subject、rule、actual、expected和unit。

Measurement records是 final domain observations，不等同 violation；它们使用 informational level且不自行让 CheckResult failed。所有 applicable files正常完成且没有 violation时 result passed；存在任一 violation时 result failed。Parse/read/protocol failure进入 failed CheckRun，不能伪装成 failed domain verdict。

### 2. 本 Change建立 Product-owned Markdown document boundary

本 Change在 `src/product/**` 建立并验证单一内部 Markdown document service：输入 approved immutable bytes，输出不含 parser类型的 normalized semantic tree、visible inline text、headings、paragraphs、links和 source ranges，或 typed execution failure。`add-markdown-link-validation` 作为下游复用并按自身需求扩展该 boundary，不能创建第二 parser或不同 heading/text语义；Structure Check是否启用或通过不影响该内部服务可用性。

产品方言固定为 CommonMark core加 GFM table、task-list、strikethrough和 autolink extensions，并把文件开头 `---` fenced front matter作为 Product extension识别为 metadata而不负责验证 YAML内容；fenced/indented code、HTML markup和Markdown syntax标记不作为 prose。具体 parser dependency由实现以 Bun compatibility、维护、license、GFM conformance和 source span evidence选择，并封装在此 boundary内。

### 3. Prose projection与单位精确定义

每份 document、每个 section和每个普通/list-item paragraph计算 `words`与`characters`：

- `characters`是纳入的 visible prose text nodes中 Unicode scalar values数量。
- `words`是这些 text nodes按 Unicode whitespace分隔后的非空 tokens数量；首版不声称语言学分词。
- Document/section包含普通 paragraph和 list item prose，排除 front matter、code、table cell、link destination、HTML markup和语法标记。
- Paragraph仅包含普通或 list-item paragraph，排除 table cell与 code。
- Section从一个 heading延续到下一个同级或更高层 heading前，并包含嵌套 subsection prose。

Records按 path → document → source-ordered sections → source-ordered paragraphs稳定输出。

### 4. Subject identity使用 semantic ancestry而非当前位置

Document subject固定为 `document`。Section subject由 normalized visible heading ancestry、同一父级下相同 heading path的 occurrence ordinal组成；paragraph subject由 owning section identity（无 heading时 document）和该 owner内 countable paragraph ordinal组成。Line、column、byte offset和 parser node ID不进入 subject identity。

该方案保证只增加前置空行不会改变 identity；插入同级同名 section或同一 section内 paragraph可能合理改变后续 ordinal。Current location始终保留用于导航。

### 5. Structure policy是 closed、serializable、Check-owned数据

Project Definition built-in reference接受完整 policy：

- `document`、`section`、`paragraph`各精确包含 `minimumWords`、`maximumWords`、`minimumCharacters`、`maximumCharacters`；每个值为 `false`或 positive safe integer，同单位 min不得大于max。
- `headings`精确包含 boolean `requireSingleH1`、`requireFirstHeadingH1`、`forbidDepthSkips`和 `maximumDepth`（`false`或 integer `1..6`）。

这些十六个 rule leaves以及 per-path `enabled`都可由该 Check声明给公共 file-policy resolver；resolver只匹配、排序、路由和冻结，Structure owner验证/应用字段。Product neutral definition选择该 Check、默认 enabled，并令十六个 rules全为 false：因此产生 measurements但不产生 policy violations。Module-backed Project Definition可设置base规则；file policy只能在 inventory内保持/缩小输入并覆盖声明 leaves，不能 deep merge未知字段或创建另一个 Check。

Definition省略时 skipped；选择但没有 enabled Markdown input时 not-applicable；parser不会为了 skipped/not-applicable check启动。

### 6. Heading rules彼此独立且按文档顺序评价

Heading levels为1..6。`requireSingleH1`要求恰有一个 H1；`requireFirstHeadingH1`只在至少有一个 visible heading时要求第一个为 H1，不暗含“必须有 heading”；`forbidDepthSkips`只在后一个 heading level比前一个增加超过1时违反，首 heading、同级和向上回退不算 skip；`maximumDepth`独立限制 level。

Size minimum在 actual < threshold时违反，maximum在 actual > threshold时违反，等于边界合规。一个 subject可产生多个 violation records；rule identity保持独立，不能把多个规则压进 message。

### 7. Record fields、identity与CheckResult保持可解释

Measurement records使用 closed `subjectKind`、`subjectIdentity`、`words`、`characters`和 current source location。Violation records使用：

- `subjectKind = document | section | paragraph | heading`；
- `subjectIdentity`；
- `rule`（十二个 size leaves或四个 heading leaves之一）；
- `outcome`（below-minimum、above-maximum、single-h1、first-heading、depth-skip、maximum-depth）；
- numeric `actual`、`expected`和 `unit = words | characters | count | heading-level`。

Measurement identity使用 check/type/path/subject；violation identity再加入 rule/outcome。Actual、expected、unit、level、message和location不参与 identity。Records由 producing Check验证 closed fields并按 semantic order提交；human message只从这些字段渲染。

### 8. TaskPlan、comparison和cache不泄漏实现 identity

静态 TaskPlan以每个 Markdown exact input为 domain work；共享 scheduler可并行 parse/measure，但 Task ID、拆分与parser node不进入 public record。一个 file完整产生 measurements、violations和final facts后才 acknowledgement。

调用者显式提供 named reference时，Check只为 violation records按稳定 identity生成 relations；measurements保持 current observations，不创建 implicit delta/regression。没有 reference不读取 Git/cache补猜。Cache unit为单文档 normalized parse + structure result，key只包含 bytes fingerprint、GFM/product rules version、relevant resolved policy和 parser implementation identity；report、location、acceptance、sibling Check settings不参与，execution failures不缓存为成功。

## Risks / Trade-offs

- GFM parser升级可能改变 AST/source spans；normalized fixtures锁定产品语义，dependency升级不得直接改变 public records。
- Whitespace word计数对中文等语言不是语言学分词；该单位确定、可复现且明确命名，未来若增加其它单位必须使用新 field/rule contract。
- Heading ancestry/ordinal比 line稳定，但重复 section插入可改变后续 identity；这是内容结构变化，接受为新 semantic occurrence。
- 为每个 paragraph发布 measurements可能增大 record stream；实现对 approved file size、node count和record count施加明确预算，超预算如实成为 execution diagnostic而不静默截断。
- 两个 Markdown Checks共享 parser boundary可能产生交付顺序耦合；共同 owner只包含格式事实，任何 Check policy/verdict仍完全独立，并用同一 fixture corpus防止语义漂移。

## Open Questions

无。GFM方言、measurement单位、policy leaves、subject identity、records、neutral behavior和验证边界均已固定；parser package是私有实现选择。
