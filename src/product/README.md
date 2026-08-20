# TypeScript/Bun product source

This directory is the Vibe Check-owned product source. This file preserves the
formation-time provenance of its initial TypeScript/Bun lift; it is not the
owner of the current module inventory, runtime behavior, or review contract.
For current owners and reading order, start with the repository
[documentation navigation](../../docs/navigation.md) and
[architecture](../../docs/architecture.md).

## Initial lift provenance (historical)

- Consumer repository revision
  `eae25aee64a5b4ecef4b02e8e86d8d39c4ab122d` supplied
  `scripts/quality/scan.ts`, `scripts/quality/args.ts`, and
  `scripts/quality/config.ts`. These names describe the initial lift input;
  they do not promise current paths or module ownership.
  Its `scripts/tools/bun-test.d.ts`, referenced by the pinned quality-core
  test configuration, now lives at `quality-core/bun-test.d.ts` as test-only
  support.
- quality-core revision
  `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` supplied its complete
  `src/**` and `test/**` trees. They now live under `quality-core/`.
- foundation revision
  `f593edbf55fd03be7db54ef44a38d0a9feda4dbd` supplied the statically
  reachable helper files under `foundation/`.
- parallel-task-runner revision
  `025af7350e2d624eeded23784f411bec5f4a1473` supplied its complete `src/**`
  and `test/**` trees. This is initial-lift provenance, not a claim that the
  current `task-scheduler/` tree retains those files or their bytes.

The consumer files and test declaration were read from commit-qualified
objects in this repository. quality-core and foundation were read from their
exact commits in the local submodule object databases under
`.git/modules/scripts/tools/`; their worktrees and unqualified branch tips
were not used. parallel-task-runner was likewise extracted from its exact
commit-qualified object before its gitlink was removed; its worktree and an
unqualified branch tip were not used.

The pinned quality-core tree has no separate fixture directory. Its
`test/config.ts` support fixture and inline scanner samples remain in the
copied source and test trees.

## Initial foundation closure and product extension (historical)

At the initial lift, the product foundation file set was:

- `args.ts`
- `csv.ts`
- `errors.ts`
- `fs.ts`
- `git.ts`
- `ndjson.ts`
- `option.ts` (repository-owned `Option` primitive)
- `path.ts`
- `process.ts` and `process/*.ts`
- `type-guards.ts`

At that formation point, `foundation/index.ts` exported the mechanically reduced
surface imported by quality-core plus the project-owned `Option` primitive.
Consumer code imported `args.ts`, `errors.ts`, and `type-guards.ts` directly.
Unused modules from the pinned foundation revision, package metadata, tests, and
`json/value.ts` were not copied.

## Initial lift adjustments (historical)

During the initial extraction, reviewers recorded two categories:

1. Byte-preserved sources:
   - quality-core source and `test/**`;
   - the consumer `scripts/tools/bun-test.d.ts` declaration;
   - the 14 copied foundation helper files other than `foundation/index.ts`;
   - task-scheduler `definition/**`, `graph.ts`, `planning.ts`, `scheduler.ts`, and
     `test/index.test.ts`.
2. Repository integration adjustments:
   - consumer imports now resolve inside `src/product/**`;
   - scan execution is exposed as `runScan(projectRoot, argv)`, while top-level
     command routing and error/status mapping live in `cli/index.ts`;
   - CLI help names the formal `product:cli` entry;
   - the dogfood config replaces retired Rust/Cargo source areas and accepted
     warnings with the `src/product/**` source area, without changing the
     pinned threshold, profile, scanner, warning, baseline, artifact, or
     status algorithms;
   - `foundation/index.ts` exports the product runtime closure and the
     preinstalled product-owned `Option` primitive;
   - `foundation/option.ts` uses an explicit readonly field assignment
     instead of a constructor parameter property to satisfy this repository's
     `erasableSyntaxOnly` type policy;
   - `scripts/quality/scan.ts` remains only as a repository-root wrapper around
     the product CLI;
   - the root Product test/typecheck/lint boundaries include
     `task-scheduler/**`, while the moved runner no longer owns a standalone
     package or TypeScript configuration;
   - `task-scheduler/index.ts` imports `parsePositiveInteger` directly
     from the existing Product foundation `args.ts` module because the Product
     foundation barrel deliberately does not expose the broader script argument
     surface used by the pinned runner; and
   - the root toolkit entries, pnpm workspace/lockfile importer, and gitlink
     for the former parallel-task-runner package are removed.

This list records the initial extraction only. It does not assert that current
files are byte-preserved, nor does it define the current module layout or
change-review gate. For current implementation and validation work, use the
[documentation navigation](../../docs/navigation.md) to locate the owner, then
read the [architecture](../../docs/architecture.md) and adjacent source/tests.
