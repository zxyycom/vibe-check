# scanner-adapters

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner exact input scope

Owner: `docs/scanner-dependencies.md#adapter-handoff-and-exact-scope`
Entities:

- `bun|src/checks/measurement/scoped-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
  Proves:
- Source acceptance uses only declared source paths and rejects a complete out-of-scope batch before record conversion.

## Case WB-SCANNER-FILE-METRICS-CHECK-001: File default owns its command and direct callback

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes file metrics from Check-owned scanner options with final data and supplemental Records`
  Proves:
- The file default consumes its complete Check-owned scanner options through the public direct callback context, returns its final data, and reports only Check-local supplemental Records.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function default owns its command and direct callback

Owner: `docs/scanner-dependencies.md#check-owned-command-options`
Entities:

- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes function metrics from Check-owned scanner options with final data and local Record IDs`
  Proves:
- The function default consumes its complete Check-owned Lizard command configuration, returns final data, and produces supplemental metric Records with local identities through the ordinary callback path.

## Case WB-SCANNER-DUPLICATE-CHECK-001: Duplicate default owns its command and cache context

Owner: `docs/scanner-dependencies.md#cache-and-failures`
Entities:

- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and cache context`
  Proves:
- Duplicate detection consumes its Check-owned command and backend concurrency, returns final data, and reports Check-local supplemental Records while cache activity remains invocation context rather than a resolver override. Its portable default marker is privately resolved to active Bun plus the installed `jscpd` manifest's declared bin; an explicit command remains an explicit adapter input.

## Case AUX-CURRENT-SCANNER-EVIDENCE-001: Scanner protocol stays private and fails closed

Owner: `docs/scanner-dependencies.md#adapter-handoff-and-exact-scope`
Entities:

- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/checks/measurement/scanners/jscpd/scanner.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
- `bun|src/checks/measurement/scanners/lizard/scanner.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/checks/measurement/scanners/lizard/scanner.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
- `bun|src/checks/measurement/scanners/scc/scanner.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/checks/measurement/scanners/scc/scanner.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > keeps legitimate Lizard zero-function output successful`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > parses Lizard 1.23 function rows`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > parses scc 3.7 Provider paths and rejects unknown CSV headers`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > rejects malformed or partial Lizard CSV headers instead of treating them as zero functions`
- `bun|src/checks/measurement/scanners/scanner-adapters.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
  Proves:
- Private SCC, Lizard, and jscpd protocol adapters distinguish valid empty work from unavailable, non-zero, missing, or malformed output and never expose a partial trusted prefix. The built-in jscpd marker is privately resolved through its installed manifest and executed through Bun.
