# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Built-in thresholds return final data and supplemental facts
Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes file metrics from Check-owned scanner options with final data and supplemental Records`
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes function metrics from Check-owned scanner options with final data and local Record IDs`
- `bun|src/product/quality-core/check-record/builtins/direct-defaults.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and cache context`
Proves:
- Built-in threshold checks return their own passed or failed final data; detailed findings, when present, are separate Check-local supplemental Records. Neither Record count nor Record data is a generic warning or Gate channel.
