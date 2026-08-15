# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Project Definition and Package Run
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/current-public-contract.test.ts|current public contract > owns exactly the definition-facing names, defaults, and operational identifiers`
- `bun|src/product/project-definition.test.ts|Project Definition > creates a plain value with product-owned authoring defaults`
- `bun|src/product/project-definition.test.ts|Project Definition > accepts direct built-ins and normalizes nested inherited tree scheduling`
- `bun|src/product/project-definition.test.ts|Project Definition > provides frozen chainable built-in adjustments without expanding defaults`
- `bun|src/product/project-definition.test.ts|Project Definition > rejects unknown descriptor adjustments without reading accessors or freezing inputs`
- `bun|src/product/project-definition.test.ts|Project Definition > validates closed definitions and controls without reflecting sensitive values`
- `bun|src/product/project-definition.test.ts|Project Definition > separates frozen declarative data from function bindings and fingerprints neither binding`
- `bun|src/product/run.test.ts|Package Run > rejects invalid closed controls before project applicability or runner functions`
- `bun|src/product/run.test.ts|Package Run > requires the definition itself before any project function`
- `bun|src/product/run.test.ts|Package Run > uses the validated named policy and keeps function bindings out of its result`
- `bun|src/product/run.test.ts|Package Run > calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it`
- `bun|src/product/run.test.ts|Package Run > does not call a TaskPlan factory for a not-applicable Check`
- `bun|src/product/run.test.ts|Package Run > flattens group dependencies before shared execution`
- `bun|src/product/run.test.ts|Package Run > uses only explicit mutex constraints to serialize direct and TaskPlan leaf work`
- `bun|src/product/run.test.ts|Package Run > prepares built-ins present in the tree before a dependent custom Check`
- `bun|src/product/run.test.ts|Package Run > observes cooperative cancellation after input validation and before planning work`
Proves:
- Project Definition is a closed plain TypeScript value; its direct built-in/custom Check tree accepts Product-issued frozen descriptor adjustments while rejecting unknown patches, accessors, and lookalike methods without mutating caller input, validates inherited scheduling metadata before work, canonicalizes equivalent descriptor data for fingerprints, keeps bindings out of public data, and delegates applicable work to existing scheduling owners.
