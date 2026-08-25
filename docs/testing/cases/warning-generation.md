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
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > returns a frozen private value without an object prototype or source/AST detail`
- `bun|src/checks/json-validation/strict-document.test.ts|strict JSON document boundary > maps a read failure to a closed unavailable result`

Proves:

- The package-private JSON document boundary applies its fixed byte, BOM, UTF-8, strict grammar and decoded duplicate-key order; a valid verdict carries a frozen null-prototype private JSON value for Product consumers, never source, AST or parser detail. Read or boundary failure remains unavailable rather than a document defect.

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

## Case ADD-JSON-SCHEMA-VALIDATION-RESULTS-001: JSON Schema Check closes safe document, reference, validation and display facts

Owner: `docs/quality-metrics.md#direct-defaults-and-exact-inputs`
Entities:

- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > validates registered schema bindings and publishes only safe normalized keyword facts`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > accepts standard conditional keywords and format annotations without extra plugins`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > keeps the default offline and fails an unapproved reference without calling fetch`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > resolves a registered local schema before requiring an external source`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > uses an explicit HTTPS allowlist with omitted credentials and no redirect`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > maps an allowlisted transport failure to unavailable without remote detail`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > treats an allowlisted redirect as a safe schema failure without following it`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > applies all three Check-level root identity modes without exposing document IDs`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > caps only displayed issues while retaining the full failed assessment`
- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape`

Proves:

- Explicit schema/binding work produces only the closed schema-document/schema-compile/instance-document/keyword-violation facts, safe authoring IDs/paths/pointers/keywords, deterministic local Record IDs, and exact valid/invalid/blocked final counts; JSON data keys that happen to be `$ref`/`$dynamicRef`/`$async` remain ordinary property names, and `format` remains a standard annotation rather than a loaded format plugin. It never publishes Ajv text, source bytes, raw external identities or credentials.
- Default resolution remains offline; only an explicit HTTPS source can be called with `GET`, omitted credentials and rejected redirects. Authorization/document failures are failed domain facts, while an allowlisted transport failure and cancellation boundary are unavailable without final data.
- The whole Check chooses exactly one root identity mode, scope failures do not trigger discovery, zero bindings are not applicable, and 100 displayed Records cap only presentation while total issue count and failed status remain truthful.
