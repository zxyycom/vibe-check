# Proposal

完成 Product owner 收敛与 prestable output hard cut。

## Why

前一轮路径与公开契约曾错误聚合共享 I/O 与 cache，虽然 cache 实际只服务 duplicate detection。本 Change 以真实生命周期替换该过渡模型。

## Outcome

Current Product source has distinct Check settlement, Project Run, Run outputs, Check-owned cache, shared JSON document, and package tooling inventory owners. The prestable public contract is `ProjectOutputs`/`output`; the former shared-I/O model has no compatibility path.

## Scope

### Intended Change

Use `src/check-settlement/`, `src/project-run/`, `progress-rendering/`, `package-checks/json-document/`, and `scripts/docs/package-api/`. Run owns only `outputs.machinePublication` and `outputs.progressRendering`; duplicate detection owns its `{ enabled, directory }` cache options. ID, dependency-reference, settlement-reason-reference and message-code validation retain only their real non-empty, uniqueness and reference constraints; message codes are not restricted to kebab case.

### Resulting Impacts

Current Product/docs/schema/examples/tooling/tests/Cases/Decisions state the same hard cut. Output failure retains final facts and status; cache read failure is a duplicate Check-local miss and cache write failure settles that Check unavailable. Archived Changes are not rewritten.

## Success Criteria

- No Product shared-I/O owner, global Check context cache, old result branch, or retired generic public type remains.
- Machine publication and progress rendering have explicit output statuses and deterministic failure diagnostics.
- Package projection, candidate, Cases, Change and Decision evidence agree with current paths and public contract.

## Affected Owners

`src/**`、`docs/**`、`scripts/docs/package-api/**`、package candidate、Cases 与 Decision collection。
