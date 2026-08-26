# Project files and Check exact inputs

本文拥有 `src/project-files/**` 的 project-root 文件收集、配置过滤、code-area 分类与 exact-input
acceptance 机制，以及 package-provided Check 如何使用这些能力。它不建立 Product-wide scan scope，也不定义
Check final status、Record、aggregation、machine output 或 scanner protocol。

## Check-owned file selection

需要读取项目文件的 Check 在自己的完整 `options` 中拥有 `files`：

```ts
{
  excludeDirs: readonly string[];
  generatedFiles: readonly string[];
  include: readonly string[];
}
```

`ProjectDefinition` 和 `CheckProjectContext` 都不保存全局文件选择。两个 Check 即使使用相同结构，也分别验证、
冻结和消费自己的 policy；项目若希望它们选择相同文件，应以普通 TypeScript value 和 object composition 显式复用，
而不是依赖 Product 的 hidden global configuration。

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 还在各自 options 中拥有 `codeAreas`。code-area
classification 只服务调用它的 Check，不是 arbitrary Check 必须采用的公共领域模型，也不会由 Definition 按
package-provided Check ID 解释。

## File collection mechanism

`collectProjectFiles(root, files)` 从 project root 产生 slash-normalized、stable-sorted relative paths，再应用该次
调用给出的 `include`、`excludeDirs` 与 `generatedFiles`。正常 collection 调用
`git ls-files -z --cached --others --exclude-standard --`。Git 成功（包括空输出）时使用其 ignore-aware candidate
set，并加入已初始化 child Git worktree 的当前文件；Git command 失败时才使用 config-only filesystem fallback。
fallback 不能读取 root 或任一遍历目录时以包含该目录的读取错误失败，不能把故障伪装为 empty set。

Git tree 中的 `160000` gitlink 只有在 child path 是独立初始化的 Git worktree 时才会下沉。child 的 canonical
Git top-level 必须等于 child 自身 canonical path；普通目录即使替换了 HEAD gitlink，也不属于 child worktree，
遍历不得回到 parent repository。该规则只描述 current worktree collection。

`RunControls.changedFiles` 仍是冻结的 invocation string list，并原样进入 ordinary Check 的 project context。它不修改
任何 Check 的 `options.files`，也不建立第二份 Product scope；需要 changed-file 语义的 Check 必须自行在 options 与
callback 中定义。

## Package-provided Check exact inputs

每个 package-provided Check 独立调用 project-file mechanism，并从自己的 resolved candidates 形成 exact inputs；
不同 Check 可以有不同 file selection。scanner 不接收 project root 来重新发现或扩大输入。

- `duplicate-detection` 依据自己的 `codeAreas` 分组 exact inputs，再将每组交给 Check-local jscpd adapter。
- `file-metrics` 将自己选择的文件交给 Check-local scc adapter。
- `function-metrics` 只从自己的 candidates 中选择 `.ts`、`.d.ts` 与 `.rs`，再交给 Check-local Lizard adapter。
- `json-validation` 只从自己的 candidates 中以 case-sensitive `path.endsWith(".json")` 选择文件；`.JSON` 不属于输入。
- `json-schema-validation` 不从 suffix、`$schema`、filename 或 directory discovery 推断 work。只有
  `schemas[].path` 与 `bindings[].instancePath` 明确声明且同时属于该 Check `files` selection 的 path 才可读取；
  out-of-selection declaration 形成安全的 `out-of-scope` domain issue，zero bindings 是 `not-applicable`。
- `markdown-link-validation` 只从自己的 candidates 中选择 `.md` 或 `.markdown` source；direct target 不成为新的
  source input，也不递归发现 links。

zero eligible input 是 owning Check 的 applicability/work fact，不触发另一份 scope fallback。

### Markdown Link source occurrences

Link Check 先将 project root canonicalize 一次。失败即为 `unavailable`；只有 root 已 canonicalize 且没有 eligible
Markdown source 时才是 `not-applicable`。每个 eligible source 只 decode 和 parse 一次，得到 Link-private facts。
受支持的 occurrence 是 inline link/image、在 use site 已定义的 full/collapsed/shortcut reference、explicit autolink
和选定的 GFM autolink literal。YAML front matter、code/fenced code、HTML attribute、prose URL 和 undefined reference
不创建 occurrence。

这些 facts 是 immutable 的 Link-private adapter output。decode 或 parser 失败使 Check 结算为 `unavailable`，而不是发布
partial occurrence set。anchor lookup 时，每份文档以 ATX 和 Setext heading 创建新的 GitHub-priority slugger。source
navigation range 使用 decode 后 JavaScript UTF-16 position，line/column 为 one-based、end-exclusive；parser offset 和
dependency AST 保持 private。

## Markdown Link direct targets

Markdown Link Check 只能对 source occurrence 的 direct local target 做 bounded work。lexically 位于 project root 内的
target 即使不属于该 Check 的 source selection 也可被检查，但绝不成为 source input。启用 cross-document fragment 后，
只有可读取的 regular Markdown target 才提供 heading facts；directory 永不接受 anchor lookup。配置 directory
non-empty checking 后，最多读取一个 entry，绝不递归枚举。

relative lexical escape、host-native absolute path 和接受的 raw host-native empty-authority `file:///` local URI，在
target I/O 前进入 Check 的 `rootExternalTargetMode`。`ignore` 不产生 finding，也不做 root 外 work；`report` 产生安全的
`target-outside-project-root` finding，也不做 root 外 work；只有 `validate` 可对该 target 做 bounded direct work。
lexically root-in candidate 只能使用 component containment probe。若某个 symlink hop 越出 root，除 `validate` mode 外，
该 probe 不授权触碰 root 外 referent。

containment guarantee 依据操作期间观察到的 host filesystem state 判断。Bun/Node path API 不提供 portable dirfd/openat
traversal，因此 component probe 成功后的 hostile concurrent replacement 不在本 Check 的 authorization proof 范围内。
regular-file read 仍使用 no-follow final-leaf opening 和 byte bound；需要 hostile-filesystem isolation 的调用方应使用
OS-level sandbox。

HTTP(S)、`mailto:`、protocol-relative URL、UNC path、带 authority 或不受支持的 `file:` form 以及其它不受支持的 target
form 只分类后停止。它们不产生 Product-owned DNS、HTTP、TLS、redirect、subprocess 或 filesystem I/O，也不产生
external reachability verdict。本 Check 没有 target discovery、crawler、shared resolver 或 general file-policy surface。

## Exact-input acceptance

scanner-derived measurement 必须声明 slash-normalized `sourcePaths`，且每个 path 都精确属于 owning Check 本次 invocation
的 approved exact set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific location
consistency 属于对应 Check-local adapter；`src/project-files/**` 只验证共同的 exact membership invariant，不读取 private
payload 重建领域事实。

## 验证

`src/project-files/**` tests 覆盖 include/exclude/generated filtering、Git success-empty 与 fallback、NUL paths、
fingerprint、initialized submodule worktree collection 和 exact-input acceptance；各 Check 相邻 tests 证明 supported
extensions、own options、scanner no-expansion 与 four-state settlement。
