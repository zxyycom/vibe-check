# warning-generation

## Case AUX-QUALITY-RECORD-GENERATION-001: Package-provided thresholds return final data and supplemental facts

Owner: `docs/development/check-results.md#package-provided-ordinary-checks-and-exact-inputs`
Entities:

- `bun|src/package-checks/file-metrics/constructor.test.ts|fileMetrics constructor and direct callback > scans area-owned exact inputs once and applies the strictest overlapping area policy`
- `bun|src/package-checks/function-metrics/constructor.area-findings.test.ts|functionMetrics area findings > records complete analyzer evidence and fails only for effective blocking findings`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > reports every rejected selected path once and sends only accepted paths to the analyzer`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > does not create analyzer metric records when every selected path is rejected`
- `bun|src/package-checks/duplicate-detection/default-check.test.ts|default Check direct callbacks > scans the exact-input union once and compares fragments only within common areas`

Proves:

- The three area-based code-quality Checks publish every trusted finding as a Check-local Record with explicit blocking state and return parser-validated `{ findingCount, blockingFindingCount }` final data. File/function matching-area overlaps and duplicate common-area overlaps are blocking when any effective owning area policy is blocking; non-blocking Records remain visible in a passed result, and measurement/conversion does not short-circuit. Function input rejections remain non-blocking even under blocking area policy, retain every matching area, count as findings, and create no analyzer metric Records when no accepted path remains. A function CCN Record alone retains its complete ordered contributor list, while the independent nesting-depth Record retains no contributor attachment; its area limit participates in the same strictest/blocking settlement. Blocking, non-blocking, and input-rejection outcomes attach separate actionable messages followed by at most ten Check-owned safe Finding summaries and an exact omitted-count message; CCN detail itself displays at most eight contributors and its exact Record remainder, without turning arbitrary Records into a generic warning or Gate channel.

## Case ADD-FILE-METRICS-FINDING-WAIVER-001: File metrics publishes reconciled waiver evidence

Owner: `docs/checks/file-metrics.md#filemetrics`
Entities:

- `bun|src/package-checks/file-metrics/finding-waivers.test.ts|fileMetrics finding waivers > validates declared waiver authoring and resolved options`
- `bun|src/package-checks/file-metrics/finding-waivers.test.ts|fileMetrics finding waivers > reconciles declared waivers after SCC forms findings without settling them as actionable`
- `bun|src/package-checks/file-metrics/finding-waivers.test.ts|fileMetrics finding waivers > audits unused waivers even when no eligible file reaches SCC`
- `bun|src/package-checks/file-metrics/finding-waivers.test.ts|fileMetrics finding waivers > uses a waiver-audit Record identity outside the normal normalized-path domain`
  Proves:
- `fileMetrics` accepts only its declared, normalized `{ metric, path }` waiver identity and non-empty reason. SCC still receives the complete eligible exact input set; waiver reconciliation starts only after its complete finding set is formed.
- An applied waiver retains its finding Record and reason while excluding it from actionable settlement. An unused waiver remains observable as an audit Record and warning, including the known empty-input case; the audit Record ID is outside the normal finding-path domain.

## Case ADD-FUNCTION-METRICS-FINDING-WAIVER-001: Function metrics reconciles precise metric subjects

Owner: `docs/checks/function-metrics.md#functionmetrics`
Entities:

- `bun|src/package-checks/function-metrics/finding-waivers.test.ts|functionMetrics finding waivers > validates closed identity authoring without invoking hostile accessors`
- `bun|src/package-checks/function-metrics/finding-waivers.test.ts|functionMetrics finding waivers > audits unused waivers only after forming a complete empty candidate set`
- `bun|src/package-checks/function-metrics/finding-waivers.test.ts|functionMetrics finding waivers > preserves applied and stale waiver evidence while settling only actionable metrics`
- `bun|src/package-checks/function-metrics/finding-waivers.test.ts|functionMetrics finding waivers > keeps duplicate analyzer function identities actionable when a waiver overmatches`

Proves:

- `functionMetrics` accepts only unique closed `{ metric, path, functionName, startLine }` identities with normalized paths, positive locations and non-empty reasons without reading hostile author accessors, including its independent `nesting-depth` metric.
- Configured waivers are audited as unused when a complete candidate set is known to be empty, but source, analysis, cancellation, or resource failure before that boundary publishes no false audit. Applied findings retain their Record and reason but leave actionable/blocking settlement; stale authoring publishes an unused audit, and an identity matching multiple function instances remains fully actionable with an overmatched audit.

## Case ADD-DUPLICATE-DETECTION-FINDING-WAIVER-001: Duplicate detection reconciles exact location sets

Owner: `docs/checks/duplicate-detection.md#duplicatedetection`
Entities:

- `bun|src/package-checks/duplicate-detection/finding-waivers.test.ts|duplicateDetection finding waivers > validates sorted closed identity authoring without invoking hostile accessors`
- `bun|src/package-checks/duplicate-detection/finding-waivers.test.ts|duplicateDetection finding waivers > audits unused waivers only after forming a complete empty candidate set`
- `bun|src/package-checks/duplicate-detection/finding-waivers.test.ts|duplicateDetection finding waivers > preserves applied and stale waiver evidence while removing only exact duplicates from settlement`
- `bun|src/package-checks/duplicate-detection/finding-waivers.test.ts|duplicateDetection finding waivers > keeps repeated duplicate identities actionable when a waiver overmatches`

Proves:

