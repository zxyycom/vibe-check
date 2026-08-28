# check-owned-scanners

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner exact input scope

Owner: `docs/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/project-files/exact-input-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
  Proves:
- Source acceptance uses only declared source paths and rejects a complete out-of-scope batch before record conversion.

## Case WB-SCANNER-FILE-METRICS-CHECK-001: File constructor owns its policy and direct callback

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/file-metrics/default-check.test.ts|fileMetrics constructor and direct callback > materializes closed defaults and rejects malformed authored or resolved policy`
  Proves:
- `fileMetrics(options?)` materializes frozen area and executable defaults, rejects unknown or invalid authored input synchronously, and retains defensive resolved preflight/execution validation without public SCC argument passthrough.

## Case WB-SCANNER-FILE-METRICS-SCOPE-001: File metrics applies area-owned exact scope

Owner: `docs/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/file-metrics/default-check.test.ts|fileMetrics constructor and direct callback > scans area-owned exact inputs once and applies the strictest overlapping area policy`
  Proves:
- Each file-metrics area owns files and code-line policy. One SCC invocation receives the stable deduplicated exact-path union; a path selected by multiple areas produces at most one finding under the strictest effective maximum and retains every matching area ID.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function constructor owns area and finding policy

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/function-metrics/default-check.test.ts|functionMetrics constructor > materializes frozen defaults and rejects malformed closed policy`
- `bun|src/package-checks/function-metrics/default-check.test.ts|functionMetrics area findings > records complete area evidence and fails only for effective blocking findings`
  Proves:
- `functionMetrics(options?)` materializes frozen area, limit, finding-policy and executable defaults; rejects malformed authored input synchronously; and retains defensive resolved preflight validation. One Lizard scan receives the area exact-path union, overlapping areas use deterministic strict policy, all findings become local supplemental Records, and only effective blocking findings fail the Check.

## Case WB-SCANNER-DUPLICATE-CHECK-001: Duplicate default owns its command and Check-owned cache options

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`
- `bun|src/package-checks/duplicate-detection/cache/cache.test.ts|quality measurement cache > treats cache read I/O errors as a Check-local miss`
  Proves:

- `duplicateDetection(options?)` materializes frozen defaults for cache, scanner and area-owned file/threshold policy, while synchronously rejecting unknown or invalid constructor input, including public custom arguments. Its resolved Check consumes package or executable-only custom command policy, returns final data, and reports Check-local supplemental Records; preflight still rejects an invalid complete options replacement. The raw cache remains Check-owned: a read failure is a miss while a write failure settles the Check unavailable; the portable package command resolves installed `jscpd` through active Bun and the adapter alone supplies availability and scan arguments to a custom executable.

## Case WB-SCANNER-DUPLICATE-SCOPE-001: Duplicate detection compares the complete exact scope

Owner: `docs/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > scans area-owned exact inputs once and applies the strictest overlapping area policy`
  Proves:

- Each code area independently owns its file selection and line/token thresholds. One jscpd scan receives their deduplicated exact-path union with the lowest effective line/token scanner thresholds and jscpd's automatic worker policy; each accepted raw fragment is annotated with every current matching area and retained only when it satisfies the strictest line and token thresholds among all involved areas, including when an unchanged raw cache hit is filtered under a stricter area policy.

## Case AUX-JSCPD-ADAPTER-OUTCOMES-001: jscpd adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
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

- The duplicate-detection-owned jscpd adapter distinguishes available findings from missing commands, unavailable tools, unidentifiable version provenance, nonzero execution, missing reports, and malformed reports; availability identifies package dependency versus custom command without inferring repository provenance. An identifiable actual version is accepted without an exact runtime lock and partitions raw cache identity. A custom executable directly receives adapter-owned version and scan arguments, while no public worker or argument passthrough can alter that protocol. The adapter normalizes only valid JSON and never accepts a partial trusted result.

## Case AUX-LIZARD-ADAPTER-OUTCOMES-001: Lizard adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > classifies signal termination as execution failure`
- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > passes only exact paths and adapter-owned CSV arguments to the executable`
- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > rejects empty version provenance instead of accepting an unknown tool`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > keeps legitimate Lizard zero-function output successful`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > parses Lizard 1.23 function rows`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > rejects malformed or partial Lizard CSV headers instead of treating them as zero functions`
  Proves:

- The function-metrics-owned Lizard adapter alone supplies version, exact-path and CSV arguments, requires nonempty version provenance, treats legitimate zero-function and valid 1.23 rows as complete output, and lets unavailable commands, failed probes, signal termination, malformed rows, or partial headers fail without a trusted prefix.

## Case AUX-SCC-ADAPTER-OUTCOMES-001: scc adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > parses scc 3.7 Provider paths and rejects unknown CSV headers`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
  Proves:

- The file-metrics-owned scc adapter skips invocation for empty exact input, accepts only the supported complete CSV shape, and preserves valid zero-file output while rejecting missing headers, unknown headers, or malformed rows.
