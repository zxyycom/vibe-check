# check-owned-scanners

## Case AUX-MARKDOWN-LINT-REFERENCE-CAPABILITY-001: 引用识别能力缺失时拒绝完整 lint

Owner: `docs/checks/markdown-lint.md#工作原理`
Entities:

- `bun|src/package-checks/markdown-lint/findings-cache.test.ts|Markdown lint findings cache > rejects a missing reference capability before direct, cold and warm cache results`

Proves:

- 已选择引用规则但 backend 对固定未定义引用返回合法空数组时，direct lint、冷缓存和已有可信热缓存均返回 `backend-failed`；Check 不发布 lint 或合成 Records，也不建立冷缓存目录。
- 故障注入只在独立 child 中替换公开 `markdownlint/promise` API，重现已观察到的混合 core 图响应；并发与后续引用调用共享一次 probe，未选择引用规则的调用不触发 probe。

## Case AUX-HOST-ENVIRONMENT-PROCESS-LIFECYCLE-001: Product process capability retains closed lifecycle causes

Owner: `docs/development/scanner-dependencies.md#product-private-process-capability`
Entities:

- `bun|src/package-checks/host-environment/process/result.test.ts|Product process result normalization > uses closed terminal-cause priority without reading native error text`
- `bun|src/package-checks/host-environment/process/result.test.ts|Product process result normalization > preserves completion eligibility independently of terminal-cause priority`
- `bun|src/package-checks/host-environment/process/runner.test.ts|Product process runner > forwards cancellation and preserves async terminal discriminants`
- `bun|src/package-checks/host-environment/process/runner.test.ts|Product process runner > terminates output-limited children before execution timeout`
- `bun|src/package-checks/host-environment/process/runner.test.ts|Product process runner > retains synchronous numeric exits and captured output`
  Proves:

- The Product-private host-environment process capability resolves competing terminal markers without reading native error text, preserving the existing exclusive cause discriminants and numeric exits. Its independent completion eligibility rejects raw cancellation, timeout, output-limit and signal markers even when a numeric nonzero exit wins the default cause; complete zero and nonzero exits remain eligible.
- Async execution forwards caller cancellation and terminates stdout/stderr overflow children that keep running after either a single burst or continuous output. The owned child PID is no longer alive when execution resolves, including a POSIX child that acknowledges but ignores SIGTERM and requires Execa's bounded SIGKILL escalation. The synchronous runner retains numeric exit and captured output for existing consumers.

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner exact input scope

