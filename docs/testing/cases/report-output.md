# report-output

## Case WB-OUTPUT-MACHINE-V3-CONTRACT-001: Machine v3 publication contract
Owner: `docs/output.md#core-to-machine-projection`
Entities:
- `bun|src/product/quality-core/output/publication-v3/publication-v3.test.ts|machine publication v3 contract > derives exact closed DTOs from runtime schemas and one validated publication model`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.test.ts|machine publication v3 contract > serializes canonical JSON and NDJSON and validates the complete two-file set`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.test.ts|machine publication v3 contract > preserves an absent record policy and allows disabled decisions to retain acceptance and views`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > rejects byte schema and cross-file invariant failures without a trusted prefix`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > rejects a mixed generation even when the old empty Record set fits the new catalog`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > reuses target Core validation for Check outcomes, record ownership, and canonical snapshot facts`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > closes named-reference identities evidence relations and canonical arrays`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > closes decision identity types canonical arrays and gate evidence state`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > binds reference evidence refs to a published Check/reference evidence pair`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.validation.test.ts|machine publication v3 contract > requires not-evaluated readiness to stop at its unique first failure`
Proves:
- Runtime schemas own the exact v3 DTO identities, fields, diagnostic vocabulary and byte grammar: `run.json` contains invocation, catalog/Record-set fingerprints, Checks and reference/acceptance/decision evidence, while Record rows bind only Check and record type identities.
- Machine validation closes the target Core `{ checks, records }` snapshot, catalog and Record-set fingerprints, reference and decision relationships and canonical order without a partial consumer result.
- Publication model construction rejects mismatched human status candidates before any trusted projection; readable output and structured Run effects consume only the frozen model status.

## Case WB-OUTPUT-PUBLISHED-MATERIALS-001: Generated v3 publication materials remain canonical
Owner: `docs/output.md#published-materials-and-historical-v2`
Entities:
- `bun|src/product/quality-core/output/publication-v3/publication-v3.contract-materials.test.ts|machine publication v3 contract > generates canonical schema and example candidates that validate independently`
Proves:
- Runtime v3 schema and example candidates are canonical, independently valid publication materials rather than a second machine contract.

## Case WB-OUTPUT-READABLE-PROJECTION-001: Readable consumers share one validated v3 projection
Owner: `docs/output.md#readable-output-and-annotation`
Entities:
- `bun|src/product/quality-core/output/publication-v3/publication-v3.readable.test.ts|machine publication v3 readable contract > projects shared statuses accepted previews and presentation from one model`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.readable.test.ts|machine publication v3 readable contract > applies report preview and changed-record limits without truncating console records`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.readable.test.ts|machine publication v3 readable contract > pins annotation consumption to one validated two-file artifact directory`
Proves:
- Report, console and annotation consume the same validated v3 model/set boundary; presentation limits affect only their declared readable projections and never truncate machine or console facts.

## Case WB-OUTPUT-PUBLICATION-LIFECYCLE-001: Publication lifecycle closes candidates before trusted paths
Owner: `docs/output.md#publication-lifecycle-and-evidence`
Entities:
- `bun|src/product/quality-core/output/publication-v3/publication-v3.lifecycle.test.ts|machine publication v3 lifecycle > pins candidate artifact and handled-failure lifecycle stages`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.lifecycle.test.ts|machine publication v3 lifecycle > plans exact canonical retired report and owned-temp cleanup without touching unrelated files`
- `bun|src/product/quality-core/output/publication-v3/publication-v3.lifecycle.test.ts|machine publication v3 lifecycle > writes every temp before replacement and cleans handled publication failures`
Proves:
- Candidate validation and every temp write precede canonical replacement; a handled preparation failure preserves the prior set, while a handled partial replacement removes canonical and temporary owned artifacts.

## Case AUX-DOCS-MACHINE-ARTIFACTS-001: Independent v3 example acceptance
Owner: `docs/output.md#published-materials-and-historical-v2`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > accepts exactly the five canonical sets and positive grammar variants`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > enforces owning record-type field contracts beyond the generic record schema`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > rejects invalid Core Check projections even with a recalculated catalog fingerprint`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > rejects focused mutations with locations and detects reversible generated drift`
Proves:
- Independent docs validator checks checked-in current schemas/examples, Core Check definition and owning record-type field contracts, and v3 set relationships without importing the production validator; focused definition mutations prove that its accepted set stays aligned with the Product validator.

## Case AUX-DOCS-HISTORICAL-MACHINE-V2-001: Historical v2 schema bytes remain archival only
Owner: `docs/output.md#published-materials-and-historical-v2`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|historical v2 machine schemas > keeps the retired run and record schema bytes under their explicit historical path`
Proves:
- Explicit historical validation fixes the preserved v2 run/record schema bytes under the archival path without making them a current runtime or consumer contract.

## Case AUX-QUALITY-ANNOTATION-001: Direct consumer validates the v3 two-file set
Owner: `docs/script-tooling.md#quality-annotation-consumer`
Entities:
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > accepts the complete v3 set, defaults, filtering, and limit matrix`
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > fails closed for argument, set read, decoding, framing, syntax, schema, and invariant errors`
Proves:
- Annotation accepts `[artifact-directory] [limit]`, reads `run.json` and `records.ndjson`, and invokes only the shallow Product v3 set validator before rendering.
- Invalid argument, read, decoding, framing, schema or relationship input yields exit `2`, actionable stderr and zero partial commands.
