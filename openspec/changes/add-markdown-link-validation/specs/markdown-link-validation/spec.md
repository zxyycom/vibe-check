本 delta spec 定义离线 Markdown link classification、本地验证与外链 handoff；它是临时未审计 artifact，不表示该能力已获准实现。

## Purpose

本能力以稳定 Markdown 解析和项目根语义离线分类、验证链接，使本地文档链接错误可在不访问网络的情况下被发现。

## ADDED Requirements

### Requirement: 离线解析与完整链接分类
本feature descriptor SHALL 只从 foundation normalized inventory与resolved `checks.markdownLinks`选择Product分类为Markdown的exact inputs解析 inline link、reference link 和 image link，并 SHALL 使用产品定义的 GFM 链接语义而不暴露具体 parser。每个链接 SHALL 被恰好分类为 same-document anchor、project-local relative target、cross-file anchor、out-of-project/absolute filesystem、external URL、mailto 或 other scheme；`http`、`https` 及 `//host/...` 为 external URL，`file:` 与 POSIX/Windows absolute filesystem 形式为 out-of-project/absolute filesystem。系统 SHALL 分类但不得请求 external URL、mailto 或 other scheme。

#### Scenario: 分类混合的 Markdown 链接
- **WHEN** 批准文档包含 `#intro`、`guide.md`、`guide.md#install`、`/tmp/a`、`https://example.test`、`mailto:a@example.test` 和 `git+ssh://host/repo`
- **THEN** 系统为每个链接产生对应的唯一分类，且不发起任何网络连接

### Requirement: 项目本地目标与锚点验证
系统 SHALL 对 same-document anchor 验证当前文档的 heading target，对 project-local relative target 验证解析后的目标位于项目根内且为存在的文件，对 cross-file anchor 同时验证存在的项目内 Markdown 文件和其 heading target。系统 SHALL 先将 URL path 与 fragment 以 UTF-8 percent-decode 一次、在 fragment 前拆分 query、忽略 local-target query 的验证影响，并对无效 percent encoding 产生可定位 invalid-target finding。词法解析越过项目根、目标 realpath 经 symlink 落在项目根外，或 absolute filesystem/file URI 目标 SHALL 分类为 out-of-project/absolute filesystem 而不得被作为本地文件读取。`local.requireExistingFiles`、`anchors.validateSameDocument`、`anchors.validateCrossFile`、`boundary.forbidAbsoluteFilesystem` 与 `boundary.forbidProjectEscape` 分别控制其owning finding；rule disabled时分类事实保留，但该rule不产生finding或越界读取。

#### Scenario: 拒绝 symlink 逃逸的本地链接
- **WHEN** 文档链接到项目内的 symlink，且该 symlink 的 realpath 位于项目根外
- **THEN** 系统将该链接分类为 out-of-project/absolute filesystem，产生可定位 finding，且不读取根外目标

