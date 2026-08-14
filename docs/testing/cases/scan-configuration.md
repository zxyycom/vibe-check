# scan-configuration

## Case WB-PROJECT-DEFINITION-001: Project Definition and Package Run
Owner: `docs/architecture.md#核心定位`
Entities:
- `bun|src/product/current-public-contract.test.ts|current public contract > owns exactly the definition-facing names, defaults, and operational identifiers`
- `bun|src/product/project-definition.test.ts|Project Definition > creates a plain value with product-owned authoring defaults`
- `bun|src/product/project-definition.test.ts|Project Definition > validates closed definitions and controls without reflecting sensitive values`
- `bun|src/product/project-definition.test.ts|Project Definition > separates frozen declarative data from function bindings and fingerprints neither binding`
- `bun|src/product/run.test.ts|Package Run > rejects invalid closed controls before project applicability or runner functions`
- `bun|src/product/run.test.ts|Package Run > requires the definition itself before any project function`
- `bun|src/product/run.test.ts|Package Run > uses the validated named policy and keeps function bindings out of its result`
- `bun|src/product/run.test.ts|Package Run > calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it`
- `bun|src/product/run.test.ts|Package Run > does not call a TaskPlan factory for an unselected or not-applicable Check`
- `bun|src/product/run.test.ts|Package Run > closes requiresChecks through the existing catalog before shared execution`
- `bun|src/product/run.test.ts|Package Run > prepares a required built-in selected through the Check dependency closure`
- `bun|src/product/run.test.ts|Package Run > observes cooperative cancellation after input validation and before planning work`
Proves:
- Project Definition is a closed plain TypeScript value; Package Run validates it and closed controls before work, keeps bindings out of public data, and delegates applicable work to existing scheduling owners.
