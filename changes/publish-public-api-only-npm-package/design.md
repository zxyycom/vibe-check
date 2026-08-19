# Design

本 Draft 将已完成的 candidate-backed Project Gate 变成一个公开 npm release；它把 candidate/gate handoff、外部状态核验、明确授权、publish 和发布后安装验证组织为不可跳过的顺序，而不复制前序 Change 的实现责任。

## Context

### Release sequence and authority

| Step | Owner | Required input | Evidence required before the next step |
| --- | --- | --- | --- |
| 1. Candidate and gate handoff | [`establish-npm-package-candidate-and-quality-dogfood`](../establish-npm-package-candidate-and-quality-dogfood/) + [`replace-workspace-verifier-with-project-gate`](../replace-workspace-verifier-with-project-gate/) | exact tarball, `candidate-handoff.md`, `gate-handoff.md`, complete Project Gate consumer evidence | package artifact, public contract and core gate use are independently verified |
| 2. Release preparation | this Change | current candidate/gate handoff and active package decisions | release plan identifies exact external checks, public materials and post-publish acceptance |
| 3. External checks and publish | this Change, with fresh user authorization | registry authority, authenticated publisher, unused exact version and final artifact | only explicitly authorized reads/writes occur; publish binds the reviewed artifact |
| 4. Post-publication acceptance | this Change | published exact version | isolated Bun consumer installs from registry and repeats public import/type/runtime acceptance |

The candidate Change owns runtime implementation, staging, local pack and repository-quality dogfood. Gate build owns Check/adapter construction and controls/feedback consumer integration; Gate cutover owns the authoritative repository entry and legacy verifier retirement. This Draft owns public distribution only. The cross-Change route is summarized in [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md), while this Design owns the release procedure below. Existing package decisions provide direction, not present facts: [`complete-project-gate-before-public-package-release`](../../docs/decisions/complete-project-gate-before-public-package-release.md), [`release-one-versioned-npm-product-unit`](../../docs/decisions/release-one-versioned-npm-product-unit.md), [`publish-unscoped-vibe-check-publicly`](../../docs/decisions/publish-unscoped-vibe-check-publicly.md), [`license-package-under-mit`](../../docs/decisions/license-package-under-mit.md), [`support-bun-as-the-package-host`](../../docs/decisions/support-bun-as-the-package-host.md), [`use-programmatic-api-as-product-entry`](../../docs/decisions/use-programmatic-api-as-product-entry.md) and [`keep-prestable-package-releases-on-0-0-x`](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md).

This Change remains a Draft because candidate evidence, live registry facts, copyright details and external-write authorization do not yet exist. A Draft is not permission to contact npm or publish.

## Goals / Non-Goals

### Goals

- Convert one verified candidate-backed Project Gate into a public, versioned npm product unit without changing its tested runtime/public contract.
- Establish the exact authorization, registry, identity, legal-material, artifact-binding and post-publication checks required for an irreversible public release.
- Verify the published exact version through an isolated Bun consumer before treating public distribution as complete.
- Evaluate Product CLI retirement only after the published package replacement has passed the required evidence.

### Non-Goals

- Rebuild package runtime, change Check/Run/Task/Core semantics, or use registry work to compensate for missing candidate evidence.
- Imply Node.js or dual-runtime support from npm distribution, or add a public CLI/bin, configuration discovery, plugin API, compatibility alias or extra export surface.
- Read credentials, query registry state, reserve a version, configure Trusted Publishing or run `npm publish` without fresh, scoped user authorization.

## Decisions

### 1. Candidate-backed full gate handoff is the release gate

This Change starts only with completed candidate and full-gate handoffs. The release artifact must be traceable to the exact tarball and public inventory that passed repository-quality, Project Gate replacement and isolated-consumer acceptance. A source-only build, a different rebuilt tarball or a synthetic-only fixture cannot substitute for that evidence.

### 2. Preparation, external checks and publish are distinct operations

Local release planning may prepare documents and validation commands. Before any registry read or credential access, obtain current user authorization for that precise operation. Before `npm publish`, obtain a separate authorization that names the exact version, access level and artifact. A decision record or a completed Plan never substitutes for either authorization.

### 3. Publication owns public identity and legal completion

The release Change resolves and verifies the unscoped public name, access level, exact `0.0.x` version, MIT license text and verified copyright holder/year, README/install guidance, Bun support statement, provenance/digest and release notes. A local candidate identity does not establish any of these facts.

### 4. Registry installation is the final delivery proof

A successful publish response is insufficient. An isolated Bun consumer must install the exact registry version, typecheck the public entry and execute the established public runtime acceptance. The published result must match the candidate inventory and declared support/prerequisite boundary.

### 5. Retire the legacy Product CLI only after replacement evidence

The retained migration diagnostic remains until the published API-only package is available and its replacement path has passed post-publication acceptance. CLI removal is a release-side change, not a prerequisite for candidate dogfood.

## Risks / Trade-offs

- **Irreversible public state:** version, access and package identity are difficult to retract; separating authorization from preparation and publish keeps each action reviewable.
- **Live registry uncertainty:** active decisions do not prove name authority, credentials or version availability; fresh checks may block release.
- **Artifact drift:** release preparation must bind publish and post-publish tests to the reviewed candidate, rather than silently rebuilding a different package.
- **Public contract cost:** `0.0.x` limits compatibility assumptions but does not remove the need for accurate exports, declarations, installation guidance or host boundaries.

## Open Questions

- At release time: registry authority, authenticated publisher, exact available version, verified copyright holder/year and approved publish mechanism.
- After candidate handoff: whether all conditions for legacy Product CLI retirement are met.
