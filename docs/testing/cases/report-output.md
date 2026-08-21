# report-output

## Case WB-OUTPUT-MACHINE-V4-CONTRACT-001: Machine v4 publication contract
Owner: `docs/output.md#core-to-machine-projection`
Entities:
- `bun|src/product/quality-core/output/publication-v4/publication-v4.test.ts|machine publication v4 contract > projects four terminal Check outcomes and minimal supplemental Records`
- `bun|src/product/quality-core/output/publication-v4/publication-v4.test.ts|machine publication v4 contract > serializes a complete canonical two-file set that validates without a prefix`
- `bun|src/product/quality-core/output/publication-v4/publication-v4.validation.test.ts|machine publication v4 validation > rejects v3 identities and malformed v4 rows`
- `bun|src/product/quality-core/output/publication-v4/publication-v4.validation.test.ts|machine publication v4 validation > rejects mixed generations, composite duplicates, and unknown owners`
Proves:
- v4 publishes four Check terminal states, final data only on passed/failed states, and minimal `{ checkId, id, data }` supplemental Records.
- Complete-set validation rejects v3 and malformed/mixed input, closes composite identity/order and ownership, binds the complete Record set by fingerprint, and exposes no partial trusted prefix.

## Case WB-OUTPUT-PUBLISHED-MATERIALS-001: Generated v4 publication materials remain canonical
Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:
- `bun|src/product/quality-core/output/publication-v4/publication-v4.contract-materials.test.ts|machine publication v4 materials > generates current schemas and independently valid candidate bytes`
Proves:
- Runtime v4 schema and example candidates are canonical independently valid publication materials, not a second machine contract.

## Case WB-OUTPUT-PUBLICATION-LIFECYCLE-001: Publication lifecycle closes candidates before trusted paths
Owner: `docs/output.md#publication-lifecycle-and-trust-boundary`
Entities:
- `bun|src/product/quality-core/output/publication-v4/publication-v4.lifecycle.test.ts|machine publication v4 lifecycle > pins two-file candidate and handled-failure lifecycle stages`
- `bun|src/product/quality-core/output/publication-v4/publication-v4.lifecycle.test.ts|machine publication v4 lifecycle > removes retired reports and leaves no canonical set after handled partial replacement`
Proves:
- Candidate validation and every temp write precede canonical replacement; a handled preparation failure preserves the prior set, while a handled partial replacement removes canonical and retired human artifacts without touching unrelated files.

## Case WB-OUTPUT-RUN-PROGRESS-001: Product projects Check execution progress for people
Owner: `docs/output.md#progress-and-presentation-boundaries`
Entities:
- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > maintains a TTY-only running region and assigns completion ordinals by settlement order`
- `bun|src/product/run/progress.test.ts|Package Run progress lifecycle presentation > keeps plain and dumb-terminal output append-only and settled-only`
- `bun|src/product/run/progress-terminal-statuses.test.ts|Package Run progress terminal statuses > renders a duration-bearing row for an executed not-applicable Check without a reason`
- `bun|src/product/run/progress-terminal-statuses.test.ts|Package Run progress terminal statuses > renders a duration-bearing row for an executed unavailable Check`
Proves:
- Product-owned progress presents lifecycle status/duration and controlled reason codes from Run facts only; it does not derive presentation from final or Record data.

## Case AUX-DOCS-MACHINE-ARTIFACTS-001: Independent v4 example acceptance
Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > accepts exactly the current v4 examples and positive JSON grammar variants`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > rejects v3 and focused v4 set mutations without a partial accepted set`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > detects generated schema and example drift`
Proves:
- The independent docs validator accepts only checked-in v4 schemas/examples and closes v4 framing, schema, composite identity/order, ownership and complete-set fingerprint invariants without importing the Product validator.

## Case AUX-DOCS-HISTORICAL-MACHINE-SCHEMAS-001: Historical v2 schemas remain archival only
Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > detects generated schema and example drift`
Proves:
- Historical v2 schema bytes are not current runtime or consumer contracts; v3 has no retained publication path, and current docs validation reads only v4 schemas and examples.
