# report-output

## Case WB-OUTPUT-MACHINE-V4-CONTRACT-001: Machine v4 publication contract

Owner: `docs/output.md#check-facts-to-machine-projection`
Entities:

- `bun|src/machine-output/v4/publication.test.ts|machine publication v4 contract > projects four terminal Check outcomes and minimal supplemental Records`
- `bun|src/machine-output/v4/publication.test.ts|machine publication v4 contract > serializes a complete canonical two-file set that validates without a prefix`
- `bun|src/machine-output/v4/validation.test.ts|machine publication v4 validation > rejects v3 identities and malformed v4 rows`
- `bun|src/machine-output/v4/validation.test.ts|machine publication v4 validation > rejects mixed generations, composite duplicates, and unknown owners`
  Proves:
- v4 publishes four Check terminal states, final data only on passed/failed states, and minimal `{ checkId, id, data }` supplemental Records.
- Complete-set validation rejects v3 and malformed/mixed input, closes composite identity/order and ownership, binds the complete Record set by fingerprint, and exposes no partial trusted prefix. The unchanged final-data projection remains the v4 compatibility boundary; version-matched provider-parser readback is package-consumer evidence, not a second machine contract.

## Case WB-OUTPUT-PUBLISHED-MATERIALS-001: Generated v4 publication materials remain canonical

Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:

- `bun|src/machine-output/v4/contract-materials.test.ts|machine publication v4 materials > serializes candidate bytes accepted by the current schemas`
  Proves:
- Runtime v4 serializer candidates are accepted by the current runtime schemas, without publishing a second contract-material helper.

## Case WB-OUTPUT-PUBLICATION-LIFECYCLE-001: Publication lifecycle closes candidates before trusted paths

Owner: `docs/output.md#publication-lifecycle-and-trust-boundary`
Entities:

- `bun|src/machine-output/v4/lifecycle.test.ts|machine publication v4 lifecycle > preserves prior artifacts when candidate writing fails before replacement`
- `bun|src/machine-output/v4/lifecycle.test.ts|machine publication v4 lifecycle > preserves prior artifacts when the first canonical rename fails`
- `bun|src/machine-output/v4/lifecycle.test.ts|machine publication v4 lifecycle > cleans a partial replacement and retired artifacts without creating raw output`
  Proves:
- A candidate-write failure before replacement preserves prior canonical and retired artifact bytes, clears owned temps, preserves unrelated files, and creates no scanner-private `raw/` output.
- A first canonical-rename failure preserves that same prior set and cleans owned temps before any canonical replacement.
- A handled partial replacement removes canonical files, retired human artifacts, and owned temps without touching unrelated files or creating scanner-private `raw/` output.

## Case WB-OUTPUT-RUN-PROGRESS-001: Product projects Check execution progress for people

Owner: `docs/output.md#progress-and-presentation-boundaries`
Entities:

- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > maintains a TTY-only running region and assigns completion ordinals by settlement order`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > keeps plain and dumb-terminal output append-only and settled-only`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > applies the settled visibility matrix consistently in plain and dumb terminals`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > hides only attention passed rows after clearing TTY running rows and writes each visible block atomically`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > formats every terminal status with measured duration or not run and only the safe reason code`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > uses ANSI color only for message level labels on color-capable TTY writers`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > renders an empty final TTY running region after zero-Check or fully settled progress`
- `bun|src/project-run/progress-rendering/renderer.test.ts|Package Run progress lifecycle presentation > propagates writer failures without swallowing them or attempting later writes`
- `bun|src/project-run/progress-rendering/terminal-statuses.test.ts|Package Run progress terminal statuses > renders a duration-bearing row for an executed not-applicable Check without a reason`
- `bun|src/project-run/progress-rendering/terminal-statuses.test.ts|Package Run progress terminal statuses > renders a duration-bearing row for an executed unavailable Check`
- `bun|src/project-run/progress-rendering/terminal-statuses.test.ts|Package Run progress terminal statuses > renders unstarted cancellation as execution-cancelled and not run`
- `bun|src/project-run/progress-rendering/timing.test.ts|Package Run progress timing > uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations`
Proves:

- Product-owned progress presents lifecycle status, measured duration or `not run`, controlled reason codes, and accepted terminal messages from Run facts only; it does not derive presentation from final or Record data. A visible settled row and author-ordered message lines form one atomic block, while a message code is not terminal text.
- `attention` omits only a passed/no-message settled row, never a running row or accounting ordinal. TTY running rows use a single monotonic elapsed interval and heartbeat; plain/dumb output stays settled-only and append-only. Capability-specific color applies only to level labels, human text is terminal-escaped, and writer failures remain observable.

## Case AUX-DOCS-MACHINE-ARTIFACTS-001: Independent v4 example acceptance

Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:

- `bun|scripts/validation/documentation/machine-artifacts/validation.test.ts|independent docs machine artifact validation > accepts exactly the current v4 examples and positive JSON grammar variants`
- `bun|scripts/validation/documentation/machine-artifacts/validation.test.ts|independent docs machine artifact validation > rejects historical v2/v3 and focused v4 set mutations without a partial accepted set`
- `bun|scripts/validation/documentation/machine-artifacts/validation.test.ts|independent docs machine artifact validation > detects generated schema and example drift`
  Proves:
- The independent docs validator accepts only checked-in v4 schemas/examples and closes v4 framing, schema, canonical JSON finite-number safety, composite identity/order, ownership and complete-set fingerprint invariants without importing the Product validator.

## Case AUX-DOCS-HISTORICAL-MACHINE-SCHEMAS-001: Current v4 example validation rejects historical machine identities

Owner: `docs/output.md#published-materials-and-historical-schemas`
Entities:

- `bun|scripts/validation/documentation/machine-artifacts/validation.test.ts|independent docs machine artifact validation > rejects historical v2/v3 and focused v4 set mutations without a partial accepted set`
  Proves:
- The current docs artifact validator rejects v2 and v3 run/Record schema identities; it accepts current v4 artifacts only.

## Case WB-OUTPUT-MAINTENANCE-REMINDER-001: Maintenance reminders use the generic v4 final-data row

Owner: `docs/output.md#维护提醒评估数据`
Entities:

- `bun|src/package-checks/maintenance-reminders/maintenance-reminders.test.ts|maintenance reminders > publishes one generic final-data Check row without Records or messages`
  Proves:
- A due advisory maintenance reminder publishes exactly one ordinary `maintenance-reminders` passed Check outcome with its ordered assessment final data. It publishes no supplemental Records, entry-level machine rows, terminal messages, or visibility fields.
