# scanner-adapters

## Case WB-SCANNER-DEPENDENCY-RESOLUTION-001: Scanner dependency resolution
Owner: `docs/scanner-dependencies.md#current-dependency-boundary`
Entities:
- `bun|src/product/scanner-dependencies/index.test.ts|scanner dependency resolution > uses explicit controls before supported environment and definition bindings`
- `bun|src/product/scanner-dependencies/index.test.ts|scanner dependency resolution > fails before work without repository, pinned-environment, or PATH fallback`
- `bun|src/product/scanner-dependencies/index.test.ts|scanner dependency resolution > resolves only the selected built-in dependency bindings`
Proves:
- Explicit controls, allowlisted environment, and Project Definition bindings are the only source order; no pinned, repository, argument, or PATH fallback exists.

## Case WB-SCANNER-EXACT-RESULT-SCOPE-001: Scanner exact input scope
Owner: `docs/scanner-dependencies.md#exact-input-adapter-handoff`
Entities:
- `bun|src/product/quality-core/measurement/scoped-measurement.test.ts|scoped measurement acceptance > validates declared source paths without inspecting payload shape`
Proves:
- Source acceptance uses only declared source paths and rejects a complete out-of-scope batch before record conversion.

## Case WB-SCANNER-FILE-METRICS-CHECK-001: File Check owns SCC handoff
Owner: `docs/quality-metrics.md#built-in-checks-与-exact-inputs`
Entities:
- `bun|src/product/quality-core/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > fails current unavailable process CSV and out-of-scope batches without records`
- `bun|src/product/quality-core/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > keeps file record identity stable when only current location changes`
- `bun|src/product/quality-core/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > retains an earlier valid record when a later out-of-scope batch is rejected`
- `bun|src/product/quality-core/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > runs controlled current and reference exact inputs into one snapshot and reference policy result`
- `bun|src/product/quality-core/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > uses the frozen changed-file scope instead of baseline delta to classify changed records`
Proves:
- File records are produced only from accepted exact inputs; private SCC failure is an owning failed run and cannot remove independently committed records or change stable record identity.

## Case WB-SCANNER-FUNCTION-METRICS-CHECK-001: Function Check owns Lizard handoff
Owner: `docs/quality-metrics.md#built-in-checks-与-exact-inputs`
Entities:
- `bun|src/product/quality-core/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > distinguishes successful zero-function work from no input`
- `bun|src/product/quality-core/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > fails unavailable execution invalid and out-of-scope current batches without records`
- `bun|src/product/quality-core/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > keeps complete current records when reference scope is incomplete`
- `bun|src/product/quality-core/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > produces three typed records and location-independent IDs from current and reference inputs`
- `bun|src/product/quality-core/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > retains ambiguous function instances as changed without inventing regressions`
Proves:
- Function Check distinguishes zero work, no input, private failure and incomplete reference without leaking private scanner data or inventing comparison facts.

## Case WB-SCANNER-DUPLICATE-DETECTION-CHECK-001: Duplicate Check owns jscpd handoff and cache
Owner: `docs/quality-metrics.md#built-in-checks-与-exact-inputs`
Entities:
- `bun|src/product/quality-core/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > distinguishes zero findings and no input and fails unavailable invalid and out-of-scope batches`
- `bun|src/product/quality-core/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > keeps equal-shape fragments distinct and their identities stable across line movement`
- `bun|src/product/quality-core/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > produces a private cached duplicate record and reference regression fact`
- `bun|src/product/quality-core/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > retains an earlier record when a later area batch fails and keeps reference failure separate`
- `bun|src/product/quality-core/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > reuses cache revalidates cached paths and keys backend arguments privately`
Proves:
- Duplicate Check keeps area inputs, backend/cache identity and reporter private while preserving canonical records and separate reference evidence.

## Case AUX-CURRENT-SCANNER-EVIDENCE-001: Additional current scanner protocol evidence
Owner: `docs/scanner-dependencies.md#exact-input-adapter-handoff`
Entities:
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies commands missing after preflight as execution failures`
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies empty jscpd JSON reports as report failures`
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies non-zero jscpd exits as execution failures`
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > classifies unavailable jscpd dependency binaries in tool availability`
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > does not treat a successful jscpd run without JSON as a successful empty scan`
- `bun|src/product/quality-core/measurement/scanners-jscpd.test.ts|quality jscpd wrapper failure projection > keeps real duplicate findings non-fatal and normalizes jscpd JSON`
- `bun|src/product/quality-core/measurement/scanners-lizard.test.ts|quality lizard availability projection > classifies missing dependency commands as unavailable tools`
- `bun|src/product/quality-core/measurement/scanners-lizard.test.ts|quality lizard availability projection > classifies non-zero version exits with stderr as execution failures`
- `bun|src/product/quality-core/measurement/scanners-scc.test.ts|quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
- `bun|src/product/quality-core/measurement/scanners-scc.test.ts|quality scc exact input projection > returns empty metrics without invoking scc when exact inputs are empty`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > classifies invalid jscpd JSON and duplicate items as parse failures`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > keeps legitimate Lizard zero-function output successful`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > parses Lizard 1.23 function rows`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > parses jscpd version and JSON output`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > parses scc 3.7 Provider paths and rejects unknown CSV headers`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed or partial Lizard CSV headers instead of treating them as zero functions`
- `bun|src/product/quality-core/measurement/scanners.test.ts|quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
Proves:
- SCC, Lizard and jscpd wrappers keep availability, process, parser/reporter and zero-result semantics private: unavailable, non-zero, missing or malformed output fails closed, while valid zero-function/zero-file output and real duplicate findings remain successful data.
- Parsers accept the SCC/Lizard/jscpd wire shapes and reject malformed or partial rows/items without a trusted prefix.
