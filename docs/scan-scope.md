# Scan Scope

本文拥有 Product 的当前 worktree 文件收集、配置过滤、code-area 分类入口，以及交给 default
Check adapter 的 exact inputs。它不定义 Check final status、Record、aggregation、machine output 或
另一套 Product-wide comparison scope。

## Resolved scope

`ProjectDefinition.quality` 是收集的唯一 declarative input：闭合字段为 `codeAreas`、`excludeDirs`、
`generatedFiles` 和 `include`。Product 从 project root 收集 slash-normalized、stable-sorted relative paths，
再应用 `include` 与 exclude/generated rules；code-area classification 在 default Check 为自己的 exact-input
selection 使用同一已验证配置。

正常 collection 调用 `git ls-files -z --cached --others --exclude-standard --`。Git 成功（包括空输出）时，
Product 使用该 ignore-aware candidate set，并加入已初始化 child Git worktree 的当前文件；之后统一
normalize、去重并应用相同 config filters。Git command 失败时才使用 config-only filesystem fallback。
fallback 不能读取 root 或任一遍历目录时以包含该目录的读取错误失败，不能把故障伪装为 empty set。

Git tree 中的 `160000` gitlink 只有在 child path 是独立初始化的 Git worktree 时才会下沉。child 的
canonical Git top-level 必须等于 child 自身 canonical path；普通目录即使替换了 HEAD gitlink，也不属于
child worktree，遍历不得回到 parent repository。该规则只描述 current worktree collection。

`RunControls.changedFiles` 仍是冻结的 invocation string list，并原样进入 custom Check project context。它
不改变 `collectScanFiles` 得到的 repository candidates，也不建立另一份 Product scope。Check 若需要使用这段
context，必须由自己的 callback/options 定义语义。

## Check exact inputs

`file-metrics`、`function-metrics` 与 `duplicate-detection` 各自从同一 resolved file collection 产生
Product-approved exact inputs。adapter 不接收 project root 来重新发现或扩大这些 inputs。function structural
inputs 为 `.ts`、`.d.ts`、`.rs`；duplicate inputs 按 code area 分组。zero eligible inputs 是 owning Check 的
applicability/work fact，不触发 scope fallback。

`markdown-link-validation` 的 source exact inputs 只是在 global resolved scope 中匹配 `.md` 或
`.markdown` 的文件。source collection 仍完全服从同一 `include`、exclude/generated rules；没有 eligible source
时不以 target、directory 或 Markdown parser 重新发现 source。其 own source occurrence 之外的 target 不扩展
global scope，也不递归收集 target 的 links。

### Markdown Link source occurrences

Link Check first canonicalizes the project root once. If that fails, it is `unavailable`; only a canonicalized
root with zero eligible Markdown source is `not-applicable`. Each eligible source is decoded and parsed once
into Link-private facts. The supported occurrences are inline links/images, defined full/collapsed/shortcut
references at their use site, explicit autolinks, and the selected GFM autolink literals. YAML front matter,
code/fenced code, HTML attributes, prose URLs, and undefined references do not create occurrences.

The facts are immutable Link-private adapter output. Decode or parser failure makes the Check `unavailable`
instead of publishing a partial occurrence set.

For anchor lookup, each document gets a fresh GitHub-priority slugger over ATX and Setext headings. The Check
does not promise every renderer's anchor edge case. Its source navigation range uses decoded JavaScript UTF-16
positions with one-based, end-exclusive line/column values; parser offsets and dependency ASTs remain private.

## Markdown Link direct targets

Markdown Link Check can perform bounded work only for a source occurrence's direct local target. A target
lexically inside the project root may be checked even when it is outside the source scope, but it never becomes
a source input. For an enabled cross-document fragment, only a readable regular Markdown target supplies
heading facts; a directory never accepts anchor lookup. When cross-document anchor validation is disabled, a
fragment does not cause a Markdown eligibility or heading read. Directory non-empty checking, when configured,
reads at most one entry and never recursively enumerates it.

Relative lexical escapes, host-native absolute paths, and accepted raw host-native empty-authority `file:///`
local URIs reach the Check's `rootExternalTargetMode` before target I/O. `ignore` produces no finding and
performs no outside work; `report` produces the safe `target-outside-project-root` finding and performs no
outside work;
only `validate` may do bounded direct work for that target. A lexically root-in candidate may use only a
component containment probe. If a symlink hop escapes the root, that probe does not authorize touching the
outside referent except in `validate` mode.

The containment guarantee is evaluated against the host filesystem state observed during that operation. The
Bun/Node path APIs used here do not provide a portable dirfd/openat traversal, so a hostile concurrent
replacement after a successful component probe is outside this Check's authorization proof. Regular-file reads
still use no-follow final-leaf opening and a byte bound; callers that require hostile-filesystem isolation need
an OS-level sandbox rather than this Link Check.

HTTP(S), `mailto:`, protocol-relative URLs, UNC paths, authority-bearing or unsupported `file:` forms, and
other unsupported target forms stop after classification. They produce no Product-owned DNS, HTTP, TLS,
redirect, subprocess, or filesystem I/O, and no external reachability verdict. The Check has no target
discovery, crawler, shared resolver, or general file-policy surface.

## Source-scope boundary

adapter 对每条 scanner-derived measurement 声明 slash-normalized `sourcePaths`。每一个必须精确属于本次
Check invocation 的 approved set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific
location consistency 属于 adapter；scope 不读取 private payload 重建它。

## 验证

测试覆盖 include/exclude/generated filtering、Git success-empty 与 fallback、NUL paths、fingerprint、
initialized submodule worktree collection、supported extensions、exact inputs 和 adapter no-expansion。
