---
title: 让 package 对外说明以中文叙述为主
status: archived
alignment: aligned
createdAt: 2026-08-24T07:23:03Z
purpose: 让项目拥有的 package 对外说明以中文承载主要语义，同时保留必要技术原文和编辑判断空间。
background: 早期 package 文档曾采用中文主叙述，但该方向未进入当前稳定规范或决策，consumer 可达说明仍出现整段英文。
decision: 对 package consumer 的 README 与声明说明采用中文主叙述，以 reviewer 编辑判断维护，不建立全量字符门禁或机械翻译义务。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让 package consumer、维护者和 agent 阅读项目拥有的对外说明时，能以中文直接理解 API 的用途、正确使用方式和边界。
- 在不改变 API、声明形状、代码示例 payload 或 machine contract 的前提下，稳定保留标识符、协议字段、命令和专有名等必要技术原文。
- 防止只要求 public root JSDoc 出现汉字的局部门槛，被误解为对完整 consumer 文档闭包的语言保证。

## 背景

- package README、package entry JSDoc、public root JSDoc 和正确使用 API 所需的 supporting declaration 共同构成 consumer 的人读说明；这些说明的 source prose 由项目拥有，受管示例和 emitted declaration 不改变语言规则 owner。
- 先前 package documentation Change 曾采用中文主叙述，但该判断未进入 active Decision 或 current coding-style；现有 public-root 检查只证明相邻 JSDoc 含有汉字，不能代表完整 consumer 文档闭包。

## 决策

- 采用: 项目拥有、直接服务 package consumer 的 README、package entry 说明、public root JSDoc，以及正确使用 public API 所需的 supporting declaration/field JSDoc，以连续中文叙述承载主要人读语义。
- 采用: “中文为主”由材料的读者、用途和上下文作编辑判断；不按字符比例计算，不要求逐字翻译或双语镜像，也不新增要求所有对外材料必须中文的全面机器门禁。现有 public-root 中文检查只保留为局部证据。
- 采用: API identifier、代码、字面量、schema/协议字段、命令、路径、专有名、互操作或法律惯例材料可保留原语言；周围中文应在需要时说明其语义和边界。
- 采用: 内部实现注释、历史 provenance 与归档、机器契约以及不面向 package consumer 的文档不纳入本规则的机械整改范围；它们只在各自 owner 或任务要求时修改。
- 不采用: 将所有 `docs/**`、源码注释、代码示例字符串或历史材料一律翻译；将有汉字的 root JSDoc 检查升级为字符占比或逐段语言 gate；把 package 尚未发布或未承诺的可用性写成既成事实。
