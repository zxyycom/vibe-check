---
title: 发布前确认内置 Check 与调整 API 名称
status: active
alignment: unaligned
createdAt: 2026-08-15T06:16:25Z
purpose: 让内置 Check values、独立调整 functions 和 Check tree types 使用一套明确且单一拥有的 public names。
background: value-owned methods 退出目标 API，BuiltInCheckDescriptor 也不再准确表达普通内置 Check 数据契约。
decision: 公开契约统一拥有 replace、append、三个内置 value names 与 BuiltInCheck 等类型名称。
relations:
  - type: 修订
    target: product-contract/confirm-built-in-check-value-and-tree-type-names-before-publication.md
---

## 目的

- 让消费者以稳定、可读且可发现的名称导入内置 Check values、调整 functions 与必要 Check tree types。
- 让 runtime entry、declarations、docs、fixtures 和 exact-tarball acceptance 从同一个 current public-contract owner 获得名称，避免示例或内部路径偶然形成兼容承诺。

## 背景

- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 已经是 current definition-facing value names，并将在 package Change 完成后进入安装包 surface。
- 独立调整 API 新增 `replace` 与 `append` 两个顶层 function names；它们需要和 `defineConfig`、`run` 一起进入 exact public function inventory。
- `BuiltInCheckDescriptor` 暗示带行为或来源身份的特殊 carrier，与普通内置 Check 数据模型不符。Check tree 的其它 consumer-facing type names 仍需保持与同一数据契约一致。

## 决策

- 采用: public runtime function names 为 `defineConfig`、`run`、`replace` 与 `append`。前两项分别拥有 Project Definition construction 与 Product Run；后两项拥有内置 Check replacement 与 append。
- 采用: public built-in Check value names 为 `duplicateDetection`、`fileMetrics` 与 `functionMetrics`。
- 采用: 普通内置 Check 数据的 public type name 为 `BuiltInCheck`；必要 Check tree types 继续使用 `CheckGroup`、`CheckNode` 与 `CustomCheck`。只为 supported signatures 和 consumer authoring 所必需的其它类型可以进入 public contract。
- 采用: `src/product/public-contract/current.ts` 完整拥有这些 names、roles 与 package import relation。manifest、runtime entry、declarations、docs、fixtures 和 acceptance 只能从该 owner 派生或单向核对。
- 采用: package candidate 发布前必须核对名称含义、导入方式、declaration inference、并存或迁移成本和 exact export inventory；source filename、example variable、registry availability 或 internal re-export 不替代确认。
- 不采用: `BuiltInCheckDescriptor` compatibility alias、value-owned `.replace/.append` member names、wildcard/internal subpath export、project file paths 或临时 type alias。
