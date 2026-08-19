# Design

本 Change 将项目治理记录从已失配的上游 Skill 契约迁到当前版本，同时保留既有长期判断和用户工作区内容。

## Context

`decision-records` 已更新至 version 29：它要求 `docs/decisions/` 的 active 决策直接位于根目录、archived 决策位于 `archive/`，以 Markdown basename 作为稳定 Decision ID，用 `tags` 而非 domain catalog 分类，并生成 definition version 6 的索引。当前集合有 114 条记录（41 active、73 archived）、75 条关系、五个 domain 目录，且 basename 没有冲突；用户明确指定旧 domain 变为 tag。`investigation-report` 已更新至 version 17，当前仅需从 definition version 4 重建 `docs/investigations/investigation-index.json` 为 version 5。

当前工作区已有与本 Change 无关的未提交内容，部分决策 Markdown 和 Change artifacts 也在其中。迁移必须移动并改写原文件，而不还原、覆盖或丢弃这些内容。

## Goals / Non-Goals

- 将全部既有决策的路径、frontmatter、关系目标和派生索引迁为当前 `decision-records` 契约。
- 将每条记录的原 domain 一对一保留为唯一 tag，并删除不再合法的 domain catalog。
- 修复受移动影响的 Markdown 链接、项目适配器类型与治理说明；建立一条已对齐的长期决策记录说明该分类选择。
- 通过当前 decision、investigation、链接、类型和目标工作区验证。
- 不改变既有决策正文的实质判断、生命周期或关系语义，不建立旧格式兼容层，不暂存、提交或归档无关工作。

## Decisions

- 以原目录名作为 tag：`configuration`、`product-contract`、`product-priority`、`testing`、`workflow-policy`。它们不再是集中注册的领域或路径层级。
- active 记录移动到 `docs/decisions/<decision-id>`，archived 记录移动到 `docs/decisions/archive/<decision-id>`；旧 relation target 的路径转换为仅含 basename 的 Decision ID。
- 由上游 CLI 重建两个派生索引，不手工维护索引的 source revision、keys 或 schema version。
- 新的分类判断通过单独 Decision Record 保存，避免直接重写已建立决策的实质方向。

## Risks / Trade-offs

- 扁平化会使旧相对链接失效；迁移前生成完整 source-to-target 映射，并在移动后运行文档链接与决策检查。
- 新 Skill 不提供旧格式兼容读取；迁移必须一次完成，不能保留旧目录或 domain catalog 作为运行时 fallback。
- 现有未提交决策内容必须随文件移动保留；任何路径冲突或不满足前提的记录会停止迁移，而非猜测处理。

## Open Questions

无。用户已明确指定旧 domain 变为 tag；调查侧只重建派生索引，不改变报告正文。
