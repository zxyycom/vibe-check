# Design

本 Design 定义本地 npm candidate 如何由 repository `quality` 真实消费，并把 candidate 明确交接给后继完整 Project Gate；它不把 package candidate、gate replacement、registry release 或 repository command adapter 混为同一责任。

## Context

### Candidate 的交付角色

[Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md) 是跨 Change 的唯一导航视图。本 Plan 只证明一个 candidate 的本地交付闭环：clean build/staging、pack、repository-quality dogfood 与 isolated exact-tarball consumer。

controls 与 lifecycle feedback 是可独立推进的 public-contract Change。本 Plan 可以在它们完成前开始；但 candidate handoff 只能代表其构建时的 public package closure。任一上游 contract 变化后，必须重新审计、pack 并运行 consumer evidence，才能把 candidate 交给 Gate build。

当前事实：root `package.json` 为 private；Product CLI 仅是 migration diagnostic；`quality` 是唯一 dogfood root entry；其 definition 和 bound Run 仍直接导入 `src/product/**`。已归档的 [`unify-check-authoring-and-execution`](../archive/unify-check-authoring-and-execution/) 已提供 authoring/execution handoff。本 Plan 在实现前必须完成 current-owner audit 并刷新自身基线。

### Terms used by this Plan

| Term | Meaning |
| --- | --- |
| **candidate** | 从 clean staging 构建、pack 并可本地安装的 `vibe-check` artifact；它不是 registry release 或名称控制权声明。 |
| **repository-quality consumer** | `scripts/quality/` 持有的 Project Definition、bound Run 与 caller；它针对本仓库运行，但必须通过 public package API 使用 Product。 |
| **built package import** | `import "vibe-check"` 经 package manifest 的 built entry 和 declarations 解析；它不是 TypeScript path alias、relative source import 或 workspace fallback。 |
| **exact-tarball consumer** | 位于 repository import paths 之外的 Bun installation；它只能使用一个 packed candidate、其 declared runtime dependencies 和显式外部 prerequisites。 |
| **candidate handoff** | `candidate-handoff.md` 中可供 Gate build、cutover 与 release 恢复的 candidate identity、验证结果、支持边界与待重新核验条件。 |

### Consumer path

```text
Product/current-contract owners
  -> clean build and staging
  -> candidate tarball

scripts/quality/project-definition.ts --public authoring import--> Project Definition
scripts/quality/project-run.ts -----------public run/type import--> bound project Run
scripts/quality/index.ts --locked tools--> pure scan adapter ------> bound project Run

exact-tarball installation
  -> same repository-quality Definition and bound Run
  -> package run against repository root
```

Only `run(definition, controls)` executes Product work. The repository consumer continues to own policy, repository root binding, scanner locations and caller exit mapping.

## Goals / Non-Goals

### Goals

- Build one Bun-importable candidate containing matching runtime, declarations, manifest and declared runtime dependency closure.
- Make `quality` a continuous consumer of the package public entry, not Product source paths.
- Prove both required views of the same candidate: repository dogfood through the built entry, and isolated exact-tarball installation.
- Keep scanner prerequisites explicit in Check options and preserve the current Product/consumer ownership boundary.
- Produce one concise release handoff rather than repeat release assumptions across candidate artifacts.

### Non-Goals

- Registry reads/writes, credential access, package publication, final public version selection or legal-release completion.
- New Product execution interfaces: no public CLI/bin, configuration discovery, extra scheduler, Node direct runtime, plugin API or compatibility/subpath surface.
- Changes to Check/Run/Task/Core semantics, output meaning, repository quality policy or the responsibility of `scripts/quality/index.ts`.

## Decisions

### 1. Build a package boundary before moving the consumer

The candidate build produces the public runtime entry and declarations first. Repository-quality then imports only `vibe-check` from that entry. The root `quality` command may coordinate a package build, but `scripts/quality/index.ts` remains a locked-tool adapter and `scripts/quality/scan.ts` remains a pure process adapter.

A bare import that resolves to source through an alias does not satisfy this decision. The built entry is the only permitted development dogfood path.

### 2. Use two complementary consumer checks

Repository dogfood makes the real `quality` workflow continuously exercise the public API. Exact-tarball acceptance independently installs the artifact outside repository resolution paths and runs the same Definition/Run against the repository root.

Both checks are required because the first catches integration drift in normal work, while the second catches source, symlink and workspace-runtime leakage that self package resolution can hide.

### 3. Keep the public API and host boundary single-purpose

The public runtime exports are exactly `defineConfig`, `defineCheck`, `inherit` and `run`; the public ordinary values are `duplicateDetection`, `fileMetrics` and `functionMetrics`; public types follow the aligned current-contract owner. No Core, Task, scheduler, scanner adapter, binding, internal subpath or legacy adjustment API crosses the package boundary.

The candidate supports Bun direct import. It owns the existing filesystem, Git, subprocess, cache, progress/logging and canonical-output closure. Project functions continue to execute in the caller Bun runtime.

### 4. Keep scanner configuration with the consumer and Check

Each default Check owns its scanner options and missing-prerequisite behavior. repository-quality may explicitly configure its repository `jscpd` executable, but the package must not discover repository mise, workspace devDependencies or legacy environment precedence. An unavailable declared prerequisite follows the existing typed outcome path.

### 5. Derive one candidate and hand it to Gate build

Staging is derived from authoritative owners and rebuilt cleanly; it is never hand-maintained. The exact tarball used for artifact audit is also the tarball installed for consumer acceptance.

After all candidate verification passes, this Plan writes `candidate-handoff.md`. That file records artifact identity, public inventory, consumer evidence, tested Bun/platform and scanner prerequisites, known limitations, and facts that Gate build, cutover and the later release Change must freshly verify. The candidate does not claim public version, complete gate replacement or registry availability.

### 6. Defer gate completion, release-side actions and CLI retirement

This Plan makes no registry side effect. The Gate-build successor owns repository-gate construction and consumer integration of separately established invocation controls/lifecycle feedback; the cutover successor owns formal entry replacement and legacy verifier retirement. The later release Change owns registry identity, actual version, legal materials, publish authorization, `npm publish`, registry-install verification and the decision to remove the retained Product CLI after full replacement evidence exists.

## Risks / Trade-offs

- **Built import can mask leakage:** the exact-tarball run is mandatory because self package resolution alone cannot prove artifact independence.
- **Real consumer has normal effects:** acceptance must isolate or clean cache, logs and artifacts without changing the Definition/Run path.
- **Scanner executables are external:** the package stays honest only if consumer configuration and missing-prerequisite behavior are tested at the installed boundary.
- **Gate then release are later stages:** separating local package proof, Gate build/cutover and external write lowers release risk but makes `candidate-handoff.md` and the later gate handoff required, reviewable contracts.

## Open Questions

No open question blocks candidate implementation. Core gate coverage belongs to the Gate-build Draft; invocation controls and lifecycle feedback belong to their preceding Product-contract Drafts; formal replacement belongs to the cutover Draft; registry authority, exact public version, copyright/legal material, publish mechanism and external-write authorization belong to the later release Draft.