Owner: `docs/development/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/project-files/exact-input-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
  Proves:
- Source acceptance uses only declared source paths and rejects a complete out-of-scope batch before record conversion.

## Case WB-SCANNER-FILE-METRICS-CHECK-001: File constructor owns its policy and direct callback

Owner: `docs/development/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/file-metrics/constructor.test.ts|fileMetrics constructor and direct callback > materializes closed defaults and rejects malformed authored or resolved policy`
  Proves:
- `fileMetrics(options?)` materializes frozen area defaults with non-blocking findings, code-line maximum `360`, low-decision allowance `600/12`, and executable `scc`; it rejects unknown or invalid authored input synchronously and retains defensive resolved preparation/execution validation without public SCC argument passthrough. Its attached/named parser validates exact finding-count invariants, and Check-owned invalid options are actionable messages rather than silent unavailable results. Normalized custom file-metrics and JSON leaves retain their flag conditions, relations, identity, scheduling and resource claims while excluding project fields from resolved options; a no-flag Run does not select them, and the matching-flag Run executes both file-metrics instances through the declared relation and resource schedule.

## Case WB-SCANNER-FILE-METRICS-SCOPE-001: File metrics applies area-owned exact scope

Owner: `docs/development/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/file-metrics/constructor.test.ts|fileMetrics constructor and direct callback > scans area-owned exact inputs once and applies the strictest overlapping area policy`
- `bun|src/package-checks/file-metrics/constructor.region-identity.test.ts|fileMetrics region identity > preserves nonempty NUL area identities for empty selection and finding policy`
  Proves:
- Each file-metrics area owns its file selection, code-line policy and effective finding policy. One logical SCC scan receives the stable deduplicated exact-path union; a path selected by multiple areas produces at most one finding under the strictest effective maximum, retains every matching area ID, and is blocking when any matching area is blocking.
- Nonempty area IDs containing NUL remain valid: an empty selection settles `not-applicable/no-eligible-input` without invoking SCC, while matched findings retain the original ID and its blocking policy.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function Check owns area, finding, and unavailable policy

Owner: `docs/development/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics constructor > materializes frozen analyzer-owned defaults and rejects malformed closed policy`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > runs from the Product-owned analyzer without an external scanner`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > terminates an in-flight Worker before results or waiver audit`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > fails an over-limit exact input before records or waiver audit`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > yields during admission so cancellation prevents Worker startup, Records, and waiver audit`
- `bun|src/package-checks/function-metrics/measurement.admission.test.ts|functionMetrics admission cancellation > does not open analysis or create a Worker for an already aborted invocation`
- `bun|src/package-checks/function-metrics/measurement.admission.test.ts|functionMetrics admission cancellation > the production yield lets timer and I/O abort stop admission before any Worker batch`
- `bun|src/package-checks/function-metrics/measurement.admission.test.ts|functionMetrics admission cancellation > stops after an early file chunk without submitting later exact paths`
- `bun|src/package-checks/function-metrics/measurement.admission.test.ts|functionMetrics admission cancellation > cancels a submitted real Worker once and retains rejection facts without waiver audit`
- `bun|src/package-checks/function-metrics/constructor.area-findings.test.ts|functionMetrics area findings > records complete analyzer evidence and fails only for effective blocking findings`
- `bun|src/package-checks/function-metrics/upgrade.integration.test.ts|functionMetrics upgraded readers publish strict findings, real contributors, and exact waiver identities through the public Worker path`
  Proves:
- `functionMetrics(options?)` materializes frozen non-blocking defaults for the translated registry's exact include set, with NLOC `60`, low-complexity `180` below CC `6`, CC `12`, nesting depth `7`, and parameters `6`; it synchronously rejects scanner-shaped and other unknown authored input, retains defensive resolved preparation validation, and exposes the strict final-count parser. The Check passes only its accepted deduplicated exact-path union to the Product-owned analyzer, applies deterministic strict area policy, and reports complete metric/rejection findings as local supplemental Records.
- Production admission yields to a macro task after each nonempty chunk of at most `32 KiB`. Tests delegate the actual production `setImmediate` while scheduling timer/I/O abort after its first invocation; cancellation stops admission before any Worker batch. Pre-abort and early-file chunk cancellation also prevent a batch, with later exact paths left unread. These failures return a whole-Check unavailable outcome without partial metric Records or waiver audit.
- Cancellation after a real Worker submission retains earlier rejection facts without metric Records or waiver audit. Unsubscribe and terminate each run once, including after competing late message/error/exit callbacks; this observes cleanup calls, not physical thread exit.
- Resource failure returns a whole-Check unavailable outcome. Resource-limit tests use private small limits through the production read loop and a resolved-Promise yield seam to prove byte boundaries separately from production-default cancellation.

## Case WB-SCANNER-DUPLICATE-CHECK-001: Duplicate default owns its command and Check-owned cache options

Owner: `docs/development/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/package-checks/duplicate-detection/constructor.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`
- `bun|src/package-checks/duplicate-detection/cache/store.test.ts|quality measurement cache > treats cache read I/O errors as a Check-local miss`
  Proves:

- `duplicateDetection(options?)` materializes frozen defaults for cache, package scanner, non-blocking area policy, minimum lines `4`, and minimum tokens `100`, while synchronously rejecting unknown or invalid constructor input, including public custom arguments. Its resolved Check consumes package or executable-only custom command policy, returns exact finding counts, exposes the strict attached/named parser, and reports every trusted Check-local supplemental Record with blocking state; an omitted finding policy produces passed-with-warning evidence, while explicit blocking still fails and preparation still rejects an invalid complete options replacement. Check-owned unavailable branches carry safe actionable messages. The raw cache remains Check-owned: a read failure is a miss while a write failure settles the Check unavailable; the portable package command resolves installed `jscpd` through active Bun and the adapter alone supplies availability and scan arguments to a custom executable.
- Cache-off、少于两个输入和 dependency unavailable 不获取 cache-only 内容/hash、Git 与 cache directory。Cache-on 保留每次 availability/version 检查，scan 前取得一次身份供 lookup/write；扫描后的 source mutation 不回写该身份，后续内容、路径、version 或 scanner 下界变化使旧缓存失效。
- 单个隔离 child 中的十次直接 Check execution 逐次观察 cache identity、source mutation 和失败分支，每步 acquisition 计数独立快照。父端观察 child 失败与完整完成信号；builtin instrumentation 保持隔离，不污染共享测试 runner。
- A scanner self-match with identical ranges settles the Check unavailable with `external-result-invalid` and publishes no Records.

## Case WB-SCANNER-DUPLICATE-SCOPE-001: Duplicate detection compares the complete exact scope

Owner: `docs/development/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/duplicate-detection/area-policy.test.ts|duplicate area policy > retains exactly the common areas and applies their strictest line and token thresholds`
- `bun|src/package-checks/duplicate-detection/constructor.test.ts|default Check direct callbacks > detects project-relative duplicates through the default scanner and returns blocking Check evidence`
- `bun|src/package-checks/duplicate-detection/constructor.test.ts|default Check direct callbacks > scans the exact-input union once and compares fragments only within common areas`
  Proves:

- One jscpd scan receives the deduplicated approved exact-path union with the lowest effective line/token scanner thresholds and automatic worker policy. Project-relative paths resolve against the invocation project root for jscpd's project-external config; a real duplicate produces a trusted Record and a failed blocking Check result.
- A raw fragment forms evidence only when every location shares at least one current area. Its Record contains exactly those common areas and uses their strictest line/token and blocking policies; mutually exclusive areas produce no cross-boundary Finding, while an explicit shared area preserves comparison.
- Direct area-policy inputs prove common-area sorting and strictest line/token boundaries. A real scan/cache pair separately proves that changed membership and policy recover previously filtered raw fragments without another scan.

## Case AUX-JSCPD-ADAPTER-OUTCOMES-001: jscpd adapter preserves its private result boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preparation as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.measurement.test.ts|quality jscpd real language measurements > keeps Markdown literal tokens and Vue template ranges within exact inputs`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > uses identifiable jscpd versions as provenance without exact locking`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
  Proves:

- The duplicate-detection-owned jscpd adapter distinguishes available findings from missing commands, unavailable tools, unidentifiable version provenance, nonzero execution, missing reports, and malformed reports. Package availability reports the actual version of its contained package bin; the repository/candidate/external-consumer release evidence separately verifies that this version agrees with the resolved manifest. Custom availability identifies its command without inferring repository provenance. An identifiable actual version is accepted without an exact runtime lock and partitions raw cache identity. A custom executable directly receives adapter-owned version and scan arguments, while no public worker or argument passthrough can alter that protocol. The adapter removes only a duplicate report `format`-matched path suffix before normalizing valid JSON and never accepts a partial trusted result.
- Real Markdown URL/comment-like literals retain their token contribution, and Vue template measurements use content-only source ranges with inclusive line counts. Both real scans report only the two approved files despite an identical third file outside the exact input list.

## Case AUX-FUNCTION-ANALYZER-ADAPTER-OUTCOMES-001: Product analyzer adapter preserves its whole-input boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > maps all 27 reader families and 55 registered suffixes from supplied source`
- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > maps fixed complexity contributors and nesting depth from the private port`
- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > fails the complete input when any supplied source has no translated reader`
- `bun|src/package-checks/function-metrics/analyzer-worker.test.ts|functionMetrics analyzer Worker > resolves the Product adapter from the source tree and rejects malformed transport`
- `bun|src/package-checks/function-metrics/analysis.test.ts|functionMetrics Product metric analysis > fails closed when a supplied metric omits or corrupts selected-extension facts`
- `bun|src/package-checks/function-metrics/measurement.encoding.test.ts|functionMetrics source-byte admission > matches Lizard 1.24 auto_read byte and newline observations`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > uses actual bytes across chunk boundaries and fails closed above the private file limit`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > fails the whole exact input above the private aggregate limit without sending a prefix`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > reports a missing admitted exact path as source-unavailable`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > maps a synchronous Worker postMessage failure to one whole analysis failure`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > fails closed for malformed Worker replies while retaining the current transport shape boundary`
  Proves:

- 真实 Worker 传输逐字段证明 Rust CCN 3、第 4/5 行 `=>` 贡献及 Kotlin 单行 expression 位置 1/1，下一函数独立；公开 Run 的严格 limits 产生对应 Rust/Kotlin/JS Finding，并在等于阈值时无 Finding。
- Parent admission passes parent-approved source text for exactly the selected paths to one Product-owned Worker; it does not delegate path discovery or file reading. The Worker validates transport, resolves the Product adapter from the source tree, and fails the complete request for unsupported supplied source or malformed transport without publishing a metric prefix.
- The adapter is the port façade's only production consumer. It maps all 27 reader families and 55 canonical suffix observations from supplied source through the Check-private port, closes fixed facts as ordered CCN contributors and a non-negative nesting-depth value, and leaves analysis to reject missing or malformed values before Record conversion.
- Parent reply validation accepts only string file/name, safe-integer measurements, and `{ source: "typescript-analyzer", value: null | safe integer }` CCN. It accepts negative safe integers and top-level, metric, and nested extra keys; it leaves nesting/contributor validation to analysis; it rejects malformed replies or metrics outside the exact approved paths.
- Before analysis, admission mirrors Lizard 1.24 `auto_read` for valid initial BOM and universal newlines, preserves legal U+FFFD, and retries invalid, truncated, overlong, surrogate, and out-of-range UTF-8 bytes with the source fallback behavior.
- Node Worker `error`, zero/non-zero `exit` without a reply, malformed reply, and synchronous `postMessage` failure each fail the complete analysis. Competing late message/error/exit callbacks after post failure or abort cannot create a second settlement; unsubscribe and terminate each run exactly once. Parent admission measures actual bytes: private small-limit tests cross the unchanged 32 KiB read-chunk boundary, accept per-file and aggregate equality, and reject either limit plus one byte before Worker startup. A successful two-file batch is posted once with both complete sources, never a prefix. Independent assertions retain the frozen production defaults of 8 MiB per file and 64 MiB aggregate, and an omitted-policy call admits input above the small test limit. An exact-path read failure maps to `source-unavailable`; none of these failures publish a metric prefix.

## Case AUX-SCC-ADAPTER-OUTCOMES-001: scc adapter preserves its private result boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > sends --no-config and rejects a successful scc invocation that produces no CSV header`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > plans a conservative UTF-16 argv partition without reordering or overlap`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > rejects one infeasible path before starting a measurement process`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > uses one compatible process for small input and merges ordered batch-local measurements`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > merges successful oversized batches into one stable exact result`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > covers oversized exact input in sequential batches and rejects a batch-local out-of-scope row`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > rejects duplicate rows only after all batch-local validation has completed`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > fails the complete logical scan when a later process fails`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > does not start a later batch after the shared monotonic deadline expires`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > accounts stdout and stderr cumulatively before a later batch can start`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > parses scc 4.0 Provider paths and rejects unknown CSV headers`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > preserves quoted provider paths across BOM, CRLF and empty CSV lines`
  Proves:

- The file-metrics-owned SCC 4.0 adapter skips invocation for empty exact input, always sends `--no-config` before its fixed by-file CSV protocol, and preserves valid zero-file output while rejecting missing headers, unknown headers, or malformed rows.
- SCC CSV parsing preserves literal commas, escaped quotes and embedded newlines in provider paths across a BOM, CRLF and empty rows; prototype-like cell text remains ordinary array data, and an empty complexity remains an explicit null measurement.
- Its private conservative UTF-16 estimator partitions approved paths without reorder or overlap, rejects a path that cannot fit before any process starts, and keeps small compatible inputs to one process.
- For a multi-batch logical scan, each batch accepts only its exact scope. An out-of-scope row, duplicate measurement, process failure, expired shared deadline, or exhausted cumulative output budget rejects the complete scan; stable merged metrics return only after every sequential batch succeeds.

## Case AUX-SCC-V4-AVAILABILITY-001: SCC v4 exact executable contract

Owner: `docs/development/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/file-metrics/scc/availability.test.ts|SCC availability > accepts only the SCC 4.0.0 executable contract`
  Proves:
- The file-metrics adapter accepts only exact `scc version 4.0.0`; a custom SCC 3.7.0 executable is an actionable contract error rather than a fallback measurement source.

## Case FM-TYPESCRIPT-PUBLIC-FINDINGS-001: TypeScript 修正经真实 Worker 与公开 Run 结算

Owner: `docs/checks/function-metrics.md#效果与结果`
Entities:

- `bun|src/package-checks/function-metrics/typescript-metrics.integration.test.ts|functionMetrics TypeScript corrections reach public Worker findings, default limits, strict limits, and waiver reconciliation`
- `bun|src/package-checks/function-metrics/typescript-metrics.integration.test.ts|functionMetrics retains every nullish contributor beyond the eight-item human preview`

Proves:

- typed-tail 不发布函数外 Findings；四项 ?? 的诊断 profile 给出 CCN 5 / ND 4 与恰四项完整贡献，默认 limits 与严格等限 profile 均 passed；blocking、精确 applied waiver 和修复后旧身份 unused audit 各按完整 Finding 集合结算。
- 九项真实 ?? 的完整 Record 保留全部有序行号，而 human message 只展示八项并准确报告余项，不以展示限截断证据。
