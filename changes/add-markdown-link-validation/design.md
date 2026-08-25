# Design

本设计让 `markdownLinkValidation` 自己拥有离线本地引用完整性、最小 Markdown parser adapter、可配置的本机 target resolution 和 GitHub-priority anchor verdict；它不把 Markdown 风格、网络可达性、全局 filesystem capability 或另一个 Check 的运行结果混入同一职责。

## Context

当前 Product 的 ordinary Check callback 已拥有 closed Check-owned options、global file-scope configuration、Record reporter、cancellation signal 和 four-state settlement；Core/output 不解释 Markdown，`dependencies.get` 只读取 canonical final data，不能承载 raw URL、parser payload 或 invocation-private snapshot。当前 package 没有 Markdown parser dependency 或 built-in Markdown Check。

现有 `scripts/validation/links.ts` 是一个独立 repository tool：它扫描 `AGENTS.md` 与 `docs/`，以正则检查 inline-form local destination 的 `existsSync`（image 会被当作同一 form 匹配），跳过 same-document fragment 和 external schemes，不处理 reference links、anchor existence、scope/realpath containment 或 raw-URL safety。它说明问题真实存在，但其 roots、grammar 和 failure contract 不是 Product contract；Product source 不能 import `scripts/**`。

用户已明确取消 Markdown Structure Check，并授权删除其 active Change。首次发布方向由 `complete-first-release-check-set-without-markdown-structure.md` 与当前 Portfolio 同步为 Link independent；Link 的独立 parser ownership 是当前稳定的计划方向，而非对已删除 Change 的临时例外。

当前长期契约由三条 Decision 共同表达：[离线本地目标边界](../../docs/decisions/define-offline-markdown-link-target-boundaries.md) 固定 source/target、root 外和目录授权；[低层 parser architecture](../../docs/decisions/adopt-low-level-markdown-link-parser-architecture.md) 固定私有 mdast/micromark + slugger 路线；[未定义 reference 边界](../../docs/decisions/exclude-undefined-markdown-references-from-link-check.md) 保持 Link 不承担 Markdown syntax lint。详细候选比较、热度/生态/活跃度与临时实验由 [库策略调查报告](../../docs/investigations/implementation-libraries/markdown-link-validation-library-strategy.md) 承接；报告是 Readiness 证据，不是已安装依赖或 runtime behavior。

现有 `scripts/validation/links.ts` 说明 repository-local local-link checking 有真实需求，但它只处理自己的 roots、正则 grammar 和 failure contract。它既不是 Product runtime dependency，也不定义 Product 的 parser、target authorization 或安全输出。

## Goals / Non-Goals

**Goals**

- 让 project author 获得可复现、零 Product-owned-network 的本地 Markdown reference integrity result：source occurrence、local target existence/containment、directory policy 和适用的 anchor existence 各自有明确语义。
- 让 Link Check 可在 Structure Check 不存在时独立运行，并保留最小、可被未来真实消费者重新评审的 package-private parser boundary。
- 让 source 继续严格使用 global exact scope，而由 Link 以受控、direct-only target resolution 处理 root 内 scope 外或显式授权的 root 外本机 target；不把 target read 伪装成第二次 source discovery。
- 以 GitHub-priority fixtures 固定 slug/fragment 行为，并使 default options、Record/final data、public docs、Cases 和 installed consumer evidence 同步闭合。
- 保护 project root、symlink、raw destination 与可能携带 credentials 的材料：外部 absolute path、target bytes 和 query/userinfo 不进入 Core、output、cache、logs 或 cross-Check state。

**Non-Goals**

- 不判定 Markdown 文本是否“语法有效”，不执行标题风格或内容质量 policy。
- 不请求 HTTP、DNS、TLS、redirect、retry 或其它 Product-owned network operation；HTTP(S)、`mailto:`、protocol-relative URL、UNC 与 remote `file:` authority 不属于本 Check。
- 不把 HTML attributes、plain prose URL、imports 或 generic path references归入 Markdown destination owner。
- 不建立 shared parser registry、shared file-policy、global target discovery、Product-wide local-filesystem permission、cross-Check snapshot/cache 或 public Markdown AST/model。

