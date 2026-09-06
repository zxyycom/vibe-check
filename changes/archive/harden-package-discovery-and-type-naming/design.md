# Design

本设计只扩大经审定的类型命名表面和 package discovery metadata，不增加 runtime capability、subpath export 或未设计主页。

## Context

Vibe Check 以 Node 作为当前 package 运行宿主，并从 package root 提供完整程序化 Gate 能力。进入本 Change 时，GitHub description 仍写 Bun，generated npm manifest 没有 description/keywords；部分 supporting declarations 虽可通过上层结构使用，却不能直接从 root import。用户已确认 npm 与 GitHub description 应一致、核心定位是通用 TypeScript Gate，并进一步澄清 Node 只属于运行前提，不能被写成被检查项目的限制。

## Goals / Non-Goals

目标是改善 registry/repository discovery 与 TypeScript helper authoring，同时保持唯一 root import 边界。非目标是新增 homepage、修改 GitHub topics、公开内部 runtime modules、批量导出 declarations、增加 CLI/Gate adapter，或改变 Check/Run 行为。

## Decisions

### Intended Change

共同 description 使用“通用 TypeScript 质量门禁工具，提供可组合 Check、类型安全 API 和结构化结果。”；Node 只在 package host/engine 事实中表达，不暗示被检查项目必须使用 Node。npm keywords 由 manifest contract 提供稳定小集合。Supporting types 只在已有 public signature 与真实 caller-owned helper/configuration 场景需要直接命名时增加 root export，并进入 current public inventory 与 direct-import acceptance。审计确认的最小集合为 `CheckDependencies`、`RunOutputStatus`、`RunOutputStatuses`，以及 `JsonSchemaIdentity`、`JsonSchemaIdentityMode`、`JsonSchemaReferenceSource`、`JsonSchemaReferenceResolution`、`RegisteredJsonSchema`、`JsonSchemaInstanceBinding`。

### Resulting Impacts

Description 和 keywords 成为 generated manifest 的 closed required fields；README 承接完整用户定位，GitHub 只更新 description，不触碰既有 homepage 或 topics。新增 type-only exports 不改变 runtime export inventory，但会扩大声明 public surface，因此必须由 public inventory、package API docs 和 exact installed consumer 验证。`DependencyReadResult`、`DependencyObservation` 与专用 diagnostic logging 子状态没有独立 consumer authoring 场景，继续只通过上层类型推断；本次审计不移除或重新分类既有公共类型。

## Risks / Trade-offs

过多 type exports 会冻结内部拆分，过少则继续迫使消费者复制嵌套 shape；以公共签名闭包和独立命名场景作为边界。Discovery 文案若各处手写可能漂移，因此 package contract 保存精确值、测试核对 manifest，README 与 GitHub 通过语义和实际回读验证。短描述不携带 Node host 会减少环境提示，但避免把运行前提误写成项目适用范围；精确 Node 要求继续由 manifest engines 与安装说明承担。中文 npm description 与 package consumer 文档的既有语言方向一致。

## Open Questions

无。
