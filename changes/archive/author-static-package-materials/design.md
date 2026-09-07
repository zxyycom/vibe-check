# Design

定义 static manifest、动态 version 投影及独立 audit 在 package lifecycle 中的责任边界。

## Context

artifact builder 同时供 local candidate 与 formal release 使用。稳定包元数据不是编译派生材料，但 candidate/release version、runtime emit、source maps 与 receipt 是。

## Goals / Non-Goals

目标是单一 static owner、root isolation 与 version-only projection；不改变 runtime、其他静态 package materials 或发布流程。

## Decisions

### Intended Change

`release-manifest.json` 是稳定字段（含 discovery metadata、dependencies、exports、files 与 publish metadata）的唯一 authoring owner。其 version 必须是无效发布 semver sentinel `<candidate-version>`。`manifest.ts` 从调用者给定的 `repositoryRoot` 读取并 parse，先直接审计 source，再 clone 并只替换 version 写入 staging。

artifact fingerprint 显式散列该 JSON 的 repository-relative path 和 bytes；不再散列第二份 TypeScript dependency object。install/runtime evidence 为 Ajv/jscpd 从同一 source 取得 declared requirement，仍对实际 consumer-resolved package/bin 作独立校验。

### Resulting Impacts

staging、tar、receipt reuse、formal receipt 与 installed dependency probes 必须消费该 root-bound source。source/projection equality 不代替安全审计：审计闭合字段、package identity、license/legal material、engine/repository/publish target、root-only exports、files 和合法非空 dependency map，拒绝 private、bin、scripts 等额外字段。

## Risks / Trade-offs

固定 target strings 和 legal identity pins 保留为独立 package safety/receipt contract，而不再作为 manifest authoring source。不会为每个其它文本建立 static file。

## Open Questions

无阻塞开放问题；后续静态材料迁移须另立 Change。

## Implementation Observations

- 独立正确性审查确认静态来源、显式 root、version-only 投影、原始 JSON 字节指纹及 staging/tar/installed/formal 审计接线一致；未发现实质阻断。此为内部 authoring 调整，未改变产品 API 或用户运行方式，因此只更新内部 lifecycle 与对应 Case，不改随包 API 指南。
- 最终优化代理修正 lifecycle 中“generated manifest”的歧义，明确为 version 投影后的 staging manifest；代码的 reader、projector、audit 和 installed dependency probe 各有具体职责，未增加或要求无必要抽象。
- 2026-09-07 最终独立 `bun run check -- --all` 通过：candidate `0.0.0-local.d77a0b2917db`，36/36 passed，0 failed/not-applicable/unavailable，20.6s。日志标识为 `2026-09-07T09-51-12.420Z-276119-1e28e330-4e19-4de4-bc5d-220f0d29eff4`；package artifact 及外部 consumer 的类型、文档、运行验收均被选择并通过。
- 另运行 `bun test scripts/package/release/release.test.ts scripts/package/release/command.test.ts`：5 passed；`package:status` 为上述 candidate/current，Decision、Investigation 与 active Change 集合检查通过。正式 release 只运行 fixture/command tests，未重建用户 release staging、执行发布或扩大 cold bootstrap 修复范围。