## Decisions

### Intended Change

1. **Product result — confirmed.** `markdownLinkValidation` 是 Product-provided ordinary Check，结果是“本地引用完整性”，不是 Markdown syntax validation。一个 normal issue 只表示受支持 source occurrence 无法满足当前 Link contract；read/decode/parser/protocol/resource uncertainty 必须是 `unavailable`，不会被伪装成 missing target 或 clean pass。
2. **Parser architecture and ownership — confirmed.** Link owns `bytes -> normalized link/heading facts | controlled failure` 的最小 package-private adapter。它以 `mdast-util-from-markdown`、必要的 micromark/mdast GFM/front matter extensions 和 `github-slugger` 产生 Link 已消费的 occurrence、definition、heading/slug input 与 source ranges，并封装 dependency AST。exact production semver、最小 extension set 和 source-range contract 留给 L4/L5；没有当前 Structure consumer 时，不创建 shared model，也不要求另一个 Check 执行。未来复用必须重新评审，不承诺 current private shape。
3. **Occurrence and non-network boundary — confirmed.** parser 产出的 inline links、已定义 reference facts、images、explicit autolinks 与 selected GFM autolink literals 是 Link occurrences。未定义 reference 若没有 parser semantic occurrence，就不经 raw-text 二次提取，也不形成 Link issue；它是独立 Markdown syntax/lint 的未来候选。code span/fence、HTML attributes、plain prose URL 不进入。HTTP(S)、`mailto:`、protocol-relative、UNC 与 remote `file:` authority 在 classification 后停止，绝不触发 Product-owned DNS/network I/O，也不发布 external reachability state。只有无 remote authority 的 supported local `file:` form 可进入 local-target gate；host filesystem 自己的 mounted transport 不构成 Product 能够隔离的 network promise。
4. **Source scope and direct targets — confirmed.** source 必须是 global-scope eligible Markdown exact input。root 内但 source scope 外的 target 可以因已被 source occurrence 明确指向而做 bounded metadata/content work；它不成为新的 source input、不重新参与 filters/collection，也不触发递归 discovery。跨文档 anchor 只有 direct target 是可读取的 Markdown regular file 时才读取 heading facts。
5. **Project-root boundary — confirmed.** Link owns一个语义为 `ignore | report | validate` 的 closed root 外 target mode；L5 固定最终 public field name/default。`ignore` 不读取也不汇报；`report` 只产生 safe boundary finding，不触碰 target；`validate` 才允许对 direct root 外、absolute 或 realpath-escape 本机 target 做 bounded `lstat`、`realpath`、directory-entry 或 Markdown content work。默认不得进入 `validate`。模式不改变 HTTP/UNC/remote-authority 的非网络边界。
6. **Directory semantics — confirmed.** `requireExistingTargets` 同时覆盖 regular file 与 directory existence；directory target 不进行 anchor lookup。`requireNonEmptyDirectories` 是默认关闭的 Link-local option；启用时只读取一个 directory entry 以判定 empty/non-empty，不递归列举。directory read failure、cancellation 和 resource limit 是 unavailable，不是假 empty。
7. **Anchor dialect — GitHub priority; exact corpus pending L4.** same/cross-document anchor lookup 使用 Product-owned、fixture-fixed GFM-like slug dialect，优先匹配 GitHub heading-anchor behavior；`github-slugger` 是已审计的候选实现，而不是 renderer oracle。它必须定义 heading source set、front matter、ATX/Setext behavior、Unicode normalization、case/punctuation/whitespace、duplicate suffix、percent decoding与fragment comparison；不声称兼容每个 renderer。
8. **Safe outcomes and limits — pending L5.** Link owns closed normal reasons、Record ID grammar、safe data fields、counts、byte/occurrence/target-read limits和 unavailable reason codes。root 外 finding 的 identity不采用 raw URL、external absolute path、line/column 或 parser ID；location仅为 source navigation。限制不能静默跳过或截断后返回 `passed`。
9. **Public closure — confirmed.** default value/options validation、exports、owner docs、README/JSDoc/example、parser dependency/license、semantic Cases 与 isolated Bun candidate 必须作为同一 Change 的交付；离线 Link Check 不新增 network option、cross-Check dependency或 scripts import。

