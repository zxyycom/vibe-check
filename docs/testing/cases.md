# 测试用例编号账本

本文保存最终 case 条目、证明目标和源码 `@case` 标记映射。编号、归属和更新流程见
[测试用例维护](case-maintenance.md)。产品语义以 [文档导航](../navigation.md#规则所有权)
指向的 owner 文档为准；本账本只记录测试证明目标。

## Black-box CLI Cases

### BB-CLI-CONFIG-FILE-001 Product 显式完整配置正式入口稳定
Status: implemented
Code: `src/product/configured-project.test.ts`
Fixture: `fixtures/projects/configured-typescript/`

Proves:
- 正式入口从 fixture root 外按 normalized project root 读取 relative、absolute 与含
  `..` 的 `--config`，并使用 explicit version、scope、code area、threshold、report、
  artifact 和 controlled tools。
- Eligible source 进入 metrics / warnings，explicit exclude 与 generated controls 不进入
  scanner inputs；重复运行产生相同 Vibe Check-owned evidence。
- Config 的 artifact/top-N defaults 生效，显式 `--artifact-dir` / `--top-n` 只覆盖对应
  output option；`VIBE_CHECK_*` command / args 不重写或阻断 explicit tool settings。
- Config read / parse failure 在 scanner 与 artifact 前写 stderr 并退出 `3`，不回退默认
  config。
- 未指定 `--config` 时不自动发现 project config，继续使用 `DEFAULT_CONFIG` 并保留默认分支
  的 `VIBE_CHECK_*` overrides。

### BB-CLI-CHANGED-FILES-001 Product changed-files CLI 路径与错误映射稳定
Status: implemented
Code: `src/product/cli.test.ts`

Proves:
- 正式入口与 dogfood wrapper 通过同一 product parser 展示 changed-files 路径和 entry
  语义。
- 正式入口从 project root 外启动时，相对 list path 仍基于显式 project root 读取，并把
  project-relative entry 纳入 changed scope。
- Missing list 保留 `failed to read --changed-files` diagnostic 并退出 `3`；其它普通 read
  error 使用 exit `2`。

## White-box Product Cases

### WB-CONFIG-FILE-001 Product 完整 JSON 配置 parsing 稳定
Status: implemented
Code: `src/product/config-file.test.ts`

Proves:
- 完整 `QualityConfig` JSON 返回字段值不变且与输入 detached 的 typed value。
- Missing、unknown、invalid nested、invalid time zone、non-object、invalid UTF-8 / JSON、
  非 regular file 与 read failure 直接失败。
- File-level error 保留 resolved config path 与原始 cause。

### WB-CLI-CONFIG-OPTIONS-001 Product config option presence 稳定
Status: implemented
Code: `src/product/args.test.ts`

Proves:
- Relative、absolute 与含 `..` 的 config values 保持 parser input。
- Omitted `--config`、`--top-n` 与 `--artifact-dir` 保持 option absence，供 selected config
  提供值。
- Duplicate 或 missing-value `--config` 直接失败。

### WB-CLI-CHANGED-FILES-001 Product changed-file input 路径与错误边界稳定
Status: implemented
Code: `src/product/quality-core/src/input/files.test.ts`

Proves:
- 相对 explicit `--changed-files` list path 基于 normalized project root 解析；absolute
  path 与基于 root 的 `..` path 可以指向 root 外。
- 列表 entries 保持 project-relative，不改为相对于列表文件解释。
- Unreadable explicit list 映射为保留 flag 名称、请求路径与原始 cause 的 thrown
  diagnostic；missing list 同时保留 top-level `ENOENT` 分类。

### WB-SCOPE-FILE-COLLECTION-001 Product current/baseline collection fallback 稳定
Status: implemented
Code: `src/product/quality-core/src/input/files.test.ts`

Proves:
- Current 与 baseline Git command 成功时直接使用 normalized result，包括成功的空集合。
- Git command 失败时，current 与 baseline 都进入 config-only fallback；匹配 product
  include 且未命中 exclude/generated rule 的 VCS-ignored path 仍可进入候选集合。
- Config include、exclude directories 与 generated-file rules 在 fallback 中继续生效。
- Selected config 未排除的 built-in-default directory 不会被 fallback 隐式排除。

## White-box Output Cases

### WB-OUTPUT-NOTICES-001 Product report notice 所有权和位置稳定
Status: implemented
Code: `src/product/config.test.ts`

Proves:
- 顶部 non-blocking notice 紧随报告标题，并将 TypeScript/Bun 产品 CLI、报告契约和产品
  测试标识为 release contract。
- Footer notice 保持为报告末行，并将 TypeScript/Bun 产品测试和契约校验标识为 release
  gates。
- 两处 notice 不再将已退役的 Rust CLI、schema 或测试标识为当前 release owner。

## Auxiliary Script Cases

### AUX-PARALLEL-RUNNER-001 Parallel task runner 保持调度契约
Status: implemented
Code: `scripts/tools/parallel-task-runner/test/index.test.ts`

Proves:
- task normalization、concurrency、mutex serialization、dependency ordering 和 nested task
  expansion 保持稳定。
- prepare strategy、invalid list metadata、duplicate id 和 unknown dependency failure 保持可诊
  断。

### AUX-QUALITY-PARSER-001 Quality scanner parser fixtures 稳定
Status: implemented
Code: `src/product/quality-core/src/measurement/scanners.test.ts`

Proves:
- scc by-file CSV 解析 Provider path 和 decision-token value，并将未知 header 投影为 parser
  failure。
- Lizard CSV row 解析 function name、file path、line range、NLOC、parameter count 和
  cyclomatic complexity。
- jscpd parser helpers 解析 version output 和 JSON duplicate fragment locations/token count，并把
  invalid JSON 或 invalid duplicate item 映射为 `jscpd-parse-failure`。

### AUX-QUALITY-JSCPD-WRAPPER-001 Quality jscpd wrapper failure projection 稳定
Status: implemented
Code: `src/product/quality-core/src/measurement/scanners.test.ts`

Proves:
- jscpd wrapper 将 successful process without JSON report 映射为 `jscpd-report-failure`，不把缺
  失或空 JSON 当作 successful empty duplicate-code result。
- jscpd wrapper 使用真实 `jscpd` duplicate scan 证明发现重复代码时仍解析 JSON 并生成
  `DuplicateCodeFragment`。
- jscpd tool availability check 将 missing dependency 或 unavailable binary 映射为
  `tool-unavailable`。
- jscpd wrapper 将 non-zero execution 映射为 `jscpd-execution-error`，不把执行失败标成
  skipped scan。

### AUX-QUALITY-LIZARD-AVAILABILITY-001 Quality Lizard availability failure projection 稳定
Status: implemented
Code: `src/product/quality-core/src/measurement/scanners.test.ts`

Proves:
- Lizard version command 非零退出时，即使 stderr 非空也映射为不可用的
  `execution-error`，并保留退出状态和诊断内容。
- 配置的 Lizard dependency command 不存在时映射为 `tool-unavailable`，不进入实际扫描。

### AUX-QUALITY-CACHE-001 Quality measurement cache identity 稳定
Status: implemented
Code: `src/product/quality-core/src/measurement/cache.test.ts`

Proves:
- duplicate-code cache key changes for tested code area、input fingerprint、tool name/version 和
  normalized args differences。
- cache hit 返回不带 changed-scope annotation 的 metric，保持复用扫描与当前 diff 语义分
  离。
- baseline snapshot cache key changes for tested tool version differences，命中时通过 snapshot
  hash 防止错读缓存内容。

### AUX-QUALITY-JSCPD-TASK-001 Quality jscpd task planning 稳定
Status: implemented
Code: `src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts`

Proves:
- jscpd 每个 code area 生成一个 scan task。
- task id 和文件排序保持可复现。
- current revision jscpd area scan 将 execution/report/parse failure 记录为 `fatalIssues` 的
  `current-scan` failure channel，不静默降级为空 duplicate result。

### AUX-QUALITY-FINGERPRINT-001 Quality input fingerprint 稳定
Status: implemented
Code: `src/product/quality-core/src/input/files.test.ts`

Proves:
- quality input fingerprint 使用排序后的文件内容生成稳定 SHA-256。
- 文件内容变化会改变 fingerprint，文件顺序变化不会改变 fingerprint。

### AUX-QUALITY-GIT-PATHSPEC-001 Quality git pathspec 参数稳定
Status: implemented
Code: `src/product/quality-core/src/input/files.test.ts`

Proves:
- quality input git pathspec 参数使用显式 `--` 分隔并保留 glob pathspec magic。
- 空 pathspec 可按调用方需要保留 `--` 或完全省略。

### AUX-QUALITY-REPORT-001 Quality report 排名和 changed-file 摘要稳定
Status: implemented
Code: `src/product/quality-core/src/output/report/markdown-report.test.ts`

Proves:
- baseline unavailable 时 changed-file watchlist 仍按风险展示有用文件。
- rankings 排序不修改 scanner output 原始顺序。
- Report config 控制 Changed Files Watchlist visibility 与独立展示上限。
- scc `Complexity` 文件列在人类报告中展示为 decision-token count，并补充热点占比。
- Code Area 汇总表展示 decision-token count 和总量占比，用于定位热点区域。
- 带 `acceptedReason` 的 warning 在报告中贴近对应 warning 展示原因，不从单独质量扫描中消
  失。

### AUX-QUALITY-WARNINGS-001 Quality warning 阈值语义稳定
Status: implemented
Code: `src/product/quality-core/src/output/warnings/generator.test.ts`

Proves:
- 文件大小 warning 使用 scc `Code` 代码行数，而不是包含注释和空行的总行数。
- 文件大小 warning 根据 scc decision-token count 选择 code-line floor，低 decision-token 文
  件可使用更高行数阈值。
- 函数 warning 使用复杂度感知的代码密度阈值。
- 配置的已知可接受 warning 保留在 all/changed/regression warning records 中，并通过
  `acceptedReason` 字段携带原因。
- 配置的 accepted warning 匹配不到任何 generated warning 时会生成
  `quality-accepted-warning-unmatched` warning。
