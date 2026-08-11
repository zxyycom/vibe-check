# Design

本设计把 Markdown occurrence parsing、本地资源解析和外链候选交接分层，使 deterministic records与授权网络工作保持独立。

## Context

当前 Product没有 Markdown AST/link检查；`scripts/**` validator主要以文本规则验证本仓库材料，跳过完整 anchor与URL语义。活动决策已确认 runtime Check/Record、TaskPlan、Project Definition、Check-owned file policies、format-aware built-ins，以及网络 Check必须声明式显式授权。上述基础和网络方向目前仍未完全成为 current runtime。

实施依赖 `establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition`、`add-file-policy-overrides`，以及 `add-markdown-structure-validation` 已建立的 Product-owned Markdown document boundary。它只依赖该内部格式服务，不依赖 Structure Check是否注册、启用或通过；`add-network-link-validation`只消费本文固定的 ephemeral handoff。

## Goals / Non-Goals

目标：

- 对 approved Markdown exact inputs中的 supported occurrences给出唯一、稳定、离线 classification。
- 在任何 secondary read前完成 root/resource approval，并为 source与target两侧变化保留 causal关系。
- 固定一个不依赖 parser默认 ID的 heading slug算法。
- 向 network Check提供足以安全调度的 sanitized occurrence identity，同时让完整 request material不持久化。

非目标：

- 不执行或评价任何 network request，也不重试、重定向或缓存 HTTP结果。
- 不把 Structure Check的policy/records/verdict或 generic path Check的文本启发式引入本 Check。
- 不公开 parser AST、raw destination、canonical request URL或 external candidate DTO。
- 不验证 HTML element attributes、JavaScript-generated links或任意 embedded code字符串。

## Decisions

### 1. 固定一个 Check、三个 Record类型和完整 policy

本 feature固定 `checkId = markdown-link-validation`，并注册：

- `markdown-link-local-target`：invalid percent encoding、undefined reference definition、missing target或 target-not-file。
- `markdown-link-anchor`：same/cross-file anchor missing或 cross target不是 Markdown。
- `markdown-link-boundary`：absolute filesystem/file URI、lexical project-root escape或 existing-target symlink escape。

Project Definition built-in reference接受 closed policy：`local.requireExistingFiles`、`anchors.validateSameDocument`、`anchors.validateCrossFile`、`boundary.forbidAbsoluteFilesystem`和 `boundary.forbidProjectEscape` 五个 booleans。它们和 per-path `enabled`可由 Link owner声明为 file-policy leaves。Product neutral definition选择该 Check并令五项为 true；module-backed definition可收紧或关闭单项。关闭规则只抑制 owning record，不删除 classification或 enabled Check的external handoff。

Definition省略时 skipped；选择但无 enabled Markdown exact input时 not-applicable；所有 work正常完成且没有 deterministic defect record时 CheckResult passed，存在任一 defect record时 failed，read/parser/protocol异常则 CheckRun failed。

### 2. 复用唯一 GFM document boundary并固定 occurrence集合

Link Check只消费 Structure Change建立的 Markdown service normalized tree/location，并按 link extraction需求扩展同一 owner，不创建第二 parser。Supported occurrences包括 inline links、resolved/unresolved reference links、images和GFM autolinks；link kind固定为 `inline | reference | image | autolink`。HTML attributes、code span/fence内容和 plain prose URL不进入本 Check。

同一 parsed token不能同时交给 generic Path Reference Check：Markdown destination和autolink occurrence由本 Check唯一拥有；Path Reference只检查其计划声明的 visible prose/inline-code segments。Structure Check可复用 headings/text，但其 enabled状态、thresholds和records不影响 link extraction。

### 3. Classification与validation严格分层

Occurrence先拆分 destination、query和fragment，对 URL path/fragment执行一次 strict UTF-8 percent-decode，再恰好分类为：

- same-document anchor；
- project-local relative target；
- cross-file anchor；
- out-of-project / absolute filesystem；
- external URL（HTTP、HTTPS、protocol-relative）；
- mailto；
- other scheme。

Invalid encoding形成 local-target record且不继续读取。External/mailto/other只分类，不产生 reachability record。Query不影响 local target existence；decoded fragment只用于 anchor。Undefined reference definition形成 local-target record，不能作为空 destination静默跳过。

### 4. Local resolver采用 lexical、approval和realpath三重边界

相对 target以 source document目录为基准规范化；absolute POSIX/Windows path与 `file:` URI直接分类为 boundary。Lexical result必须位于 normalized project root内，再由 Scan Scope/resource index批准该 exact target；resolver禁止 walk、glob、parent search或 fallback。Existence/type只查询该 target。

Existing target在读取内容前解析 realpath并再次验证 project-root containment；symlink escape不读取。Cross-file anchor只有在 approved target存在、是普通文件且分类为 Markdown时才读取其 normalized document；普通 local target只需 file existence/type，不解析目标内容。规则关闭不能授权越界读取：它只决定是否发布 record。

### 5. Anchor算法固定为 `gfm-heading-slug-v1`