### Resulting Impacts

| Boundary | Chosen direction | Required follow-up |
| --- | --- | --- |
| Source scope → target resolution | Source remains global exact scope; directly referenced targets may be checked without becoming sources. | L3 fixtures distinguish scope-external direct reads from recursive discovery and validate no source-scope expansion. |
| Project root → host-local target | `ignore | report | validate` is Link-owned; only `validate` permits direct root-external local work. | L5 closes field name/defaults; L3 tests absolute, relative escape, `file:`, symlink and Windows/POSIX forms. |
| Directory target | Existence and non-empty policy are independent; anchor lookup is unsupported. | Fixtures cover empty/non-empty/unreadable, one-entry bound and no recursive listing. |
| Reference syntax | Only parser semantic occurrences are Link inputs; undefined reference syntax remains out of scope. | L4 fixtures distinguish a defined reference from an undefined/collapsed/shortcut form that has no occurrence. |
| Parser and anchor compatibility | Low-level mdast/micromark + `github-slugger` is selected; Product fixture corpus, not parser accident, is the contract. | L4 locks the exact dependency versions/minimal extensions, range convention and unsupported renderer edge cases. |
| Future Network Link Check | It keeps its own authorization/input-acquisition boundary. | Offline Link never retains raw external target material or creates a replay handoff. |
| Future Path / Structure Check | Neither owns or depends on Link invocation state. | Reuse of Link-private functions needs a new real consumer review; no shared resolver is preallocated. |
| Repository docs validator | It remains a local script with its current narrow contract. | Do not import, replace or silently broaden it; product fixtures may compare representative behavior only. |

## Risks / Trade-offs

- **Host-local capability:** `validate` can read a direct path outside project root under the caller's existing filesystem privileges. Keeping it Check-owned and opt-in prevents a default Check, Gate profile or registration from silently acquiring that capability, but project authors must still treat it as trusted configuration.
- **Portability and mount semantics:** absolute paths and root-external links can be machine-specific; local filesystem calls may hit a host-managed network mount even though the Product creates no network client. Fixtures can prove our resolver behavior, not host mount implementation.
- **Scope versus usefulness:** direct target reads improve link integrity for a focused source set, but must never turn into a second collector or change another Check's input set. The one-hop/direct-only gate is the required boundary.
- **Renderer anchor drift:** GitHub and other renderers can slug headings differently. GitHub-priority fixtures are auditable but need explicit unsupported edge behavior.
- **Sensitive destination material:** query/userinfo, external absolute paths and target bytes can leak secrets or host topology. Logs, errors, IDs and persistent data must use source navigation plus safe classifications only.
- **Dependency lifecycle:** a parser/slug dependency increases package, Bun, license and upgrade-maintenance obligations. No dependency is accepted until L4/L5 selection evidence and an installed candidate pass.

## Open Questions

| ID | 必须关闭的问题 | 推荐方向与所需证据 | 阻塞点 |
| --- | --- | --- | --- |
| L3 | supported local syntaxes与 target access sequencing是什么：relative escape、absolute POSIX/Windows path、local `file:` URI、remote `file:` authority、UNC、symlink、scope-external Markdown anchor和 mounted-path boundary分别如何分类？ | fixture spike 将 root 内、root 外 `ignore/report/validate`、Win/POSIX、local/remote `file:`、UNC、symlink、same/cross-document anchor 与 no-recursion 做成 matrix。远程 form 永不访问；host mount 只记录为环境边界。 | 1.2、2.1 |
| L4 | 已选 parser/slug architecture 的 exact dependency versions、最小 extension set、source-range convention、supported GFM syntax、defined/undefined reference behavior 与 GitHub-priority Product slug corpus分别是什么？ | 以 0.3 evidence 的 Bun-compatible MIT/ISC candidates 为起点，完成 production manifest/license/security audit并锁定 fixture corpus；不复用 `scripts/**` helper，也不把 `github-slugger` 当作完整 renderer oracle。 | 1.1、2.1 |
| L5 | final public option field names/defaults、normal reason set、Record ID/data、final counts、source-range base和 byte/occurrence/target-read limits分别是什么？ | root 外 mode 必须默认不为 `validate`，`requireNonEmptyDirectories` 默认 `false`；由 Configuration/Quality Metrics/Output owner 与 fixtures闭合完整 DTO、safe root-external evidence和 unavailable reasons。 | 1.2、1.3、2.1 |

