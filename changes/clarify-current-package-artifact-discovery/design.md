# Design

复核现有入口后，以“不增加新机制”结束当前包定位评审；保留事实与误登记更正的依据。

## Context

当前 [Package lifecycle](../../docs/tooling/package-lifecycle.md#local-candidate-lifecycle) 与 `scripts/package/build-contract.ts` 规定 `build/package/` 为 local unpacked evidence，`build/artifacts/` 为 versioned tarballs；`bun run package:status` 已报告 freshness/path。`build/release-package/` 是独立 formal staging。前轮 package:status 为 current，不等于旧目录已清理，也不保证正式 release 是最新版本。

直接 owner：[Package lifecycle](../../docs/tooling/package-lifecycle.md)、`scripts/package/build-contract.ts`、`scripts/package/command.ts`、candidate status/tests。

## Goals / Non-Goals

明确发现任务、freshness 解释与包身份对应；现有 status/文档入口已满足这些目标。不新增 latest 链接、第二套路径或额外状态文件，不改正式发布授权。

## Decisions

### Intended Change

2026-09-07 按实际 `bun run package:status` 复核：候选 `0.0.0-local.afada4b41fc8` 为 `current`，
unpacked path 为 `build/package/`，tarball 为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.afada4b41fc8.tgz`，
installed entry 为 `scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`。这次读数是形成时证据，不是未来默认版本。
因此保留现有入口与 ownership，不安排实施任务。旧材料窄清理及 fixture 隔离结果见[已归档清理记录](../archive/clean-obsolete-generated-artifacts/proposal.md)。

### Resulting Impacts

无产品实现影响；只纠正本 Draft 与协调入口的登记状态。现有 current/stale 与 receipt/artifact/installed validation 继续由 package lifecycle 拥有。

## Risks / Trade-offs

看起来更方便的副本、symlink 或 latest 文件会形成第二事实源和竞态；必须从 exact receipt/artifact 恢复身份，而不能按 mtime 猜『最新』。

## Open Questions

当前定位需求没有待决产品问题。旧生成产物处置在独立 Change 中推进；归档须取得明确授权，并通过正式生命周期入口。

本轮授权为记录与考虑方案；未批准产品实施、删除、发布或归档。设计确认后再形成 Plan 与 tasks。
