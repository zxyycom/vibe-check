本 design 说明 `add-scan-scope-file-collection` 的实现路径：在不实现具体质量指标的前提下，让 `vibe-check scan` 基于真实项目文件集合生成 scan scope report。

## Context

Vibe Check 当前已经有 Rust workspace、`vibe-check scan [project-root]`、`--format human|json`、`--config <path>`、退出码映射、stdout/stderr 边界、JSON schema 和 examples。当前默认运行时仍是 fixture runtime，scan report 固定为 `run.mode = fixture`、`scope.file_count = 0`、`scope.supported_file_count = 0`。

架构文档把文件收集和 scan scope 构造放在 Core scan pipeline，scanner 依赖文档把 `ignore` 定为文件收集 / scan scope 的默认依赖。这个 change 应把真实文件集合接入 core report data，但不提前实现 LOC、AST、重复检测或 warning 规则。

## Goals / Non-Goals

**Goals:**

- 定义 `scan-scope` capability，覆盖 Core 的文件收集、默认排除、supported file 识别、generated/vendor/cache 路径边界和文件收集诊断。
- 接入 `ignore` 作为真实项目遍历基座，遵守 `.gitignore` 等 ignore 规则，并应用 Vibe Check 默认排除目录。
- 让默认 `vibe-check scan` 输出 scanner-backed report：`run.mode = scanner`，scope counts 来自真实文件集合。
- 保持现有 CLI/output/schema 契约稳定，不新增 JSON envelope 字段。
- 用 fixtures 和集成测试证明真实 scope、默认排除、supported file count、diagnostics 和现有 output contract。

**Non-Goals:**

- 不实现 LOC、注释行、空行、语言统计或 `tokei` adapter。
- 不实现 `ast-grep` 结构扫描、函数级 metrics、复杂度、重复检测或 `jscpd` adapter。
- 不生成质量 warnings，不改变 gate policy，也不新增 gate failure 条件。
- 不实现完整配置发现、include/exclude 配置语言或 profile 系统。
- 不把 `ignore` 的原生数据结构、错误类型或内部路径规则暴露为 public output contract。

## Decisions

### Decision 1: 新增 `scan-scope` capability

本 change 新增 `scan-scope`，而不是修改 `cli-contract` 或 `output-contract`。CLI 已负责 project root 归一化和输出模式分发，Output 已负责把 report data 投影为 human/json；真实文件集合属于 Core scan pipeline 的输入构造能力。

备选方案是把 scope 行为塞进 output-contract，因为 scope counts 已经出现在 JSON envelope 中。这样会让输出层拥有扫描输入语义，偏离现有架构边界。

### Decision 2: `ignore` 是 MVP 文件收集基座

文件收集使用 `ignore`，并把其结果归一化为 Vibe Check 自己的 scan scope 模型。`ignore` 负责递归遍历、VCS ignore 规则和基础路径过滤；Core 负责把路径分类为 in-scope、supported、ignored 或 diagnostic。

备选方案是先用 `std::fs` 手写递归。这样依赖更少，但会马上复制 `.gitignore`、跨平台遍历、隐藏目录和错误处理逻辑，后续仍要替换。

### Decision 3: 区分 scope file 和 supported file

`scope.file_count` 表示经过 ignore/default exclude 后进入 scan scope 的普通文件数量；`scope.supported_file_count` 表示其中属于 MVP 支持语言的文件数量。MVP 支持语言先按扩展名识别：`.rs`、`.ts`、`.tsx`、`.js`、`.jsx`、`.py`、`.go`。Unsupported 文件不会默认产生 diagnostic，因为“不支持该文件类型”不是扫描失败。

备选方案是只统计 supported 文件。这样第一段 report 更接近 scanner adapter 输入，但用户无法判断项目里有多少文件被 scope 规则纳入后又因语言不支持而没有进入 adapter。

### Decision 4: 默认排除规则先作为 Core scope 默认值

MVP 默认排除 VCS、依赖、构建、虚拟环境、生成物、vendor 和缓存目录。默认基线使用路径组件匹配，至少包括 `.git`、`target`、`node_modules`、`.venv`、`dist`、`build`、`vendor`、`generated`、`.cache` 和 `cache`。完整 include/exclude、generated file 内容识别和 profile 配置属于后续 Config/File owner change；本 change 只定义无需配置即可稳定运行的默认基线。

备选方案是等待完整配置系统后再做文件收集。这样会阻塞真实扫描闭环，并让后续指标实现继续依赖 fixture scope。

### Decision 5: 文件收集错误优先降级为 diagnostics

单个 walk error 或 ignore 解析问题如果不阻止 report 构造，Core 应生成 scanner diagnostic，并把 report summary 标记为 `partial`。CLI 负责在进入 Core 前处理无效 project root；Core 只有在已归一化且已接受的 project root 上无法初始化 collector，或文件收集无法产生 report data 时，才映射为 scanner fatal error。

备选方案是任何遍历错误都直接退出 `3`。这更简单，但会让大仓库中少数不可读路径阻断其它可扫描文件，也无法证明 output contract 中 diagnostic/partial report 的路径。

### Decision 6: 保持 JSON shape 不变

本 change 只填充已有 `run.mode`、`scope`、`summary`、`metrics` 和 `diagnostics` 字段，不新增 schema 字段。后续如果需要公开语言分布、ignored counts、文件列表或 scanner adapter 细节，应通过新的 output-contract change 同步 schema、examples、docs 和测试。

备选方案是在这个 change 中新增 scope 细分字段。这样有助于调试，但会扩大第一段真实扫描闭环的 schema 影响面。

## Risks / Trade-offs

- 默认排除规则可能不覆盖所有仓库形态。缓解方式：只承诺 MVP 默认基线，并把完整 include/exclude 配置留给后续 Config/File change。
- `ignore` 的默认行为与 Vibe Check 期望可能存在差异。缓解方式：把第三方行为隔离在 adapter/collector 内，用 fixture 证明 Vibe Check 自己的归一化结果。
- 不输出文件列表会降低调试便利性。缓解方式：当前 JSON shape 不变；若后续需要可观察 file list 或 ignored summary，走 output-contract change。
- 单路径错误降级为 partial report 可能隐藏严重问题。缓解方式：fatal 与 recoverable 的边界进入 spec 和测试；无法构造 report 时仍返回 scanner fatal。

## Migration Plan

这是未发布阶段的 bootstrap change。实现时应先新增 owner 文档和 spec 对齐材料，再接入 `ignore` 和真实 scope runtime，最后用 fixture 和 CLI 集成测试替换 fixture-only 断言。当前没有已发布用户迁移；回滚方式是恢复 fixture runtime，但必须同时回滚或调整 `scan-scope` docs/spec/tests，避免实现状态与契约漂移。

## Open Questions

无。
