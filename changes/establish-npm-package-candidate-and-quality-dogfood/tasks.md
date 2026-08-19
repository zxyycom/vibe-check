# Tasks

Complete the package candidate in dependency order: refresh current facts, build one public artifact, move the real repository consumer across the boundary, verify the exact tarball, then write a Project Gate handoff. Completed checkboxes preserve evidence already established before this reorganization.

## Readiness

- [x] 0.1 Confirm the enduring package direction: unscoped `vibe-check`, Bun direct import, API-only entry and project-owned bound Run; separate local candidate delivery from later registry publication.
- [x] 0.2 Re-plan against [`unify-check-authoring-and-execution`](../archive/unify-check-authoring-and-execution/): use recursive Check values, `defineCheck`, `inherit`, native composition, direct structured execution and Check-owned scanner options.
- [x] 0.3 Fix the candidate public inventory from [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md): four callable functions, three ordinary default Check values and the approved named type roots.
- [x] 0.4 Define the two consumer checks: built-package repository dogfood and exact-tarball installation using the same repository-quality Definition/Run, with no source/workspace runtime fallback.
- [ ] 0.5 Re-audit current Product, package and `scripts/quality` owners; confirm active Changes do not conflict with this split, then refresh this Plan baseline before implementation.

## Implementation

- [ ] 1.1 Define candidate build inputs from current owners: public inventory, Bun support, manifest fields, declared runtime dependencies and local candidate identity. Do not assign registry authority, public version or legal-release completion here.
- [ ] 1.2 Before changing tests or Cases, use `test-evidence-review` to map API/Run evidence, repository-quality consumer evidence and later CLI-retirement evidence.
- [ ] 1.3 Build the API-only public runtime entry and declarations. Export only the approved functions, default values and types; exclude internal/wildcard subpaths and legacy aliases.
- [ ] 1.4 Close the Bun runtime required by the public entry—filesystem, Git, subprocess, cache, progress/logging and canonical output—without changing Check/Run semantics or exposing host seams.
- [ ] 1.5 Make installed scanner prerequisites explicit and truthful: use Check options plus existing typed unavailable/configuration results; prohibit package fallback to repository mise, workspace devDependencies and legacy environment precedence.
- [ ] 1.6 Build deterministic clean staging and create one local candidate with `npm pack --json`; keep root private and prevent staging from becoming a second source of truth.
- [ ] 1.7 Add candidate audits for entry resolution, declarations, runtime closure, artifact allowlist, no `bin`, no install-time network effect and no source/workspace material leakage.
- [ ] 1.8 Migrate `scripts/quality/project-definition.ts` and `scripts/quality/project-run.ts` to public `vibe-check` imports. Coordinate package build outside `scripts/quality/index.ts`; retain its locked-tool/pure-scan responsibility.
- [ ] 1.9 Install the exact candidate tarball into an isolated Bun consumer and run the same repository-quality Definition/Run against the repository root. Isolate normal effects and prove package-runtime independence.
- [ ] 1.10 Write `changes/establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md` with candidate identity, public inventory, consumer evidence, tested support/prerequisite facts, known limitations and Project-Gate/release conditions that require fresh verification. Retain Product CLI and perform no registry action.

## Verification

- [ ] 2.1 Compare current-contract owner, candidate manifest, runtime entry, declarations and repository-quality imports; prove the approved public inventory and absence of legacy/project-path exports.
- [ ] 2.2 Run relevant Product authoring, Definition, Run and default-Check tests through the public projection; prove no config loader, second scheduler, source binding or result reinterpretation was introduced.
- [ ] 2.3 Typecheck and execute both consumer checks, covering recursive authoring, `defineCheck`, `inherit`, default values and native scanner/threshold composition.
- [ ] 2.4 In the installed consumer, verify declared/default/missing scanner prerequisite behavior, exact inputs, cache identity and absence of package-runtime fallback to repository/mise/environment sources.
- [ ] 2.5 Verify Project Run → Package Run behavior for direct execution, Records/reference, structured outcomes, dependency/mutex/cap, effects, failures, cancellation and concurrency using repository-quality or focused acceptance where appropriate.
- [ ] 2.6 Repeat clean build and pack; audit the exact candidate tarball for runtime/declarations/artifact closure and absence of tests, credentials, cache, logs, artifacts, source fallback and undeclared runtime material.
- [ ] 2.7 Run affected Product/package/quality tests, typecheck, lint, `bun run test-evidence -- check --root .`, `bun run decisions -- check`, `bun run validate`, both Change checks and `bun run verify:vibe-check-workspace:required`.
- [ ] 2.8 Run `bun run verify:vibe-check-workspace:full` and candidate-backed repository-quality dogfood. Complete `candidate-handoff.md`, recording successful local evidence and explicitly recording that no registry query, credential access or `npm publish` occurred.
