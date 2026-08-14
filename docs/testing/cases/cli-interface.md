# cli-interface

## Case BB-CLI-LEGACY-MIGRATION-001: Legacy Product CLI fails closed with migration guidance
Owner: `docs/cli.md#legacy-migration-boundary`
Entities:
- `bun|src/product/cli.test.ts|legacy Product CLI requests return one actionable migration diagnostic without work`
Proves:
- Former scan and init requests return the configuration exit, point to a TypeScript Project Definition and bound project Run, do not reflect legacy arguments, and create no cache or artifacts.
