# TypeScript/Bun product source

This directory is the Vibe Check-owned product source. It was established by
mechanically lifting the existing TypeScript/Bun scanner and its checked-in
tests into the repository product boundary. No Rust source, test, fixture, or
behavior was used as migration input.

## Pinned provenance

- Consumer repository revision
  `eae25aee64a5b4ecef4b02e8e86d8d39c4ab122d` supplied
  `scripts/quality/scan.ts`, `scripts/quality/args.ts`, and
  `scripts/quality/config.ts`. They now live at the root of this directory.
  Its `scripts/tools/bun-test.d.ts`, referenced by the pinned quality-core
  test configuration, now lives at `quality-core/bun-test.d.ts` as test-only
  support.
- quality-core revision
  `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` supplied its complete
  `src/**` and `test/**` trees. They now live under `quality-core/`.
- foundation revision
  `f593edbf55fd03be7db54ef44a38d0a9feda4dbd` supplied the statically
  reachable helper files under `foundation/src/`.

The consumer files and test declaration were read from commit-qualified
objects in this repository. quality-core and foundation were read from their
exact commits in the local submodule object databases under
`.git/modules/scripts/tools/`; their worktrees and unqualified branch tips
were not used.

The pinned quality-core tree has no separate fixture directory. Its
`test/config.ts` support fixture and inline scanner samples remain in the
copied source and test trees.

## Extracted foundation closure and product extension

The product foundation file set is:

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

`foundation/src/index.ts` exports the mechanically reduced surface imported by
quality-core plus the project-owned `Option` primitive. Consumer code imports
`args.ts`, `errors.ts`, and `type-guards.ts` directly. Unused modules from the
pinned foundation revision, package metadata, tests, and `json/value.ts` were
not copied.

## Ownership and lift adjustments

Vibe Check now owns the copied source and tests in this repository. Product
runtime imports must resolve within `src/product/**` or to declared external
packages; they must not resolve through `scripts/**` or a toolkit gitlink.

The lift uses two review categories:

1. Byte-preserved sources:
   - quality-core `src/**` and `test/**`;
   - the consumer `scripts/tools/bun-test.d.ts` declaration;
   - the 14 copied foundation helper files other than `foundation/src/index.ts`.
2. Repository integration adjustments:
   - consumer imports now resolve inside `src/product/**`;
   - scan execution is exposed as `runScan(projectRoot, argv)`, while top-level
     command routing and error/status mapping live in `cli.ts`;
   - CLI help names the formal `product:cli` entry;
   - the dogfood config replaces retired Rust/Cargo source areas and accepted
     warnings with the `src/product/**` source area, without changing the
     pinned threshold, profile, scanner, warning, baseline, artifact, or
     status algorithms;
   - `foundation/src/index.ts` exports the product runtime closure and the
     preinstalled product-owned `Option` primitive;
   - `foundation/src/option.ts` uses an explicit readonly field assignment
     instead of a constructor parameter property to satisfy this repository's
     `erasableSyntaxOnly` type policy;
   - `scripts/quality/scan.ts` remains only as a repository-root wrapper around
     the product CLI.

Provenance reviews should compare byte-preserved files with the commits above
and treat only the listed integration adjustments as expected differences.
Any other source or behavior difference requires an independently reviewed
change.
