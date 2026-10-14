---
title: 为 Project Gate 启用本地 Markdown 解析缓存
id: 261014-enable-gate-markdown-parse-cache
status: active
alignment: aligned
createdAt: 2026-10-14T08:24:24Z
purpose: 减少完整文档验收的重复解析，同时保留当前输入与目标验证。
background: 完整 Gate 中 Markdown 解析成本较高，用户已允许保存可删除的本地解析材料。
decision: 仅 Gate 显式启用现有 parse-facts cache，公共默认关闭与完整验收保持。
tags:
  - configuration
  - performance
  - workflow-policy
relations: []
---

## 目的

- 减少完整 Gate 文档验收的重复解析，保持新鲜输入、目标授权与完整验收。

## 背景

- Markdown Link 是完整 Gate 的主要成本之一；现有 Product 已提供显式 parse-facts cache。
- 用户允许 Gate 将链接地址、标题 slug 和位置写入 Git 忽略、可删除的本地目录。
- 该选择是 Gate 的仓库配置，不改变 Product 默认关闭的公共契约。

## 决策

- 采用: 仅 Project Gate 显式启用现有 Markdown Link parse-facts cache，目录为
  `.cache/vibe-check/markdown-link-parse-facts/`；冷启动与命中分别验收。
- 采用: 每次仍读取当前源文件、校验 exact-content identity，并完成 target 授权、链接与 anchor 验证；
  复用只替换解析计算，原 corpus、work limits、finding policy 和结果保持。
- 采用: 目录由本地维护者管理和删除，沿用默认 16 MiB 非阻断容量提醒；cache 不提供机密性或防篡改保证。
  不引入自动清理、远端共享、成功结果缓存或新的依赖。
