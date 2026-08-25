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
2. **Parser architecture and ownership — confirmed.** Link owns `bytes -> normalized link/heading facts | controlled failure` 的最小 package-private adapter。production direct dependencies 固定为 `mdast-util-from-markdown@2.0.3`、`micromark-extension-gfm@3.0.0`、`mdast-util-gfm@3.1.0`、`micromark-extension-frontmatter@2.0.0`、`mdast-util-frontmatter@2.0.1` 与 `github-slugger@2.0.0`；adapter 只组合 YAML front matter 与 GFM extensions，并封装 dependency AST。没有当前 Structure consumer 时，不创建 shared model，也不要求另一个 Check 执行。未来复用必须重新评审，不承诺 current private shape。
3. **Occurrence and non-network boundary — confirmed.** parser 产出的 inline links、已定义 reference facts、images、explicit autolinks 与 selected GFM autolink literals 是 Link occurrences。未定义 reference 若没有 parser semantic occurrence，就不经 raw-text 二次提取，也不形成 Link issue；它是独立 Markdown syntax/lint 的未来候选。code span/fence、HTML attributes、plain prose URL 不进入。HTTP(S)、`mailto:`、protocol-relative、UNC 与 remote `file:` authority 在 classification 后停止，绝不触发 Product-owned DNS/network I/O，也不发布 external reachability state。只有无 remote authority 的 supported local `file:` form 可进入 local-target gate；host filesystem 自己的 mounted transport 不构成 Product 能够隔离的 network promise。
4. **Source scope and direct targets — confirmed.** source 必须是 global-scope eligible Markdown exact input。root 内但 source scope 外的 target 可以因已被 source occurrence 明确指向而做 bounded metadata/content work；它不成为新的 source input、不重新参与 filters/collection，也不触发递归 discovery。跨文档 anchor 只有 direct target 是可读取的 Markdown regular file 时才读取 heading facts。
5. **Project-root boundary — confirmed.** Link 的 closed `rootExternalTargetMode` 是 `ignore | report | validate`，default 为 `report`。relative lexical escape、host-native absolute spelling 与已接受的 local `file:` URI 在任何 target I/O 前进入该 mode；`ignore` 无 finding，`report` 产生安全的 `target-outside-project-root` finding，只有 `validate` 才继续 bounded direct work。lexically root-in candidate 允许逐组件 no-follow `lstat`/`readlink` containment probe；某个 symlink hop 首次越出 canonical root 后即为 sticky root-external，`ignore/report` 均不得触碰该 root 外 referent。模式不改变 HTTP/UNC/remote-authority 的非网络边界。
6. **Directory semantics — confirmed.** `requireExistingTargets` 同时覆盖 regular file 与 directory existence；directory target 不进行 anchor lookup。`requireNonEmptyDirectories` 是默认关闭的 Link-local option；启用时只读取一个 directory entry 以判定 empty/non-empty，不递归列举。directory read failure、cancellation 和 resource limit 是 unavailable，不是假 empty。
7. **Anchor dialect — GitHub priority; corpus fixed.** same/cross-document anchor lookup 使用 Product-owned、fixture-fixed GFM-like slug dialect，优先匹配 GitHub heading-anchor behavior；每个 document 创建一个 `github-slugger`，按照 AST heading source order 生成 slug。fixture 固定 ATX/Setext、YAML exclusion、Unicode、punctuation/whitespace、duplicate suffix、valid percent fragment 与 invalid fragment；fragment 恰好 decode 一次后与 slug exact compare。range 使用 decoded JavaScript UTF-16 code-unit offset `[startOffset,endOffset)`，line/column 为 1-based、end-exclusive；public Record 只投影 line/column。
8. **Safe outcomes and limits — confirmed.** Link owns closed normal reasons、Record ID grammar、safe data fields、counts、byte/occurrence/target-read limits和 unavailable reason codes。完整 options、safe Record DTO、counts 与 failure folding 在下方 L5 contract 固定。root 外 finding 的 identity不采用 raw URL、external absolute path、parser ID 或 target location；location仅为 source navigation。限制不能静默跳过或截断后返回 `passed`。
9. **Public closure — confirmed.** default value/options validation、exports、owner docs、README/JSDoc/example、parser dependency/license、semantic Cases 与 isolated Bun candidate 必须作为同一 Change 的交付；离线 Link Check 不新增 network option、cross-Check dependency或 scripts import。

