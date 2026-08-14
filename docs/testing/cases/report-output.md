# report-output

## Case WB-OUTPUT-MACHINE-V2-CONTRACT-001: Machine v2 publication contract
Owner: `docs/output.md#当前产品输出`
Entities:
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > derives exact closed DTOs from runtime schemas and one validated publication model`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > serializes canonical JSON and NDJSON and validates the complete two-file set`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > preserves an absent record policy and allows disabled decisions to retain acceptance and views`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > rejects byte schema and cross-file invariant failures without a trusted prefix`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > reuses final Core validation for legal run coverage and canonical snapshot facts`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > closes named-reference identities evidence relations and canonical arrays`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > closes decision identity types canonical arrays and gate evidence state`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > binds reference evidence refs to a published Check/reference evidence pair`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.validation.test.ts|machine publication v2 contract > requires not-evaluated readiness to stop at its unique first failure`
Proves:
- Runtime schemas own exact v2 DTO identities, fields, enums and byte grammar; `run.json` and `records.ndjson` validate only as one complete set.
- Machine validation closes final snapshot, record/run/reference/decision relationships and canonical ordering without a partial consumer result.
- Publication model construction rejects mismatched or illegal human status candidates before any trusted projection; readable output and structured Run Result consume only the frozen model status.

## Case WB-OUTPUT-PUBLISHED-MATERIALS-001: Generated publication materials remain canonical
Owner: `docs/output.md#published-materials-and-verification`
Entities:
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.contract-materials.test.ts|machine publication v2 contract > generates canonical schema and example candidates that validate independently`
Proves:
- Runtime schema and example candidates are canonical, independently valid publication materials rather than a second machine contract.

## Case WB-OUTPUT-READABLE-PROJECTION-001: Readable consumers share one validated projection
Owner: `docs/output.md#readable-output-and-annotation`
Entities:
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.readable.test.ts|machine publication v2 readable contract > projects shared statuses accepted previews and presentation from one model`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.readable.test.ts|machine publication v2 readable contract > applies report preview and changed-record limits without truncating console records`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.readable.test.ts|machine publication v2 readable contract > pins annotation consumption to one validated two-file artifact directory`
Proves:
- Report, console and annotation consume the same validated model/set boundary; presentation limits affect only their declared readable projections and never truncate machine or console facts.

## Case WB-OUTPUT-PUBLICATION-LIFECYCLE-001: Publication lifecycle closes candidates before trusted paths
Owner: `docs/output.md#publication-lifecycle-and-evidence`
Entities:
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.lifecycle.test.ts|machine publication v2 lifecycle > pins candidate artifact and handled-failure lifecycle stages`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.lifecycle.test.ts|machine publication v2 lifecycle > plans exact prior-v2 stale-v1 report and owned-temp cleanup without touching unrelated files`
Proves:
- Candidate validation precedes canonical writes; handled failure and cleanup affect only owned artifacts.

## Case AUX-DOCS-MACHINE-ARTIFACTS-001: Independent v2 example acceptance
Owner: `docs/output.md#published-materials-and-verification`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > accepts exactly the five canonical sets and positive grammar variants`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > rejects focused mutations with locations and detects reversible generated drift`
Proves:
- Independent docs validation checks checked-in schemas/examples and v2 set relationships without importing the production validator.

## Case AUX-QUALITY-ANNOTATION-001: Direct consumer validates the v2 two-file set
Owner: `docs/script-tooling.md#quality-annotation-consumer`
Entities:
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > accepts the complete v2 set, defaults, filtering, and limit matrix`
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > fails closed for argument, set read, decoding, framing, syntax, schema, and invariant errors`
Proves:
- Annotation accepts `[artifact-directory] [limit]`, reads `run.json` and `records.ndjson`, and invokes only the shallow Product set validator before rendering.
- Invalid argument, read, decoding, framing, schema or relationship input yields exit `2`, actionable stderr and zero partial commands.
