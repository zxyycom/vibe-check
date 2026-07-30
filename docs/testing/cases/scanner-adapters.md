# scanner-adapters

## Case AUX-QUALITY-JSCPD-TASK-001: Quality jscpd task planning 稳定
Owner: `docs/scanner-dependencies.md#jscpd-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > plans one scan task per code area`
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > records current failures and throws baseline failures for invalid jscpd output`
Proves:
- jscpd 每个 code area 生成一个 scan task。
- task id 和文件排序保持可复现。
- Reporter output 缺失时，current scan 收集 area failure 供 wrapper 归一为一个 failed `CapabilityResult`，不静默降级为空 duplicate result；baseline scan 对同类失败直接抛出。

## Case AUX-QUALITY-JSCPD-WRAPPER-001: Quality jscpd wrapper failure projection 稳定
Owner: `docs/scanner-dependencies.md#jscpd-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
Proves:
- jscpd wrapper 将 successful process without JSON report 映射为 `jscpd-report-failure`，不把缺失或空 JSON 当作 successful empty duplicate-code result。
- jscpd wrapper 使用真实 `jscpd` duplicate scan 证明发现重复代码时仍解析 JSON 并生成 `DuplicateCodeFragment`。
- jscpd tool availability check 将 missing dependency 或 unavailable binary 映射为 `tool-unavailable`。
- jscpd wrapper 将 non-zero execution 映射为 `jscpd-execution-error`，不把执行失败标成 skipped scan。

## Case AUX-QUALITY-LIZARD-AVAILABILITY-001: Quality Lizard availability failure projection 稳定
Owner: `docs/scanner-dependencies.md#pythonlizard-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
Proves:
- Lizard version command 非零退出时，即使 stderr 非空也映射为不可用的 `execution-error`，并保留退出状态和诊断内容。
- 配置的 Lizard dependency command 不存在时映射为 `tool-unavailable`，不进入实际扫描。

## Case AUX-QUALITY-PARSER-001: Quality scanner parser fixtures 稳定
Owner: `docs/scanner-dependencies.md#共同-adapter-contract`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > keeps legitimate Lizard zero-function output successful`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > parses Lizard 1.23 function rows`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > parses scc 3.7 Provider paths and rejects unknown CSV headers`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed or partial Lizard CSV headers instead of treating them as zero functions`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
Proves:
- scc by-file CSV 解析 Provider path 和 decision-token value；完整 header-only output 是合法 zero-file result，空输出、未知 header、截断或缺少必填字段、非法数值字段以及合法行后的 malformed row 均 fail closed 为 `invalid-result`。
- Lizard CSV row 解析 function name、file path、line range、NLOC、parameter count 和 cyclomatic complexity。
- jscpd parser helpers 解析 version output 和 JSON duplicate fragment locations/token count，并把 invalid JSON 或 invalid duplicate item 映射为 `jscpd-parse-failure`。

## Case AUX-QUALITY-SCC-WRAPPER-001: Quality scc zero-input boundary 稳定
Owner: `docs/scanner-dependencies.md#scc-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/product/quality-core/src/measurement/scanners.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
Proves:
- scc wrapper 收到空 exact input list 时直接返回 successful empty metrics，不启动 configured process。
- External scc 的 default-cwd traversal 不会把 normalized scan scope 未批准的文件重新加入 file metrics。
