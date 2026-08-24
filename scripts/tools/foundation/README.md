# Foundation scripts source

`scripts/tools/foundation` contains shared TypeScript helpers for this repository's development
scripts. It is ordinary repository source, not a pnpm workspace package, published npm package,
separate checkout, or Product runtime dependency. The ownership and import boundary are defined
by [脚本工具](../../../docs/script-tooling.md#工具来源).

## Use

Development scripts import source from `scripts/tools/foundation/src`. Use `src/index.ts` for
helpers exported by the barrel; import a focused source module when the helper is intentionally
not exported there. These source imports do not define a public package or `exports` contract.

The helpers cover process, Git, path, filesystem, JSON, CSV, NDJSON, argument, error, and
type-guard boundaries.

## Assurance

Foundation has no package-local commands or independent Gate identity. Root workspace checks own
its evidence: `bun run typecheck -- scripts`, `bun run lint -- scripts`, and `bun run format -- check`
cover its source and tests; `bun run test-evidence -- check --root .` discovers and executes its
`*.test.ts` files and checks their semantic Cases. Run these root commands (also documented in
[脚本工具](../../../docs/script-tooling.md#验证入口)), not a command from this directory.
