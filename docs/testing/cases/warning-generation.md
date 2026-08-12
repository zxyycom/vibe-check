# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Built-in thresholds become typed records
Owner: `docs/quality-metrics.md#built-in-checks-与-exact-inputs`
Entities:
- `bun|src/product/quality-core/src/check-record/builtins/file-metrics.test.ts|file-metrics built-in Check > runs controlled current and reference exact inputs into one snapshot and reference policy result`
- `bun|src/product/quality-core/src/check-record/builtins/function-metrics.test.ts|function-metrics built-in Check > produces three typed records and location-independent IDs from current and reference inputs`
- `bun|src/product/quality-core/src/check-record/builtins/duplicate-detection.test.ts|duplicate-detection built-in Check > produces a private cached duplicate record and reference regression fact`
Proves:
- Built-in threshold findings are typed records owned by their Check; DecisionPolicy consumes records rather than a separate warning-generation channel.
