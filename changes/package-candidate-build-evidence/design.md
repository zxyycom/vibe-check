# Design

本设计以一个集中 path contract 把可查看的 package build evidence 从本地 cache 中抽离，同时保留当前 candidate preparation 的严格复用和安装验证。

## Context

当前 `scripts/package/candidate/receipt.ts` 同时分配 staging、tarball、receipt 与 tsbuildinfo；`preparePackageCandidate` 及 Project Gate 将该 staging 路径作为 typed acceptance input。`build/` 已被忽略且尚无 owner，根 `artifacts/` 已属 machine/quality outputs，不能复用。`publish-readable-esm-package-layout.md` 已对齐，要求 package 保留可读 `dist/esm`、types、maps 和 `src`，不允许以 bundle 或新增格式替代。

## Goals / Non-Goals

- Goals：默认输出可发现、单一且完整；cache 只保留可复用状态；状态、构建与完整验收入口清晰且 fail-closed；测试 fixture 仍隔离。
- Non-Goals：不创建根 `dist/`，不使用 Rollup，不改 package physical content 或 public export，且不改变 third-party runtime dependency 安装方式，不发布或写入 registry。

## Decisions

### Intended Change

在 package build contract 中集中 default `build/package`、`build/artifacts` 和 `.cache/vibe-check/package-candidate` paths。preparation 只将 receipt 与 tsbuildinfo 写入 cache；rebuild 精确清理并重建 build-owned package/artifact paths，reinstall/reuse 验证同一 receipt 指向的 build evidence。`package:status` 只评估并报告 candidate version、freshness、unpacked path、tarball path 与可验证 installed entry；非 current 状态退出失败而不变更文件。`package:build` 执行现有 prepare action 并输出结果；`package:verify` 调用 full Project Gate，作为现有 complete package acceptance。

### Resulting Impacts

- CandidateReceipt 不再以 state-directory containment 证明 artifact/staging，而以 contract-owned build paths 验证；receipt schema 会递增以拒绝旧路径状态。
- Project Gate 的 typed candidate fact 仍传递 artifact、staging/unpacked evidence、digest 和 installed entry，只改变其默认物理位置。
- 每个 direct fixture 显式设置 state 与 build roots，保证不污染默认 output；新增测试覆盖 cache/output 分离、status 不写入和 command semantics。
- 稳定 package tooling/test owner 明确 default paths、cache boundary、命令及 full Gate 绑定。

## Risks / Trade-offs

- 删除旧 cache-owned candidate 会使首次运行重建；这是有意的 receipt schema/path hard cut，避免复用不可查看的旧 artifact。
- status 无法将失效安装伪装为 current；它只报告经验证 entry，调用者应运行 build 修复。
- `package:verify` 的 full Gate 耗时较长，但避免第二套 acceptance 实现或结果标准。

## Open Questions

无。
