# Design

本 Design 只拥有 API-only Bun package 的 projection、installed host、artifact、acceptance 与 Product CLI hard cut；Check/Run semantics 全部从 `unify-check-authoring-and-execution` 的最终事实单向消费。

## Context

### Authority

| Concern | Owner | This Change |
| --- | --- | --- |
| recursive Check、direct execution/results、inheritance、defaults、Task/Core handoff | [`unify-check-authoring-and-execution`](../unify-check-authoring-and-execution/) and its stable owners | consume after completion; do not redefine |
| public function/value/type inventory | [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/product-contract/expose-recursive-check-authoring-and-run-surface.md) and current-contract source | project exactly |
| Bun-only host and one versioned package | active product-contract decisions | implement and verify |
| staging, manifest, declarations, tarball and installed acceptance | this Change | own completely |
| legacy Product CLI removal | this Change | execute only after replacement gate |
| registry publish | external authorization | not performed here |

Current repository facts remain: root `package.json` is private, Product CLI only emits a migration diagnostic, and repository callers use a bound Project Run. The upstream Change is active; therefore this Plan may be maintained and audited now, but package implementation starts only after its handoff gate passes.

### Stable terms

| Term | Meaning |
| --- | --- |
| **Project Definition** | ordinary TypeScript value containing recursive Checks, policy, scheduler and effects |
| **Package Run** | package `run(definition, controls)`; the only package function that executes Product work |
| **project Run** | consumer-owned wrapper that binds its Project Definition; not a package export |
| **default Check value** | `duplicateDetection`, `fileMetrics` or `functionMetrics`; an ordinary complete Check object |
| **candidate** | built, packed and verified package artifact; not automatically published |
| **exact-tarball consumer** | temporary Bun project that can access only the candidate tarball, declared dependencies and explicit prerequisites |

### Consumer path

```text
project-definition.ts
  -> defineConfig / defineCheck / inherit
  -> Project Definition

separate caller
  -> project Run (consumer-owned)
  -> run(Project Definition, Run Controls)
  -> Product runtime
  -> Check functions through generic Task graph
```

No configuration discovery, reload, function serialization, whole-invocation worker or third package operation is inserted into this path.

## Goals / Non-Goals

### Goals

- Ship one Bun-importable version containing matching runtime, declarations, public inventory and required assets.
- Close filesystem, Git, subprocess, cache, output and external scanner prerequisites for an installed consumer.
- Generate or single-directionally verify public artifacts from current owners.
- Prove the real two-file consumer pattern with an exact tarball and a separate caller.
- Delete the retained Product CLI only after the API replacement is installable.
- Produce deterministic, allowlisted, traceable and unpublished `0.0.x` MIT candidates.

### Non-Goals

- Alter upstream Check/Run/Task/Core/policy/output semantics.
- Provide `replace`, `append`, TaskPlan, operational dependency maps or compatibility aliases.
- Fix consumer-owned project file names or wrapper APIs.
- Support Node direct runtime, dual runtime, `bin`, plugin APIs or whole-process isolation.
- Authenticate to or write to a package registry.

## Decisions

### 1. Upstream handoff is a hard gate

Before package implementation:

1. `unify-check-authoring-and-execution` has all tasks complete and is archived or otherwise handed off as an implemented stable fact;
2. its source/tests/docs/decisions agree on the final inventory;
3. no active conflicting Change still requires `BuiltInCheck`, `replace` / `append`, TaskPlan or operational dependency maps;
4. this Plan is rechecked against current owners and its baseline refreshed.

Until then, tasks may audit package requirements but must not create provisional exports or declarations.

### 2. Exact public surface

Runtime callable exports:

1. `defineConfig` — forms a Project Definition value;
2. `defineCheck` — contextual-typing identity helper;
3. `inherit` — creates a parent-relative scheduling collection expression;
4. `run` — executes Product work.

Runtime non-callable values:

- `duplicateDetection`
- `fileMetrics`
- `functionMetrics`

Named type exports exactly follow the upstream inventory decision. There is one recursive `Check` family. `BuiltInCheck`, `CustomCheck`, `CheckGroup`, `CheckNode`, TaskPlan types, adjustment/patch types and operational dependency types are not compatibility exports.

Manifest has no `bin`, wildcard subpath or internal source path export.

### 3. Installed usage uses ordinary values

The canonical acceptance shape is:

```ts
import {
  defineCheck,
  defineConfig,
  fileMetrics,
  inherit
} from "vibe-check";

const strictFiles = defineCheck({
  ...fileMetrics,
  dependsOn: inherit({ add: ["compile"] }),
  options: {
    ...fileMetrics.options,
    scanner: {
      ...fileMetrics.options.scanner,
      executable: "/opt/tools/scc"
    }
  }
});

export default defineConfig({
  checks: [{
    checkId: "repository-quality",
    displayName: "Repository quality",
    maxParallel: 2,
    checks: [strictFiles]
  }]
});
```

