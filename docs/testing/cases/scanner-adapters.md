# scanner-adapters

## Case WB-SCANNER-DEPENDENCY-RESOLUTION-001: Scanner dependency operational resolution 稳定
Owner: `docs/scanner-dependencies.md#scanner-依赖选择`
Entities:
- `bun|src/product/configured-project-completeness.test.ts|formal CLI configured scan completeness > returns a warning without a quality verdict when no capability has eligible input`
- `bun|src/product/scanner-dependencies.test.ts|scanner dependency resolution > applies supported operational overrides without probing executables`
- `bun|src/product/scanner-dependencies.test.ts|scanner dependency resolution > rejects malformed or non-string-array argument overrides without exposing values`
- `bun|src/product/scanner-dependencies.test.ts|scanner dependency resolution > resolves platform defaults, availability arguments, and bounded concurrency`
- `bun|src/product/scanner-dependencies.test.ts|scanner dependency resolution > treats unset and empty operational inputs as no override`
Proves:
- Product-owned resolver 按 host platform 构造 file、function 与 duplication dependency slices，固定 Lizard module/availability args，并把 duplicate concurrency 保持为有界 internal setting。
- Non-empty supported command/args operational inputs 只替换对应 executable 或 additional args，resolver 不探测 executable existence，也不接受 Lizard args override。
- Unset/empty override 使用 Product-owned defaults；malformed 或非 string-array args 产生带 input name、expected shape 与修复动作的 typed operational error，且不暴露 supplied value。
- CLI 在任何 banner、availability probe、cache 或 artifact write 前为每次 invocation 解析一次 `ScannerDependencySnapshot`；malformed args 即使 semantic scope 没有 eligible input 也 typed-exit `2`，而 valid snapshot 中不可用但 ineligible 的 commands 不被探测或执行。

## Case AUX-QUALITY-JSCPD-TASK-001: Quality jscpd task planning 稳定
Owner: `docs/scanner-dependencies.md#duplicate-measurement-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > plans one scan task per code area`
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > hands exact TypeScript, Rust, and mixed paths to jscpd without format overrides`
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > records current failures and throws baseline failures for invalid jscpd output`
Proves:
- jscpd 每个 code area 生成一个 scan task。
- task id 和文件排序保持可复现。
- Pure TypeScript、pure Rust 与同 area mixed TypeScript/Rust inputs 均以 filtered exact paths 进入一次 area invocation；private config 与 argv 均不包含 format override，不承诺 cross-format clone matching。
- Per-area minimum-token override 与 semantic default 分别进入 private config；excluded/generated paths 不会重新进入 adapter，过滤后少于两个 exact paths 的 area 不启动 process。
- Reporter output 缺失时，current scan 收集 area failure 供 wrapper 归一为一个 failed `CapabilityResult`，不静默降级为空 duplicate result；baseline scan 对同类失败直接抛出。

## Case AUX-QUALITY-JSCPD-WRAPPER-001: Quality jscpd wrapper failure projection 稳定
Owner: `docs/scanner-dependencies.md#duplicate-measurement-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/product/quality-core/src/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
Proves:
- jscpd wrapper 将 successful process without JSON report 映射为 `jscpd-report-failure`，不把缺失或空 JSON 当作 successful empty duplicate-code result。
- jscpd wrapper 使用真实 `jscpd` duplicate scan 证明发现重复代码时仍解析 JSON 并生成 `DuplicateCodeFragment`。
- jscpd tool availability check 将 missing dependency 或 unavailable binary 映射为 `tool-unavailable`。
- jscpd wrapper 将 non-zero execution 映射为 `jscpd-execution-error`，不把执行失败标成 skipped scan。

## Case AUX-QUALITY-LIZARD-AVAILABILITY-001: Quality Lizard availability failure projection 稳定
Owner: `docs/scanner-dependencies.md#function-measurement-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners-lizard.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/product/quality-core/src/measurement/scanners-lizard.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
Proves:
- Lizard version command 非零退出时，即使 stderr 非空也映射为不可用的 `execution-error`，并保留退出状态和诊断内容。
- 配置的 Lizard dependency command 不存在时映射为 `tool-unavailable`，不进入实际扫描。

## Case AUX-QUALITY-PARSER-001: Quality scanner parser fixtures 稳定
Owner: `docs/scanner-dependencies.md#eligibility-and-adapter-handoff`
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
- SCC、Lizard 与 jscpd parser 从构造 payload 的同一组私有 location values 生成 `ScopedMeasurement`；payload-specific path shape 不需要由 Core 重新解释。
- jscpd parser helpers 解析 version output 和 JSON duplicate fragment locations/token count，并把 invalid JSON 或 invalid duplicate item 映射为 `jscpd-parse-failure`。

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner result exact-input scope 稳定
Owner: `docs/scanner-dependencies.md#eligibility-and-adapter-handoff`
Entities:
- `bun|src/product/quality-core/src/measurement/baseline-revision.test.ts|baseline revision capability eligibility > rejects scanner measurements outside baseline exact inputs`
- `bun|src/product/quality-core/src/measurement/current-revision/scanner-scope.test.ts|current scanner exact-result scope > rejects measurements that reference paths outside approved exact inputs`
- `bun|src/product/quality-core/src/measurement/scoped-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
- `bun|src/product/quality-core/src/measurement/scanners/jscpd/area-scans.test.ts|jscpd tasks > revalidates cached fragment source paths against exact area inputs`
Proves:
- Adapter 从构造 payload 的同一组 normalized locations 生成 `sourcePaths`；source-scope acceptance 只读取 `ScopedMeasurement.sourcePaths` 并把 payload 当作 opaque value。每条 measurement 至少声明一个 source path，且所有 paths 必须属于本 capability invocation 的 approved exact inputs。
- Current SCC、Lizard 与 jscpd 的任一越界 measurement 都使整个 capability 以 `invalid-result` 失败，不写入部分 metrics；baseline measurement 同样 fail closed。
- jscpd cache hit 会重新经过相同 exact-input scope 验收；包含未批准路径的缓存不会重新进入 metrics，而是被忽略并重新扫描。

## Case AUX-QUALITY-SCC-WRAPPER-001: Quality scc zero-input boundary 稳定
Owner: `docs/scanner-dependencies.md#file-measurement-boundary`
Entities:
- `bun|src/product/quality-core/src/measurement/scanners-scc.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/product/quality-core/src/measurement/scanners-scc.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
Proves:
- scc wrapper 收到空 exact input list 时直接返回 successful empty metrics，不启动 configured process。
