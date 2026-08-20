# foundation

TypeScript helpers for this repository's development scripts.

## Scope

This repository directly tracks `foundation` as a private pnpm workspace package. It is not a
published npm package, does not have a separate checkout or upstream pin, and is not a Product
runtime dependency. The ownership and import boundary are defined by
[脚本工具](../../../docs/script-tooling.md#工具来源).

## Use

Development scripts import source from `scripts/tools/foundation/src`. Use `src/index.ts` for
helpers exported by the barrel; import a focused source module when the helper is intentionally
not exported there. Do not infer a public package or `exports` contract from these source imports.

The package provides process, Git, path, filesystem, JSON, CSV, NDJSON, argument, error, and
type-guard helpers.

## Checks

Run these commands from this directory:

- `bun run format` (writes format targets)
- `bun run format -- check` (checks only)
- `bun run typecheck`
- `bun run lint`
- `bun run test`

The format and lint commands reuse the repository-root Oxfmt and Oxlint configuration. The
root development workflows and full Project Gate are documented in
[脚本工具](../../../docs/script-tooling.md#验证入口).