The project Run imports this value and calls package `run`; another caller imports only the project Run. Example paths are not package contract values.

### 4. Check-owned external prerequisites

Scanner executable and arguments are in each default Check options. Installed acceptance overrides them through native object spread when the test fixture uses controlled executables.

The package does not read old `operationalDependencies`, `VIBE_CHECK_*_CMD` precedence, repository mise paths or workspace devDependencies. A default executable that is unavailable returns the upstream typed Check-unavailable reason. Adapter protocol, exact-input validation and safe raw-output handling remain package-private.

The support matrix must state which executable defaults and OS/architecture combinations the exact tarball actually proves. Install lifecycle performs no network download.

### 5. Bun host and effects

The first package supports Bun direct import only. The host provides the current Product runtime's filesystem, Git, subprocess, cache, progress/logging and canonical output needs. Package-private seams do not become plugin APIs.

Project functions execute in the caller Bun runtime. The package does not claim isolation from `process.exit`, global mutation, synchronous loops or non-cooperative cancellation.

Structured Run results remain the owner of configuration, planning, cancellation, execution and effect status. Gate results are not converted into a package CLI exit code.

### 6. One current source drives artifacts

The current public-contract source owns package name, runtime exports/values/types, effect defaults, version candidate, Bun/platform support, system prerequisites and consumer map. Build projects or compares:

- public entry and declarations;
- candidate manifest and export map;
- MIT/license files;
- docs/examples and acceptance fixtures;
- inventory, provenance and digest.

Staging is derived and rebuilt cleanly. It is never a second hand-edited owner.

### 7. Exact-tarball acceptance

Acceptance:

1. builds a clean staging tree and packs it once;
2. creates a secure temporary Bun project outside repository import paths;
3. installs only that exact tarball, declared dependencies and explicit prerequisites;
4. typechecks standalone/nested `defineCheck`, `inherit`, ordinary default values and native scanner/threshold overrides;
5. runs a Project Definition through a project Run from a separate caller;
6. proves direct custom execution, Record/reference reporting, completed/not-applicable/unavailable outcomes, dependency/mutex/cap behavior, effects and cancellation;
7. audits runtime exports, declarations, manifest, filesystem access and dependency resolution;
8. confirms no workspace source, symlink, repository script or devDependency supplied the result.

The same tarball is used for inventory and execution evidence.

### 8. Product CLI hard cut

Only after runtime, declarations, host, dependencies, effects and exact-tarball acceptance pass, delete the retained Product CLI migration diagnostic, its tests/support and `product:cli` script. Repository commands remain under `scripts/**` and call the bound project Run.

No forwarding shim, deprecated `bin` or dual Product entry remains.

### 9. Pack is not publish

The candidate uses unscoped `vibe-check`, SPDX `MIT` and a unique increasing `0.0.x` version. `npm pack`, local install and verification do not establish registry authority or publish success. Real `npm publish` requires separate authorization and fresh registry/authentication/version checks.

### 10. Gate evidence

| Gate | Required evidence |
| --- | --- |
| Upstream handoff | completed upstream Change, aligned stable owners, final public inventory and target tests |
| Public API | exact four callable functions, three default values and upstream named type inventory |
| Host/dependencies | exact-tarball Bun/platform/prerequisite execution without repository fallbacks |
| Artifact | repeatable staging, manifest, declarations, MIT files, allowlist, provenance and digest |
| Consumer | Project Definition + bound project Run + separate caller using ordinary Check APIs |
| CLI cut | installable replacement evidence precedes deletion |
| Release | pack/verify only; no registry credential access or external write |

## Risks / Trade-offs

- **Upstream dependency:** package work waits for a stable implemented Check contract; this avoids publishing provisional compatibility layers.
- **Caller-runtime code:** functions and closures remain simple but can affect the caller process.
- **External tools:** explicit Check options improve ownership but require truthful prerequisite docs and installed-host tests.
- **Derived staging:** adds a build layer; one owner, clean rebuild and exact-tarball audit prevent drift.
- **No Product CLI:** projects regain command ergonomics only through their own project Run adapters.
- **Prestable releases:** any `0.0.x` update may be breaking; release materials require exact version pinning guidance.

## Open Questions

无产品或架构开放问题。Exact Bun/platform support, prerequisite delivery and next `0.0.x` version are implementation evidence values owned by Readiness/Verification tasks, not placeholder API choices.