### Requirement: 可复现的 heading slug 验证
系统 SHALL 使用 `gfm-heading-slug-v1` 验证文档锚点：从 heading 的可见 inline text 提取文本、执行 Unicode lowercase、删除 ASCII 标点 ``[!"#$%&'()*+,./:;<=>?@[\\]^`{|}~]``、将每段空白替换为单个 `-`，并按文档顺序为重复 slug 追加 `-1`、`-2` 等后缀。系统 SHALL 以该算法与 decoded fragment 精确比较；缺失或不匹配 SHALL 产生 anchor finding，其位置为引用位置而不是被引用文件位置。

#### Scenario: 验证重复 heading 的锚点
- **WHEN** 目标文档有两个可见文字为 `Install!` 的 headings，且链接 fragment 分别为 `#install` 与 `#install-1`
- **THEN** 系统接受两个链接；若 fragment 为 `#install-2`，则产生 anchor finding

### Requirement: 链接结果独立于结构阈值
系统 SHALL 注册 stable check IDs `markdown-link-local-target`、`markdown-link-anchor` 与 `markdown-link-boundary`：missing/non-file/invalid local target使用local-target ID，same/cross-file missing anchor或non-Markdown anchor target使用anchor ID，absolute filesystem、file URI、lexical root escape与symlink escape使用boundary ID。系统 SHALL 将 link classification、local validation 和 anchor validation 作为独立 check result 与 content finding 报告，并 SHALL 允许 file-policy override 选择该 check 的有效政策。系统 SHALL 不依赖 Markdown structure validation 是否启用、其 words/chars 阈值或其 finding；external URL、mailto 与 other scheme 的离线结果 SHALL 保持分类而非 reachability 成败。

Enabled capability SHALL 为每个 external URL occurrence 产生一个 sanitized internal `ExternalLinkCandidate`。Candidate MUST 精确包含 normalized project-relative `sourcePath`、`linkKind` (`inline | reference | image`)、`classification = external-url`、closed `safeUrlShape`、positive `semanticOccurrenceOrdinal` 与 non-empty `semanticOccurrenceIdentity`；它 MUST NOT包含source location、raw destination或canonical request URL。

`safeUrlShape` SHALL 精确包含：`scheme` (`http | https | protocol-relative`)、canonical lowercase ASCII `host`（无userinfo）、`port` (`false`或integer 1..65535)、normalized percent-encoded `path`（无query/fragment）与`queryKeys`（按destination order保留重复项的string array，只含normalized query key而无value）。Shape MUST不包含userinfo、password、query value、fragment、raw destination或absolute filesystem path。Ordinal MUST按同一source path AST traversal中具有相同link kind与deep-equal safe shape的occurrences从1计数。`semanticOccurrenceIdentity` MUST由Product-owned deterministic canonicalization只从sourcePath、linkKind、safeUrlShape与semanticOccurrenceOrdinal派生；它及candidate MUST NOT消费canonical/raw URL、query value、userinfo、fragment、line/column/byte offset。Value/userinfo/fragment或前置行变化不得制造new occurrence、regression或cache identity。

Markdown owner SHALL 另外建立两个invocation-owned bounded ephemeral lookups，均以`semanticOccurrenceIdentity`为唯一key：location lookup只保存foundation `sourceLocation`；request-material lookup只保存closed `{ rawDestination, canonicalRequestUrl }`。`rawDestination`保留原Markdown destination；`canonicalRequestUrl`保留HTTP request所需的完整query values并移除fragment，userinfo只可短暂保留以供`add-network-link-validation`拒绝且不得发送。每项request material的size不得超过source destination bytes，只能由network request boundary按identity取得并在使用后释放；两个lookups及其values MUST NOT进入candidate、log、cache、artifact、public DTO、finding/evidence或derived persistent key。

`add-network-link-validation` MAY消费这些external candidates，但Markdown owner不得等待或吸收network outcome。External candidate不是finding，不进入finding evidence/channels/acceptance/gate；同一shape的多个source occurrences仍以ordinal保持独立。

#### Scenario: 结构检查关闭时仍验证本地链接
- **WHEN** 有效政策关闭 Markdown structure validation 但启用 Markdown link validation，且文档链接到不存在的相对文件
- **THEN** 系统产生 code 为 `markdown-link-local-target-missing` 的 finding，且不产生或依赖任何结构阈值结果

#### Scenario: External candidates are handed off without network work

- **WHEN**enabled Markdown link capability分类出两个相同sanitized shape的HTTP occurrences，且它们query values不同
- **THEN**它交付两个以positive ordinal和`semanticOccurrenceIdentity`区分、但不消费query values的sanitized external candidates
- **AND**本capability不执行DNS/HTTP，也不把network outcome写回deterministic findings

#### Scenario: Query value, userinfo, fragment and line never enter external identity

- **WHEN**同一source occurrence只改变query value、userinfo、fragment或前置空行，sanitized scheme/host/port/path/query-key shape不变
- **THEN**external occurrence identity保持不变，identity-keyed ephemeral location与request material按当前值更新
- **AND**raw/full URL及其值不进入log、cache、artifact或public DTO

### Requirement: Link findings register exact codes and typed evidence

`markdown-link-validation` descriptor SHALL 注册下列closed finding-code/evidence catalogs。每项evidence使用foundation generic `{key, kind, value}` entry并严格按声明顺序投影；unknown、missing required、wrong-kind、duplicate或out-of-order entry MUST使normalized capability result成为`invalid-result`。Finding identity MUST由check ID、finding code、common normalized source path及catalog标为identity的evidence组成；common/current/secondary location均不参与。`message`/`suggestion`不得成为消费者恢复required机器语义的source。

1. Check `markdown-link-local-target` SHALL 允许且只允许codes `markdown-link-target-invalid-encoding`、`markdown-link-local-target-missing`与`markdown-link-local-target-not-file`。Evidence order SHALL 为required `linkKind:string`（`inline | reference | image`，identity，redaction none）、required `classification:string`（`project-local-relative-target | cross-file-anchor`，identity，redaction none）、required `sanitizedTarget:string`（identity，redaction required：移除query values/userinfo/absolute host，只保留safe project-relative target或`<invalid-target>`）、required `semanticOccurrenceOrdinal:number`（positive safe integer，identity，redaction none），以及optional `targetPath:string`（存在时必须normalized project-relative，identity，redaction required）。
2. Check `markdown-link-anchor` SHALL 允许且只允许codes `markdown-link-anchor-missing`与`markdown-link-anchor-target-not-markdown`。Evidence order SHALL 为required `linkKind:string`、required `classification:string`（`same-document-anchor | cross-file-anchor`）、required `sanitizedTarget:string`、required `semanticOccurrenceOrdinal:number`、required `targetPath:string`与required `anchor:string`；六项均参与identity。Kinds依次为string/string/string/number/string/string；ordinal为positive safe integer，targetPath必须project-relative，anchor为decoded canonical slug且不含raw URL/query/userinfo；`sanitizedTarget`、`targetPath`、`anchor`均redaction required，其余redaction none。
3. Check `markdown-link-boundary` SHALL 允许且只允许codes `markdown-link-absolute-filesystem-target`、`markdown-link-project-root-escape`与`markdown-link-symlink-root-escape`。Evidence order SHALL 为required `linkKind:string`（closed link-kind enum）、required `classification:string`（固定`out-of-project/absolute-filesystem`）、required `sanitizedTarget:string`与required `semanticOccurrenceOrdinal:number`；四项均参与identity。`sanitizedTarget` MUST只使用`<absolute-filesystem>`、`<project-root-escape>`或`<symlink-root-escape>`，不得包含raw absolute host/project path、userinfo、query value或fragment，且redaction required；其它entries redaction none。

For deterministic findings，`semanticOccurrenceOrdinal` MUST 按同一source path AST traversal中相同link kind、classification与sanitized target（anchor check还包含targetPath/anchor）的occurrences从1计数。Location、message、raw destination与canonical request URL不得参与identity或evidence。

#### Scenario: Missing local target has closed evidence

- **WHEN**inline link指向不存在的project-relative `guide.md`
- **THEN**finding使用check ID`markdown-link-local-target`、code`markdown-link-local-target-missing`与ordered linkKind/classification/sanitizedTarget/ordinal/targetPath evidence
- **AND**consumer无需解析message即可取得stable target semantics

#### Scenario: Boundary evidence never exposes an absolute host path

- **WHEN**Markdown destination是POSIX、Windows或file URI absolute target
- **THEN**finding使用code`markdown-link-absolute-filesystem-target`与catalog token`<absolute-filesystem>`
- **AND**finding、evidence、message、fingerprint与public output不包含raw absolute target

### Requirement: Deterministic link regressions require an explicit baseline

`all` SHALL 包含全部current deterministic Markdown link findings。Descriptor SHALL 为每个finding产生closed causal path set：所有findings包含normalized source path；project-local target finding在可确定intended/actual target时还包含其normalized project-relative target path；same-document anchor包含source/target同一路径；cross-file anchor包含source与实际target path；boundary finding只包含source path。任一causal path命中resolved changed scope时finding MUST按all中的relative order进入`changed`，而不是只检查source path。

只有调用者提供有效显式baseline时，Product才 SHALL 以stable line-independent finding identity比较current与baseline，并只把baseline中不存在且已属于`changed`的current identity按order-preserving subsequence放入`regressions`。省略、无效或不可用baseline MUST NOT 从Git history、cache、上一提交或source location推断comparison；省略baseline时该feature MUST保持current-only且regressions为空。External candidate handoff本身不是finding，也不得由本feature创建network regression。

#### Scenario: Preceding line insertion preserves link identity

- **WHEN**有效显式baseline与current的唯一差异是在同一link occurrence前增加空行
- **THEN**candidate/finding semantic occurrence identity保持不变且不产生new deterministic regression
- **AND**current location更新但不进入fingerprint或cache key

#### Scenario: Missing explicit baseline does not infer regressions

- **WHEN**caller省略baseline且current产生local、anchor或boundary finding
- **THEN**finding进入all并按changed scope进入changed，但regressions为空
- **AND**Product不从Git或cache推断baseline

#### Scenario: Target-only change makes an anchor finding changed

- **WHEN**source Markdown link未修改，但其project-local target删除或重命名heading且target path命中changed scope
- **THEN**resulting local-target或anchor finding因causal target path进入`changed`
- **AND**只有有效显式baseline且identity为new时才进一步进入`regressions`
