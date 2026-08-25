# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Built-in thresholds return final data and supplemental facts

Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:

- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes file metrics from Check-owned scanner options with final data and supplemental Records`
- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes function metrics from Check-owned scanner options with final data and local Record IDs`
- `bun|src/checks/builtins/default-checks.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and cache context`

Proves:

- Built-in threshold checks return their own passed or failed final data; detailed findings, when present, are separate Check-local supplemental Records. Neither Record count nor Record data is a generic warning or Gate channel.

## Case ADD-JSON-VALIDATION-STRICT-DOCUMENT-001: Strict JSON document boundary normalizes document verdicts

Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:

- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > uses byte length with a strict greater-than limit before every document issue`
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > returns BOM before fatal UTF-8 and strict grammar failures`
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > accepts every JSON root value only after Momoa strictly consumes it`
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > detects decoded duplicate keys in each object without exposing the key or AST`
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > maps a read failure to a closed unavailable result`

Proves:

- The package-private JSON document boundary applies its fixed byte, BOM, UTF-8, strict grammar and decoded duplicate-key order, returns one closed document verdict without source or parser detail, and preserves read or boundary failure as unavailable rather than as a document defect.

## Case ADD-JSON-VALIDATION-RESULTS-001: JSON validation emits safe per-file facts and four-state outcomes

Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:

- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > filters only lower-case .json paths from global scope and returns exact final counts`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > reports every closed document issue once with redacted Records and exact counts`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable when global scope has no lower-case JSON input`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > retains accepted Records but becomes unavailable when a later eligible file disappears`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > honors cancellation before and between file boundaries without final data`

Proves:

- JSON validation returns normal four-count final data only after every eligible file is settled; each of the five closed document reasons produces exactly one safe `{ id: path }` / `{ path, reason }` Record and no JSON source, key, pointer, location, or parser detail.
- Empty eligible input is `not-applicable`; cancellation or a later unavailable document produces `unavailable` without final data while retaining already accepted Records.