### Resulting Impacts

| Boundary | Chosen direction | Required follow-up |
| --- | --- | --- |
| Source scope → target resolution | Source remains global exact scope; directly referenced targets may be checked without becoming sources. | Fixtures distinguish scope-external direct reads from recursive discovery and prove no source-scope expansion. |
| Project root → host-local target | `rootExternalTargetMode: "ignore" | "report" | "validate"`; only `validate` reaches a root-external referent. | Fixtures cover lexical escape, host-native absolute, `file:///`, symlink hops and Windows/POSIX forms. |
| Directory target | Existence and non-empty policy are independent; anchor lookup is unsupported. | Fixtures cover empty/non-empty/unreadable, one-entry bound and no recursive listing. |
| Reference syntax | Only parser semantic occurrences are Link inputs; undefined reference syntax remains out of scope. | Fixtures distinguish defined references from undefined/collapsed/shortcut forms without an occurrence. |
| Parser and anchor compatibility | Exact low-level mdast/micromark package set plus `github-slugger` is selected; Product fixture corpus, not parser accident, is the contract. | Dependency/license audit, installed consumer and locked range corpus prove the selected set. |
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

无。L3–L5 已关闭；后续发现只能作为实现缺陷或新需求处理，不能在实现中静默改变本 Change 的公开语义或安全边界。

## Closed Implementation Contract

### L3: target authorization and bounded I/O

1. Link starts by `realpath(projectRoot)` once. A failure is `project-root-unavailable`; a global exact-scope Markdown source whose containment cannot be proved is `source-unavailable`. Source and direct targets never become a second collector.
2. A relative destination is split into path/query/fragment in private memory. Query never participates in a filesystem path or persistent output. Local path and fragment decode strictly once; malformed percent encoding, invalid UTF-8, encoded separator/backslash/NUL/control are `invalid-local-destination` and settle the Check as `unavailable` before target I/O.
3. Relative lexical escape and host-native absolute spelling enter `rootExternalTargetMode` before target I/O. On a non-Windows host, Windows drive spelling is unsupported and stops with zero I/O; on Windows it is an absolute candidate. HTTP(S), `mailto:`, protocol-relative URL, UNC and foreign/unsupported path forms stop with zero filesystem, DNS, HTTP, TLS or subprocess work and make no reachability finding.
4. A lexically root-in path uses only component-wise, no-follow `lstat`/`readlink` while the current component remains inside the canonical root. A symlink hop that first escapes is sticky root-external. This containment probe is not authority to read the outside referent: `ignore` stops silently, `report` emits one `target-outside-project-root` finding, and only `validate` may continue its bounded direct work. Probe errors, loops or hop-limit exhaustion are unavailable.
5. A contained direct target may be checked even if outside source scope. A regular Markdown target is read only for an enabled cross-document fragment; its own links are never discovered. A directory never receives anchor lookup; non-empty validation calls `opendir().read()` once, never recursive discovery. Missing target is a normal finding only when `requireExistingTargets` is enabled; otherwise anchor work stops.

| Raw/local class | `ignore` / `report` | `validate` | Persistent outcome |
| --- | --- | --- | --- |
| relative contained target | normal direct validation | normal direct validation | regular file/directory/anchor verdict |
| relative lexical escape or host-native absolute | no I/O / safe boundary finding | bounded direct validation | none or `target-outside-project-root`; validate may yield missing/unavailable |
| root-in path with escaping symlink hop | root-in containment probe only, then no outside I/O / safe boundary finding | bounded external continuation | none or `target-outside-project-root`; validate may yield missing/unavailable |
| `file:///` accepted local URI | no I/O / safe boundary finding | bounded direct validation | same as absolute target |
| HTTP(S), mailto, protocol-relative, UNC, unsupported `file:` or foreign path | zero I/O | zero I/O | no finding or external verdict |

`file:` is classified from raw spelling before WHATWG normalization. The only supported form is ASCII-case-insensitive `file:///` with empty raw authority and a host-native absolute path: POSIX absolute on POSIX, or drive-absolute on Windows. `localhost`, any authority, `file:/`, relative `file:`, a fourth slash/UNC form, query, raw backslash/control/whitespace and platform-mismatched drive forms stop with zero I/O. Its URI path is strict UTF-8 percent-decoded exactly once; encoded `/`, `\\`, NUL or control are unavailable. Fragment is separately decoded under the anchor contract.