在 L3–L5 关闭前，这个 Change 是结构有效的 Plan；0.3 已形成 evidence，下一步只能执行 0.4，不得开始 parser/resolver/public implementation。

## Readiness Evidence

### 0.3 parser and target-boundary audit — complete

- 在修改测试前，`bun run test-evidence -- check --root .` 通过（163 个 current test entities，49 个 semantic Cases）；本次没有修改 test body 或原生 test node。
- 2026-08-25 的仓库外临时 ESM fixture 用 `pnpm --ignore-scripts` 安装候选、在 Bun 1.3.14 运行并清理目录；未修改 `package.json`、lockfile、Product source 或 Product dependency。候选版本/许可证是 `mdast-util-from-markdown@2.0.3`、`micromark@4.0.2`、GFM/front matter mdast/micromark extensions（MIT）与 `github-slugger@2.0.0`（ISC）。
- fixture 确认 YAML front matter、heading、inline link、defined reference、image、explicit/GFM autolink、UTF-8 heading 和 node position；code/HTML 不生成 Link occurrence。未定义 reference 没有 semantic occurrence，故由对应 Decision 排除。position offset 是 decoded JavaScript code unit 而非 UTF-8 byte，L5 必须明确公开 navigation/range contract。
- fixture 确认 duplicate GitHub-style slugs、local/remote `file:` authority、protocol-relative form、Windows/POSIX absolute spelling、invalid percent decode、root 外三态、empty/non-empty directory 的 one-entry read、symlink realpath escape 与 direct-only no-recursion policy。它证明候选与边界可实现，不证明 Product runtime 已实现。

| Candidate | 0.3 finding | Architecture status |
| --- | --- | --- |
| Low-level mdast/micromark extensions + `github-slugger` | Bun AST/range/slug fixture 通过；不主动发现 target、运行 Git 或发起 network。 | 已选；L4 锁定 exact production set。 |
| `remark-validate-links` | Node API 缺跨文件 heading；默认 Git discovery/child process 与 Product boundary 冲突。 | 不采用为 Product core。 |
| unified/remark | 能产出相同类别 AST，但当前没有第二个 transform consumer，增加 pipeline surface。 | 不作为首版默认 runtime。 |
| `markdown-it` | 缺同等 occurrence offset 与 front matter；未定义 reference 在实验中只是 text，未来 syntax/lint 若要处理它仍须另定语义。 | 不作为首版 parser。 |
| `markdown-link-check` / Linkinator | network/CLI/crawl model 与 offline direct-only boundary 相反。 | 不采用。 |

完整的版本、热度、生态、活跃度、license 和临时实验条件保存在 [库策略调查报告](../../docs/investigations/implementation-libraries/markdown-link-validation-library-strategy.md)；它是 selection matrix 的详细证据 owner。

## Next Executable Step

执行 0.4 时必须一次性关闭以下可交付物：

1. **L3 target table：** 逐一规定 relative escape、absolute POSIX/Windows、local/remote `file:`、UNC、protocol-relative、`localhost` spelling、symlink 与 cross-document anchor 的 lexical classification、I/O 顺序、mode verdict 与 safe reason。
2. **L4 parser contract：** 固定 direct package names/semver、最小 extensions、production dependency/license/security evidence、defined/undefined reference fixture、decoded range convention 和 GitHub-priority slug corpus。
3. **L5 public contract：** 固定 option field names/defaults、normal/unavailable reason、Record ID/data、counts 与 byte/occurrence/target-read limits，并同步 Proposal/owner docs/Cases 的验收入口。

0.4 关闭并复核后才可进入 1.1–1.3；若任一 public 或安全契约仍未关闭，保持 Plan，不安装 dependency 或开始 Product implementation。
