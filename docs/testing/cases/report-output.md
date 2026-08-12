# report-output

## Case WB-OUTPUT-MACHINE-V2-CONTRACT-001: Machine v2 publication contract
Owner: `docs/output.md#当前产品输出`
Entities:
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > derives exact closed DTOs from runtime schemas and one validated publication model`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > serializes canonical JSON and NDJSON and validates the complete two-file set`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > preserves an absent record policy and allows disabled decisions to retain acceptance and views`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > rejects byte schema and cross-file invariant failures without a trusted prefix`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > reuses final Core validation for legal run coverage and canonical snapshot facts`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > closes named-reference identities evidence relations and canonical arrays`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > closes decision identity types canonical arrays and gate evidence state`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > binds reference evidence refs to a published Check/reference evidence pair`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > requires not-evaluated readiness to stop at its unique first failure`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > generates canonical schema and example candidates that validate independently`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > locks shared readable previews annotation set input lifecycle and process mapping`
- `bun|src/product/quality-core/src/output/publication-v2/publication-v2.test.ts|machine publication v2 contract > plans exact prior-v2 stale-v1 report and owned-temp cleanup without touching unrelated files`
Proves:
- Runtime schemas own exact v2 DTO identities, fields, enums and byte grammar; `run.json` and `records.ndjson` validate only as one complete set.
- Machine validation closes final snapshot, record/run/reference/decision relationships and canonical ordering without a partial consumer result.
- Publication model construction rejects mismatched or illegal human status candidates before any trusted projection; readable output and process outcome consume only the frozen model status.
- Resolved report presentation controls title、notice、timestamp time zone、footer、record `topN` 与独立 changed-record watchlist visibility / limit；这些 projection choices 不改变完整 console records、machine bytes、GateResult 或 process outcome。

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

## Case AUX-QUALITY-PRODUCER-ANNOTATION-001: Formal producer reaches the actual annotation CLI
Owner: `docs/testing.md#测试层级`
Entities:
- `bun|scripts/quality/producer-annotation-acceptance.test.ts|producer-to-annotation acceptance > connects formal non-empty, zero-record, and invalid v2 artifact sets to the actual consumer`
Proves:
- Formal Product output supplies non-empty and zero-record v2 sets accepted by the actual consumer; an invalid derived set cannot emit valid-prefix annotations.
