---
title: package consumer 文档以中文叙述为主
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:11Z
purpose: 让直接服务 package consumer 的人读说明以中文承载主要语义，同时保留技术原文与编辑判断。
background: 原决策 ID 使用 public documentation，范围宽于正文实际约束，容易被误读为所有公开材料规则。
decision: README、package entry 与必要 public declarations 采用中文主叙述，不建立全库语言门禁。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 替代
    target: use-chinese-as-primary-language-for-public-documentation.md
---

## 目的

- 让决策名称与实际消费者范围一致，不把 package 说明约束误扩张到所有 public documentation。
- 让中文主叙述保持可读和可审阅，同时为代码、协议、法律与互操作原文保留必要空间。

## 背景

- 当前义务面向 package consumer 可达的 README、package entry、public root JSDoc 及正确使用 API 所需的 supporting declarations。
- 全量字符比例、逐字翻译或覆盖所有 docs/source comments 既不能证明读者结果，也会制造与各材料 owner 冲突的机械门禁。

## 决策

- 采用: 项目拥有、直接服务 package consumer 的 README、package entry 说明、public root JSDoc，以及正确使用 public API 所需的 supporting declaration/field JSDoc，以连续中文叙述承载主要人读语义。
- 采用: “中文为主”按材料读者、用途和上下文作编辑判断；不计算字符比例，不要求逐字翻译或双语镜像，也不建立覆盖所有对外材料的机器门禁。
- 采用: API identifier、代码、字面量、Schema/协议字段、命令、路径、专有名、互操作或法律惯例材料可保留原语言；周围中文在需要时说明其语义和边界。
- 采用: 内部实现注释、历史 provenance 与归档、机器契约，以及不面向 package consumer 的文档不在本规则的机械整改范围内。
- 不采用: 将全部 `docs/**`、源码注释、示例字符串或历史材料一律翻译，或把 package 尚未发布的可用性写成既成事实。
