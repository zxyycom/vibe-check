---
title: 在 package 中交付当前 machine contract 材料
status: archived
alignment: aligned
createdAt: 2026-08-28T15:05:30Z
purpose: 让 package consumer 从同一安装版本取得 machine v4 说明、schemas 与可验证示例。
background: Package Run 默认可以发布 machine files，但当前安装包没有交付 output owner、current schemas 或 artifact examples。
decision: Package 随当前 API 和 runtime 交付 consumer-oriented output guide、两份 v4 schema 与四组 current examples。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让启用 machine publication 的 package consumer 不需要回到 repository source tree，便能取得与安装 runtime 精确匹配的当前输出契约和代表性 bytes。
- 让 package candidate、tarball 与外部安装验收共同证明 README、output guide、schemas、examples 和 runtime 属于同一版本化产品单元。
- 保持 README 是唯一 package 总入口，不新增 output index 或把 repository 历史材料当作当前消费契约。

## 背景

- 当前 package 已交付 README、深入 API mechanism 和七份 Check guides，但 `docs/output.md`、`docs/schemas/vibe-check-run.schema.json`、`docs/schemas/vibe-check-record.schema.json` 与 `docs/examples/artifacts/**` 不在 candidate 中。
- `run.json` 与 `records.ndjson` 是 fingerprint-bound complete two-file set；单独 schema validation 不能证明两份 bytes 属于同一 generation，examples 也不能替代 consumer 自己的版本和 trust boundary。
- 现有 `docs/output.md` 同时包含 consumer contract、repository implementation 和历史 schema 说明。直接复制而不分层会把 package 用户的阅读重心移向内部维护路径。

## 决策

- 采用: Package README 作为唯一总入口直接链接 `docs/output.md`；该文档先完整说明 consumer 读取、字段、complete-set validation 与安全边界，再把 repository implementation notes 降级为明确的维护章节。
- 采用: 当前 package material 精确包含 `docs/output.md`、`docs/schemas/vibe-check-run.schema.json`、`docs/schemas/vibe-check-record.schema.json`，以及 complete passed、complete failed with Record、legitimate not-applicable 和 unavailable 四组 `docs/examples/artifacts/**` files。
- 采用: Package 只交付 current machine v4 材料；historical v2 schemas、repository validators、generation scripts、fixtures 和测试不是 consumer package material。Output guide 明确区分未随包交付的 repository history。
- 采用: Package artifact 使用显式 material registry读取这些 checked-in owner files，纳入 candidate fingerprint、staging allowlist、tarball audit、installation audit 与 external consumer documentation acceptance；不得依赖 manifest 宽泛 `files` glob 偶然带入。
- 采用: Schemas 证明各文件的结构，complete-set fingerprint 与 ordering 规则证明两文件关系。当前交付不因此新增 public artifact reader、unchecked cast helper 或第二 machine DTO；built-in Check final-data parsers也不验证 artifact bytes。
- 采用: README、output guide、schemas、examples、runtime 与 declarations 由同一 exact package version 发布和验收；材料变化使旧 candidate receipt 失效并要求重新构建。
