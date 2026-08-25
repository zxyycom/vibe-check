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

`file-metrics`、`function-metrics`、`duplicate-detection`、`json-validation` 与 `json-schema-validation` 各自从同一 resolved file collection 产生
Product-approved exact inputs。adapter 不接收 project root 来重新发现或扩大这些 inputs。function structural
inputs 为 `.ts`、`.d.ts`、`.rs`；duplicate inputs 按 code area 分组。

`json-validation` 只从 resolved global candidates 中以 case-sensitive `path.endsWith(".json")` 选择 paths。它不会重走
discovery、加入 excluded/generated/vendor/scope 外路径，或把 `.JSON` 作为 input。zero eligible inputs 是 owning
Check 的 applicability/work fact，不触发 scope fallback。

`json-schema-validation` 不从 suffix、`$schema`、filename 或 directory discovery 推断 work。它只检查其 closed
options 中逐项声明的 `schemas[].path` 与 `bindings[].instancePath`：每个 path 必须精确存在于同一次 resolved
global candidate set，才能被读取。declared path 不在 scope 时产生 owning Check 的 safe `out-of-scope` domain issue；
adapter 不读取该 path，也不因为 declaration 自行扩大 scope。zero bindings 是 `not-applicable`，而非允许扫描所有
JSON files。package-fixed catalog 与显式 allowlisted 的 HTTPS reference 不会改变 local scan scope。

`markdown-link-validation` 的 source exact inputs 只是在 global resolved scope 中匹配 `.md` 或
`.markdown` 的文件。source collection 仍完全服从同一 `include`、exclude/generated rules；没有 eligible source
时不以 target、directory 或 Markdown parser 重新发现 source。其 own source occurrence 之外的 target 不扩展
global scope，也不递归收集 target 的 links。

### Markdown Link source occurrences

Link Check 先将 project root canonicalize 一次。失败即为 `unavailable`；只有 root 已 canonicalize 且没有 eligible
Markdown source 时才是 `not-applicable`。每个 eligible source 只 decode 和 parse 一次，得到 Link-private facts。
受支持的 occurrence 是 inline link/image、在 use site 已定义的 full/collapsed/shortcut reference、explicit autolink
和选定的 GFM autolink literal。YAML front matter、code/fenced code、HTML attribute、prose URL 和 undefined reference
不创建 occurrence。

这些 facts 是 immutable 的 Link-private adapter output。decode 或 parser 失败使 Check 结算为 `unavailable`，而不是发布
partial occurrence set。

anchor lookup 时，每份文档以 ATX 和 Setext heading 创建新的 GitHub-priority slugger。该 Check 不承诺每个 renderer 的
anchor edge case。source navigation range 使用 decode 后 JavaScript UTF-16 position，line/column 为 one-based、
end-exclusive；parser offset 和 dependency AST 保持 private。

## Markdown Link direct targets

Markdown Link Check 只能对 source occurrence 的 direct local target 做 bounded work。lexically 位于 project root 内的
target 即使在 source scope 外也可被检查，但绝不成为 source input。启用 cross-document fragment 后，只有可读取的
regular Markdown target 才提供 heading facts；directory 永不接受 anchor lookup。关闭 cross-document anchor validation
时，fragment 不触发 Markdown eligibility 或 heading read。配置 directory non-empty checking 后，最多读取一个 entry，
绝不递归枚举。

relative lexical escape、host-native absolute path 和接受的 raw host-native empty-authority `file:///` local URI，在
target I/O 前进入 Check 的 `rootExternalTargetMode`。`ignore` 不产生 finding，也不做 root 外 work；`report` 产生安全的
`target-outside-project-root` finding，也不做 root 外 work；只有 `validate` 可对该 target 做 bounded direct work。
lexically root-in candidate 只能使用 component containment probe。若某个 symlink hop 越出 root，除 `validate` mode 外，
该 probe 不授权触碰 root 外 referent。

containment guarantee 依据操作期间观察到的 host filesystem state 判断。这里使用的 Bun/Node path API 不提供 portable
dirfd/openat traversal，因此 component probe 成功后的 hostile concurrent replacement 不在本 Check 的 authorization proof
范围内。regular-file read 仍使用 no-follow final-leaf opening 和 byte bound；需要 hostile-filesystem isolation 的调用方应使用
OS-level sandbox，而不是依赖本 Link Check。

HTTP(S)、`mailto:`、protocol-relative URL、UNC path、带 authority 或不受支持的 `file:` form 以及其它不受支持的 target form
只分类后停止。它们不产生 Product-owned DNS、HTTP、TLS、redirect、subprocess 或 filesystem I/O，也不产生 external
reachability verdict。本 Check 没有 target discovery、crawler、shared resolver 或 general file-policy surface。

## Source-scope boundary

adapter 对每条 scanner-derived measurement 声明 slash-normalized `sourcePaths`。每一个必须精确属于本次
Check invocation 的 approved set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific
location consistency 属于 adapter；scope 不读取 private payload 重建它。

## 验证

测试覆盖 include/exclude/generated filtering、Git success-empty 与 fallback、NUL paths、fingerprint、
initialized submodule worktree collection、supported extensions、exact inputs 和 adapter no-expansion。
