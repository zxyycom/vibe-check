# 测试用例编号账本

本文保存最终 case 条目、证明目标和源码 `@case` 标记映射。编号、归属和更新流程见
[测试用例维护](case-maintenance.md)。产品语义以 [文档导航](../navigation.md#规则所有权)
指向的 owner 文档为准；本账本只记录测试证明目标。

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

### AUX-QUALITY-CHANGED-FILES-001 Quality changed-file input explicit list failure 稳定
Status: implemented
Code: `src/product/quality-core/src/input/files.test.ts`

Proves:
- quality changed-file input 将 unreadable explicit `--changed-files` path 映射为 thrown
  diagnostic，错误文本保留 flag 名称和请求的文件路径。

### AUX-QUALITY-REPORT-001 Quality report 排名和 changed-file 摘要稳定
Status: implemented
Code: `src/product/quality-core/src/output/report/markdown-report.test.ts`

Proves:
- baseline unavailable 时 changed-file watchlist 仍按风险展示有用文件。
- rankings 排序不修改 scanner output 原始顺序。
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
