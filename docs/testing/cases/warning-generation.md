# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Built-in thresholds become typed records
Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes file metrics from Check-owned scanner options and reports Check-owned candidates`
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes function metrics from Check-owned scanner options and reports all metric Records`
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options and uses the invocation cache context`
Proves:
- Built-in threshold findings are typed records owned by their Check; DecisionPolicy consumes records rather than a separate warning-generation channel.
