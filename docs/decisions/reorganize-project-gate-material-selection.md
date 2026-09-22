---
title: 按 repository-material 责任组织 Project Gate 材料选择
id: 260922-reorganize-project-gate-material-selection
status: active
alignment: aligned
createdAt: 2026-09-22T16:14:25Z
purpose: 让 Project Gate 与 workspace validation 使用 canonical materials 入口和 Check identity。
background: 现有 docs preset 与 docs-* identity 无法表达 JSON、schema、examples 与 links 的 repository-material 责任边界。
decision: 将当前材料入口切换为 materials，并以 materials-* identity 承接直接材料 Check；历史记录保持形成时语义。
tags:
  - documentation
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: 260915-delegate-project-gate-direct-presets-to-effective-selection
    summary: 采用 materials preset 与 identity
---

## 目的

- 让 repository-material owner、workspace validation 和 Project Gate 共享可恢复的材料责任词汇。
- 让 focused selection、诊断、mutex 与测试证据使用同一 `materials` preset 和 `materials-*` identity。

## 背景

- 当前入口名为 `docs`，但实际覆盖 JSON、schema、machine examples、report examples 和 links；调用者无法从 identity 恢复输入边界。
- 纯 JSON 文档使用 package `jsonValidation` constructor；schema inventory、publication drift 和 machine artifact 集合仍由仓库 material validator 拥有。

## 决策

- 采用: workspace 只接受 `materials` 及已命名 task；旧 `docs` 参数作为非法参数失败，完整 `bun run validate` 仍运行全部材料与布局校验。
- 采用: Project Gate preset 改为 `materials`，材料 Check identity 使用 `materials-json-validator`、`materials-schema-validator`、`materials-schema-publication-validator`、`materials-examples-validator` 与 `materials-links-validator`。
- 采用: workspace 的独立 Product Run 与 Gate 分别复用公共 `jsonValidation` constructor；Gate 也复用 `jsonSchemaValidation`。schema inventory/publication drift、machine artifact 和 links diagnostics 继续由各自 repository-material provider 负责，不建立嵌套 Gate Run。
- 采用: 归档 Decision、历史日志和形成时测试材料保留其原始 `docs` identity；当前源码、测试和 owner 文档使用新词汇。