Heading index从 normalized visible heading text生成 slug：Unicode lowercase；删除 ASCII punctuation ``[!"#$%&'()*+,./:;<=>?@[\\]^`{|}~]``；每段 whitespace替换为单个 `-`；按 source order为重复 slug追加 `-1`、`-2`。Decoded fragment与最终 slug精确比较。Finding primary location始终是 source link occurrence；cross-file record另带 safe target path/anchor，不把 target heading位置伪作 source failure位置。

算法名称是 Product dialect，不声称所有 Git hosting实现相同。改变算法需要明确 version/contract migration，不能随 parser dependency升级漂移。

### 6. External handoff只含 sanitized candidate和两个 bounded lookups

每个 external URL occurrence产生 Link-owned invocation-private `ExternalLinkCandidate`，精确包含：

- normalized project-relative `sourcePath`；
- `linkKind`四值；
- `classification = external-url`；
- `safeUrlShape`：`scheme = http | https | protocol-relative`、lowercase ASCII host（无userinfo）、`port = false | 1..65535`、normalized percent-encoded path（无query/fragment）、ordered query key names（保留重复、无values）；
- 在同 source path、linkKind和deep-equal safe shape内的 positive semantic occurrence ordinal；
- 只由以上安全字段确定的 line-independent occurrence identity。

Candidate、identity、cache和public records均不包含 source location、raw/full URL、userinfo、query values或fragment。Link owner另建 identity-keyed bounded ephemeral location lookup和 request-material lookup；后者只保存当前 invocation request所需的 raw destination / fragment-free canonical URL。Material不超过 source destination bytes。Link Check完成全部 classification/local validation并形成完整 CheckResult后，原子发布一个 ordered、immutable、invocation-private snapshot，包含完整 candidates集合及两个受控 lookups；Link Check执行失败时不发布可消费的完整 snapshot。未选择Network Check时在 Link Check结束立即释放。Snapshot、lookups及其values不得写入 log、cache、artifact、QualityRecord、public DTO或derived persistent key。

获得显式授权的 Network Check通过 Check-level `requiresChecks = [markdown-link-validation]`进入 selection/execution；只有 Link Check完成并发布完整 snapshot后，Network owner才能取得snapshot、按candidate identity读取request material并在消费后释放。若 Link Check执行失败而没有完整 snapshot，Network不能从partial candidates继续或自行重跑classification。两者之间没有Task ID、Task `needs`或per-source scheduler依赖。

Link Check不等待 network result，Network Check也不回写本 CheckResult/records。网络授权、transport、retry、redaction verdict和最终 network records只由 `add-network-link-validation`拥有；完整 `ExternalLinkCandidate` 字段集合、snapshot顺序和lookups仍只由本 Change拥有。

### 7. Record evidence与 occurrence identity不依赖当前位置

三个 record types共享 closed字段：`reason`、`linkKind`、classification、sanitized target token、semantic occurrence ordinal及适用的 normalized target path/anchor。`reason`按 record type封闭：local-target只允许 `invalid-percent-encoding | undefined-reference | missing | not-file`，anchor只允许 `missing | target-not-markdown`，boundary只允许 `absolute-filesystem | project-root-escape | symlink-root-escape`。Boundary target只使用 `<absolute-filesystem>`、`<project-root-escape>`或 `<symlink-root-escape>` token，不输出 raw path；local/anchor records不得含 query values、userinfo或 absolute host path。

Occurrence ordinal按同 source path、link kind、classification和相同 sanitized semantic target的 AST source order计算。Record identity使用 check/type/source path、reason、安全 target/anchor和ordinal；line、column、byte offset、message、raw destination和 request material不参与。只增加前置空行不改变 identity；同一安全 target的真实 occurrence插入会合理改变后续 ordinal。

### 8. Source/target causal closure驱动comparison，cache保持离线安全

每个 deterministic record关联 source path；可确定 project-local intended/actual target时再关联 target path。Same-document closure只有 source；cross-file anchor包含 source与target；boundary只有 source。显式 named reference存在时，producing Check以稳定 identity匹配并用 closure解释 source-only或target-only变化；没有 reference不从Git/cache推断。

Cache unit为单 source Markdown document的 normalized offline classifications/records，key包含 content fingerprint、link/slug rules version、relevant policy、approved target metadata/content fingerprints和 parser implementation identity。Raw/canonical external URL、query values、userinfo、ephemeral lookups、location、report和network result不能进入 persistent cache。Execution failure不缓存为成功。

## Risks / Trade-offs

- URL与filesystem语义跨平台容易漂移；用 POSIX、Windows drive/UNC、file URI、encoded separator和protocol-relative fixtures锁定分类，filesystem I/O只发生在受控 resolver。
- Slug算法可能与某些renderer不同；versioned dialect和Unicode/duplicate fixtures换取可复现性，不宣称普遍兼容。
- Path或query可能含secret；candidate只保留约定 safe shape，完整request material限定在 invocation memory并做 canary byte-search，任何异常路径也必须释放。
- Shared Markdown parser可能产生两个 Check之间的实现耦合；共享范围只到 normalized document facts，policy、records、cache和verdict分别 owned。
- Target-aware cache/relations比 source-only复杂，但能避免 target heading变更被静默漏掉；closure只包含实际解析/验证的资源，不hash全项目。

## Open Questions

无。Occurrence集合、classification、resolver、slug、policy、record identity、external handoff和跨 Change owner均已固定。