- `duplicateDetection` accepts only unique closed `{ metric, locations }` identities whose normalized project-relative ranges are complete, valid and strictly sorted by path and numeric lines, rejecting malformed or hostile authoring without accessor invocation.
- Configured waivers are audited as unused when a complete candidate set is known to be empty, but scanner failure before that boundary publishes no false audit. An applied exact location set retains the duplicate Record and reason while leaving actionable/blocking settlement; stale and overmatched authoring publish audit evidence, and overmatched fragments remain fully actionable.

## Case ADD-JSON-VALIDATION-STRICT-DOCUMENT-001: Strict JSON document boundary normalizes document verdicts

Owner: `docs/checks/json-validation.md#工作原理`
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

Owner: `docs/checks/json-validation.md#效果与结果`
Entities:

- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > reports selected non-JSON paths and returns exact mixed final counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > reports every closed document issue once with redacted Records and exact counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > settles all rejected selected inputs as non-blocking findings`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable only when its file selection is empty`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > retains accepted Records but becomes unavailable when a later eligible file disappears`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > honors cancellation before and between file boundaries without final data`

Proves:

- `jsonValidation(options?)` fills a precise JSON file default plus byte authoring defaults and exposes a parser that enforces the five-count equations. JSON validation returns final data only after every accepted file is settled; each of the five closed document reasons produces exactly one safe `{ id: path }` / `{ path, reason }` Record and no JSON source, key, pointer, location, or parser detail.
- Every selected unsupported path produces its own fixed non-blocking rejection Record and contributes to `rejectedInputCount` plus `issueCount`; only invalid documents fail the Check. Empty selected input is `not-applicable`, while all-rejected input is passed with a warning. Cancellation or a later unavailable document produces `unavailable` without final data while retaining already accepted Records.

## Case ADD-JSON-SCHEMA-VALIDATION-RESULTS-001: JSON Schema validation publishes safe domain facts and exact counts

Owner: `docs/checks/json-schema-validation.md#效果与结果`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.default-contract.test.ts|JSON Schema validation default Check > validates registered schema bindings and publishes only safe normalized keyword facts`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.result-reporting.test.ts|JSON Schema validation default Check > accepts standard conditional keywords and format annotations without extra plugins`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.result-reporting.test.ts|JSON Schema validation default Check > caps only displayed issues while retaining the full failed assessment`
  Proves:

- `jsonSchemaValidation(options?)` fills partial authoring defaults and exposes a parser for exact binding, issue, reported-count and truncation invariants. Registered work publishes only the closed schema-document, schema-compile, instance-document, and keyword-violation facts with safe IDs, paths, pointers, and keywords; it never exposes engine text, source bytes, raw external identity, or credentials.
- Normal final data keeps valid, invalid, blocked, and total issue counts truthful. A 100-Record display prefix changes neither the full failed assessment nor its issue count; failed results carry a safe message that identifies truncation, and `format` remains an annotation rather than a loaded plugin.

## Case ADD-JSON-SCHEMA-VALIDATION-REMOTE-POLICY-001: JSON Schema reference policy is explicit and fail-closed

Owner: `docs/checks/json-schema-validation.md#referenceresolution-引用解析规则`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.offline-and-local-reference.test.ts|JSON Schema validation default Check > keeps the default offline and fails an unapproved reference without calling fetch`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.offline-and-local-reference.test.ts|JSON Schema validation default Check > resolves a registered local schema before requiring an external source`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.allowlisted-reference.test.ts|JSON Schema validation default Check > uses an explicit HTTPS allowlist with omitted credentials and no redirect`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.reference-failure-boundaries.test.ts|JSON Schema validation default Check > maps an allowlisted transport failure to unavailable without remote detail`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.reference-failure-boundaries.test.ts|JSON Schema validation default Check > treats an allowlisted redirect as a safe schema failure without following it`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.unsafe-schema-boundaries.test.ts|JSON Schema validation default Check > rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape`
  Proves:

- Reference resolution is offline by default. Only explicitly configured HTTPS sources may be requested with omitted credentials and no redirect; registered local schemas and the fixed catalog need no request.
- Unapproved references, unsafe schema features, and redirects become safe failures, while an allowlisted transport failure is unavailable with an actionable message and without exposing remote detail.

## Case ADD-JSON-SCHEMA-VALIDATION-IDENTITY-OUTCOMES-001: JSON Schema identity and complete outcome boundaries remain explicit

Owner: `docs/checks/json-schema-validation.md#jsonschemavalidation`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts|JSON Schema validation default Check > applies all three Check-level root identity modes without exposing document IDs`
- `bun|src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`
  Proves:

- One Check-level root identity mode governs every configured schema without exposing document IDs. Scope or schema-document failures block their dependent bindings rather than inventing keyword results, and zero bindings settle as `not-applicable` without document work.

## Case ADD-SECRET-DETECTION-FINDING-SETTLEMENT-001: Secret detection publishes safe findings and waiver audits

Owner: `docs/checks/secret-detection.md#效果与结果`
Entities:

- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > reconciles safe waiver identities and audits unused and overmatched authoring`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > keeps the safe finding identity when the detected value or line moves`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > returns unavailable rather than a partial result after cancellation or detector protocol failure`

Proves:

- Secret finding identity uses only rule, path, structural class and ordinal; applied waiver retains a safe finding Record, while unused and overmatched waiver authoring remains observable and does not silently settle actionable findings.
- Replacing the detected private-key value or moving it to another line changes the safe location evidence but not the rule/path/structure/ordinal identity.
- Cancellation and detector protocol failure settle unavailable without final data or raw detector material.
