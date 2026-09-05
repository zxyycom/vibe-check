# check-owned-scanners

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
- `fileMetrics(options?)` materializes frozen area defaults with non-blocking findings, code-line maximum `360`, low-decision allowance `600/12`, and executable `scc`; it rejects unknown or invalid authored input synchronously and retains defensive resolved preflight/execution validation without public SCC argument passthrough. Its attached/named parser validates exact finding-count invariants, and Check-owned invalid options are actionable messages rather than silent unavailable results.

## Case WB-SCANNER-FILE-METRICS-SCOPE-001: File metrics applies area-owned exact scope

Owner: `docs/development/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/file-metrics/constructor.test.ts|fileMetrics constructor and direct callback > scans area-owned exact inputs once and applies the strictest overlapping area policy`
  Proves:
- Each file-metrics area owns its file selection, code-line policy and effective finding policy. One SCC invocation receives the stable deduplicated exact-path union; a path selected by multiple areas produces at most one finding under the strictest effective maximum, retains every matching area ID, and is blocking when any matching area is blocking.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function Check owns area, finding, and unavailable policy

Owner: `docs/development/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics constructor > materializes frozen analyzer-owned defaults and rejects malformed closed policy`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > runs from the Product-owned analyzer without an external scanner`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > terminates an in-flight Worker before results or waiver audit`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics analyzer execution > fails an over-limit exact input before records or waiver audit`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > yields during admission so cancellation prevents Worker startup, Records, and waiver audit`
- `bun|src/package-checks/function-metrics/constructor.area-findings.test.ts|functionMetrics area findings > records complete analyzer evidence and fails only for effective blocking findings`
  Proves:
- `functionMetrics(options?)` materializes frozen non-blocking defaults for the translated registry's exact include set, with NLOC `60`, low-complexity `180` below CC `6`, CC `12`, nesting depth `7`, and parameters `6`; it synchronously rejects scanner-shaped and other unknown authored input, retains defensive resolved preflight validation, and exposes the strict final-count parser. The Check passes only its accepted deduplicated exact-path union to the Product-owned analyzer, applies deterministic strict area policy, and reports complete metric/rejection findings as local supplemental Records. Production admission yields to a timer after at most `32 KiB`: cancellation before Worker startup returns a whole-Check unavailable outcome without a Worker, partial metric Records, or waiver audit; cancellation after one Worker starts terminates it before result formation with the same empty-Records/unaudited-waiver outcome. Resource-limit tests inject only a private immediate-yield seam while still reading the real 8/64 MiB byte boundaries, so they do not spend seconds on thousands of timer turns. Resource failure still returns a whole-Check unavailable outcome.

## Case WB-SCANNER-DUPLICATE-CHECK-001: Duplicate default owns its command and Check-owned cache options

Owner: `docs/development/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`
- `bun|src/package-checks/duplicate-detection/cache/store.test.ts|quality measurement cache > treats cache read I/O errors as a Check-local miss`
  Proves:

- `duplicateDetection(options?)` materializes frozen defaults for cache, package scanner, non-blocking area policy, minimum lines `4`, and minimum tokens `100`, while synchronously rejecting unknown or invalid constructor input, including public custom arguments. Its resolved Check consumes package or executable-only custom command policy, returns exact finding counts, exposes the strict attached/named parser, and reports every trusted Check-local supplemental Record with blocking state; an omitted finding policy produces passed-with-warning evidence, while explicit blocking still fails and preflight still rejects an invalid complete options replacement. Check-owned unavailable branches carry safe actionable messages. The raw cache remains Check-owned: a read failure is a miss while a write failure settles the Check unavailable; the portable package command resolves installed `jscpd` through active Bun and the adapter alone supplies availability and scan arguments to a custom executable.

## Case WB-SCANNER-DUPLICATE-SCOPE-001: Duplicate detection compares the complete exact scope

Owner: `docs/development/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > detects project-relative duplicates through the public Check and fails an explicit all aggregate`
- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > scans the exact-input union once and compares fragments only within common areas`
  Proves:

- One jscpd scan receives the deduplicated approved exact-path union with the lowest effective line/token scanner thresholds and automatic worker policy. Project-relative paths remain the stable input identity but are resolved against the invocation project root for jscpd's project-external config; a real duplicate produces a trusted Record and fails an explicit blocking `all` aggregate rather than becoming an empty report. A raw fragment forms evidence only when every location shares at least one current area; its Record contains exactly those common areas and uses their strictest line/token and blocking policies. Mutually exclusive areas therefore produce no cross-boundary Finding, while an explicit shared area preserves comparison. An unchanged raw cache hit is re-evaluated under current area policy, and a scanner self-match with duplicate identical ranges is rejected as an invalid external result.

## Case AUX-JSCPD-ADAPTER-OUTCOMES-001: jscpd adapter preserves its private result boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > uses identifiable jscpd versions as provenance without exact locking`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
  Proves:

