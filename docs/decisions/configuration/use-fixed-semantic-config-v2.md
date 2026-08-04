---
title: 将文件政策契约升级为固定配置 v2
status: active
alignment: unaligned
createdAt: 2026-08-04T15:02:12Z
purpose: 用明确版本边界承载文件覆盖和可组合功能政策，避免静默改变既有配置含义。
background: 当前固定 v1 是完整且封闭的文档，加入 overrides 和 optional feature sections 已构成新的公共配置契约。
decision: 采用 single-active 固定 semantic config v2，并对 file-backed v1 提供明确拒绝和迁移诊断。
relations:
  - type: 修订
    target: configuration/use-fixed-semantic-config-version.md
---

## 目的
- 让项目配置版本准确标识一套完整、封闭且可验证的语义契约，而不是在相同版本下逐步改变字段含义。
- 让文件覆盖和后续格式能力共享一个公共配置 owner，同时保持迁移结果明确、可审阅和可复现。

## 背景
- Semantic config v1 固定为 `"1"`，并把完整 field tree、neutral default、runtime/editor schema 和 `init` 生成物作为同一契约维护。
- 加入 required override collection、optional-but-complete feature sections 和对应 resolution semantics 会改变合法文档集合及运行行为，无法作为不改变版本的兼容扩展。
- 同时维护 v1/v2 reader 或从 neutral default 静默补齐旧文件，会延长双重语义并让 gate 的实际政策无法从文件本身恢复。

## 决策
- 采用: 新文件政策契约固定使用 semantic config `version: "2"`；runtime schema、editor schema、neutral default、canonical example 与 `init` 生成物原子切换到同一版本。
- 采用: File-backed v1 在 scan work 前以稳定迁移诊断拒绝；不提供 dual reader、宽松 unknown-field 吸收或执行时自动升级。
- 采用: 现有 core check sections 继续完整存在；后续 feature sections 可以 optional，但一旦存在就必须满足自己的 complete closed shape。
- 采用: Config v2 仍保持 product-semantic、scanner-tool-neutral，并继续遵守显式配置优先级与 gate 的 file-backed policy 要求。
