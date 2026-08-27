# check-owned-scanners

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner exact input scope

Owner: `docs/scanner-dependencies.md#exact-input-handoff`
Entities:

- `bun|src/package-checks/project-files/exact-input-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
  Proves:
- Source acceptance uses only declared source paths and rejects a complete out-of-scope batch before record conversion.

## Case WB-SCANNER-FILE-METRICS-CHECK-001: File default owns its command and direct callback

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/file-metrics/default-check.test.ts|default Check direct callbacks > executes file metrics from Check-owned scanner options with final data and supplemental Records`
  Proves:
- The file default consumes its complete Check-owned scanner options through the public direct callback context, returns its final data, and reports only Check-local supplemental Records.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function default owns its command and direct callback

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/package-checks/function-metrics/default-check.test.ts|default Check direct callbacks > executes function metrics from Check-owned scanner options with final data and local Record IDs`
  Proves:
- The function default consumes its complete Check-owned Lizard command configuration, returns final data, and produces supplemental metric Records with local identities through the ordinary callback path.

## Case WB-SCANNER-DUPLICATE-CHECK-001: Duplicate default owns its command and Check-owned cache options

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`
- `bun|src/package-checks/duplicate-detection/cache/cache.test.ts|quality measurement cache > treats cache read I/O errors as a Check-local miss`
Proves:

- Duplicate detection consumes its Check-owned command and backend concurrency, returns final data, and reports Check-local supplemental Records. Its cache remains Check-owned: a read failure is a miss while a write failure settles the Check unavailable; the portable default marker resolves the installed `jscpd` bin through active Bun and an explicit command remains an explicit adapter input.

## Case AUX-JSCPD-ADAPTER-OUTCOMES-001: jscpd adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/package-checks/duplicate-detection/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/package-checks/duplicate-detection/jscpd/parser.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
Proves:

- The duplicate-detection-owned jscpd adapter distinguishes available findings from missing commands, unavailable tools, nonzero execution, missing reports, and malformed reports; it normalizes only valid JSON and never accepts a partial trusted result.

## Case AUX-LIZARD-ADAPTER-OUTCOMES-001: Lizard adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/package-checks/function-metrics/lizard/scanner.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > keeps legitimate Lizard zero-function output successful`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > parses Lizard 1.23 function rows`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
- `bun|src/package-checks/function-metrics/lizard/parser.test.ts|quality scanner output parsing > rejects malformed or partial Lizard CSV headers instead of treating them as zero functions`
Proves:

- The function-metrics-owned Lizard adapter treats legitimate zero-function and valid 1.23 rows as complete output, while unavailable commands, failed probes, malformed rows, or partial headers fail without a trusted prefix.

## Case AUX-SCC-ADAPTER-OUTCOMES-001: scc adapter preserves its private result boundary

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/package-checks/file-metrics/scc/scanner.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > parses scc 3.7 Provider paths and rejects unknown CSV headers`
- `bun|src/package-checks/file-metrics/scc/parser.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
Proves:

- The file-metrics-owned scc adapter skips invocation for empty exact input, accepts only the supported complete CSV shape, and preserves valid zero-file output while rejecting missing headers, unknown headers, or malformed rows.