- The duplicate-detection-owned jscpd adapter distinguishes available findings from missing commands, unavailable tools, unidentifiable version provenance, nonzero execution, missing reports, and malformed reports. Package availability reports the actual version of its contained package bin; the repository/candidate/external-consumer release evidence separately verifies that this version agrees with the resolved manifest. Custom availability identifies its command without inferring repository provenance. An identifiable actual version is accepted without an exact runtime lock and partitions raw cache identity. A custom executable directly receives adapter-owned version and scan arguments, while no public worker or argument passthrough can alter that protocol. The adapter removes only a duplicate report `format`-matched path suffix before normalizing valid JSON and never accepts a partial trusted result.

## Case AUX-FUNCTION-ANALYZER-ADAPTER-OUTCOMES-001: Product analyzer adapter preserves its whole-input boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > maps all 27 reader families and 55 registered suffixes from supplied source`
- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > maps fixed complexity contributors and nesting depth from the private port`
- `bun|src/package-checks/function-metrics/analyzer-adapter.test.ts|functionMetrics Product analyzer adapter > fails the complete input when any supplied source has no translated reader`
- `bun|src/package-checks/function-metrics/analyzer-worker.test.ts|functionMetrics analyzer Worker > resolves the Product adapter from the source tree and rejects malformed transport`
- `bun|src/package-checks/function-metrics/analysis.test.ts|functionMetrics Product metric analysis > fails closed when a supplied metric omits or corrupts selected-extension facts`
- `bun|src/package-checks/function-metrics/measurement.encoding.test.ts|functionMetrics source-byte admission > matches Lizard 1.24 auto_read byte and newline observations`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > uses actual bytes for the 8 MiB per-file boundary and fails closed above it`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > fails the whole exact input when aggregate bytes exceed 64 MiB without sending a prefix`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > reports a missing admitted exact path as source-unavailable`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > maps a synchronous Worker postMessage failure to one whole analysis failure`
- `bun|src/package-checks/function-metrics/measurement.resource.test.ts|functionMetrics resource admission > fails closed for malformed Worker replies while retaining the current transport shape boundary`
  Proves:

- Parent admission passes parent-approved source text for exactly the selected paths to one Product-owned Worker; it does not delegate path discovery or file reading. The Worker validates transport, resolves the Product adapter from the source tree, and fails the complete request for unsupported supplied source or malformed transport without publishing a metric prefix.
- The adapter is the port façade's only production consumer. It maps all 27 reader families and 55 canonical suffix observations from supplied source through the Check-private port, closes fixed facts as ordered CCN contributors and a non-negative nesting-depth value, and leaves analysis to reject missing or malformed values before Record conversion.
- Parent reply validation accepts only string file/name, safe-integer measurements, and `{ source: "typescript-analyzer", value: null | safe integer }` CCN. It accepts negative safe integers and top-level, metric, and nested extra keys; it leaves nesting/contributor validation to analysis; it rejects malformed replies or metrics outside the exact approved paths.
- Before analysis, admission mirrors Lizard 1.24 `auto_read` for valid initial BOM and universal newlines, preserves legal U+FFFD, and retries invalid, truncated, overlong, surrogate, and out-of-range UTF-8 bytes with the source fallback behavior.
- A synchronous Worker `postMessage` failure maps once to `analysis-failed`, terminates that Worker, and cannot publish a metric prefix or a second settlement. Parent admission measures actual bytes, accepts exactly 8 MiB per file, rejects larger files or an aggregate over 64 MiB before Worker analysis, and maps an exact-path read failure to `source-unavailable`; none publish a metric prefix.

## Case AUX-SCC-ADAPTER-OUTCOMES-001: scc adapter preserves its private result boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > sends --no-config and rejects a successful scc invocation that produces no CSV header`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > parses scc 4.0 Provider paths and rejects unknown CSV headers`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
  Proves:

- The file-metrics-owned SCC 4.0 adapter skips invocation for empty exact input, always sends `--no-config` before its fixed by-file CSV protocol, accepts only the supported complete CSV shape, and preserves valid zero-file output while rejecting missing headers, unknown headers, or malformed rows.

## Case AUX-SCC-V4-AVAILABILITY-001: SCC v4 exact executable contract

Owner: `docs/development/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/file-metrics/scc/availability.test.ts|SCC availability > accepts only the SCC 4.0.0 executable contract`
  Proves:
- The file-metrics adapter accepts only exact `scc version 4.0.0`; a custom SCC 3.7.0 executable is an actionable contract error rather than a fallback measurement source.
