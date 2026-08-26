# Design

本 Change 以真实 owner 完成 prestable hard cut；它不保留旧路径或旧结果分支的 compatibility layer。

## Context

本轮直接修订第一阶段 layout Decision。实现把普通 Check contract、Project Definition、Check settlement、Project Run、machine publication、package Checks、shared JSON document 和 package API tooling 各自放到唯一 owner；historical Change 不作为 current contract。

## Goals / Non-Goals

目标是让目录、public declarations、machine-v4 schema、README/examples、candidate、tests/Cases 与 active Change/Decision 都表达同一个真实模型：Run 仅拥有 machine publication 和 progress rendering 两项 outputs；duplicate detection 独占 cache。非目标是新增 CLI、subpath、global cache、global logs output、generic shared-IO abstraction 或任何旧 API alias。

## Decisions

### Intended Change

- `src/check/` owns `CheckDescriptor`、authoring、树解析和 executable Check identity；ID、dependency reference、settlement reason reference 与 message code 分别只验证其真实 non-empty/unique/reference obligation，不强制无业务含义的 kebab-case。
- `src/check-settlement/` owns Check/Record terminal facts、validation 与 session；`Check facts` 是领域事实名称，不是 source owner 路径。
- `src/project-definition/` owns Definition and output defaults/validation. `src/project-run/` owns controls, context, execution, scheduler, completion/result, machine publication and `progress-rendering/`.
- `ProjectDefinition.outputs`、`RunControls.outputs` 和 `RunResult.outputs` use only `machinePublication` and `progressRendering`. Any output failure returns `kind: "output"` with final facts where available; no retired shared-IO public type, old result branch, or obsolete owner directory remains.
- duplicate-detection options own `{ enabled, directory }` cache configuration. Read I/O failure is a Check-local miss; write failure settles only duplicate detection unavailable. Project context, Run controls and Run result have no cache capability.
- `src/package-checks/json-document/` owns strict JSON shared by JSON Checks; `scripts/docs/package-api/public-api-inventory.ts` owns package/docs/candidate inventory. `src/data-boundary/` owns canonical immutable data.

### Resulting Impacts

- Current source, tests, scripts/package artifact/candidate tooling, layout validation, docs, schemas, examples and Case entities use final paths and output terminology.
- `src/index.ts` keeps the same intentional root inventory, but its public types use the new output contract; there is no prestable compatibility alias.
- The formal successor Decision records the owner/layout refinement; the output/cache judgment separately succeeds the prior shared-IO Decision. Implementation did not implicitly archive this Change; archival followed a separate user authorization after completion review.

## Risks / Trade-offs

A hard cut can leave stale generated package material, Case entities, or external consumer declarations. Target tests cover output failure and Check-local cache failure; package projection, candidate validation, decision/change checks and the full Gate close the cross-owner boundary.

## Open Questions

None.

## Implementation Observations

- Final directories are `check/`, `check-settlement/`, `data-boundary/`, `machine-output/v4/`, `package-checks/`, `project-definition/`, and `project-run/`; old `checks/`, `definition/`, `core/`, `foundation/`, `output/`, `project-files/`, `run/`, and `scheduler/` source owners are removed.
- `progress-rendering/` names the rendering owner, rather than a generic “progress” capability. `project-run/` retains Run entry, invocation, aggregation, context and result files because the short name denotes the Product Run owner, not a generic helper bucket.
- The implementation itself did not commit, publish, or archive this Change; archival followed the later explicit user authorization recorded by the task that closed it.
