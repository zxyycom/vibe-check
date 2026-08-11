# Scan Scope

本文是 Vibe Check scan scope 的 owner 文档。它维护文件收集、默认排除、code area /
supported input 分类、ignore 规则、changed-file scope 和 collection failure 边界。

本文只回答“哪些文件进入本次扫描，以及哪些 exact paths 可以交给 scanner”。指标、
warning、baseline、artifact 和输出字段由各自 owner 维护。

## 实施状态

`src/product/**` 下的 TypeScript/Bun core 从本次 invocation-owned
`ResolvedQualityConfig` 构造 normalized scan scope，再按 capability 产生 exact inputs。Neutral
default、explicit 与 discovered source 共用这一 pipeline；source 只影响 provenance，不改变
scope consumer contract。Selection、complete-document replacement 与 CLI precedence 由
[Configuration](configuration.md#selection-and-path-rules) 维护；`ScannerDependencySnapshot` 不参与
scope selection。

## 职责边界

CLI 负责归一化并接受 `project-root`。Product core 在该 root 下：

1. 按 `ResolvedQualityConfig` 收集 scan files。
2. 应用 resolved exclude / generated-file 边界，并在 primary Git collection 中应用 VCS
   ignore。
3. 把文件归入 configured code areas 并生成稳定 fingerprint。
4. 解析 baseline 或显式 changed-files scope。
5. 为每个 scanner 生成其支持的 exact file paths。

Scanner adapter 不接收 project root 来重新发现输入，也不重新解释 include、exclude、
ignore、generated-file 或 changed-file 规则。收集与分类结果使用 Vibe Check-owned model；
文件系统、Git 或 matcher 的私有结果不进入 product output。

## Resolved 配置与排除

Include、exclude directories、generated-file globs 和 code-area definitions 全部来自本次
`ResolvedQualityConfig`。Neutral default 的 exact policy、file-backed complete replacement 与
CLI precedence 由 [Configuration](configuration.md#neutral-default) 维护；本 owner 只维护这些
resolved values 如何决定 scope。

Scope collector 不叠加隐藏的 built-in exclusion list。Neutral default 使用 Configuration
定义的 exclusions；explicit 或 discovered document 使用自身 complete values，不继承 neutral
default 或 repository policy。改变 neutral policy 或 replacement precedence 进入 Configuration；
改变 resolved values 的收集与分类效果才进入本 owner。

普通文件只有在经过这些规则后才进入 normalized scan scope。目录、设备、管道和其它特殊
文件不是 scanner input。

## Ignore 与 changed-file scope

Current 与 baseline primary file collection 都使用
`git ls-files -z --cached --others --exclude-standard --`。Git 只负责按 NUL-delimited protocol
枚举 tracked / untracked candidate identity 并应用 VCS ignore。Product 对候选路径完成 slash
normalization 后，按 [Configuration 的 config glob contract](configuration.md#complete-semantic-document)
解释 `include`，再应用 resolved exclude / generated-file rules。Git 不解释 config glob，也不预先
缩小 include 候选集合。

Git command 成功时，经过 Product 过滤的结果就是权威 scan scope；无论候选集合在过滤前还是
过滤后为空，都不触发 fallback walker。

只有 Git command 失败时，对应 collector 才使用 config-only best-effort fallback。
Fallback 只替换 candidate enumeration：后续仍使用同一 config glob contract 和同一
`ResolvedQualityConfig` exclude / generated-file rules。Fallback 不读取 `.gitignore`、
`.git/info/exclude` 或 global Git excludes。需要稳定排除的 path 必须由 Config / Scan Scope
owner 维护，不能只依赖 VCS ignore source。无论来自哪个 collector，被 config exclude 或
generated-file 规则排除的路径都不得因某个 scanner 自行遍历而重新进入。

Changed-file scope 可以来自现有 comparison 逻辑或调用者显式传入的文件列表。显式列表
读取失败必须抛出可行动 error，不能静默回退为“没有 changed files”。Changed scope 只为
现有 scan results 提供 changed/regression context，不筛选或扩大 full metrics inventory。

## Supported input 分类

Pinned TypeScript selector 的 structural inputs 只有：

- TypeScript `.ts`
- Rust `.rs`

`.d.ts` 因 `.ts` suffix 按 TypeScript supported input 处理。`.tsx`、`.js`、`.jsx`、
`.go` 和 `.py` 不是当前 Python/Lizard structural input。Unsupported ordinary
files 可以属于总体 scan scope 和其它 configured measurement，但不得仅因 unsupported
产生 structural diagnostic。

Duplicate scanning 按 resolved code areas 对 Product-approved exact inputs 分组。被 scope rules
排除的 path 不进入 task；per-area eligibility、minimum-token 与 backend format detection 由
[Scanner 依赖选择](scanner-dependencies.md#duplicate-measurement-boundary) 维护。

## Adapter input contract

Python/Lizard adapter 只接收 product core 已收集且被 structural classification 支持的
exact paths。它不得扫描 project root，不得把 unsupported ordinary files 或 excluded
paths 交给 Lizard。没有 supported inputs 时不启动 Lizard process，并以 empty function
metrics 正常完成该扫描阶段。

jscpd adapter 只接收 product core 已批准的 code-area exact inputs，不重新发现或扩大 path
集合。Per-area measurement settings、private config、format detection 与 dependency lifecycle
由 [Scanner 依赖选择](scanner-dependencies.md#duplicate-measurement-boundary) 维护。

## Collection failure

上述 Git command failure 使用 config-only fallback，保持 recoverable outcome，不新增
ignore-parse diagnostic。Fingerprint 读取失败继续使用 pinned `file-not-readable`
marker。显式 changed-file 输入读取失败则抛出可行动 error，不得静默变为 empty changed
scope。

Scanner process / parse failure 由 scanner boundary 负责；scan scope 不重新分类这些
failure 或 fallback，也不拥有 failure code、status、artifact 或 console output。

## 验证要求

修改 scan scope 行为时，最低验证包括：

- include / exclude、generated-file、fixture、vendor 和 cache 边界。
- Current/baseline Git success-empty、command-failure config-only fallback，以及 unreadable
  fingerprint marker。
- code-area classification、文件排序和 fingerprint 稳定性。
- Git NUL candidate identity、config glob contract 与显式 `--changed-files` 失败。
- `.ts` / `.d.ts` / `.rs` structural inputs 和 unsupported extensions。
- Python/Lizard 与 jscpd 只接收 normalized exact inputs，不重新扫描 project root。
- zero-supported-input、quick profile 跳过 jscpd 和 normal no-finding。
- Default、explicit 与 discovered source 映射出的 include、exclude、generated-file 与 code-area
  rules 都同时用于 current、baseline 和 Git-failure fallback，且不继承隐藏 exclusions。

涉及 output shape 时必须同步 Output owner；本 owner 不单独新增 artifact、JSON 或 warning
字段。
