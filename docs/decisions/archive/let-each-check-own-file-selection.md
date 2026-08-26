---
title: 让每个 Check 完整拥有自己的文件选择
status: archived
alignment: aligned
createdAt: 2026-08-26T02:26:58Z
purpose: 让需要项目文件的 Check 在 options 中拥有完整 selection，并保持 Markdown direct target 为 Link-local policy。
background: 全局 quality scope 使随包 Check 依赖 hidden context，但既有方向要求 file 与 Link target policy 留在 owning Check。
decision: Definition/context 不提供全局 file/code-area policy；每个 Check 拥有 selection，project-files 只提供共同机制。
tags:
  - configuration
  - product-contract
relations:
  - type: 归并
    target: use-check-owned-file-overrides.md
  - type: 归并
    target: define-offline-markdown-link-target-boundaries.md
---

## 目的

- 消除 package-provided Check 对 `ProjectDefinition.quality` 和 hidden `CheckProjectContext.files` 的依赖，让 ordinary external Check 与随包 Check 具有相同的 core context。
- 允许不同 Check 明确选择不同 inputs，并让项目在确需一致时通过可审阅的 TypeScript composition 复用同一 policy。
- 保持 Check-local file overrides、Markdown source selection、direct-target authorization 与安全结果边界，不建立 Product-wide resolver 或 merge grammar。

## 背景

- 原有 `ProjectDefinition.quality` 同时承载 `include`、exclude/generated rules 与 metric code areas；Run 再把 resolved files 注入所有 callbacks。只有随包 Check 的集中 validator 理解这些值，外部 ordinary Check 没有对应特殊路径。
- 已确认的 file override 方向要求 pattern、precedence、threshold 与 merge semantics 留在 producing Check；已确认的 Markdown Link 边界要求 source discovery 与 direct target resolution 分离，并只由 Link options 授权 root-external work。
- 多个 Check 使用相同 file-selection shape 证明 collection mechanism 有真实共性，但不证明所有 Check 必须共享同一个 selection value、code-area model 或领域 policy。

## 决策

- 采用：`ProjectDefinition` 只拥有 ordinary Check tree、scheduler 与 effects；`CheckProjectContext` 只提供 normalized root、cache context 与 invocation `changedFiles`/flags。二者都不提供 `quality`、resolved files 或 code areas。
- 采用：每个需要项目文件的 Check 在自己的完整 closed options 中拥有 `files: { include, excludeDirs, generatedFiles }`，并在自己的 execution entry 验证和消费。不同 Check 的 selection 相互独立。
- 采用：需要 code-area classification 的 metric Check 还在自己的 options 中拥有完整 `codeAreas`。code areas 不成为 arbitrary Check、Definition 或 Core 的公共领域模型。
- 采用：项目若希望多个 Check 使用同一 policy，以普通 TypeScript constant 和 object spread 显式组合；Product 不提供 hidden defaults merge、cross-Check override catalog、precedence engine 或旧 `quality` alias。
- 采用：`src/project-files/**` 只实现 project-root candidate collection、config glob filtering、revision/gitlink helpers、reported-path normalization 与 exact-input membership 等共同机制。调用方每次提供完整 selection；该模块不保存全局 policy，也不识别 Check ID。
- 采用：局部 override、threshold 或 matching 只作用于 owning Check 已选择的 inputs，不能改变其它 Check 的 options、scanner dependency、aggregation 或 output。
- 采用：Markdown Link source 只来自其 own `options.files` selected Markdown paths。root 内但 source-selection 外的 direct target 可做 bounded resolver work，但不成为 source；target 不递归发现 links。
- 采用：Markdown Link 的 `rootExternalTargetMode` 保持 `ignore | report | validate` 三态且默认不读取 root 外路径；directory non-empty、anchor、symlink containment、safe Record material 与零网络边界继续由 Link-local options/execution 拥有。
- 采用：producing Check 以普通 four-state result、final data 与 supplemental Records 表达 file work；invalid selection 为 owning Check 的 `unavailable` / `invalid-options`，collection/read/tool failure 按该 Check 的受控 unavailable semantics 结算。
- 不采用：Product-wide scan scope、global code-area policy、Run 注入 resolved file list、Link target 扩大 source discovery、默认读取任意本机路径，或跨 Check partial patch/merge engine。
