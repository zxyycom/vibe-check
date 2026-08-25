# Proposal

本 Plan 将 `markdownLinkValidation` 定义为离线的 Markdown **本地引用完整性** Check：它验证 source 文档中的本机文件系统链接是否能安全解析到 target 或 heading。target 可以是 project root 内路径、source scope 外路径，或仅在 Check-owned 显式选项授权下的 root 外本机路径；它不把 Markdown 文本本身误称为“语法无效”，也不尝试验证外部网站可达性。

## Why

文档移动、重命名和标题编辑会留下失效的相对路径与 fragment anchors；这类错误会让读者、生成文档消费者或 repository navigation 跳转到不存在的目标。它是可由当前项目内容证伪的引用完整性问题，而不是 Markdown 风格偏好。

仓库已有 `scripts/validation/links.ts` 的 docs validator，证明本地链接存在性是实际需求，但它只扫描 `AGENTS.md` 和 `docs/`，用正则处理 inline form（image 会被当作同一 form 匹配），跳过 anchor existence、reference links 和安全 containment。Package Check 的价值是向任意 Project Definition 提供有边界、可组合、可记录的 generic local-reference integrity；它不替代、导入或改变该 repository script。

## Outcome

完成后，package 公开 ordinary Check value `markdownLinkValidation`（`checkId = "markdown-link-validation"`）。它从 global scope 的 `.md` / `.markdown` exact inputs 中提取受支持的 Markdown link occurrences，离线验证 same-document anchors、direct local paths、directories 和 cross-document anchors，并以 safe Check-local Records、final counts 和四态 result 表达本次本地引用完整性结论。

HTTP(S)、protocol-relative、`mailto:`、UNC 与 authority-bearing/unsupported `file:` form 只被分类后停止：不做 DNS、HTTP、TLS、redirect、retry 或 external reachability verdict，也不把 raw request material 交给其它 Check。首版只有 raw empty-authority、host-native absolute `file:///` URI 才可能进入本机 target option gate。

## Scope

### Intended Change

1. 新增 `markdownLinkValidation` ordinary default value、closed options runtime validation 与 public export。完整 grammar 是 `requireExistingTargets`、`validateSameDocumentAnchors`、`validateCrossDocumentAnchors`、`rootExternalTargetMode: "ignore" | "report" | "validate"`、默认关闭的 `requireNonEmptyDirectories` 及 `limits.maxMarkdownBytes/maxOccurrences/maxTargetReads`；完整 default 的 root-external mode 是 `report`，不会隐式进入 `validate`。
2. Link Check 自己拥有一个最小、package-private Markdown parser adapter。它使用精确 direct dependencies `mdast-util-from-markdown@2.0.3`、GFM/YAML front-matter micromark/mdast extensions 与 `github-slugger@2.0.0`，只投影本 Check 使用的 occurrence、definition、heading/anchor input、source ranges 和 controlled parse failure，并封装 dependency AST。它不依赖 `markdownStructureValidation` 注册、执行或通过，也不建立 Check-to-Check handoff、parse cache 或 public Markdown model。
3. 支持的 occurrences 是 inline links、parser 已解析的 reference links、images、explicit autolinks 与经选定 dialect 解析的 GFM autolink literals。未定义 reference 若 parser 未产出 semantic occurrence，就不是 Link issue，不能通过 raw-text 二次提取补回；它属于未来独立 Markdown syntax/lint 的候选问题。code span/fence、HTML attributes 和 plain-prose URLs 不属于本 Check；HTTP(S)、protocol-relative、`mailto:`、UNC 与 remote `file:` authority 在分类后立即停止，不产生本地 target read 或 external result。
4. 本地 resolution 按安全顺序处理：先受控 decode/classify，再以 source directory 为 base 做 lexical normalization。source eligibility 始终是 global exact scope；root 内但 source scope 外的 direct target 可被 bounded 检查，且不成为新 source input。relative lexical escape、host-native absolute 与 accepted `file:///` 在零 target I/O 下进入 mode gate；lexically root-in candidate 只可用 component-wise no-follow `lstat`/`readlink` 做 containment probe。symlink 首次越出 root 后，`ignore/report` 不得触碰 outside referent，`validate` 才可继续 direct bounded work。没有递归 discovery。cross-document anchor 只能在可读取的 Markdown regular file 上解析，directory target 不进行 anchor read。
5. normal link defects 形成 Check-local safe Records；normal issues 大于零为 `failed`、零为 `passed`；没有 source Markdown 为 `not-applicable`；source/target read、decode/parser/limit、cancellation 或 Product-protocol failure 为 `unavailable`，不伪造 clean result。任何 root 外 finding 的 identity/data 只使用 source-relative navigation、occurrence ordinal 和 safe reason，绝不带 raw/digest destination。
6. 同步 Configuration、Scan Scope、Quality Metrics、Output、public README/JSDoc/example、dependency/license evidence、semantic Cases、isolated installed-Bun candidate 与 Project Gate evidence。
7. 不实现网络 reachability、HTML/prose path extraction、generic path-reference validation、shared file policy、comparison/reference、raw URL cache、cross-Check request snapshot 或 Network Check 的任何 side effect。

