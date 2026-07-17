# Scan Scope

本文是 Vibe Check scan scope 的 owner 文档。它维护文件收集、默认排除、code area /
supported input 分类、ignore 规则、changed-file scope 和 collection failure 边界。

本文只回答“哪些文件进入本次扫描，以及哪些 exact paths 可以交给 scanner”。指标、
warning、baseline、artifact 和输出字段由各自 owner 维护。

## 实施状态

`src/product/**` 下的 TypeScript/Bun core 从 `src/product/config.ts` 构造 normalized scan
scope，再把同一份归一化输入交给 scc、Python/Lizard 和 jscpd adapters。该配置文件是
include、exclude、generated files、code areas 和 scanner input defaults 的唯一实现
owner；dogfood wrapper 不维护第二份配置或 collection behavior。

## 职责边界

CLI 负责归一化并接受 `project-root`。Product core 在该 root 下：

1. 按现有 product config 收集 scan files。
2. 应用 product exclude / generated-file 边界，并在 primary Git collection 中应用 VCS
   ignore。
3. 把文件归入 configured code areas 并生成稳定 fingerprint。
4. 解析 baseline 或显式 changed-files scope。
5. 为每个 scanner 生成其支持的 exact file paths。

Scanner adapter 不接收 project root 来重新发现输入，也不重新解释 include、exclude、
ignore、generated-file 或 changed-file 规则。收集与分类结果使用 Vibe Check-owned model；
文件系统、Git 或 matcher 的私有结果不进入 product output。

## 配置与默认排除

Include、exclude directories、generated-file globs 和 code-area definitions 由
`src/product/config.ts` 提供。改变这些值、precedence、路径规则、默认目录或 fallback
语义时，必须同步本 owner 和相应测试。

默认排除继续覆盖仓库元数据、构建产物、依赖、虚拟环境、vendor、generated、fixture、
cache、artifact、临时文件和日志目录。具体列表以当前 product config 为实现
依据；改变列表或 precedence 必须作为独立 Config / Scan Scope change 同步本文和测试。

普通文件只有在经过这些规则后才进入 normalized scan scope。目录、设备、管道和其它特殊
文件不是 scanner input。

## Ignore 与 changed-file scope

Primary file collection 使用
`git ls-files --cached --others --exclude-standard`，因此遵守 Git pathspec 和 VCS ignore
规则。Git collection 不可用时，core 使用当前 fallback walker；该路径继续应用 product
config 的排除边界，但不承诺与 Git VCS ignore 完全等价。无论来自哪个 collector，被
exclude 或 generated-file 规则排除的路径都不得因某个 scanner 自行遍历而重新进入。

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

Duplicate scanning 按 product config 的 code area、format mapping 和 minimum-token profile
选择输入。每个至少包含两个已批准 exact paths 的 code area 可以建立 jscpd task；format
mapping 为字符串时传给 jscpd，值为 `null` 时省略 format override 并保留 component 自动
检测。被 scope rules 排除的路径不进入 task。

## Adapter input contract

Python/Lizard adapter 只接收 product core 已收集且被 structural classification 支持的
exact paths。它不得扫描 project root，不得把 unsupported ordinary files 或 excluded
paths 交给 Lizard。没有 supported inputs 时不启动 Lizard process，并以 empty function
metrics 正常完成该扫描阶段。

jscpd adapter 只接收 product core 已批准的 code-area exact paths。它可以为既有
per-area scan 生成私有临时 config，但该 config 不得扩大 file list。没有足够输入或当前
profile 明确跳过 duplicate detection 时，返回正常 no-finding，不产生伪造 diagnostic。

## Collection failure

主 file collection 继续先运行 `git ls-files --cached --others --exclude-standard`；该命令
失败时记录提示并使用现有 fallback walker，不把 fallback 重写成 fatal。Fingerprint 读取
失败继续使用 pinned `file-not-readable` marker。显式 changed-file 输入读取失败则抛出可
行动 error，不得静默变为 empty changed scope。

Scanner process / parse failure 由 scanner boundary 负责；scan scope 不重新分类这些
failure 或 fallback，也不拥有 failure code、status、artifact 或 console output。

## 验证要求

修改 scan scope 行为时，最低验证包括：

- include / exclude、generated-file、fixture、vendor 和 cache 边界。
- Git collection 与 fallback walker，以及 unreadable fingerprint marker。
- code-area classification、文件排序和 fingerprint 稳定性。
- Git pathspec 与显式 `--changed-files` 失败。
- `.ts` / `.d.ts` / `.rs` structural inputs 和 unsupported extensions。
- Python/Lizard 与 jscpd 只接收 normalized exact paths，不重新扫描 project root。
- zero-supported-input、quick profile 跳过 jscpd 和 normal no-finding。

涉及 output shape 时必须同步 Output owner；本 owner 不单独新增 artifact、JSON 或 warning
字段。
