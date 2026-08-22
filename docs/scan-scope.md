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

## Source-scope boundary

adapter 对每条 scanner-derived measurement 声明 slash-normalized `sourcePaths`。每一个必须精确属于本次
Check invocation 的 approved set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific
location consistency 属于 adapter；scope 不读取 private payload 重建它。

## 验证

测试覆盖 include/exclude/generated filtering、Git success-empty 与 fallback、NUL paths、fingerprint、
initialized submodule worktree collection、supported extensions、exact inputs 和 adapter no-expansion。