### Resulting Impacts

- 用户已取消 `add-markdown-structure-validation`；首版方向改由 `complete-first-release-check-set-without-markdown-structure.md` 与 `changes/active-change-portfolio.md` 表达。Link 因而独立拥有最小 parser adapter，不以 Structure 的注册、执行、结果或 private handoff 为前置。
- `scripts/validation/links.ts` 是同一问题的 repository-local、较窄实现，不是 Product runtime dependency。Product source 不得 import `scripts/**`；本 Change 不扩大该 script 的 roots 或语法。
- Future Markdown Structure Check 若重新出现，只能在有真实消费者时评审复用 Link 的 package-private adapter；它不得要求当前 Link 固化无消费者的 prose/measurement/structure policy。
- Future Network Link Check 保持独立：离线 Check 不保存 raw external destination、query、userinfo 或 credential-derived material，也不为网络重放建立数据通道。
- [离线 Markdown Link Check 的本地目标边界](../../docs/decisions/define-offline-markdown-link-target-boundaries.md) 固定：source scope 与 direct target resolution 是不同职责；root 外本机路径只有 Link-owned option 的 `validate` mode 可读取，且不因此获得网络权限或 Product-wide filesystem capability。
- [低层 Markdown parser architecture](../../docs/decisions/adopt-low-level-markdown-link-parser-architecture.md) 固定：parser/slug 只产生私有 source facts，target authorization 与安全 resolver 继续由 Link 自己拥有；不采用 Git/CLI/crawler 型完整 validator。
- [未定义 Markdown reference 边界](../../docs/decisions/exclude-undefined-markdown-references-from-link-check.md) 固定：没有 parser semantic occurrence 的 reference syntax 不进入 Link issue、Record 或 count。

## Success Criteria

- 每个受支持 occurrence 都有 fixture 固定的 classification 与 source range；inline/reference/image/autolink、escaped or encoded destination、same/cross-document fragment、duplicate headings、front matter、code span/fence 和 Unicode 的语义可复现。
- 已定义 reference 必须进入 target validation；未定义 reference 不得被 raw-text 二次提取或伪装成 missing target。
- 本地 file、directory、source-scope 外、absolute、lexical escape 与 symlink escape 的行为符合 L3 的明确 contract；root 外 mode fixture 证明 lexical root-external target 的 `ignore/report` 零 target I/O，escaping symlink 只允许 root-in containment probe，只有 `validate` 可访问 root 外 referent，directory target 不进行 anchor read。
- `requireNonEmptyDirectories` 默认关闭；启用时以不递归的单个-entry fixture 固定 empty/non-empty/unreadable directory 的 passed/failed/unavailable semantics。
- HTTP(S)、protocol-relative、`mailto:`、UNC 与 remote `file:` authority 保持零 Product-owned network、零 reachability verdict，且 raw query/userinfo/destination 不进入 Record ID、Record data、final data、message、cache、artifact 或 error output。host filesystem 自己的 mount transport 不构成 Product network guarantee。
- anchor validation 以 fixture 固定的 GitHub-priority GFM-like dialect 为准；它不声称兼容所有 renderer，也不把 parser 的偶然版本行为当作 contract。
- 结构化 result 只表达 link-integrity facts：status、counts、closed reason、safe normalized relative path/fragment、occurrence kind 和可选 navigation location；identity 不依赖 raw URL、parser node ID 或当前 line/column。
- public value/options/docs/Cases/package candidate 与 required/full Gate evidence 一起闭合；Structure Check 是否存在不改变本 Check 的可用性、scope 或 verdict。

## Affected Owners

| Owner | 本 Change 必须同步的事实或证据 |
| --- | --- |
| `docs/configuration.md`、`src/definition/default-checks.ts` | default value、完整 closed option grammar、native composition 与 runtime validation。 |
| `docs/scan-scope.md`、Link input/resolver implementation | source exact inputs 与 direct target resolution 的区分、root 外 mode、metadata/content-read authorization、no-discovery/no-recursion boundary。 |
| `docs/quality-metrics.md`、`src/checks/builtins/**` | local-reference issue taxonomy、Record identity、final counts、four-state and limit semantics。 |
| `docs/output.md`、machine/output tests | safe relative target/fragment projection及 raw URL exclusion。 |
| `src/index.ts`、package/dependency/license owners、README/JSDoc/examples | public export、parser dependency material、consumer composition example 与 installed candidate。 |
| `docs/testing/cases/**`、相邻 Bun tests | occurrence、resolution、anchor、scope、symlink、zero-network、credential-canary 与 public-consumer evidence。 |
| `docs/decisions/complete-first-release-check-set-without-markdown-structure.md`、`changes/active-change-portfolio.md` | 首版发布门槛只包含 Link、JSON、JSON Schema 与 maintenance reminders；Link 不依赖 Structure。 |
| `docs/decisions/define-offline-markdown-link-target-boundaries.md`、`docs/decisions/adopt-low-level-markdown-link-parser-architecture.md`、`docs/decisions/exclude-undefined-markdown-references-from-link-check.md` | Link-local target authorization、parser/slug architecture、undefined reference boundary 与 GitHub-priority anchor contract。 |