### L4: parser facts, grammar and range

- Direct production dependencies are exact (no range): `mdast-util-from-markdown@2.0.3`, `micromark-extension-gfm@3.0.0`, `mdast-util-gfm@3.1.0`, `micromark-extension-frontmatter@2.0.0`, `mdast-util-frontmatter@2.0.1` and `github-slugger@2.0.0`. `micromark` remains transitive, not a Link direct dependency.
- The one Link-private adapter uses `fromMarkdown()` with GFM and YAML-front-matter extensions. It receives an already authorized decoded document and returns immutable occurrences, definitions, headings, ranges or controlled failure; it neither discovers paths nor invokes Git, a child process or a network client.
- Supported occurrences are inline links/images, defined full/collapsed/shortcut references, explicit autolinks and selected GFM autolink literals. Code/fenced code, HTML attributes, plain prose URLs, YAML front matter and undefined references have no Link occurrence. A defined reference range is its use-site, not its definition.
- The locked fixture corpus covers ATX/Setext headings, YAML exclusion, inline/reference/image/autolink forms, code/HTML/prose exclusion, undefined reference exclusion, duplicate headings, `Hello, World!`, `Café & tea`, `你好，世界`, valid/invalid encoded fragments and source range positions. Each document uses a fresh slugger; the expected slug is compared exactly after one fragment decode.

### L5: public options, data, limits and reasons

```ts
interface MarkdownLinkValidationOptions {
  readonly requireExistingTargets: boolean;
  readonly validateSameDocumentAnchors: boolean;
  readonly validateCrossDocumentAnchors: boolean;
  readonly rootExternalTargetMode: "ignore" | "report" | "validate";
  readonly requireNonEmptyDirectories: boolean;
  readonly limits: Readonly<{
    readonly maxMarkdownBytes: number;
    readonly maxOccurrences: number;
    readonly maxTargetReads: number;
  }>;
}
```

The complete default is `{ requireExistingTargets: true, validateSameDocumentAnchors: true, validateCrossDocumentAnchors: true, rootExternalTargetMode: "report", requireNonEmptyDirectories: false, limits: { maxMarkdownBytes: 1_048_576, maxOccurrences: 10_000, maxTargetReads: 1_000 } }`. Runtime validation requires every field, accepts only positive safe-integer limits, and rejects limits above `16_777_216`, `100_000` and `10_000` respectively; native object composition does not fill omitted nested fields.

`passed` and `failed` final data is `{ sourceFileCount, occurrenceCount, targetReadCount, findingCount }`. `occurrenceCount` includes every parser semantic occurrence, even a non-local one; `targetReadCount` counts each occurrence that reaches direct endpoint validation. No eligible Markdown source returns `not-applicable` with `no-eligible-input`. Any cancellation, containment/source/target read, decode, parser or limit failure returns `unavailable` without final data or partial Records.

Normal reasons are `missing-target`, `target-outside-project-root`, `empty-directory`, `anchor-on-directory`, `anchor-target-not-markdown`, `missing-anchor` and `unsupported-target-type`. A Record ID is `source:<encodeURIComponent(sourcePath)>:occurrence:<one-based-ordinal>:reason:<reason>`. Its data only contains the safe reason, `occurrenceKind: "link" | "image"`, root-relative slash-normalized `sourcePath`, source navigation range, and a target descriptor: same-document/project-file/project-directory may contain safe root-relative path and decoded fragment; `project-path` is the safe root-relative path and decoded fragment when no endpoint type was established (including a missing target); `outside-project-root` may contain neither target path nor fragment. Raw destinations, query/userinfo, external absolute paths, symlink payloads, target bytes and digests never enter IDs, data, final data, messages, cache, logs or artifacts.

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

## Execution Boundary

L3–L5 are closed. Implementation may now start with the private parser adapter and target resolver; it must preserve the above contracts rather than rediscover or broaden them. Exact dependency lockfile/license evidence, public owner docs, semantic Cases and isolated installed-Bun evidence remain delivery work, not an invitation to alter the closed grammar or target authorization model silently.
