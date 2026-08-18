# Scan Scope

本文拥有文件收集、ignore、code-area classification、changed-file scope 与交给每个 Check adapter 的 exact inputs。它不定义 record、policy 或 output。

## Resolved scope

Product Core 从 invocation-owned `ResolvedQualityConfig` 收集 files，应用 include/exclude、generated-file rules、code areas 和 Git ignore，并生成 deterministic project-root-relative slash paths/fingerprints。explicit、discovered 与 neutral source 只影响 config provenance，不改变这个 consumer contract。

Git collection 使用 `git ls-files -z --cached --others --exclude-standard --`。成功时（即使 empty）不 fallback；仅 command failure 使用 config-only enumeration，并继续应用同一 config rules。config-only enumeration 无法读取 root 或任一遍历目录时，必须以包含该目录的读取错误失败，不能把失败伪装成 empty candidate set。explicit changed-file list 读取失败同样必须失败，不能静默改为 empty。

Git tree 中的 `160000` gitlink 只在 child path 是独立初始化的 Git worktree 时才可下沉：child 的
canonical Git top-level 必须等于 child 自身的 canonical path。普通目录即使替换了 HEAD gitlink，
也不属于 child worktree；current collection 继续以主仓 Git candidates 为准，canonical repository
chain 不得重新进入 ancestor。baseline materialization 需要该 gitlink 时，缺少 child path 必须报告
missing initialized worktree；普通目录但非独立 child worktree 必须报告该独立-worktree 条件。两者都
不能把 parent worktree 当作 child，也不能静默跳过。

## Check exact inputs

scope 为 `file-metrics`、`function-metrics`、`duplicate-detection` 各自产生 Product-approved exact inputs。adapter 不接收 project root 来重新发现或扩大它们。function structural inputs 为 `.ts`、`.d.ts`、`.rs`；duplicate inputs 按 code area 分组。quick 不选择 duplicate Check；zero eligible inputs 是 Check 的 applicability/work 事实，不是 scope fallback。

## Source-scope boundary

adapter 对每条 scanner-derived measurement 声明 slash-normalized `sourcePaths`。每一个必须精确属于本次 Check invocation 的 approved set；任何越界 path 拒绝整批 conversion，不能写 partial records。payload-specific location consistency 属于 adapter，scope 不读取 private payload 重建它。

## 验证

测试覆盖 include/exclude/generated、Git success-empty 与 fallback、NUL paths、fingerprint、changed-file failure、supported extensions、current/reference exact inputs 和 adapter no-expansion。
