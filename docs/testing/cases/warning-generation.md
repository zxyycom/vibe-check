# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Package-provided thresholds return final data and supplemental facts

Owner: `docs/quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/file-metrics/constructor.test.ts|fileMetrics constructor and direct callback > scans area-owned exact inputs once and applies the strictest overlapping area policy`
- `bun|src/package-checks/function-metrics/constructor.test.ts|functionMetrics area findings > records complete area evidence and fails only for effective blocking findings`
- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options`

Proves:

- Package-provided threshold Checks return their own passed or failed final data; detailed findings, when present, are separate Check-local supplemental Records. Function metrics keeps non-blocking Records in a passed result and fails only when its own blocking count is nonzero. Neither Record count nor Record data is a generic warning or Gate channel.

## Case ADD-JSON-VALIDATION-STRICT-DOCUMENT-001: Strict JSON document boundary normalizes document verdicts

Owner: `docs/quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > uses byte length with a strict greater-than limit before every document issue`
- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > returns BOM before fatal UTF-8 and strict grammar failures`
- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > accepts every JSON root value only after Momoa strictly consumes it`
- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > detects decoded duplicate keys in each object without exposing the key or AST`
- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > returns a frozen private value without an object prototype or source/AST detail`
- `bun|src/package-checks/json-document/strict-document.test.ts|strict JSON document boundary > maps a read failure to a closed unavailable result`

Proves:

- The package-private JSON document boundary applies its fixed byte, BOM, UTF-8, strict grammar and decoded duplicate-key order; a valid verdict carries a frozen null-prototype private JSON value for Product consumers, never source, AST or parser detail. Read or boundary failure remains unavailable rather than a document defect.

## Case ADD-JSON-VALIDATION-RESULTS-001: JSON validation emits safe per-file facts and four-state outcomes

Owner: `docs/quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > filters only lower-case .json paths from its file selection and returns exact final counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > reports every closed document issue once with redacted Records and exact counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable when its file selection has no lower-case JSON input`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > retains accepted Records but becomes unavailable when a later eligible file disappears`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > honors cancellation before and between file boundaries without final data`

Proves:

- JSON validation returns normal four-count final data only after every eligible file is settled; each of the five closed document reasons produces exactly one safe `{ id: path }` / `{ path, reason }` Record and no JSON source, key, pointer, location, or parser detail.
- Empty eligible input is `not-applicable`; cancellation or a later unavailable document produces `unavailable` without final data while retaining already accepted Records.

## Case ADD-JSON-SCHEMA-VALIDATION-RESULTS-001: JSON Schema validation publishes safe domain facts and exact counts

Owner: `docs/quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > validates registered schema bindings and publishes only safe normalized keyword facts`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > accepts standard conditional keywords and format annotations without extra plugins`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > caps only displayed issues while retaining the full failed assessment`
  Proves:

- Registered schema/binding work publishes only the closed schema-document, schema-compile, instance-document, and keyword-violation facts with safe IDs, paths, pointers, and keywords; it never exposes engine text, source bytes, raw external identity, or credentials.
- Normal final data keeps valid, invalid, blocked, and total issue counts truthful. A 100-Record display prefix changes neither the full failed assessment nor its issue count, and `format` remains an annotation rather than a loaded plugin.

## Case ADD-JSON-SCHEMA-VALIDATION-REMOTE-POLICY-001: JSON Schema reference policy is explicit and fail-closed

Owner: `docs/configuration.md#jsonschemavalidation-option-contract`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > keeps the default offline and fails an unapproved reference without calling fetch`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > resolves a registered local schema before requiring an external source`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > uses an explicit HTTPS allowlist with omitted credentials and no redirect`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > maps an allowlisted transport failure to unavailable without remote detail`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > treats an allowlisted redirect as a safe schema failure without following it`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape`
  Proves:

- Reference resolution is offline by default. Only explicitly configured HTTPS sources may be requested with omitted credentials and no redirect; registered local schemas and the fixed catalog need no request.
- Unapproved references, unsafe schema features, and redirects become safe failures, while an allowlisted transport failure is unavailable without exposing remote detail.

## Case ADD-JSON-SCHEMA-VALIDATION-IDENTITY-OUTCOMES-001: JSON Schema identity and complete outcome boundaries remain explicit

Owner: `docs/quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > applies all three Check-level root identity modes without exposing document IDs`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`
  Proves:

- One Check-level root identity mode governs every configured schema without exposing document IDs. Scope or schema-document failures block their dependent bindings rather than inventing keyword results, and zero bindings settle as `not-applicable` without document work.
